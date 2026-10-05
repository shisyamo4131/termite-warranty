import { randomUUID } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'

export class AccountMutationError extends Error {
  constructor(code, message) { super(message); this.code = code }
}
const blocked = () => { throw new AccountMutationError('aborted', 'このアカウントは別の操作中、または状態の確認が必要です。時間を置いて再試行し、続く場合は管理者へ連絡してください。') }
const uncertain = () => { throw new AccountMutationError('failed-precondition', 'アカウントの更新結果を確認できません。管理者による状態確認が必要です。') }
const sameProfile = (user, value) => user.email === value.email && (user.displayName ?? '') === (value.displayName ?? '')

// No timed takeover: Auth cannot fence an old worker that resumes after a lease expires.
export async function mutateAccount(auth, db, { uid, targetPath, actorUid, authorize, kind, desired }) {
  const lockRef = db.doc(`accountMutationLocks/${uid}`), targetRef = db.doc(targetPath)
  const operationId = randomUUID()
  const before = await db.runTransaction(async tx => {
    const [actor, target, lock] = await Promise.all([
      tx.get(db.doc(`staffAccounts/${actorUid}`)), tx.get(targetRef), tx.get(lockRef),
    ])
    authorize(actor.data(), target.exists ? target.data() : null)
    if (lock.exists) blocked()
    if (!target.exists) throw new AccountMutationError('not-found', 'アカウントが見つかりません。')
    tx.create(lockRef, { operationId, targetPath, actorUid, kind, desired, status: 'running', createdAt: FieldValue.serverTimestamp() })
    // Fail closed before both enable and disable operations touch Auth.
    if (kind === 'enabled') tx.update(targetRef, { enabled: false, updatedAt: FieldValue.serverTimestamp() })
    return target.data()
  })
  const owned = async () => {
    const [lock, target] = await Promise.all([lockRef.get(), targetRef.get()])
    if (target.data()?.lastAccountMutationId === operationId) return 'complete'
    if (lock.data()?.operationId !== operationId) return 'unknown'
    return 'owned'
  }
  const finish = async (patch, completed = false) => db.runTransaction(async tx => {
    const lock = await tx.get(lockRef)
    if (lock.data()?.operationId !== operationId) uncertain()
    if (patch) tx.update(targetRef, { ...patch, updatedAt: FieldValue.serverTimestamp(), ...(completed ? { lastAccountMutationId: operationId } : {}) })
    tx.delete(lockRef)
  })
  const retain = async () => {
    await db.runTransaction(async tx => {
      const lock = await tx.get(lockRef)
      if (lock.data()?.operationId === operationId) tx.update(lockRef, { status: 'recovery_required' })
    }).catch(() => {})
  }
  const consistentPreviousProfile = async previous => {
    const [user, target, lock] = await Promise.all([auth.getUser(uid), targetRef.get(), lockRef.get()])
    const current = target.data()
    return lock.data()?.operationId === operationId && sameProfile(user, previous)
      && sameProfile(current ?? {}, before) && current?.enabled === before.enabled
      && user.disabled === (current?.enabled !== true) && sameProfile(user, current ?? {})
  }
  let previousUser
  try {
    previousUser = await auth.getUser(uid)
    // Persist compensation information before the first external mutation.
    await db.runTransaction(async tx => {
      if ((await tx.get(lockRef)).data()?.operationId !== operationId) uncertain()
      tx.update(lockRef, { previousAuth: { email: previousUser.email ?? '', displayName: previousUser.displayName ?? '', disabled: previousUser.disabled === true }, previousEnabled: before.enabled === true })
    })
  } catch (error) {
    // No Auth mutation has started; a confirmed owned lock may safely be released.
    try { if (kind === 'profile' && await owned() === 'owned') await finish(null); else await retain() } catch { await retain() }
    throw error
  }
  try {
    await auth.updateUser(uid, kind === 'profile' ? desired : { disabled: !desired.enabled })
    if (kind === 'enabled' && !desired.enabled) await auth.revokeRefreshTokens(uid)
  } catch (error) {
    // Documented validation rejection has no mutation; preserve ordinary retryable form errors.
    if (kind === 'profile' && ['auth/email-already-exists', 'auth/invalid-email', 'auth/invalid-display-name'].includes(error?.code)) {
      try {
        if (await consistentPreviousProfile(previousUser)) { await finish(null); throw error }
      } catch (verificationError) {
        if (verificationError === error) throw error
      }
    }
    // Even a rejected network call may have applied. Do not release or race its outcome.
    await retain()
    uncertain()
  }
  try {
    await finish(desired, true)
  } catch {
    let state
    try { state = await owned() } catch { await retain(); uncertain() }
    if (state === 'complete') return // Committed successfully, but the response was lost.
    if (state !== 'owned') { await retain(); uncertain() }
    try {
      if (kind === 'profile') {
        await auth.updateUser(uid, { email: previousUser.email, displayName: previousUser.displayName ?? '' })
        if (!await consistentPreviousProfile(previousUser)) uncertain()
      } else {
        // Never undo a disable by re-enabling. Failed enables return to the closed state.
        await auth.updateUser(uid, { disabled: true })
        await auth.revokeRefreshTokens(uid)
        if ((await auth.getUser(uid)).disabled !== true) uncertain()
      }
      await finish(null)
    } catch { await retain(); uncertain() }
    throw new AccountMutationError('internal', 'アカウントを保存できませんでした。安全な状態へ戻しました。再試行してください。')
  }
}
