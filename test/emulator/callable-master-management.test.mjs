import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, deleteApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'
import { normalizeMasterFields } from '../../src/domain/master-data.mjs'

const projectId = 'demo-termite-warranty'
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180') throw new Error('Callable tests require the local emulator.')

const adminApp = initializeAdminApp({ projectId }, 'callable-master-management-test')
const adminDb = getFirestore(adminApp)
let webApp; let auth; let functions; let uid

const homeownerFields = (overrides = {}) => ({
  name: 'Synthetic homeowner',
  address: {
    postalCode: '100-0001', prefecture: 'Tokyo', municipality: 'Chiyoda',
    streetTownAndNumber: '1-1', buildingName: null,
  },
  telephone: null, fax: null, notes: null,
  ...overrides,
})
const businessFields = (data) => {
  const { active, revision, createdAt, updatedAt, ...fields } = data
  return fields
}

before(async () => {
  webApp = initializeApp({ projectId, apiKey: 'demo-only-api-key', authDomain: `${projectId}.firebaseapp.com` }, 'callable-master-management-test')
  auth = getAuth(webApp)
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true })
  functions = getFunctions(webApp, 'asia-northeast1')
  connectFunctionsEmulator(functions, '127.0.0.1', 5101)
  const credential = await createUserWithEmailAndPassword(auth, 'callable.master.staff@example.invalid', 'Demo-only-password-123')
  uid = credential.user.uid
})

beforeEach(async () => {
  await adminDb.recursiveDelete(adminDb.collection('homeowners'))
  await adminDb.doc(`staffAccounts/${uid}`).set({ enabled: true, email: 'callable.master.staff@example.invalid' })
})

after(async () => { await signOut(auth); await deleteApp(webApp); await deleteAdminApp(adminApp) })

test('Web Functions SDK accepts the last-write-wins DTO and rejects obsolete expectedRevision', async () => {
  const create = httpsCallable(functions, 'createMaster')
  const update = httpsCallable(functions, 'updateMaster')
  const setActive = httpsCallable(functions, 'setMasterActive')
  const created = (await create({ masterType: 'homeowner', fields: homeownerFields({ name: 'Original' }) })).data
  const updated = (await update({ masterType: 'homeowner', id: created.id, fields: homeownerFields({ name: 'Updated' }) })).data
  assert.deepEqual(updated, { id: created.id, revision: 2 })
  const inactive = (await setActive({ masterType: 'homeowner', id: created.id, active: false })).data
  assert.deepEqual(inactive, { id: created.id, revision: 3 })
  await assert.rejects(
    update({ masterType: 'homeowner', id: created.id, expectedRevision: 3, fields: homeownerFields({ name: 'Rejected' }) }),
    (error) => error?.code === 'functions/invalid-argument',
  )
  const data = (await adminDb.doc(`homeowners/${created.id}`).get()).data()
  assert.equal(data.name, 'Updated')
  assert.equal(data.active, false)
  assert.equal(data.revision, 3)
  const beforeObsoleteLifecycle = { ...data }
  await assert.rejects(
    setActive({ masterType: 'homeowner', id: created.id, expectedRevision: 3, active: true }),
    (error) => error?.code === 'functions/invalid-argument',
  )
  assert.deepEqual((await adminDb.doc(`homeowners/${created.id}`).get()).data(), beforeObsoleteLifecycle)
})

test('Web Functions SDK concurrent full payload updates retain the payload with the higher server revision', async () => {
  const create = httpsCallable(functions, 'createMaster')
  const update = httpsCallable(functions, 'updateMaster')
  const created = (await create({ masterType: 'homeowner', fields: homeownerFields({ name: 'Original' }) })).data
  const firstFields = homeownerFields({ name: ' First ', address: { postalCode: '101-0001', prefecture: 'One', municipality: 'One City', streetTownAndNumber: '1-1', buildingName: 'A' }, telephone: '1', fax: '2', notes: 'first' })
  const secondFields = homeownerFields({ name: ' Second ', address: { postalCode: '102-0002', prefecture: 'Two', municipality: 'Two City', streetTownAndNumber: '2-2', buildingName: 'B' }, telephone: '3', fax: '4', notes: 'second' })
  const [first, second] = await Promise.all([
    update({ masterType: 'homeowner', id: created.id, fields: firstFields }),
    update({ masterType: 'homeowner', id: created.id, fields: secondFields }),
  ])
  assert.deepEqual(new Set([first.data.revision, second.data.revision]), new Set([2, 3]))
  const data = (await adminDb.doc(`homeowners/${created.id}`).get()).data()
  assert.equal(data.revision, 3)
  assert.deepEqual(
    businessFields(data),
    normalizeMasterFields('homeowner', first.data.revision > second.data.revision ? firstFields : secondFields),
  )
})
