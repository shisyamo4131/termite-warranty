import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { deleteApp, initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'
import { LOCAL_RUNTIME, localRuntimeHost, localRuntimeUrl } from '../../src/config/local-emulator.mjs'

const projectId = 'demo-termite-warranty'
const password = 'Demo-only-password-123'
if (process.env.FIRESTORE_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.firestorePort)) throw new Error('Company portal tests require the local emulator.')

const adminApp = initializeAdminApp({ projectId }, 'company-portal-test')
const adminDb = getFirestore(adminApp)
const adminAuth = getAdminAuth(adminApp)
let webApp
let auth
let functions
let adminUid
let companyUid

const call = (name, data = {}) => httpsCallable(functions, name)(data).then(result => result.data)
const signIn = email => signInWithEmailAndPassword(auth, email, password)

const newCaseResponse = {
  contactName: '申請担当者', contactEmail: 'contact@example.invalid', requestedPeriodYears: 5, notes: '新規申請',
  applicationDate: '2026-09-01', handoverDate: '2026-09-02', warrantyStartDate: '2026-09-03',
  homeownerName: '申請施主', propertyName: '申請物件',
  propertyAddress: { postalCode: '1000001', prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '1-1', buildingName: null },
}

before(async () => {
  webApp = initializeApp({ projectId, apiKey: 'demo-only-api-key', authDomain: `${projectId}.firebaseapp.com` }, 'company-portal-test')
  auth = getAuth(webApp)
  connectAuthEmulator(auth, localRuntimeUrl(LOCAL_RUNTIME.authPort), { disableWarnings: true })
  functions = getFunctions(webApp, 'asia-northeast1')
  connectFunctionsEmulator(functions, LOCAL_RUNTIME.host, LOCAL_RUNTIME.functionsPort)
  adminUid = (await createUserWithEmailAndPassword(auth, 'portal-admin@example.invalid', password)).user.uid
  await signOut(auth)
  companyUid = (await createUserWithEmailAndPassword(auth, 'portal-company@example.invalid', password)).user.uid
  await signOut(auth)
})

beforeEach(async () => {
  for (const collection of [
    'staffAccounts', 'constructionCompanyAccounts', 'constructionCompanyAccountBindings', 'constructionCompanyCaseWorkItems', 'notificationOutbox',
    'cases', 'caseNumberReservations', 'systemCounters', 'branches', 'constructionCompanies', 'homeowners', 'properties', 'warrantyServices',
  ]) await adminDb.recursiveDelete(adminDb.collection(collection))
  const now = Timestamp.fromMillis(1_700_000_000_000)
  await Promise.all([
    adminDb.doc(`staffAccounts/${adminUid}`).set({ email: 'portal-admin@example.invalid', displayName: '管理者', role: 'house_solution_administrator', enabled: true }),
    adminDb.doc(`constructionCompanyAccounts/${companyUid}`).set({
      constructionCompanyId: 'company-1', companyName: '工務店1', email: 'portal-company@example.invalid',
      role: 'construction_company', enabled: true, createdAt: now, updatedAt: now,
    }),
    adminDb.doc('constructionCompanyAccountBindings/company-1').set({ uid: companyUid }),
    adminDb.doc('constructionCompanies/company-1').set({ name: '工務店1', active: true }),
    adminDb.doc('constructionCompanies/company-2').set({ name: '工務店2', active: true }),
    adminDb.doc('homeowners/homeowner-1').set({ name: '施主1', active: true }),
    adminDb.doc('properties/property-1').set({ name: '物件1', homeownerId: 'homeowner-1', constructionCompanyId: 'company-1', active: true }),
    adminDb.doc('branches/branch-1').set({ name: '支店1', active: true }),
    adminDb.doc('warrantyServices/service-5').set({ name: '5年保証', defaultPeriodYears: 5, active: true }),
    adminDb.doc('systemCounters/caseNumber').set({ nextValue: 2, lastCaseId: 'case-1' }),
    adminDb.doc('caseNumberReservations/000001').set({ caseId: 'case-1' }),
    adminDb.doc('cases/case-1').set({
      caseNumber: '000001', sequenceValue: 1, propertyId: 'property-1', homeownerId: 'homeowner-1', constructionCompanyId: 'company-1',
      responsibleBranchId: 'branch-1', applicationDate: '2021-09-01', handoverDate: '2021-09-02', status: 'active', statusReason: null,
      registrationWarrantyId: 'warranty-1', listProjection: { appliedWarranties: [{ id: 'warranty-1', warrantyServiceId: 'service-5', expiryDate: '2026-09-02', notificationStatus: 'not notified', status: 'active' }] },
      registeredAt: now, updatedAt: now,
    }),
    adminDb.doc('cases/case-1/appliedWarranties/warranty-1').set({
      warrantyServiceId: 'service-5', periodYears: 5, startDate: '2021-09-03', expiryDate: '2026-09-02',
      notificationStatus: 'not notified', status: 'active', statusReason: null, createdAt: now, updatedAt: now,
    }),
  ])
})

after(async () => {
  if (auth.currentUser) await signOut(auth)
  await deleteApp(webApp)
  await deleteAdminApp(adminApp)
})

test('administrator issues one account per construction company without setting its password', async () => {
  await signIn('portal-admin@example.invalid')
  const result = await call('createConstructionCompanyAccount', { constructionCompanyId: 'company-2', email: 'company-2@example.invalid' })
  const user = await adminAuth.getUser(result.uid)
  assert.equal(user.email, 'company-2@example.invalid')
  assert.equal(user.passwordHash, undefined)
  assert.equal((await adminDb.doc(`constructionCompanyAccounts/${result.uid}`).get()).data()?.constructionCompanyId, 'company-2')
  await assert.rejects(
    call('createConstructionCompanyAccount', { constructionCompanyId: 'company-2', email: 'other@example.invalid' }),
    error => error?.code === 'functions/already-exists',
  )
})

test('renewal task stays one-to-one with its case and approval adds the selected warranty atomically', async () => {
  await signIn('portal-admin@example.invalid')
  await call('createRenewalWorkItem', { caseId: 'case-1' })
  await assert.rejects(call('createRenewalWorkItem', { caseId: 'case-1' }), error => error?.code === 'functions/already-exists')
  await signOut(auth)

  await signIn('portal-company@example.invalid')
  await call('updateCompanyCaseWorkItem', {
    id: 'case-1', expectedRevision: 1, submit: true,
    response: {
      contactName: '更改担当者', contactEmail: 'renewal@example.invalid', requestedPeriodYears: 5,
      renewalDecision: 'renew', warrantyStartDate: '2026-09-03', notes: null,
    },
  })
  await signOut(auth)

  await signIn('portal-admin@example.invalid')
  await call('reviewCompanyCaseWorkItem', {
    id: 'case-1', expectedRevision: 2, action: 'approve', warrantyServiceId: 'service-5', reviewComment: '',
  })
  const [workItem, warranties, caseSnapshot] = await Promise.all([
    adminDb.doc('constructionCompanyCaseWorkItems/case-1').get(),
    adminDb.collection('cases/case-1/appliedWarranties').get(),
    adminDb.doc('cases/case-1').get(),
  ])
  assert.equal(workItem.data()?.status, 'approved')
  assert.equal(warranties.size, 2)
  assert.equal(caseSnapshot.data()?.listProjection?.appliedWarranties?.length, 2)
  assert.equal((await adminDb.collection('notificationOutbox').get()).size, 3)
})

test('new-case submission reserves its future case id and approval creates the case and masters', async () => {
  await signIn('portal-company@example.invalid')
  const submitted = await call('createNewCaseWorkItem', { response: newCaseResponse, submit: true })
  const pending = await adminDb.doc(`constructionCompanyCaseWorkItems/${submitted.id}`).get()
  assert.equal(pending.data()?.caseId, submitted.id)
  assert.equal(pending.data()?.status, 'submitted')
  await signOut(auth)

  await signIn('portal-admin@example.invalid')
  await call('reviewCompanyCaseWorkItem', {
    id: submitted.id, expectedRevision: 1, action: 'approve', branchId: 'branch-1', warrantyServiceId: 'service-5',
  })
  const [createdCase, approvedItem] = await Promise.all([
    adminDb.doc(`cases/${submitted.id}`).get(), adminDb.doc(`constructionCompanyCaseWorkItems/${submitted.id}`).get(),
  ])
  assert.equal(createdCase.exists, true)
  assert.equal(createdCase.data()?.constructionCompanyId, 'company-1')
  assert.equal(createdCase.data()?.caseNumber, '000002')
  assert.equal(approvedItem.data()?.status, 'approved')
  assert.equal(approvedItem.data()?.caseNumber, '000002')
})

test('a construction-company account cannot update another company work item', async () => {
  await adminDb.doc('constructionCompanyCaseWorkItems/other-company-case').set({
    caseId: 'other-company-case', kind: 'renewal', constructionCompanyId: 'company-2', status: 'awaiting_response', revision: 1,
  })
  await signIn('portal-company@example.invalid')
  await assert.rejects(call('updateCompanyCaseWorkItem', {
    id: 'other-company-case', expectedRevision: 1, submit: true,
    response: { contactName: '担当', contactEmail: 'contact@example.invalid', requestedPeriodYears: 5, renewalDecision: 'renew', warrantyStartDate: '2026-09-03', notes: null },
  }), error => error?.code === 'functions/not-found')
})
