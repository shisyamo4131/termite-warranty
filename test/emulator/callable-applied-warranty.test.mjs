import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { initializeApp, deleteApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'
import { LOCAL_RUNTIME, localRuntimeHost, localRuntimeUrl } from '../../src/config/local-emulator.mjs'

const projectId = 'demo-termite-warranty'
if (process.env.FIRESTORE_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.firestorePort)) throw new Error('Callable tests require the local emulator.')
const adminApp = initializeAdminApp({ projectId }, 'callable-applied-warranty-test')
const adminDb = getFirestore(adminApp)
let webApp; let auth; let functions; let uid
const email = 'callable.staff@example.invalid'
const password = 'Demo-only-password-123'
const dto = (timestamp) => ({ seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds })

before(async () => {
  webApp = initializeApp({ projectId, apiKey: 'demo-only-api-key', authDomain: `${projectId}.firebaseapp.com` }, 'callable-applied-warranty-test')
  auth = getAuth(webApp)
  connectAuthEmulator(auth, localRuntimeUrl(LOCAL_RUNTIME.authPort), { disableWarnings: true })
  functions = getFunctions(webApp, 'asia-northeast1')
  connectFunctionsEmulator(functions, LOCAL_RUNTIME.host, LOCAL_RUNTIME.functionsPort)
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  uid = credential.user.uid
})
beforeEach(async () => {
  if (!auth.currentUser) await signInWithEmailAndPassword(auth, email, password)
  await adminDb.recursiveDelete(adminDb.collection('cases'))
  await adminDb.recursiveDelete(adminDb.collection('warrantyServices'))
  await adminDb.doc(`staffAccounts/${uid}`).set({ enabled: true, email })
  const baseline = Timestamp.fromMillis(1_700_000_000_000)
  await adminDb.doc('cases/case-1').set({ status: 'active', updatedAt: baseline })
  await adminDb.doc('cases/case-1/appliedWarranties/retained').set({ status: 'cancelled', expiryDate: '2030-12-31' })
  await adminDb.doc('warrantyServices/service-1').set({ active: true, defaultPeriodYears: 5 })
})
after(async () => { if (auth.currentUser) await signOut(auth); await deleteApp(webApp); await deleteAdminApp(adminApp) })

test('applied-warranty callable wrapper maps representative authentication and operation errors without mutation', async () => {
  const add = httpsCallable(functions, 'addAppliedWarranty')
  const baseline = (await adminDb.doc('cases/case-1').get()).data().updatedAt
  const valid = { caseId: 'case-1', warrantyServiceId: 'service-1', expectedCaseUpdatedAt: dto(baseline) }

  await signOut(auth)
  await assert.rejects(add(valid), error => error?.code === 'functions/unauthenticated')
  await signInWithEmailAndPassword(auth, email, password)

  await adminDb.doc(`staffAccounts/${uid}`).update({ enabled: false })
  await assert.rejects(add(valid), error => error?.code === 'functions/permission-denied')
  await adminDb.doc(`staffAccounts/${uid}`).update({ enabled: true })

  await assert.rejects(add({}), error => error?.code === 'functions/invalid-argument')
  await assert.rejects(
    add({ ...valid, caseId: 'missing' }),
    error => error?.code === 'functions/not-found',
  )
  assert.equal((await adminDb.collection('cases/case-1/appliedWarranties').get()).size, 1)
  assert.equal((await adminDb.doc('cases/case-1').get()).data().updatedAt.isEqual(baseline), true)
})

test('Web Functions SDK callable DTO adds, edits, rejects stale baseline, and leaves rejected mutation atomic', async () => {
  const add = httpsCallable(functions, 'addAppliedWarranty')
  const update = httpsCallable(functions, 'updateAppliedWarranty')
  const initial = (await adminDb.doc('cases/case-1').get()).data()
  const added = (await add({ caseId: 'case-1', warrantyServiceId: 'service-1', expectedCaseUpdatedAt: dto(initial.updatedAt) })).data
  assert.equal(added.startDate, '2031-01-01')
  let warranty = (await adminDb.doc(`cases/case-1/appliedWarranties/${added.id}`).get()).data()
  assert.equal(warranty.expiryDate, '2035-12-31')
  const afterAdd = (await adminDb.doc('cases/case-1').get()).data()

  await update({ caseId: 'case-1', warrantyId: added.id, expectedCaseUpdatedAt: dto(afterAdd.updatedAt), startDate: '2031-01-02', expiryDate: '2036-01-01', notificationStatus: 'notified', status: 'active', statusReason: null })
  warranty = (await adminDb.doc(`cases/case-1/appliedWarranties/${added.id}`).get()).data()
  assert.equal(warranty.startDate, '2031-01-02')
  assert.equal(warranty.expiryDate, '2036-01-01')
  assert.equal(warranty.notificationStatus, 'notified')

  const beforeRejectedCase = (await adminDb.doc('cases/case-1').get()).data()
  const beforeRejectedWarranties = await adminDb.collection('cases/case-1/appliedWarranties').get()
  await assert.rejects(add({ caseId: 'case-1', warrantyServiceId: 'service-1', expectedCaseUpdatedAt: dto(initial.updatedAt) }), error => error?.code === 'functions/aborted')
  const afterRejectedCase = (await adminDb.doc('cases/case-1').get()).data()
  const afterRejectedWarranties = await adminDb.collection('cases/case-1/appliedWarranties').get()
  assert.equal(afterRejectedCase.updatedAt.isEqual(beforeRejectedCase.updatedAt), true)
  assert.equal(afterRejectedWarranties.size, beforeRejectedWarranties.size)
})
