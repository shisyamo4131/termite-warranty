import { Timestamp } from 'firebase-admin/firestore'
import { calculateExpiryDate } from '../src/domain/warranty.mjs'

const requiredString = (value, message) => {
  if (typeof value !== 'string' || value.length === 0) throw new Error(message)
  return value
}

export async function registerCaseTransaction(firestore, input, actorUid) {
  requiredString(actorUid, '利用可能なスタッフアカウントを確認できません。')
  const propertyId = requiredString(input?.propertyId, '有効な物件を選択してください。')
  const branchId = requiredString(input?.branchId, '有効な担当支店を選択してください。')
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

    const companyRef = firestore.doc(`constructionCompanies/${property.constructionCompanyId}`)
    const homeownerRef = firestore.doc(`homeowners/${property.homeownerId}`)
    const [companySnapshot, homeownerSnapshot] = await transaction.getAll(companyRef, homeownerRef)
    if (!companySnapshot.exists || companySnapshot.data()?.active !== true) throw new Error('物件の工務店が無効です。')
    if (!homeownerSnapshot.exists || homeownerSnapshot.data()?.active !== true) throw new Error('物件の施主が無効です。')

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
      homeownerId: property.homeownerId,
      propertyId,
      constructionCompanyId: property.constructionCompanyId,
      responsibleBranchId: branchId,
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
