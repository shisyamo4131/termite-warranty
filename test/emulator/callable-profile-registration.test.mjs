import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'

const projectId = 'demo-termite-warranty'
const email = 'callable.profile.registration@example.invalid'
const password = 'Demo-only-password-123'
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180') throw new Error('Callable tests require the local emulator.')

const adminApp = initializeAdminApp({ projectId }, 'callable-profile-registration-test')
const adminDb = getFirestore(adminApp)
let webApp
let auth
let functions
let uid

const input = {
  propertyId: 'property-1',
  homeownerId: 'homeowner-1',
  constructionCompanyId: 'company-1',
  homeownerOverridden: false,
  constructionCompanyOverridden: false,
  branchId: 'branch-1',
  applicationDate: '2026-09-08',
  handoverDate: '2026-09-09',
  warrantyServiceId: 'service-1',
  startDate: '2026-09-10',
}

const signIn = async () => {
  if (!auth.currentUser) await signInWithEmailAndPassword(auth, email, password)
}

before(async () => {
  webApp = initializeApp({ projectId, apiKey: 'demo-only-api-key', authDomain: `${projectId}.firebaseapp.com` }, 'callable-profile-registration-test')
  auth = getAuth(webApp)
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true })
  functions = getFunctions(webApp, 'asia-northeast1')
  connectFunctionsEmulator(functions, '127.0.0.1', 5101)
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  uid = credential.user.uid
})

beforeEach(async () => {
  await signIn()
  for (const collection of ['cases', 'caseNumberReservations', 'branches', 'constructionCompanies', 'homeowners', 'properties', 'warrantyServices']) {
    await adminDb.recursiveDelete(adminDb.collection(collection))
  }
  await Promise.all([
    adminDb.doc(`staffAccounts/${uid}`).set({ email, displayName: 'Callable staff', role: 'general_staff', enabled: true }),
    adminDb.doc('systemCounters/caseNumber').set({ nextValue: 1, lastCaseId: null }),
    adminDb.doc('branches/branch-1').set({ name: 'Synthetic branch', active: true }),
    adminDb.doc('constructionCompanies/company-1').set({ name: 'Synthetic company', active: true }),
    adminDb.doc('homeowners/homeowner-1').set({ name: 'Synthetic homeowner', active: true }),
    adminDb.doc('properties/property-1').set({
      name: 'Synthetic property', active: true, homeownerId: 'homeowner-1', constructionCompanyId: 'company-1',
    }),
    adminDb.doc('warrantyServices/service-1').set({ name: 'Synthetic warranty', defaultPeriodYears: 5, active: true }),
  ])
})

after(async () => {
  if (auth.currentUser) await signOut(auth)
  await deleteApp(webApp)
  await deleteAdminApp(adminApp)
})

test('profile callable enforces authentication and enabled staff authorization', async () => {
  const getOwnProfile = httpsCallable(functions, 'getOwnProfile')
  assert.deepEqual((await getOwnProfile()).data, {
    uid,
    displayName: 'Callable staff',
    role: 'general_staff',
    enabled: true,
  })

  await adminDb.doc(`staffAccounts/${uid}`).update({ enabled: false })
  await assert.rejects(getOwnProfile(), error => error?.code === 'functions/permission-denied')
  await signOut(auth)
  await assert.rejects(getOwnProfile(), error => error?.code === 'functions/unauthenticated')
})

test('registration callable maps success and creates one atomic case/warranty result', async () => {
  const registerCase = httpsCallable(functions, 'registerCase')
  const result = (await registerCase(input)).data
  assert.equal(result.caseNumber, '000001')
  assert.equal(typeof result.id, 'string')
  const caseSnapshot = await adminDb.doc(`cases/${result.id}`).get()
  const warrantySnapshot = await adminDb.collection(`cases/${result.id}/appliedWarranties`).get()
  assert.equal(caseSnapshot.data()?.caseNumber, '000001')
  assert.equal(warrantySnapshot.size, 1)
  assert.equal((await adminDb.doc('systemCounters/caseNumber').get()).data()?.nextValue, 2)
})

test('registration callable maps authentication, authorization, and validation errors without mutation', async () => {
  const registerCase = httpsCallable(functions, 'registerCase')
  await adminDb.doc(`staffAccounts/${uid}`).update({ enabled: false })
  await assert.rejects(registerCase(input), error => error?.code === 'functions/permission-denied')

  await adminDb.doc(`staffAccounts/${uid}`).update({ enabled: true })
  await assert.rejects(registerCase({ ...input, applicationDate: undefined }), error => error?.code === 'functions/failed-precondition')

  await signOut(auth)
  await assert.rejects(registerCase(input), error => error?.code === 'functions/unauthenticated')

  assert.equal((await adminDb.collection('cases').get()).empty, true)
  assert.equal((await adminDb.collection('caseNumberReservations').get()).empty, true)
  assert.equal((await adminDb.doc('systemCounters/caseNumber').get()).data()?.nextValue, 1)
})
