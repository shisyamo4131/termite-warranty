import { randomUUID } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'
import { defineBoolean, defineString } from 'firebase-functions/params'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { resolveRecovery } from './recovery-runtime.js'
import { backupHealth, assertPrivateAuthBucket } from './domain/backup-health.mjs'
import { measureFirestoreOperation } from './firestore-metrics.js'

const enabled = defineBoolean('RECOVERY_BACKUP_AUTOMATION', { default: false })
const bucketName = defineString('RECOVERY_AUTH_BACKUP_BUCKET', { default: '' })
const hashEvidence = defineString('RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE', { default: '' })
const mailEvidence = defineString('RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE', { default: '' })
export async function recordBackupFailure(control, health) {
  // Notification must survive a control-store failure. Never log raw errors,
  // private backup references, account records or credentials.
  logger.error('Recovery backup check failed.', { recoveryBackupFailure: true })
  if (control) {
    try { await control.doc('recovery/backupHealth').set(health, { merge: true }) }
    catch { logger.warn('Recovery backup failure status could not be saved.') }
  }
}
async function api(path) {
  const token = await applicationDefault().getAccessToken()
  const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error('Backup metadata could not be obtained.')
  return response.json()
}
export async function recordFirestoreBackupObservation(control, health) {
  await control.collection('backupHistory').doc().create({ type:'firestore', ...health, checkedAt:new Date() })
  // Firestore success is independent of the following Auth export outcome.
  if(health.status==='success')await control.doc('recovery/backupHealth').set({lastFirestoreSuccessTime:health.backupTime},{merge:true})
}
export async function exportPrivateAuthSnapshot(control, { force = false, auth = getAuth(), storage = getStorage() } = {}) {
  if (!enabled.value() || !bucketName.value() || !hashEvidence.value()) return { status: 'unconfigured' }
  const last = (await control.doc('recovery/lastAuthBackup').get()).data()
  const pending = (await control.doc('recovery/authBackupRequested').get()).data()
  if (!force && last?.completedAt?.toMillis() > Date.now() - 7 * 86400_000 && last.completedAt.toMillis() >= (pending?.requestedAt?.toMillis() ?? 0)) return { status: 'success' }
  const lock = control.doc('recovery/authExportLock'), owner = randomUUID()
  const epochRef = control.doc('recovery/authBackupEpoch'), runtimeRef = control.doc('recovery/runtime')
  const acquired = await control.runTransaction(async tx => {
    const [prior, epoch, state, active] = await Promise.all([tx.get(lock), tx.get(epochRef), tx.get(runtimeRef), tx.get(control.collection('recoveryOperations').where('accountMutation','==',true).limit(1))])
    if (prior.exists || active.size || state.data()?.phase !== 'normal') return null
    const binding = { owner, epoch: epoch.data()?.epoch ?? 0, generation: state.data().generation, startedAt: new Date() }
    tx.create(lock, binding)
    return binding
  })
  if (!acquired) return { status: 'unavailable' }
  try {
  const bucket = storage.bucket(bucketName.value())
  const [metadata] = await bucket.getMetadata(), [policy] = await bucket.iam.getPolicy()
  assertPrivateAuthBucket(metadata, policy)
  const users = []; let pageToken
  do {
    const page = await auth.listUsers(1000, pageToken)
    for (const user of page.users) {
      if (user.providerData.some(provider => provider.providerId === 'password') && (!user.passwordHash || user.passwordSalt === undefined)) throw new Error('Auth password export permission is missing.')
      users.push(user.toJSON())
    }
    pageToken = page.pageToken
  } while (pageToken)
  const object = `auth/${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}.json.gz`
  await bucket.file(object).save(gzipSync(JSON.stringify({ schemaVersion: 1, hashConfigurationEvidence: hashEvidence.value(), users })), { resumable: false, metadata: { contentType: 'application/gzip' }, preconditionOpts: { ifGenerationMatch: 0 } })
  // Private reference only; never send it, user data or hashes to the browser/log.
  await control.runTransaction(async tx => {
    const [held, epoch, state] = await Promise.all([tx.get(lock),tx.get(epochRef),tx.get(runtimeRef)])
    if (held.data()?.owner !== owner || (epoch.data()?.epoch ?? 0) !== acquired.epoch || state.data()?.generation !== acquired.generation || state.data()?.phase !== 'normal') throw new Error('Accounts or recovery state changed during export; a fresh backup is required.')
    tx.set(control.doc('recovery/lastAuthBackup'), { completedAt: acquired.startedAt, object, bucket: bucketName.value(), count: users.length })
    tx.create(control.collection('backupHistory').doc(), { type: 'auth', status: 'success', backupTime: acquired.startedAt.toISOString(), checkedAt: new Date() })
    tx.delete(lock)
  })
  return { status: 'success' }
  } finally {
    await control.runTransaction(async tx => { const held=await tx.get(lock);if(held.data()?.owner===owner)tx.delete(lock) })
  }
}
export const recoveryBackupMonitor = onSchedule({ region: 'asia-northeast1', schedule: '0 10 * * *', timeZone: 'Asia/Tokyo', retryCount: 0 }, () => measureFirestoreOperation('recoveryBackupMonitor', null, async () => {
  if (!enabled.value()) return
  let control, authStatus = 'unavailable'
  try {
    const resolved = await resolveRecovery()
    control = resolved.control
    if (!control) throw new Error('Recovery control is not activated.')
    if (resolved.state.phase !== 'normal') return // recovery operator validates backups while maintenance runs
    const project = process.env.GCLOUD_PROJECT, resource = `projects/${project}/databases/${resolved.state.databaseId}`
    const description = await api(resource), backups = []; let pageToken
    do { const page = await api(`projects/${project}/locations/${description.locationId}/backups${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ''}`); backups.push(...(page.backups ?? [])); pageToken = page.nextPageToken } while (pageToken)
    const health = backupHealth(backups, resource, Date.now())
    await recordFirestoreBackupObservation(control, health)
    const auth = await exportPrivateAuthSnapshot(control)
    authStatus = auth.status
    await control.doc('recovery/backupHealth').set({ monitoring: mailEvidence.value() ? health.status : 'unconfigured', authBackup: auth.status, checkedAt: new Date() }, {merge:true})
    if (health.status !== 'success' || auth.status !== 'success') throw new Error('Backup is missing, stale or unconfigured.')
  } catch {
    // Cloud Monitoring log-based alert sends developer-only email after its
    // separately verified notification channel/policy has been configured.
    await recordBackupFailure(control, { monitoring: mailEvidence.value() ? 'failed' : 'unconfigured', authBackup: authStatus, checkedAt: new Date() })
    throw new Error('Backup monitoring failed; inspect private operational state.')
  }
}))
