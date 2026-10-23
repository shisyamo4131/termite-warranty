import { httpsCallable, seedFixedRuntime } from '../helpers/fixed-runtime.mjs'
import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { deleteApp, initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { LOCAL_RUNTIME, localRuntimeHost, localRuntimeUrl } from '../helpers/emulator-runtime.mjs'

const projectId = 'demo-termite-warranty-test'
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
  contactName: '申請担当者', requestedPeriodYears: 5, notes: '新規申請',
  applicationDate: '2026-09-01', handoverDate: '2026-09-02', warrantyStartDate: '2026-09-03',
  homeownerName: '申請施主', propertyName: '申請物件', buildingAreaSquareMeters: 92.75,
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
  await seedFixedRuntime(adminDb)
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

const snapshotState = async () => {
  const documents = []
  const visit = async collection => {
    const snapshot = await collection.get()
    for (const document of snapshot.docs) {
      documents.push([document.ref.path, document.data()])
      for (const child of await document.ref.listCollections()) await visit(child)
    }
  }
  for (const collection of await adminDb.listCollections()) await visit(collection)
  documents.sort(([a], [b]) => a.localeCompare(b))
  const users = []
  let pageToken
  do {
    const page = await adminAuth.listUsers(1000, pageToken)
    users.push(...page.users.map(user => user.toJSON()))
    pageToken = page.pageToken
  } while (pageToken)
  users.sort((a, b) => a.uid.localeCompare(b.uid))
  return { documents, users }
}

for (const actor of ['administrator', 'company', 'anonymous']) {
  test(`all seven legacy portal Callables reject ${actor} without database or Auth mutations`, async () => {
    if (auth.currentUser) await signOut(auth)
    if (actor !== 'anonymous') await signIn(actor === 'administrator' ? 'portal-admin@example.invalid' : 'portal-company@example.invalid')
    await adminDb.doc('constructionCompanyCaseWorkItems/case-1').set({
      caseId: 'case-1', constructionCompanyId: 'company-1', branchId: 'branch-1',
      kind: 'new_case', status: 'submitted', revision: 1, response: newCaseResponse,
    })
    const commands = [
      ['createConstructionCompanyAccount', { constructionCompanyId: 'company-2', email: 'closed-portal@example.invalid' }],
      ['setConstructionCompanyAccountEnabled', { uid: companyUid, enabled: false }],
      ['createRenewalWorkItem', { caseId: 'case-1' }],
      ['createNewCaseWorkItem', { response: newCaseResponse, submit: true }],
      ['updateCompanyCaseWorkItem', { id: 'case-1', expectedRevision: 1, response: newCaseResponse, submit: true }],
      ['withdrawNewCaseWorkItem', { id: 'case-1', expectedRevision: 1, reason: 'Synthetic withdrawal' }],
      ['reviewCompanyCaseWorkItem', { id: 'case-1', expectedRevision: 1, action: 'approve', branchId: 'branch-1', warrantyServiceId: 'service-5' }],
    ]
    const before = await snapshotState()
    for (const [name, input] of commands) {
      await assert.rejects(call(name, input), error => error?.code === (actor === 'anonymous' ? 'functions/unauthenticated' : 'functions/permission-denied'), name)
      assert.deepEqual(await snapshotState(), before, `${name} changed persisted state`)
    }
  })
}