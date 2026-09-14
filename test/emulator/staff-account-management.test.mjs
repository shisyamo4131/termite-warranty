import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { deleteApp, initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'
import { LOCAL_RUNTIME, localRuntimeHost, localRuntimeUrl } from '../../src/config/local-emulator.mjs'

const projectId = 'demo-termite-warranty'
const password = 'Demo-only-password-123'
if (process.env.FIRESTORE_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.firestorePort)) throw new Error('Staff account tests require the local emulator.')

const adminApp = initializeAdminApp({ projectId }, 'staff-account-management-test')
const adminDb = getFirestore(adminApp)
const adminAuth = getAdminAuth(adminApp)
let webApp
let auth
let functions
const identities = {}
const createdUids = []

const call = (name, data = {}) => httpsCallable(functions, name)(data).then(result => result.data)
const signIn = email => signInWithEmailAndPassword(auth, email, password)

before(async () => {
  webApp = initializeApp({ projectId, apiKey: 'demo-only-api-key', authDomain: `${projectId}.firebaseapp.com` }, 'staff-account-management-test')
  auth = getAuth(webApp)
  connectAuthEmulator(auth, localRuntimeUrl(LOCAL_RUNTIME.authPort), { disableWarnings: true })
  functions = getFunctions(webApp, 'asia-northeast1')
  connectFunctionsEmulator(functions, LOCAL_RUNTIME.host, LOCAL_RUNTIME.functionsPort)
  for (const [name, email] of Object.entries({
    developer: 'staff-developer@example.invalid',
    administrator: 'staff-administrator@example.invalid',
    general: 'staff-general@example.invalid',
  })) {
    identities[name] = (await createUserWithEmailAndPassword(auth, email, password)).user.uid
    await signOut(auth)
  }
})

beforeEach(async () => {
  await adminDb.recursiveDelete(adminDb.collection('staffAccounts'))
  await Promise.all([
    adminDb.doc(`staffAccounts/${identities.developer}`).set({ email: 'staff-developer@example.invalid', displayName: '開発者', role: 'developer_superuser', enabled: true }),
    adminDb.doc(`staffAccounts/${identities.administrator}`).set({ email: 'staff-administrator@example.invalid', displayName: '管理者', role: 'house_solution_administrator', enabled: true }),
    adminDb.doc(`staffAccounts/${identities.general}`).set({ email: 'staff-general@example.invalid', displayName: '一般担当者', role: 'general_staff', enabled: true }),
  ])
})

after(async () => {
  if (auth.currentUser) await signOut(auth)
  await Promise.all(createdUids.map(uid => adminAuth.deleteUser(uid).catch(() => {})))
  await deleteApp(webApp)
  await deleteAdminApp(adminApp)
})

test('House Solution administrator manages only general-staff account lifecycle', async () => {
  await signIn('staff-administrator@example.invalid')
  const created = await call('createStaffAccount', { email: 'created-general@example.invalid', displayName: '作成担当者' })
  createdUids.push(created.uid)
  assert.equal(created.role, 'general_staff')
  assert.equal((await adminAuth.getUser(created.uid)).email, 'created-general@example.invalid')

  const listed = await call('listManageableStaffAccounts')
  assert.equal(listed.targetRole, 'general_staff')
  assert.ok(listed.accounts.some(account => account.uid === created.uid))

  await call('updateStaffAccount', { uid: created.uid, email: 'updated-general@example.invalid', displayName: '更新担当者' })
  assert.equal((await adminAuth.getUser(created.uid)).displayName, '更新担当者')
  assert.equal((await adminDb.doc(`staffAccounts/${created.uid}`).get()).data()?.email, 'updated-general@example.invalid')

  await call('setStaffAccountEnabled', { uid: created.uid, enabled: false })
  assert.equal((await adminAuth.getUser(created.uid)).disabled, true)
  assert.equal((await adminDb.doc(`staffAccounts/${created.uid}`).get()).data()?.enabled, false)
})

test('developer manages administrators while administrator and general staff cannot cross the boundary', async () => {
  await signIn('staff-developer@example.invalid')
  const created = await call('createStaffAccount', { email: 'created-administrator@example.invalid', displayName: '作成管理者' })
  createdUids.push(created.uid)
  assert.equal(created.role, 'house_solution_administrator')
  assert.ok((await call('listManageableStaffAccounts')).accounts.some(account => account.uid === created.uid))
  await signOut(auth)

  await signIn('staff-administrator@example.invalid')
  await assert.rejects(
    call('updateStaffAccount', { uid: created.uid, email: 'forbidden@example.invalid', displayName: '変更不可' }),
    error => error?.code === 'functions/not-found',
  )
  await signOut(auth)

  await signIn('staff-general@example.invalid')
  await assert.rejects(call('listManageableStaffAccounts'), error => error?.code === 'functions/permission-denied')
})
