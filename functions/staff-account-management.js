import { AccountMutationError, mutateAccount } from './account-mutation.js'
import { Timestamp } from 'firebase-admin/firestore'

export class StaffAccountError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'StaffAccountError'
    this.code = code
  }
}

const fail = (code, message) => { throw new StaffAccountError(code, message) }
const nonBlank = value => typeof value === 'string' && /\S/.test(value)
const requiredText = (value, message) => nonBlank(value) ? value.trim() : fail('invalid-argument', message)
const email = (value) => {
  const normalized = requiredText(value, 'メールアドレスを入力してください。').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) fail('invalid-argument', 'メールアドレスを正しく入力してください。')
  return normalized
}

const targetRoleFor = role => {
  if (role === 'developer_superuser') return 'house_solution_administrator'
  if (role === 'house_solution_administrator') return 'general_staff'
  fail('permission-denied', '担当者アカウントを管理する権限がありません。')
}

const assertManager = async (firestore, actorUid) => {
  if (!nonBlank(actorUid)) fail('permission-denied', '利用可能な管理者アカウントを確認できません。')
  const snapshot = await firestore.doc(`staffAccounts/${actorUid}`).get()
  const account = snapshot.data()
  if (!snapshot.exists || account?.enabled !== true) fail('permission-denied', '利用可能な管理者アカウントを確認できません。')
  return { account, targetRole: targetRoleFor(account.role) }
}

const authFailure = error => {
  if (error?.code === 'auth/email-already-exists') fail('already-exists', 'このメールアドレスはすでに使用されています。')
  if (error?.code === 'auth/user-not-found') fail('not-found', '認証アカウントが見つかりません。')
  fail('internal', '認証アカウントを更新できませんでした。')
}

export async function listManageableStaffAccountsOperation(firestore, actorUid) {
  const { targetRole } = await assertManager(firestore, actorUid)
  const snapshot = await firestore.collection('staffAccounts').where('role', '==', targetRole).get()
  return {
    targetRole,
    accounts: snapshot.docs
      .map(item => ({
        uid: item.id,
        email: String(item.data().email ?? ''),
        displayName: String(item.data().displayName ?? ''),
        role: targetRole,
        enabled: item.data().enabled === true,
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ja') || left.email.localeCompare(right.email)),
  }
}

export async function createStaffAccountOperation(auth, firestore, input, actorUid) {
  const { targetRole } = await assertManager(firestore, actorUid)
  const accountEmail = email(input?.email)
  const displayName = requiredText(input?.displayName, '表示名を入力してください。')
  let user
  try {
    user = await auth.createUser({ email: accountEmail, displayName, disabled: false })
    const now = Timestamp.now()
    await firestore.doc(`staffAccounts/${user.uid}`).create({
      email: accountEmail,
      displayName,
      role: targetRole,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
    return { uid: user.uid, email: accountEmail, displayName, role: targetRole, enabled: true }
  } catch (error) {
    if (user?.uid) await auth.deleteUser(user.uid).catch(() => {})
    if (error instanceof StaffAccountError) throw error
    authFailure(error)
  }
}

const manageLockedTarget = (actor, target) => {
  if (actor?.enabled !== true) fail('permission-denied', '利用可能な管理者アカウントを確認できません。')
  if (!target || target.role !== targetRoleFor(actor.role)) fail('not-found', '管理可能な担当者アカウントが見つかりません。')
}
const staffMutation = async (auth, firestore, input, actorUid, kind, desired) => {
  const uid = requiredText(input?.uid, '担当者アカウントを指定してください。')
  if (uid.includes('/')) fail('invalid-argument', '担当者アカウントを指定してください。')
  try { await mutateAccount(auth, firestore, { uid, targetPath: `staffAccounts/${uid}`, actorUid, authorize: manageLockedTarget, kind, desired }) }
  catch (error) {
    if (error instanceof AccountMutationError) fail(error.code, error.message)
    if (error instanceof StaffAccountError) throw error
    authFailure(error)
  }
  return { uid, ...desired }
}
export async function updateStaffAccountOperation(auth, firestore, input, actorUid) {
  return staffMutation(auth, firestore, input, actorUid, 'profile', { email: email(input?.email), displayName: requiredText(input?.displayName, '表示名を入力してください。') })
}
export async function setStaffAccountEnabledOperation(auth, firestore, input, actorUid) {
  if (typeof input?.enabled !== 'boolean') fail('invalid-argument', '有効状態が不正です。')
  return staffMutation(auth, firestore, input, actorUid, 'enabled', { enabled: input.enabled })
}
