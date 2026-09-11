import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { initializeApp, deleteApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'

const projectId = 'demo-termite-warranty'
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180') throw new Error('Callable tests require the local emulator.')
const adminApp = initializeAdminApp({ projectId }, 'callable-applied-warranty-test')
const adminDb = getFirestore(adminApp)
let webApp; let auth; let functions; let uid
const dto = (timestamp) => ({ seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds })

before(async () => {
  webApp = initializeApp({ projectId, apiKey: 'demo-only-api-key', authDomain: `${projectId}.firebaseapp.com` }, 'callable-applied-warranty-test')
  auth = getAuth(webApp)
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true })
  functions = getFunctions(webApp, 'asia-northeast1')
  connectFunctionsEmulator(functions, '127.0.0.1', 5101)
  const credential = await createUserWithEmailAndPassword(auth, 'callable.staff@example.invalid', 'Demo-only-password-123')
  uid = credential.user.uid
})
beforeEach(async () => {
  await adminDb.recursiveDelete(adminDb.collection('cases'))
  await adminDb.recursiveDelete(adminDb.collection('warrantyServices'))
  await adminDb.doc(`staffAccounts/${uid}`).set({ enabled: true, email: 'callable.staff@example.invalid' })
  const baseline = Timestamp.fromMillis(1_700_000_000_000)
  await adminDb.doc('cases/case-1').set({ status: 'active', updatedAt: baseline })
  await adminDb.doc('cases/case-1/appliedWarranties/retained').set({ status: 'cancelled', expiryDate: '2030-12-31' })
  await adminDb.doc('warrantyServices/service-1').set({ active: true, defaultPeriodYears: 5 })
})
after(async () => { await signOut(auth); await deleteApp(webApp); await deleteAdminApp(adminApp) })

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
