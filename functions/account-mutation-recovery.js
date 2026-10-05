import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'node:crypto'

const fail = message => { throw new Error(message) }
const validate = uid => { if (typeof uid !== 'string' || !/^[\w-]{1,128}$/.test(uid)) fail('Explicit valid UID required.') }
export async function inspectAccountMutation(auth, db, uid) {
  validate(uid)
  const lock = (await db.doc(`accountMutationLocks/${uid}`).get()).data()
  if (!lock) return { uid, locked: false }
  if (!['staffAccounts', 'constructionCompanyAccounts'].some(collection => lock.targetPath === `${collection}/${uid}`)) fail('Unexpected account target; manual review required.')
  const [target, user] = await Promise.all([db.doc(lock.targetPath).get(), auth.getUser(uid)])
  const value = target.data()
  return { uid, locked: true, operationId: lock.operationId, recoveryOwner: lock.recoveryOwner ?? null, kind: lock.kind, status: lock.status, documentExists: target.exists, documentEnabled: value?.enabled === true, authDisabled: user.disabled === true, profileMatches: user.email === value?.email && (user.displayName ?? '') === (value?.displayName ?? value?.companyName ?? '') }
}

export async function recoverAccountMutation(auth, db, { uid, expectedOperationId, workerStopped, expectedRecoveryOwner, recoveryWorkerStopped = false }) {
  validate(uid)
  if (!workerStopped || typeof expectedOperationId !== 'string' || !expectedOperationId) fail('Expected operation ID and confirmed old-worker quiescence required.')
  const lockRef = db.doc(`accountMutationLocks/${uid}`)
  const recoveryOwner = randomUUID()
  const { target, targetPath } = await db.runTransaction(async tx => {
    const initial = (await tx.get(lockRef)).data()
    if (initial?.operationId !== expectedOperationId) fail('Lock differs from inspected operation.')
    if (initial.recoveryOwner && (!recoveryWorkerStopped || initial.recoveryOwner !== expectedRecoveryOwner)) fail('Another recovery owns this lock; confirm its worker stopped before explicit replacement.')
    if (!initial.recoveryOwner && expectedRecoveryOwner) fail('Recovery ownership differs from inspected state.')
    if (!['staffAccounts', 'constructionCompanyAccounts'].some(collection => initial.targetPath === `${collection}/${uid}`)) fail('Unexpected target path.')
    const target = (await tx.get(db.doc(initial.targetPath))).data()
    if (!target || typeof target.enabled !== 'boolean' || typeof target.email !== 'string') fail('Account state requires manual repair.')
    tx.update(lockRef, { recoveryOwner, status: 'recovery_running' })
    return { target, targetPath: initial.targetPath }
  })
  const targetRef = db.doc(targetPath)
  const displayName = target.displayName ?? target.companyName ?? ''
  // The durable account document is authoritative. An interrupted enable stays disabled.
  await auth.updateUser(uid, { email: target.email, displayName, disabled: !target.enabled })
  if (!target.enabled) await auth.revokeRefreshTokens(uid)
  const user = await auth.getUser(uid)
  if (user.email !== target.email || (user.displayName ?? '') !== displayName || user.disabled !== !target.enabled) fail('Auth reconciliation not confirmed; lock retained.')
  await db.runTransaction(async tx => {
    const [lock, latest] = await Promise.all([tx.get(lockRef), tx.get(targetRef)])
    const current = latest.data()
    if (lock.data()?.operationId !== expectedOperationId || lock.data()?.recoveryOwner !== recoveryOwner || !current || ['email', 'displayName', 'companyName', 'enabled'].some(key => current[key] !== target[key])) fail('Account changed during recovery; lock retained.')
    tx.update(targetRef, { lastAccountMutationId: expectedOperationId, updatedAt: FieldValue.serverTimestamp() })
    tx.delete(lockRef)
  })
  return { uid, recovered: true, enabled: target.enabled }
}
