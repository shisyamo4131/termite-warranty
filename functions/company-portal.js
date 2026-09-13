import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { calculateExpiryDate } from './domain/warranty.mjs'
import { buildCaseListProjection } from './domain/case-list-projection.mjs'
import { generateSearchTokens } from './domain/search-tokens.mjs'

export class CompanyPortalError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'CompanyPortalError'
    this.code = code
  }
}

const fail = (code, message) => { throw new CompanyPortalError(code, message) }
const nonBlank = value => typeof value === 'string' && /\S/.test(value)
const text = (value, message) => nonBlank(value) ? value.trim() : fail('invalid-argument', message)
const nullableText = value => nonBlank(value) ? value.trim() : null
const canonicalDate = (value, message) => {
  const result = text(value, message)
  try { calculateExpiryDate(result, 1) } catch { fail('invalid-argument', message) }
  return result
}
const email = (value, message) => {
  const result = text(value, message).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail('invalid-argument', message)
  return result
}
const requestedPeriod = value => {
  const period = Number(value)
  if (![5, 10].includes(period)) fail('invalid-argument', '保証期間は5年または10年を選択してください。')
  return period
}
const requiredRevision = value => {
  if (!Number.isSafeInteger(value) || value < 1) fail('invalid-argument', '更新番号が不正です。')
  return value
}
const address = value => ({
  postalCode: text(value?.postalCode, '郵便番号を入力してください。').replace(/-/g, ''),
  prefecture: text(value?.prefecture, '都道府県を入力してください。'),
  municipality: text(value?.municipality, '市区町村を入力してください。'),
  streetTownAndNumber: text(value?.streetTownAndNumber, '町名番地を入力してください。'),
  buildingName: nullableText(value?.buildingName),
})
const validateAddress = value => {
  const result = address(value)
  if (!/^\d{7}$/.test(result.postalCode)) fail('invalid-argument', '郵便番号は7桁で入力してください。')
  return result
}
const searchFields = name => {
  const tokens = generateSearchTokens(name)
  return {
    normalized: tokens.normalized,
    one: Object.fromEntries(tokens.oneCharacter.map(token => [token, true])),
    two: Object.fromEntries(tokens.twoCharacter.map(token => [token, true])),
  }
}

const assertStaff = async (firestore, uid, adminOnly = false) => {
  if (!nonBlank(uid)) fail('permission-denied', '利用可能なスタッフアカウントを確認できません。')
  const snapshot = await firestore.doc(`staffAccounts/${uid}`).get()
  const account = snapshot.data()
  if (!snapshot.exists || account?.enabled !== true) fail('permission-denied', '利用可能なスタッフアカウントを確認できません。')
  if (adminOnly && !['developer_superuser', 'house_solution_administrator'].includes(account.role)) {
    fail('permission-denied', '管理者のみが工務店アカウントを管理できます。')
  }
  return account
}

const assertCompanyAccount = async (firestore, uid) => {
  if (!nonBlank(uid)) fail('permission-denied', '利用可能な工務店アカウントを確認できません。')
  const snapshot = await firestore.doc(`constructionCompanyAccounts/${uid}`).get()
  const account = snapshot.data()
  if (!snapshot.exists || account?.enabled !== true || !nonBlank(account.constructionCompanyId)) {
    fail('permission-denied', '利用可能な工務店アカウントを確認できません。')
  }
  return { uid, ...account }
}

const validateResponse = (kind, value) => {
  const common = {
    contactName: text(value?.contactName, '今回の担当者名を入力してください。'),
    contactEmail: email(value?.contactEmail, '連絡先メールアドレスを正しく入力してください。'),
    requestedPeriodYears: requestedPeriod(value?.requestedPeriodYears),
    notes: nullableText(value?.notes),
  }
  if (kind === 'renewal') {
    const renewalDecision = value?.renewalDecision
    if (!['renew', 'decline'].includes(renewalDecision)) fail('invalid-argument', '更改するかどうかを選択してください。')
    return {
      ...common,
      renewalDecision,
      warrantyStartDate: renewalDecision === 'renew'
        ? canonicalDate(value?.warrantyStartDate, '保証開始日を正しく入力してください。')
        : null,
    }
  }
  if (kind !== 'new_case') fail('failed-precondition', '申請種別が不正です。')
  return {
    ...common,
    applicationDate: canonicalDate(value?.applicationDate, '申込日を正しく入力してください。'),
    handoverDate: canonicalDate(value?.handoverDate, '引渡日を正しく入力してください。'),
    warrantyStartDate: canonicalDate(value?.warrantyStartDate, '保証開始日を正しく入力してください。'),
    homeownerName: text(value?.homeownerName, '施主名を入力してください。'),
    propertyName: text(value?.propertyName, '物件名を入力してください。'),
    propertyAddress: validateAddress(value?.propertyAddress),
  }
}

const queueNotification = (transaction, firestore, { audience, recipientEmail = null, template, workItemId }) => {
  const ref = firestore.collection('notificationOutbox').doc()
  transaction.create(ref, {
    audience,
    recipientEmail,
    template,
    workItemId,
    status: 'queued',
    createdAt: FieldValue.serverTimestamp(),
  })
}

export async function createConstructionCompanyAccountOperation(auth, firestore, input, actorUid) {
  await assertStaff(firestore, actorUid, true)
  const constructionCompanyId = text(input?.constructionCompanyId, '工務店を選択してください。')
  const accountEmail = email(input?.email, 'メールアドレスを正しく入力してください。')
  const company = await firestore.doc(`constructionCompanies/${constructionCompanyId}`).get()
  if (!company.exists || company.data()?.active !== true) fail('failed-precondition', '有効な工務店を選択してください。')

  let user
  try {
    user = await auth.createUser({ email: accountEmail, displayName: company.data().name, disabled: false })
    const now = Timestamp.now()
    await firestore.runTransaction(async transaction => {
      const bindingRef = firestore.doc(`constructionCompanyAccountBindings/${constructionCompanyId}`)
      if ((await transaction.get(bindingRef)).exists) fail('already-exists', 'この工務店にはすでにアカウントがあります。')
      transaction.create(bindingRef, { uid: user.uid })
      transaction.create(firestore.doc(`constructionCompanyAccounts/${user.uid}`), {
        constructionCompanyId,
        companyName: company.data().name,
        email: accountEmail,
        role: 'construction_company',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })
    })
    return { uid: user.uid }
  } catch (error) {
    if (user?.uid) await auth.deleteUser(user.uid).catch(() => {})
    if (error instanceof CompanyPortalError) throw error
    if (error?.code === 'auth/email-already-exists') fail('already-exists', 'このメールアドレスはすでに使用されています。')
    fail('internal', '工務店アカウントを発行できませんでした。')
  }
}

export async function setConstructionCompanyAccountEnabledOperation(auth, firestore, input, actorUid) {
  await assertStaff(firestore, actorUid, true)
  const uid = text(input?.uid, '工務店アカウントを指定してください。')
  if (typeof input?.enabled !== 'boolean') fail('invalid-argument', '有効状態が不正です。')
  const ref = firestore.doc(`constructionCompanyAccounts/${uid}`)
  const snapshot = await ref.get()
  if (!snapshot.exists) fail('not-found', '工務店アカウントが見つかりません。')
  if (!input.enabled) {
    await ref.update({ enabled: false, updatedAt: FieldValue.serverTimestamp() })
    await auth.updateUser(uid, { disabled: true })
    await auth.revokeRefreshTokens(uid)
  } else {
    await auth.updateUser(uid, { disabled: false })
    await ref.update({ enabled: true, updatedAt: FieldValue.serverTimestamp() })
  }
  return { uid, enabled: input.enabled }
}

export async function createRenewalWorkItemOperation(firestore, input, actorUid) {
  await assertStaff(firestore, actorUid)
  const caseId = text(input?.caseId, '案件を選択してください。')
  const caseRef = firestore.doc(`cases/${caseId}`)
  const workItemRef = firestore.doc(`constructionCompanyCaseWorkItems/${caseId}`)
  return firestore.runTransaction(async transaction => {
    const [caseSnapshot, workItemSnapshot] = await Promise.all([
      transaction.get(caseRef),
      transaction.get(workItemRef),
    ])
    const caseData = caseSnapshot.data()
    if (!caseSnapshot.exists || caseData?.status !== 'active') fail('failed-precondition', '有効な案件を選択してください。')
    if (workItemSnapshot.exists) fail('already-exists', 'この案件にはすでに工務店対応データがあります。')
    const accountQuery = firestore.collection('constructionCompanyAccounts')
      .where('constructionCompanyId', '==', caseData.constructionCompanyId).where('enabled', '==', true).limit(1)
    const [accountSnapshot, propertySnapshot, homeownerSnapshot] = await Promise.all([
      transaction.get(accountQuery),
      transaction.get(firestore.doc(`properties/${caseData.propertyId}`)),
      transaction.get(firestore.doc(`homeowners/${caseData.homeownerId}`)),
    ])
    if (accountSnapshot.empty) fail('failed-precondition', '対象工務店の有効なアカウントがありません。')
    const account = accountSnapshot.docs[0].data()
    const expiries = Array.isArray(caseData.listProjection?.appliedWarranties)
      ? caseData.listProjection.appliedWarranties.map(item => item.expiryDate).filter(nonBlank).sort()
      : []
    transaction.create(workItemRef, {
      caseId,
      kind: 'renewal',
      constructionCompanyId: caseData.constructionCompanyId,
      caseNumber: caseData.caseNumber,
      propertyName: propertySnapshot.data()?.name ?? '',
      homeownerName: homeownerSnapshot.data()?.name ?? '',
      currentExpiryDate: expiries.at(-1) ?? null,
      status: 'awaiting_response',
      response: null,
      reviewComment: null,
      revision: 1,
      submittedAt: null,
      approvedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    queueNotification(transaction, firestore, {
      audience: 'construction_company', recipientEmail: account.email,
      template: 'renewal_request_created', workItemId: caseId,
    })
    return { id: caseId }
  })
}

export async function createNewCaseWorkItemOperation(firestore, input, actorUid) {
  const account = await assertCompanyAccount(firestore, actorUid)
  const response = validateResponse('new_case', input?.response)
  const submit = input?.submit === true
  const ref = firestore.collection('constructionCompanyCaseWorkItems').doc()
  return firestore.runTransaction(async transaction => {
    transaction.create(ref, {
      caseId: ref.id,
      kind: 'new_case',
      constructionCompanyId: account.constructionCompanyId,
      caseNumber: null,
      propertyName: response.propertyName,
      homeownerName: response.homeownerName,
      currentExpiryDate: null,
      status: submit ? 'submitted' : 'draft',
      response,
      reviewComment: null,
      revision: 1,
      submittedAt: submit ? FieldValue.serverTimestamp() : null,
      approvedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    if (submit) queueNotification(transaction, firestore, {
      audience: 'house_solution', template: 'new_case_submitted', workItemId: ref.id,
    })
    return { id: ref.id }
  })
}

export async function updateCompanyCaseWorkItemOperation(firestore, input, actorUid) {
  const account = await assertCompanyAccount(firestore, actorUid)
  const id = text(input?.id, '対象データを指定してください。')
  const expectedRevision = requiredRevision(input?.expectedRevision)
  const submit = input?.submit === true
  const ref = firestore.doc(`constructionCompanyCaseWorkItems/${id}`)
  return firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref)
    const current = snapshot.data()
    if (!snapshot.exists || current?.constructionCompanyId !== account.constructionCompanyId) fail('not-found', '対象データが見つかりません。')
    if (!['awaiting_response', 'draft', 'needs_correction'].includes(current.status)) fail('failed-precondition', '現在の状態では更新できません。')
    if (current.revision !== expectedRevision) fail('aborted', 'データが更新されています。最新の内容を確認してください。')
    const response = validateResponse(current.kind, input?.response)
    transaction.update(ref, {
      response,
      propertyName: current.kind === 'new_case' ? response.propertyName : current.propertyName,
      homeownerName: current.kind === 'new_case' ? response.homeownerName : current.homeownerName,
      status: submit ? 'submitted' : 'draft',
      reviewComment: submit ? null : current.reviewComment,
      submittedAt: submit ? FieldValue.serverTimestamp() : current.submittedAt,
      revision: current.revision + 1,
      updatedAt: FieldValue.serverTimestamp(),
    })
    if (submit) queueNotification(transaction, firestore, {
      audience: 'house_solution', template: 'company_response_submitted', workItemId: id,
    })
    return { id, status: submit ? 'submitted' : 'draft' }
  })
}

export async function reviewCompanyCaseWorkItemOperation(firestore, input, actorUid) {
  await assertStaff(firestore, actorUid)
  const id = text(input?.id, '対象データを指定してください。')
  const expectedRevision = requiredRevision(input?.expectedRevision)
  const action = input?.action
  if (!['approve', 'return'].includes(action)) fail('invalid-argument', '確認結果が不正です。')
  const ref = firestore.doc(`constructionCompanyCaseWorkItems/${id}`)
  return firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref)
    const workItem = snapshot.data()
    if (!snapshot.exists || workItem?.status !== 'submitted') fail('failed-precondition', '提出済みデータではありません。')
    if (workItem.revision !== expectedRevision) fail('aborted', 'データが更新されています。最新の内容を確認してください。')
    const accountQuery = firestore.collection('constructionCompanyAccounts')
      .where('constructionCompanyId', '==', workItem.constructionCompanyId).where('enabled', '==', true).limit(1)
    const accountSnapshot = await transaction.get(accountQuery)
    const recipientEmail = accountSnapshot.empty ? null : accountSnapshot.docs[0].data().email

    if (action === 'return') {
      const reviewComment = text(input?.reviewComment, '差戻し理由を入力してください。')
      transaction.update(ref, {
        status: 'needs_correction', reviewComment,
        revision: workItem.revision + 1, updatedAt: FieldValue.serverTimestamp(),
      })
      queueNotification(transaction, firestore, {
        audience: 'construction_company', recipientEmail,
        template: 'company_response_returned', workItemId: id,
      })
      return { id, status: 'needs_correction' }
    }

    const response = workItem.response
    if (workItem.kind === 'renewal' && response?.renewalDecision === 'decline') {
      transaction.update(ref, {
        status: 'approved', reviewComment: nullableText(input?.reviewComment), approvedAt: FieldValue.serverTimestamp(),
        revision: workItem.revision + 1, updatedAt: FieldValue.serverTimestamp(),
      })
      queueNotification(transaction, firestore, {
        audience: 'construction_company', recipientEmail,
        template: 'company_response_approved', workItemId: id,
      })
      return { id, status: 'approved', caseNumber: workItem.caseNumber }
    }

    const warrantyServiceId = text(input?.warrantyServiceId, '保証サービスを選択してください。')
    const serviceRef = firestore.doc(`warrantyServices/${warrantyServiceId}`)
    if (workItem.kind === 'renewal') {
      const caseRef = firestore.doc(`cases/${workItem.caseId}`)
      const [caseSnapshot, serviceSnapshot, existing] = await Promise.all([
        transaction.get(caseRef), transaction.get(serviceRef), transaction.get(caseRef.collection('appliedWarranties')),
      ])
      const service = serviceSnapshot.data()
      if (!caseSnapshot.exists || caseSnapshot.data()?.status !== 'active') fail('failed-precondition', '対象案件を更新できません。')
      if (!serviceSnapshot.exists || service?.active !== true || service.defaultPeriodYears !== response.requestedPeriodYears) {
        fail('failed-precondition', '希望保証期間と一致する有効な保証サービスを選択してください。')
      }
      const warrantyRef = caseRef.collection('appliedWarranties').doc()
      const startDate = canonicalDate(response.warrantyStartDate, '保証開始日を正しく入力してください。')
      const expiryDate = calculateExpiryDate(startDate, service.defaultPeriodYears)
      const createdWarranty = {
        warrantyServiceId, periodYears: service.defaultPeriodYears, startDate, expiryDate,
        notificationStatus: 'not notified', status: 'active', statusReason: null,
      }
      transaction.create(warrantyRef, { ...createdWarranty, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
      transaction.update(caseRef, {
        listProjection: buildCaseListProjection([
          ...existing.docs.map(item => ({ id: item.id, ...item.data() })),
          { id: warrantyRef.id, ...createdWarranty },
        ]),
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else {
      const branchId = text(input?.branchId, '担当支店を選択してください。')
      const caseRef = firestore.doc(`cases/${workItem.caseId}`)
      const counterRef = firestore.doc('systemCounters/caseNumber')
      const companyRef = firestore.doc(`constructionCompanies/${workItem.constructionCompanyId}`)
      const [caseSnapshot, counterSnapshot, companySnapshot, branchSnapshot, serviceSnapshot] = await Promise.all([
        transaction.get(caseRef), transaction.get(counterRef), transaction.get(companyRef),
        transaction.get(firestore.doc(`branches/${branchId}`)), transaction.get(serviceRef),
      ])
      if (caseSnapshot.exists) fail('already-exists', 'この申請はすでに案件へ反映されています。')
      if (!companySnapshot.exists || companySnapshot.data()?.active !== true) fail('failed-precondition', '工務店が無効です。')
      if (!branchSnapshot.exists || branchSnapshot.data()?.active !== true) fail('failed-precondition', '有効な担当支店を選択してください。')
      const service = serviceSnapshot.data()
      if (!serviceSnapshot.exists || service?.active !== true || service.defaultPeriodYears !== response.requestedPeriodYears) {
        fail('failed-precondition', '希望保証期間と一致する有効な保証サービスを選択してください。')
      }
      const nextValue = counterSnapshot.exists ? Number(counterSnapshot.data()?.nextValue) : 1
      if (!Number.isInteger(nextValue) || nextValue < 1 || nextValue > 999999) fail('failed-precondition', '案件番号カウンターが不正です。')
      const caseNumber = String(nextValue).padStart(6, '0')
      const reservationRef = firestore.doc(`caseNumberReservations/${caseNumber}`)
      if ((await transaction.get(reservationRef)).exists) fail('already-exists', '案件番号はすでに予約されています。')
      const homeownerRef = firestore.collection('homeowners').doc()
      const propertyRef = firestore.collection('properties').doc()
      const warrantyRef = caseRef.collection('appliedWarranties').doc()
      const now = Timestamp.now()
      const expiryDate = calculateExpiryDate(response.warrantyStartDate, service.defaultPeriodYears)
      const warranty = {
        warrantyServiceId, periodYears: service.defaultPeriodYears,
        startDate: response.warrantyStartDate, expiryDate,
        notificationStatus: 'not notified', status: 'active', statusReason: null,
      }
      transaction.create(homeownerRef, {
        name: response.homeownerName, address: response.propertyAddress,
        telephone: null, fax: null, notes: null, active: true,
        nameSearch: searchFields(response.homeownerName), revision: 1, createdAt: now, updatedAt: now,
      })
      transaction.create(propertyRef, {
        name: response.propertyName, homeownerId: homeownerRef.id,
        constructionCompanyId: workItem.constructionCompanyId, address: response.propertyAddress,
        active: true, nameSearch: searchFields(response.propertyName), revision: 1, createdAt: now, updatedAt: now,
      })
      transaction.set(counterRef, { nextValue: nextValue + 1, lastCaseId: caseRef.id }, { merge: true })
      transaction.create(reservationRef, { caseId: caseRef.id })
      transaction.create(caseRef, {
        caseNumber, sequenceValue: nextValue, propertyId: propertyRef.id, homeownerId: homeownerRef.id,
        constructionCompanyId: workItem.constructionCompanyId, responsibleBranchId: branchId,
        applicationDate: response.applicationDate, handoverDate: response.handoverDate,
        status: 'active', statusReason: null, registrationWarrantyId: warrantyRef.id,
        listProjection: buildCaseListProjection([{ id: warrantyRef.id, ...warranty }]),
        registeredAt: now, updatedAt: now,
      })
      transaction.create(warrantyRef, { ...warranty, createdAt: now, updatedAt: now })
      transaction.update(ref, { caseNumber })
    }
    transaction.update(ref, {
      status: 'approved', reviewComment: nullableText(input?.reviewComment), approvedAt: FieldValue.serverTimestamp(),
      revision: workItem.revision + 1, updatedAt: FieldValue.serverTimestamp(),
    })
    queueNotification(transaction, firestore, {
      audience: 'construction_company', recipientEmail,
      template: 'company_response_approved', workItemId: id,
    })
    return { id, status: 'approved' }
  })
}
