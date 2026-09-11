import { Timestamp } from 'firebase-admin/firestore'
import { calculateExpiryDate } from '../src/domain/warranty.mjs'

const requiredString = (value, message) => {
  if (typeof value !== 'string' || value.length === 0) throw new Error(message)
  return value
}

const requiredBoolean = (value, message) => {
  if (typeof value !== 'boolean') throw new Error(message)
  return value
}

const canonicalDate = (value, message) => {
  const text = requiredString(value, message)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) throw new Error(message)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(message)
  }
  return text
}

export async function registerCaseTransaction(firestore, input, actorUid) {
  requiredString(actorUid, '利用可能なスタッフアカウントを確認できません。')
  const propertyId = requiredString(input?.propertyId, '有効な物件を選択してください。')
  const homeownerId = requiredString(input?.homeownerId, '有効な施主を選択してください。')
  const constructionCompanyId = requiredString(input?.constructionCompanyId, '有効な工務店を選択してください。')
  const homeownerOverridden = requiredBoolean(input?.homeownerOverridden, '施主の選択状態が不正です。')
  const constructionCompanyOverridden = requiredBoolean(input?.constructionCompanyOverridden, '工務店の選択状態が不正です。')
  const branchId = requiredString(input?.branchId, '有効な担当支店を選択してください。')
  const applicationDate = canonicalDate(input?.applicationDate, '申込日を正しい日付で入力してください。')
  const handoverDate = canonicalDate(input?.handoverDate, '引渡日を正しい日付で入力してください。')
  const warrantyServiceId = requiredString(input?.warrantyServiceId, '有効な保証サービスを選択してください。')
  const startDate = requiredString(input?.startDate, '保証開始日を入力してください。')
  const caseRef = firestore.collection('cases').doc()
  const warrantyRef = caseRef.collection('appliedWarranties').doc()
  const counterRef = firestore.doc('systemCounters/caseNumber')

  return firestore.runTransaction(async (transaction) => {
    const staffRef = firestore.doc(`staffAccounts/${actorUid}`)
    const propertyRef = firestore.doc(`properties/${propertyId}`)
    const branchRef = firestore.doc(`branches/${branchId}`)
    const serviceRef = firestore.doc(`warrantyServices/${warrantyServiceId}`)
    const [staffSnapshot, counterSnapshot, propertySnapshot, branchSnapshot, serviceSnapshot] = await transaction.getAll(
      staffRef, counterRef, propertyRef, branchRef, serviceRef,
    )
    const property = propertySnapshot.data()
    const service = serviceSnapshot.data()
    const nextValue = Number(counterSnapshot.data()?.nextValue)
    const periodYears = Number(service?.defaultPeriodYears)

    if (!staffSnapshot.exists || staffSnapshot.data()?.enabled !== true) {
      const error = new Error('利用可能なスタッフアカウントを確認できません。')
      error.code = 'permission-denied'
      throw error
    }
    if (!counterSnapshot.exists) throw new Error('案件番号カウンターがありません。')
    if (!Number.isInteger(nextValue) || nextValue < 1 || nextValue > 999_999) throw new Error('案件番号カウンターが不正です。')
    if (!propertySnapshot.exists || property?.active !== true) throw new Error('有効な物件を選択してください。')
    if (!property.homeownerId || !property.constructionCompanyId) throw new Error('物件の参照情報が不足しています。')
    if (!branchSnapshot.exists || branchSnapshot.data()?.active !== true) throw new Error('有効な担当支店を選択してください。')
    if (!serviceSnapshot.exists || service?.active !== true) throw new Error('有効な保証サービスを選択してください。')
    if (!Number.isInteger(periodYears) || periodYears < 1) throw new Error('保証期間が不正です。')

    const defaultCompanyRef = firestore.doc(`constructionCompanies/${property.constructionCompanyId}`)
    const defaultHomeownerRef = firestore.doc(`homeowners/${property.homeownerId}`)
    const effectiveCompanyId = constructionCompanyOverridden ? constructionCompanyId : property.constructionCompanyId
    const effectiveHomeownerId = homeownerOverridden ? homeownerId : property.homeownerId
    const selectedCompanyRef = firestore.doc(`constructionCompanies/${effectiveCompanyId}`)
    const selectedHomeownerRef = firestore.doc(`homeowners/${effectiveHomeownerId}`)
    const refsByPath = new Map([
      defaultCompanyRef, defaultHomeownerRef, selectedCompanyRef, selectedHomeownerRef,
    ].map((reference) => [reference.path, reference]))
    const referenceSnapshots = await transaction.getAll(...refsByPath.values())
    const snapshotsByPath = new Map(referenceSnapshots.map((snapshot) => [snapshot.ref.path, snapshot]))
    const defaultCompany = snapshotsByPath.get(defaultCompanyRef.path)
    const defaultHomeowner = snapshotsByPath.get(defaultHomeownerRef.path)
    const selectedCompany = snapshotsByPath.get(selectedCompanyRef.path)
    const selectedHomeowner = snapshotsByPath.get(selectedHomeownerRef.path)
    if (!defaultCompany?.exists || defaultCompany.data()?.active !== true) throw new Error('物件の工務店が無効です。')
    if (!defaultHomeowner?.exists || defaultHomeowner.data()?.active !== true) throw new Error('物件の施主が無効です。')
    if (!selectedCompany?.exists || selectedCompany.data()?.active !== true) throw new Error('有効な工務店を選択してください。')
    if (!selectedHomeowner?.exists || selectedHomeowner.data()?.active !== true) throw new Error('有効な施主を選択してください。')

    const caseNumber = String(nextValue).padStart(6, '0')
    const reservationRef = firestore.doc(`caseNumberReservations/${caseNumber}`)
    const reservationSnapshot = await transaction.get(reservationRef)
    if (reservationSnapshot.exists) throw new Error('案件番号はすでに予約されています。')

    const timestamp = Timestamp.now()
    transaction.update(counterRef, { nextValue: nextValue + 1, lastCaseId: caseRef.id })
    transaction.create(reservationRef, { caseId: caseRef.id })
    transaction.create(caseRef, {
      caseNumber,
      sequenceValue: nextValue,
      homeownerId: effectiveHomeownerId,
      propertyId,
      constructionCompanyId: effectiveCompanyId,
      responsibleBranchId: branchId,
      applicationDate,
      handoverDate,
      status: 'active',
      statusReason: null,
      registrationWarrantyId: warrantyRef.id,
      registeredAt: timestamp,
      updatedAt: timestamp,
    })
    transaction.create(warrantyRef, {
      warrantyServiceId,
      periodYears,
      startDate,
      expiryDate: calculateExpiryDate(startDate, periodYears),
      notificationStatus: 'not notified',
      status: 'active',
      statusReason: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return { id: caseRef.id, caseNumber }
  })
}
