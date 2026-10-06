import { randomUUID } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import { defineString } from 'firebase-functions/params'
import { HttpsError } from 'firebase-functions/v2/https'
import { ACCESS_PATH, RUNTIME_PATH, RECOVERY_ROLES } from './domain/recovery.mjs'
import { fixedRuntimeState, assertFixedRequest, sameFixedEpoch } from './domain/fixed-recovery.mjs'
import { resolveProjectId } from './local-runtime.js'

// Explicit fictional fixture configuration, never a live missing-config fallback.
const fixtureControl = process.env.FUNCTIONS_EMULATOR === 'true' && resolveProjectId() === 'demo-termite-warranty'
  && process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:28080' ? 'test-fixed-control' : ''
const controlDatabase = defineString('RECOVERY_CONTROL_DATABASE', { default: fixtureControl })
const db = id => id === '(default)' ? getFirestore() : getFirestore(id)
export async function resolveRecovery() {
  const configured = controlDatabase.value() || fixtureControl
  if (!configured || configured === '(default)') throw new HttpsError('failed-precondition', '復旧制御の設定を確認してください。')
  const firestore = db('(default)')
  try {
    const state = fixedRuntimeState((await firestore.doc(ACCESS_PATH).get()).data())
    if (state.controlDatabaseId !== configured) throw new Error('Control mismatch')
    return { state, firestore, control: db(configured) }
  } catch { throw new HttpsError('failed-precondition', '復旧制御の接続状態を確認してください。') }
}
export async function withRecovery(request, mutation, operation, { accountMutation = false } = {}) {
  const resolved = await resolveRecovery()
  const { state, firestore, control } = resolved
  const actor = request.auth && (state.phase === 'verification' || accountMutation) ? (await firestore.doc(`staffAccounts/${request.auth.uid}`).get()).data() : null
  const administrator = actor?.enabled === true && RECOVERY_ROLES.includes(actor.role)
  if (accountMutation && !administrator) throw new HttpsError('permission-denied','アカウントの変更は管理者のみ操作できます。')
  try { assertFixedRequest(state, request.data?.runtimeGeneration, request.data?.runtimeProtocol, mutation, administrator) }
  catch (error) { throw new HttpsError(error.code, error.message) }
  if (!mutation) {
    const result = await operation(firestore)
    const current = fixedRuntimeState((await firestore.doc(ACCESS_PATH).get()).data())
    const latestActor = current.phase === 'verification' ? (await firestore.doc(`staffAccounts/${request.auth.uid}`).get()).data() : null
    assertFixedRequest(current, request.data?.runtimeGeneration, request.data?.runtimeProtocol, false, latestActor?.enabled === true && RECOVERY_ROLES.includes(latestActor.role))
    if (!sameFixedEpoch(current, state)) throw new HttpsError('failed-precondition', '接続状態が変更されました。')
    return result
  }
  // Only mutations lease; read results are fenced again before return.
  // Release failure deliberately leaves a visible blocking lease.
  const lease = control.collection('recoveryOperations').doc(randomUUID())
  await control.runTransaction(async tx => {
    const current = fixedRuntimeState((await tx.get(control.doc(RUNTIME_PATH))).data())
    const epoch = accountMutation ? (await tx.get(control.doc('recovery/authBackupEpoch'))).data()?.epoch ?? 0 : null
    assertFixedRequest(current, request.data?.runtimeGeneration, request.data?.runtimeProtocol, mutation, administrator)
    if (!sameFixedEpoch(current, state)) throw new HttpsError('failed-precondition', '接続状態が変更されました。')
    tx.create(lease, { protocol: state.protocol, generation: state.generation, mutation, accountMutation, startedAt: new Date() })
    if (accountMutation) {
      tx.set(control.doc('recovery/authBackupEpoch'), { epoch: epoch + 1 })
      tx.set(control.doc('recovery/authBackupRequested'), { requestedAt: new Date() })
    }
  })
  let completed = false
  try { const result = await operation(firestore); completed = true; return result }
  finally {
    await lease.delete()
    if (accountMutation && completed) {
      const { exportPrivateAuthSnapshot } = await import('./recovery-backups.js')
      // Coalesce signals. Failed/rejected calls do not force a full export;
      // the epoch preserves uncertain authorized mutations for the next run.
      try { await exportPrivateAuthSnapshot(control) }
      catch { await control.doc('recovery/backupHealth').set({ authBackup: 'failed' }, { merge: true }); console.error('Recovery Auth backup failed.', { recoveryBackupFailure: true }) }
    }
  }
}
export async function recoveryRuntimeOperation() {
  const { state } = await resolveRecovery()
  return state
}
export async function recoveryStatusOperation(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'ログインしてください。')
  const { state, firestore, control } = await resolveRecovery()
  const actor = (await firestore.doc(`staffAccounts/${request.auth.uid}`).get()).data()
  if (actor?.enabled !== true || !RECOVERY_ROLES.includes(actor.role)) throw new HttpsError('permission-denied', '管理者のみ確認できます。')
  if (state?.phase === 'recovering') throw new HttpsError('failed-precondition', '復旧処理中です。')
  if (!control) return { configured: false, runtime: null, backups: [], monitoring: 'unconfigured', authBackup: 'unconfigured', lastFirestoreSuccess:null, lastAuthSuccess:null }
  const history = await control.collection('backupHistory').orderBy('checkedAt', 'desc').limit(20).get()
  const settings = (await control.doc('recovery/backupHealth').get()).data()
  const lastAuth=(await control.doc('recovery/lastAuthBackup').get()).data()
  return { configured: true, runtime: state, monitoring: settings?.monitoring ?? 'unconfigured', authBackup: settings?.authBackup ?? 'unconfigured', lastFirestoreSuccess:settings?.lastFirestoreSuccessTime??null, lastAuthSuccess:lastAuth?.completedAt?.toDate?.().toISOString()??null, backups: history.docs.map(row => { const value = row.data(); return { id: row.id, type: value.type, status: value.status, checkedAt: value.checkedAt?.toDate?.().toISOString() ?? null, backupTime: value.backupTime ?? null } }) }
}
