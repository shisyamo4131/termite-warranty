import { createHash, randomUUID } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { AccountMutationError } from './account-mutation.js'

const fail = (code, message, details) => { const error = new AccountMutationError(code, message); if (details) error.details = details; throw error }
const uncertain = details => fail('failed-precondition', 'アカウント発行の結果確認が必要です。再発行せず、管理者に確認してください。', details)
const stamp = () => FieldValue.serverTimestamp()
export const creationMatches = (value, desired) => value?.email === desired.email && (value?.displayName ?? '') === desired.displayName
export function authorizeCreation(actor, role) {
  const expected = actor?.role === 'developer_superuser' ? 'house_solution_administrator' : actor?.role === 'house_solution_administrator' ? 'general_staff' : null
  if (actor?.enabled !== true || expected !== role) fail('permission-denied', '担当者を発行する権限を確認できません。')
}

// Request receipts are separate from active UID locks and survive later account edits.
export async function createStaffAccountSafely(auth, db, desired, actorUid, requestId) {
  if (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(requestId)) fail('invalid-argument', '画面を再読込して発行してください。')
  const key = createHash('sha256').update(JSON.stringify([actorUid, requestId])).digest('hex')
  const operationRef = db.doc(`accountCreationOperations/${key}`)
  const uid = randomUUID(), operationId = randomUUID()
  const lockRef = db.doc(`accountMutationLocks/${uid}`), targetRef = db.doc(`staffAccounts/${uid}`)
  const acquired = await db.runTransaction(async tx => {
    const [actor, existing, target, lock] = await Promise.all([tx.get(db.doc(`staffAccounts/${actorUid}`)), tx.get(operationRef), tx.get(targetRef), tx.get(lockRef)])
    authorizeCreation(actor.data(), desired.role)
    if (existing.exists) {
      const prior = existing.data()
      if (prior.actorUid !== actorUid || !creationMatches(prior.desired, desired) || prior.desired.role !== desired.role) fail('failed-precondition', '発行確認中の入力内容は変更できません。')
      if (prior.status === 'rejected') fail(prior.rejectionCode === 'invalid-argument' ? 'invalid-argument' : 'already-exists', '発行を受け付けられませんでした。メールアドレスと表示名を確認してください。')
      if (prior.status !== 'completed') uncertain({ uid: prior.uid, operationId: prior.operationId })
      return { ...prior.result, replayed: true }
    }
    if (target.exists || lock.exists) uncertain()
    tx.create(operationRef, { kind: 'staff_creation', operationId, actorUid, requestId, uid, targetPath: targetRef.path, desired, status: 'running', createdAt: stamp() })
    tx.create(lockRef, { kind: 'create', operationId, actorUid, targetPath: targetRef.path, creationPath: operationRef.path, desired, status: 'running', createdAt: stamp() })
    return null
  })
  if (acquired) return acquired
  const result = { uid, ...desired, enabled: true }
  const check = (lock, operation) => {
    if (lock.data()?.operationId !== operationId || lock.data()?.recoveryOwner || operation.data()?.operationId !== operationId || operation.data()?.status !== 'running') uncertain()
  }
  try {
    await auth.createUser({ uid, email: desired.email, displayName: desired.displayName, disabled: true })
    await db.runTransaction(async tx => {
      const [lock, operation, actor] = await Promise.all([tx.get(lockRef), tx.get(operationRef), tx.get(db.doc(`staffAccounts/${actorUid}`))])
      check(lock, operation); authorizeCreation(actor.data(), desired.role)
      tx.create(targetRef, { ...desired, enabled: false, creationOperationId: operationId, creationPending: true, createdAt: stamp(), updatedAt: stamp() })
    })
    await auth.updateUser(uid, { disabled: false })
    const user = await auth.getUser(uid)
    if (!creationMatches(user, desired) || user.disabled !== false) uncertain()
    await db.runTransaction(async tx => {
      const [lock, operation, actor, target] = await Promise.all([tx.get(lockRef), tx.get(operationRef), tx.get(db.doc(`staffAccounts/${actorUid}`)), tx.get(targetRef)])
      check(lock, operation); authorizeCreation(actor.data(), desired.role)
      if (target.data()?.creationOperationId !== operationId || target.data()?.enabled !== false || !creationMatches(target.data(), desired) || target.data()?.role !== desired.role) uncertain()
      tx.update(targetRef, { enabled: true, creationPending: false, lastAccountMutationId: operationId, updatedAt: stamp() })
      tx.update(operationRef, { status: 'completed', result, completedAt: stamp() })
      tx.delete(lockRef)
    })
    return result
  } catch (error) {
    const authConflict = ['auth/email-already-exists', 'auth/uid-already-exists'].includes(error?.code)
    if (authConflict || ['auth/invalid-email', 'auth/invalid-display-name', 'auth/invalid-uid'].includes(error?.code)) {
      const rejectionCode = authConflict ? 'already-exists' : 'invalid-argument'
      await db.runTransaction(async tx => {
        const [lock, operation, target] = await Promise.all([tx.get(lockRef), tx.get(operationRef), tx.get(targetRef)])
        check(lock, operation)
        if (target.exists) uncertain()
        tx.update(operationRef, { status: 'rejected', authConflict, rejectionCode, completedAt: stamp() })
        tx.delete(lockRef)
      })
      fail(rejectionCode, '発行を受け付けられませんでした。メールアドレスと表示名を確認してください。')
    }
    // A committed final transaction must not be undone after its response was lost.
    try {
      const operation = (await operationRef.get()).data()
      if (operation?.operationId === operationId && operation.status === 'completed') return operation.result
    } catch { /* Unknown completion: retain evidence, never blindly delete Auth. */ }
    const retained = await db.runTransaction(async tx => {
      const [lock, operation] = await Promise.all([tx.get(lockRef), tx.get(operationRef)])
      if (lock.data()?.operationId !== operationId || lock.data()?.recoveryOwner || operation.data()?.status === 'completed') return false
      tx.update(lockRef, { status: 'recovery_required' })
      tx.update(operationRef, { status: 'recovery_required' })
      return true
    }).catch(() => {})
    if (retained) {
      try {
        const user = await auth.getUser(uid)
        if (!creationMatches(user, desired)) uncertain()
        await auth.updateUser(uid, { disabled: true })
        await auth.revokeRefreshTokens(uid)
        if ((await auth.getUser(uid)).disabled !== true) uncertain()
      } catch { /* No assertion of safe closure: recovery must independently verify. */ }
    }
    // The profile stays disabled throughout incomplete creation. Recovery confirms
    // Auth disablement under exclusive ownership; it does not guess a lost result.
    uncertain({ uid, operationId })
  }
}

export async function recoverStaffCreation(auth, db, { uid, expectedOperationId, workerStopped, expectedRecoveryOwner, recoveryWorkerStopped = false }) {
  if (!workerStopped || !expectedOperationId) uncertain()
  const lockRef = db.doc(`accountMutationLocks/${uid}`), targetRef = db.doc(`staffAccounts/${uid}`)
  const recoveryOwner = randomUUID()
  const state = await db.runTransaction(async tx => {
    const lock = (await tx.get(lockRef)).data()
    if (lock?.kind !== 'create' || lock.operationId !== expectedOperationId || lock.targetPath !== targetRef.path || !/^accountCreationOperations\/[a-f0-9]{64}$/.test(lock.creationPath ?? '')) uncertain()
    if (lock.recoveryOwner && (!recoveryWorkerStopped || lock.recoveryOwner !== expectedRecoveryOwner) || !lock.recoveryOwner && expectedRecoveryOwner) uncertain()
    const operationRef = db.doc(lock.creationPath)
    const [operationSnapshot, target] = await Promise.all([tx.get(operationRef), tx.get(targetRef)])
    const operation = operationSnapshot.data()
    if (operation?.operationId !== expectedOperationId || operation.uid !== uid || operation.targetPath !== targetRef.path || operation.status === 'completed' || operation.authConflict || !creationMatches(operation.desired, lock.desired) || operation.desired.role !== lock.desired.role) uncertain()
    if (target.exists && (target.data().creationOperationId !== expectedOperationId || target.data().enabled !== false || !creationMatches(target.data(), operation.desired) || target.data().role !== operation.desired.role)) uncertain()
    tx.update(lockRef, { recoveryOwner, status: 'recovery_running' })
    return { desired: operation.desired, creationPath: lock.creationPath }
  })
  // Missing Auth is a distinct manual-repair case; never create or adopt another
  // email owner's identity as an implicit side effect of recovering a lock.
  const user = await auth.getUser(uid)
  if (!creationMatches(user, state.desired)) uncertain()
  await auth.updateUser(uid, { disabled: true })
  await auth.revokeRefreshTokens(uid)
  const closed = await auth.getUser(uid)
  if (!creationMatches(closed, state.desired) || closed.disabled !== true) uncertain()
  await db.runTransaction(async tx => {
    const operationRef = db.doc(state.creationPath)
    const [lockSnapshot, operationSnapshot, target] = await Promise.all([tx.get(lockRef), tx.get(operationRef), tx.get(targetRef)])
    const lock = lockSnapshot.data(), operation = operationSnapshot.data()
    if (lock?.operationId !== expectedOperationId || lock.recoveryOwner !== recoveryOwner || lock.creationPath !== state.creationPath || operation?.operationId !== expectedOperationId || operation.status === 'completed' || !creationMatches(operation.desired, state.desired) || operation.desired.role !== state.desired.role) uncertain()
    if (target.exists && (target.data().creationOperationId !== expectedOperationId || target.data().enabled !== false || !creationMatches(target.data(), state.desired) || target.data().role !== state.desired.role)) uncertain()
    const value = { ...state.desired, enabled: false, creationPending: false, creationOperationId: expectedOperationId, lastAccountMutationId: expectedOperationId, updatedAt: stamp() }
    if (target.exists) tx.update(targetRef, value)
    else tx.create(targetRef, { ...value, createdAt: stamp() })
    tx.update(operationRef, { status: 'recovered_disabled', completedAt: stamp() })
    tx.delete(lockRef)
  })
  return { uid, recovered: true, enabled: false }
}
