import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { LOCAL_RUNTIME, localRuntimeHost } from '../src/config/local-emulator.mjs'

const projectId = 'demo-termite-warranty'
if (process.env.FIRESTORE_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.firestorePort)) {
  throw new Error(`Firestore Rules tests require the dedicated local emulator at ${localRuntimeHost(LOCAL_RUNTIME.firestorePort)}.`)
}

let testEnvironment

const contextFor = (uid) => testEnvironment.authenticatedContext(uid).firestore()

async function seedDocument(path, data) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data)
  })
}

async function seedStaff(uid, enabled = true) {
  await seedDocument(`staffAccounts/${uid}`, {
    email: `${uid}@example.invalid`,
    displayName: `Synthetic ${uid}`,
    role: 'general_staff',
    enabled,
  })
}

async function seedCompanyAccount(uid, constructionCompanyId, enabled = true) {
  await seedDocument(`constructionCompanyAccounts/${uid}`, {
    constructionCompanyId,
    companyName: `Synthetic ${constructionCompanyId}`,
    email: `${uid}@example.invalid`,
    role: 'construction_company',
    enabled,
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  })
}

before(async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: LOCAL_RUNTIME.host,
      port: LOCAL_RUNTIME.firestorePort,
      rules,
    },
  })
})

beforeEach(async () => {
  await testEnvironment.clearFirestore()
})

after(async () => {
  await testEnvironment?.cleanup()
})

describe('staff authentication and enabled-account boundary', () => {
  test('unauthenticated, Authentication-only, and disabled accounts cannot access business data', async () => {
    await seedStaff('disabled-user', false)
    const contexts = [
      testEnvironment.unauthenticatedContext().firestore(),
      contextFor('auth-only'),
      contextFor('disabled-user'),
    ]

    for (const db of contexts) {
      await assertFails(getDoc(doc(db, 'properties', 'property-1')))
      await assertFails(setDoc(doc(db, 'properties', 'property-1'), { any: 'shape' }))
    }
  })

  test('enabled staff can create, read, update, and delete declared business data without schema enforcement', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')
    const paths = [
      'branches/branch-1',
      'constructionCompanies/company-1',
      'homeowners/homeowner-1',
      'properties/property-1',
      'warrantyServices/service-1',
      'cases/case-1',
      'cases/case-1/appliedWarranties/warranty-1',
    ]

    for (const path of paths) {
      const reference = doc(db, path)
      await assertSucceeds(setDoc(reference, { deliberatelyUnsupportedShape: true }))
      await assertSucceeds(getDoc(reference))
      await assertSucceeds(updateDoc(reference, { changedOutsideApplicationFlow: true }))
      await assertSucceeds(deleteDoc(reference))
    }
  })

  test('enabled staff can read only their own staff record and cannot write account records', async () => {
    await seedStaff('enabled-user')
    await seedStaff('other-user')
    const db = contextFor('enabled-user')

    await assertSucceeds(getDoc(doc(db, 'staffAccounts', 'enabled-user')))
    await assertFails(getDoc(doc(db, 'staffAccounts', 'other-user')))
    await assertFails(updateDoc(doc(db, 'staffAccounts', 'enabled-user'), { displayName: 'Changed' }))
    await assertFails(setDoc(doc(db, 'staffAccounts', 'new-user'), { enabled: true }))
  })

  test('enabled staff can run the applied-warranty collection-group query', async () => {
    await seedStaff('enabled-user')
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', {
      warrantyServiceId: 'service-1',
      status: 'active',
    })
    const db = contextFor('enabled-user')

    const result = await assertSucceeds(getDocs(query(
      collectionGroup(db, 'appliedWarranties'),
      where('warrantyServiceId', '==', 'service-1'),
    )))
    assert.equal(result.size, 1)
  })
})

describe('construction-company and server-owned boundaries', () => {
  test('a company account can read only its own profile and work items', async () => {
    await seedCompanyAccount('company-user', 'company-1')
    await seedCompanyAccount('other-company-user', 'company-2')
    await seedDocument('constructionCompanyCaseWorkItems/case-1', { constructionCompanyId: 'company-1' })
    await seedDocument('constructionCompanyCaseWorkItems/case-2', { constructionCompanyId: 'company-2' })
    const db = contextFor('company-user')

    await assertSucceeds(getDoc(doc(db, 'constructionCompanyAccounts', 'company-user')))
    await assertFails(getDoc(doc(db, 'constructionCompanyAccounts', 'other-company-user')))
    await assertSucceeds(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1')))
    await assertFails(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-2')))
    await assertFails(getDoc(doc(db, 'cases', 'case-1')))
    await assertFails(getDoc(doc(db, 'constructionCompanies', 'company-1')))
  })

  test('disabled company accounts lose access and company writes remain Callable-only', async () => {
    await seedCompanyAccount('company-user', 'company-1', false)
    await seedDocument('constructionCompanyCaseWorkItems/case-1', { constructionCompanyId: 'company-1' })
    const db = contextFor('company-user')

    await assertFails(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1')))
    await assertFails(updateDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1'), { status: 'submitted' }))
    await assertFails(updateDoc(doc(db, 'constructionCompanyAccounts', 'company-user'), { enabled: true }))
  })

  test('enabled staff can read review data but server-owned writes remain denied', async () => {
    await seedStaff('enabled-user')
    await seedCompanyAccount('company-user', 'company-1')
    await seedDocument('constructionCompanyAccountBindings/company-1', { uid: 'company-user' })
    await seedDocument('constructionCompanyCaseWorkItems/case-1', { constructionCompanyId: 'company-1' })
    await seedDocument('systemCounters/caseNumber', { nextValue: 2, lastCaseId: 'case-1' })
    await seedDocument('caseNumberReservations/000001', { caseId: 'case-1' })
    const db = contextFor('enabled-user')

    await assertSucceeds(getDoc(doc(db, 'constructionCompanyAccounts', 'company-user')))
    await assertSucceeds(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1')))
    await assertSucceeds(getDoc(doc(db, 'systemCounters', 'caseNumber')))
    await assertSucceeds(getDoc(doc(db, 'caseNumberReservations', '000001')))
    await assertFails(getDoc(doc(db, 'constructionCompanyAccountBindings', 'company-1')))
    await assertFails(updateDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1'), { status: 'approved' }))
    await assertFails(setDoc(doc(db, 'notificationOutbox', 'notification-1'), { status: 'queued' }))
    await assertFails(updateDoc(doc(db, 'systemCounters', 'caseNumber'), { nextValue: 3 }))
    await assertFails(updateDoc(doc(db, 'caseNumberReservations', '000001'), { caseId: 'case-2' }))
  })

  test('unknown collections remain denied', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')

    await assertFails(getDoc(doc(db, 'unknownCollection', 'unknown')))
    await assertFails(setDoc(doc(db, 'unknownCollection', 'unknown'), { value: true }))
  })
})
