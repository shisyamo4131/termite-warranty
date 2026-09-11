import { FieldValue } from 'firebase-admin/firestore'
import { calculateExpiryDate, calculateExtensionStartDate } from '../src/domain/warranty.mjs'

export class AppliedWarrantyOperationError extends Error {
  constructor(code, message) { super(message); this.name = 'AppliedWarrantyOperationError'; this.code = code }
}
const fail = (code, message) => { throw new AppliedWarrantyOperationError(code, message) }
const nonBlank = (value) => typeof value === 'string' && /\S/.test(value)
const canonicalDate = (value, message) => {
  if (typeof value !== 'string') fail('invalid-argument', message)
  try { calculateExpiryDate(value, 1) } catch { fail('invalid-argument', message) }
  return value
}
const expectedTimestamp = (value) => value && typeof value.isEqual === 'function'
const assertStaff = async (transaction, firestore, uid) => {
  if (!nonBlank(uid)) fail('permission-denied', '利用可能なスタッフアカウントを確認できません。')
  const staff = await transaction.get(firestore.doc(`staffAccounts/${uid}`))
  if (!staff.exists || staff.data()?.enabled !== true) fail('permission-denied', '利用可能なスタッフアカウントを確認できません。')
}
const assertActiveCase = (snapshot, baseline) => {
  if (!snapshot.exists) fail('not-found', '対象の案件が見つかりません。')
  const value = snapshot.data()
  if (!expectedTimestamp(baseline) || !value.updatedAt?.isEqual?.(baseline)) {
    fail('aborted', '他のユーザーが案件を更新しました。最新データを確認してやり直してください。')
  }
  if (value.status !== 'active') fail('failed-precondition', '取消・無効の案件は編集できません。')
}

export async function addAppliedWarrantyTransaction(firestore, input, actorUid) {
  const caseId = nonBlank(input?.caseId) ? input.caseId : fail('invalid-argument', '対象の案件を指定してください。')
  const warrantyServiceId = nonBlank(input?.warrantyServiceId) ? input.warrantyServiceId : fail('invalid-argument', '有効な保証サービスを選択してください。')
  const ref = firestore.doc(`cases/${caseId}`)
  const warrantyRef = ref.collection('appliedWarranties').doc()
  return firestore.runTransaction(async (transaction) => {
    await assertStaff(transaction, firestore, actorUid)
    const [caseSnapshot, serviceSnapshot, existing] = await Promise.all([
      transaction.get(ref), transaction.get(firestore.doc(`warrantyServices/${warrantyServiceId}`)), transaction.get(ref.collection('appliedWarranties')),
    ])
    assertActiveCase(caseSnapshot, input?.expectedCaseUpdatedAt)
    const service = serviceSnapshot.data(); const periodYears = Number(service?.defaultPeriodYears)
    if (!serviceSnapshot.exists || service?.active !== true) fail('failed-precondition', '有効な保証サービスを選択してください。')
    if (!Number.isInteger(periodYears) || periodYears < 1) fail('failed-precondition', '保証期間が不正です。')
    const expiries = existing.docs.map(item => item.data().expiryDate).filter(value => typeof value === 'string').sort()
    const initialStart = expiries.length ? calculateExtensionStartDate(expiries.at(-1)) : new Date().toISOString().slice(0, 10)
    const startDate = input?.startDate == null || input.startDate === '' ? initialStart : canonicalDate(input.startDate, '保証開始日を正しい日付で入力してください。')
    transaction.create(warrantyRef, { warrantyServiceId, periodYears, startDate, expiryDate: calculateExpiryDate(startDate, periodYears), notificationStatus: 'not notified', status: 'active', statusReason: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
    transaction.update(ref, { updatedAt: FieldValue.serverTimestamp() })
    return { id: warrantyRef.id, startDate }
  })
}

export async function updateAppliedWarrantyTransaction(firestore, input, actorUid) {
  const caseId = nonBlank(input?.caseId) ? input.caseId : fail('invalid-argument', '対象の案件を指定してください。')
  const warrantyId = nonBlank(input?.warrantyId) ? input.warrantyId : fail('invalid-argument', '対象の適用保証が見つかりません。')
  const caseRef = firestore.doc(`cases/${caseId}`); const warrantyRef = caseRef.collection('appliedWarranties').doc(warrantyId)
  return firestore.runTransaction(async (transaction) => {
    await assertStaff(transaction, firestore, actorUid)
    const [caseSnapshot, warrantySnapshot] = await Promise.all([transaction.get(caseRef), transaction.get(warrantyRef)])
    assertActiveCase(caseSnapshot, input?.expectedCaseUpdatedAt)
    if (!warrantySnapshot.exists) fail('not-found', '対象の適用保証が見つかりません。')
    const current = warrantySnapshot.data()
    if (current.status !== 'active') fail('failed-precondition', '取消・無効の適用保証は編集できません。')
    const startDate = canonicalDate(input?.startDate, '保証開始日を正しい日付で入力してください。')
    const periodYears = Number(current.periodYears)
    if (!Number.isInteger(periodYears) || periodYears < 1) fail('failed-precondition', '保証期間が不正です。')
    const calculatedExpiry = calculateExpiryDate(startDate, periodYears)
    const expiryDate = input?.expiryDate == null || input.expiryDate === '' ? calculatedExpiry : canonicalDate(input.expiryDate, '満了日を正しい日付で入力してください。')
    const notificationStatus = input?.notificationStatus
    if (!['not notified', 'notified', 'not required'].includes(notificationStatus)) fail('invalid-argument', '通知状態が不正です。')
    const status = input?.status
    if (!['active', 'cancelled', 'invalid'].includes(status)) fail('invalid-argument', '状態が不正です。')
    const statusReason = status === 'active' ? null : (nonBlank(input?.statusReason) ? input.statusReason.trim() : fail('invalid-argument', '取消・無効には理由が必要です。'))
    transaction.update(warrantyRef, { startDate, expiryDate, notificationStatus, status, statusReason, updatedAt: FieldValue.serverTimestamp() })
    transaction.update(caseRef, { updatedAt: FieldValue.serverTimestamp() })
    return { id: warrantyId }
  })
}
