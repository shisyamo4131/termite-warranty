import './emulator-runtime.mjs'
// Historical controller regression only; never imported by deployed Functions.
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:38080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:39099') throw new Error('Legacy fixture requires dedicated fictional emulators.');
import { randomUUID } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import { defineString } from 'firebase-functions/params'
import { HttpsError } from 'firebase-functions/v2/https'
import { ACCESS_PATH, ACTIVATION_PATH, RUNTIME_PATH, RECOVERY_ROLES, runtimeState, assertRequest } from '../../src/domain/recovery.mjs'

const controlDatabase = defineString('RECOVERY_CONTROL_DATABASE', { default: '' })
const db = id => id === '(default)' ? getFirestore() : getFirestore(id)
export async function resolveRecovery() {
  if (db('(default)').projectId !== 'demo-termite-warranty-test') throw new Error('Legacy fixture requires fictional project.')
  // The default database is a permanent activation anchor. Loss of configuration
  // after activation cannot silently put Admin SDK operations back on the old DB.
  const anchor = await db('(default)').doc(ACTIVATION_PATH).get()
  const configured = controlDatabase.value()
  if (!configured && !anchor.exists) return { state: null, firestore: db('(default)'), control: null }
  if (!configured || !anchor.exists || anchor.data().controlDatabaseId !== configured) throw new HttpsError('failed-precondition', '復旧制御の設定を確認してください。')
  const control = db(configured)
  const snapshot = await control.doc(RUNTIME_PATH).get()
  const state = runtimeState(snapshot.data())
  if (state.controlDatabaseId !== configured || state.databaseId === configured) throw new HttpsError('failed-precondition', '復旧制御の接続先が不正です。')
  const firestore = db(state.databaseId)
  const marker = (await firestore.doc(ACCESS_PATH).get()).data()
  if (!marker || marker.databaseId !== state.databaseId || marker.phase !== state.phase || marker.generation !== state.generation) throw new HttpsError('failed-precondition', '復旧制御の切替処理中です。')
  return { state, firestore, control }
}
export async function withRecovery(request, mutation, operation, { accountMutation = false } = {}) {
  const resolved = await resolveRecovery()
  if (!resolved.state) return operation(resolved.firestore)
  const { state, firestore, control } = resolved
  const actor = request.auth && (state.phase === 'verification' || accountMutation) ? (await firestore.doc(`staffAccounts/${request.auth.uid}`).get()).data() : null
  const administrator = actor?.enabled === true && RECOVERY_ROLES.includes(actor.role)
  if (accountMutation && !administrator) throw new HttpsError('permission-denied','アカウントの変更は管理者のみ操作できます。')
  try { assertRequest(state, request.data?.runtimeGeneration, mutation, administrator) }
  catch (error) { throw new HttpsError(error.code, error.message) }
  if (!mutation) {
    const result = await operation(firestore)
    // Enter publishes recovering before closing markers; cutover starts from
    // recovering. A fresh control read therefore fences each transition without
    // re-reading the immutable activation anchor and the marker on every read.
    const current = runtimeState((await control.doc(RUNTIME_PATH).get()).data())
    const latestActor = current.phase === 'verification' ? (await firestore.doc(`staffAccounts/${request.auth.uid}`).get()).data() : null
    assertRequest(current, request.data?.runtimeGeneration, false, latestActor?.enabled === true && RECOVERY_ROLES.includes(latestActor.role))
    if (current.databaseId !== state.databaseId || current.controlDatabaseId !== state.controlDatabaseId) throw new HttpsError('failed-precondition', '接続先が変更されました。')
    return result
  }
  // Only mutations lease; read results are fenced again before return.
  // Release failure deliberately leaves a visible blocking lease.
  const lease = control.collection('recoveryOperations').doc(randomUUID())
  await control.runTransaction(async tx => {
    const current = runtimeState((await tx.get(control.doc(RUNTIME_PATH))).data())
    const epoch = accountMutation ? (await tx.get(control.doc('recovery/authBackupEpoch'))).data()?.epoch ?? 0 : null
    assertRequest(current, request.data?.runtimeGeneration, mutation, administrator)
    if (current.databaseId !== state.databaseId) throw new HttpsError('failed-precondition', '接続先が変更されました。')
    tx.create(lease, { generation: state.generation, mutation, accountMutation, startedAt: new Date() })
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
      const { exportPrivateAuthSnapshot } = await import('../../functions/recovery-backups.js')
      // Coalesce signals. Failed/rejected calls do not force a full export;
      // the epoch preserves uncertain authorized mutations for the next run.
      try { await exportPrivateAuthSnapshot(control) }
      catch { await control.doc('recovery/backupHealth').set({ authBackup: 'failed' }, { merge: true }); console.error('Recovery Auth backup failed.', { recoveryBackupFailure: true }) }
    }
  }
}
export async function recoveryRuntimeOperation() {
  const { state } = await resolveRecovery()
  return state ?? { phase: 'normal', generation: 0, databaseId: '(default)', controlDatabaseId: null }
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
