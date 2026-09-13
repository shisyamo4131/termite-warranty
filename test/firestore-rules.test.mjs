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
  deleteDoc,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { LOCAL_RUNTIME, localRuntimeHost } from '../src/config/local-emulator.mjs'

const projectId = 'demo-termite-warranty'
if (process.env.FIRESTORE_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.firestorePort)) {
  throw new Error(`Firestore Rules tests require the dedicated local emulator at ${localRuntimeHost(LOCAL_RUNTIME.firestorePort)}.`)
}
let testEnvironment

const validNameSearch = {
  normalized: 'テスト',
  one: { 'テ': true, 'ス': true, 'ト': true },
  two: { 'テス': true, 'スト': true },
}

const validAddress = {
  postalCode: '1000001',
  prefecture: 'Tokyo',
  municipality: 'Chiyoda',
  streetTownAndNumber: '1-1',
  buildingName: null,
}

const masterMetadata = () => ({
  active: true,
  revision: 1,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})

const companyData = (overrides = {}) => ({
  name: 'Test company', address: validAddress, telephone: null, fax: null,
  contactPerson: null, contactDetails: null, email: null, notes: null,
  nameSearch: validNameSearch, ...masterMetadata(), ...overrides,
})

const homeownerData = (overrides = {}) => ({
  name: 'Test homeowner', address: validAddress, telephone: null, fax: null,
  notes: null, nameSearch: validNameSearch, ...masterMetadata(), ...overrides,
})

const propertyData = (overrides = {}) => ({
  name: 'Test property', homeownerId: 'homeowner-1', constructionCompanyId: 'company-1',
  address: validAddress, nameSearch: validNameSearch, ...masterMetadata(), ...overrides,
})

const warrantyServiceData = (overrides = {}) => ({
  name: 'Test warranty', defaultPeriodYears: 5, ...masterMetadata(), ...overrides,
})

async function createDirectMasterFixtures(db) {
  await setDoc(doc(db, 'constructionCompanies', 'company-1'), companyData())
  await setDoc(doc(db, 'homeowners', 'homeowner-1'), homeownerData())
  await setDoc(doc(db, 'properties', 'property-1'), propertyData())
  await setDoc(doc(db, 'warrantyServices', 'service-1'), warrantyServiceData())
}

const validCase = (overrides = {}) => ({
  caseNumber: '000001',
  sequenceValue: 1,
  propertyId: 'property-1',
  homeownerId: 'homeowner-1',
  constructionCompanyId: 'company-1',
  responsibleBranchId: 'branch-1',
  status: 'active',
  statusReason: null,
  applicationDate: '2026-09-08',
  handoverDate: '2026-09-09',
  registrationWarrantyId: 'warranty-1',
  registeredAt: Timestamp.fromMillis(1_700_000_000_000),
  updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  ...overrides,
})

const validWarranty = (overrides = {}) => ({
  warrantyServiceId: 'service-1',
  periodYears: 5,
  startDate: '2026-09-10',
  expiryDate: '2031-09-09',
  notificationStatus: 'not notified',
  status: 'active',
  statusReason: null,
  createdAt: Timestamp.fromMillis(1_700_000_000_000),
  updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  ...overrides,
})

const contextFor = (uid) => testEnvironment.authenticatedContext(uid).firestore()

async function seedStaff(uid, enabled = true) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'staffAccounts', uid), {
      email: `${uid}@example.invalid`,
      displayName: `Synthetic ${uid}`,
      role: 'general_staff',
      enabled,
    })
  })
}

async function seedCompanyAccount(uid, constructionCompanyId, enabled = true) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'constructionCompanyAccounts', uid), {
      constructionCompanyId,
      companyName: `Synthetic ${constructionCompanyId}`,
      email: `${uid}@example.invalid`,
      role: 'construction_company',
      enabled,
      createdAt: Timestamp.fromMillis(1_700_000_000_000),
      updatedAt: Timestamp.fromMillis(1_700_000_000_000),
    })
  })
}

async function seedDocument(path, data) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data)
  })
}

async function seedRegistrationPrerequisites(overrides = {}) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'branches', 'branch-1'), {
      name: 'Test branch',
      active: overrides.branchActive ?? true,
    })
    batch.set(doc(db, 'constructionCompanies', 'company-1'), {
      name: 'Test company',
      active: overrides.companyActive ?? true,
      nameSearch: validNameSearch,
    })
    batch.set(doc(db, 'homeowners', 'homeowner-1'), {
      name: 'Test homeowner',
      active: true,
      nameSearch: validNameSearch,
    })
    batch.set(doc(db, 'properties', 'property-1'), {
      name: 'Test property',
      active: overrides.propertyActive ?? true,
      nameSearch: validNameSearch,
      homeownerId: 'homeowner-1',
      constructionCompanyId: 'company-1',
      address: {
        postalCode: '1000001',
        prefecture: 'Tokyo',
        municipality: 'Chiyoda',
        streetTownAndNumber: '1-1',
        buildingName: null,
      },
    })
    batch.set(doc(db, 'warrantyServices', 'service-1'), {
      name: 'Test warranty',
      defaultPeriodYears: 5,
      active: overrides.serviceActive ?? true,
    })
    batch.set(doc(db, 'systemCounters', 'caseNumber'), { nextValue: 1, lastCaseId: null })
    await batch.commit()
  })
}

function directRegistrationBatch(db) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'systemCounters', 'caseNumber'), { nextValue: 2, lastCaseId: 'case-1' })
  batch.set(doc(db, 'caseNumberReservations', '000001'), { caseId: 'case-1' })
  batch.set(doc(db, 'cases', 'case-1'), validCase())
  batch.set(
    doc(db, 'cases', 'case-1', 'appliedWarranties', 'warranty-1'),
    validWarranty(),
  )
  return batch
}

function warrantyUpdateBatch(db, changes) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'cases', 'case-1'), { updatedAt: serverTimestamp() })
  batch.update(doc(db, 'cases', 'case-1', 'appliedWarranties', 'warranty-1'), {
    ...changes,
    updatedAt: serverTimestamp(),
  })
  return batch
}

before(async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  })
})

beforeEach(async () => {
  await testEnvironment.clearFirestore()
})

after(async () => {
  await testEnvironment?.cleanup()
})

describe('account access boundary', () => {
  test('unauthenticated business reads and writes are denied', async () => {
    const db = testEnvironment.unauthenticatedContext().firestore()

    await assertFails(getDoc(doc(db, 'branches', 'branch-1')))
    await assertFails(setDoc(doc(db, 'branches', 'branch-1'), { name: 'Test branch', active: true }))
  })

  test('an Authentication-only account without a staff record is denied', async () => {
    const db = contextFor('auth-only')

    await assertFails(getDoc(doc(db, 'branches', 'branch-1')))
    await assertFails(setDoc(doc(db, 'branches', 'branch-1'), { name: 'Test branch', active: true }))
  })

  test('a disabled staff account is denied even with an authenticated session', async () => {
    await seedStaff('disabled-user', false)
    const db = contextFor('disabled-user')

    await assertFails(getDoc(doc(db, 'branches', 'branch-1')))
    await assertFails(setDoc(doc(db, 'branches', 'branch-1'), { name: 'Test branch', active: true }))
  })

  test('an enabled staff account can read and write intended business data', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')
    const branchRef = doc(db, 'branches', 'branch-1')

    await assertSucceeds(setDoc(branchRef, { name: 'Test branch', active: true }))
    await assertSucceeds(getDoc(branchRef))
    await assertSucceeds(updateDoc(branchRef, { name: 'Updated branch' }))
  })

  test('enabled staff can read only their own staff record', async () => {
    await seedStaff('enabled-user')
    await seedStaff('other-user')
    const db = contextFor('enabled-user')

    await assertSucceeds(getDoc(doc(db, 'staffAccounts', 'enabled-user')))
    await assertFails(getDoc(doc(db, 'staffAccounts', 'other-user')))
  })

  test('direct staff-account writes are always denied', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')

    await assertFails(updateDoc(doc(db, 'staffAccounts', 'enabled-user'), { displayName: 'Changed' }))
    await assertFails(setDoc(doc(db, 'staffAccounts', 'new-user'), {
      email: 'new-user@example.invalid',
      displayName: 'New user',
      role: 'general_staff',
      enabled: true,
    }))
  })

  test('construction-company accounts can read only their own profile and work items', async () => {
    await seedCompanyAccount('company-user', 'company-1')
    await seedCompanyAccount('other-company-user', 'company-2')
    await seedDocument('constructionCompanyAccountBindings/company-1', { uid: 'company-user' })
    await seedDocument('constructionCompanyCaseWorkItems/case-1', { constructionCompanyId: 'company-1' })
    await seedDocument('constructionCompanyCaseWorkItems/case-2', { constructionCompanyId: 'company-2' })
    const db = contextFor('company-user')

    await assertSucceeds(getDoc(doc(db, 'constructionCompanyAccounts', 'company-user')))
    await assertFails(getDoc(doc(db, 'constructionCompanyAccounts', 'other-company-user')))
    await assertFails(getDoc(doc(db, 'constructionCompanyAccountBindings', 'company-1')))
    await assertSucceeds(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1')))
    await assertFails(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-2')))
    await assertFails(getDoc(doc(db, 'cases', 'case-1')))
    await assertFails(getDoc(doc(db, 'constructionCompanies', 'company-1')))
  })

  test('disabled company accounts lose work-item access and all direct writes stay denied', async () => {
    await seedCompanyAccount('company-user', 'company-1', false)
    await seedDocument('constructionCompanyCaseWorkItems/case-1', { constructionCompanyId: 'company-1' })
    const db = contextFor('company-user')

    await assertFails(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1')))
    await assertFails(updateDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1'), { status: 'submitted' }))
    await assertFails(updateDoc(doc(db, 'constructionCompanyAccounts', 'company-user'), { enabled: true }))
  })

  test('enabled staff can review company accounts and work items but cannot write them directly', async () => {
    await seedStaff('enabled-user')
    await seedCompanyAccount('company-user', 'company-1')
    await seedDocument('constructionCompanyCaseWorkItems/case-1', { constructionCompanyId: 'company-1' })
    await seedDocument('constructionCompanyAccountBindings/company-1', { uid: 'company-user' })
    const db = contextFor('enabled-user')

    await assertSucceeds(getDoc(doc(db, 'constructionCompanyAccounts', 'company-user')))
    await assertSucceeds(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1')))
    await assertFails(getDoc(doc(db, 'constructionCompanyAccountBindings', 'company-1')))
    await assertFails(updateDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1'), { status: 'approved' }))
  })

  test('all four managed masters require an enabled staff account for reads', async () => {
    await seedRegistrationPrerequisites()
    const paths = [
      'constructionCompanies/company-1',
      'homeowners/homeowner-1',
      'warrantyServices/service-1',
      'properties/property-1',
    ]
    const unauthenticated = testEnvironment.unauthenticatedContext().firestore()
    for (const path of paths) await assertFails(getDoc(doc(unauthenticated, path)))

    await seedStaff('enabled-user')
    const enabled = contextFor('enabled-user')
    for (const path of paths) await assertSucceeds(getDoc(doc(enabled, path)))
  })
})

describe('business document validation', () => {
  test('branch and warranty-service records reject invalid required values', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')

    await assertFails(setDoc(doc(db, 'branches', 'branch-1'), { name: '', active: true }))
    await assertFails(setDoc(doc(db, 'warrantyServices', 'service-1'), {
      name: 'Test warranty',
      defaultPeriodYears: 0,
      active: true,
    }))
  })

  test('enabled staff directly create, update, inactivate, and reactivate all four masters', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')
    await createDirectMasterFixtures(db)

    const scenarios = [
      ['constructionCompanies', 'company-1', { name: 'Updated company', nameSearch: { ...validNameSearch, normalized: 'updatedcompany' } }],
      ['homeowners', 'homeowner-1', { name: 'Updated homeowner', nameSearch: { ...validNameSearch, normalized: 'updatedhomeowner' } }],
      ['properties', 'property-1', { name: 'Updated property', nameSearch: { ...validNameSearch, normalized: 'updatedproperty' } }],
      ['warrantyServices', 'service-1', { name: 'Updated warranty', defaultPeriodYears: 10 }],
    ]
    for (const [collectionName, id, changes] of scenarios) {
      const reference = doc(db, collectionName, id)
      const created = (await getDoc(reference)).data()
      await assertSucceeds(updateDoc(reference, {
        ...changes, revision: increment(1), updatedAt: serverTimestamp(),
      }))
      await assertSucceeds(updateDoc(reference, {
        active: false, revision: increment(1), updatedAt: serverTimestamp(),
      }))
      await assertSucceeds(updateDoc(reference, {
        active: true, revision: increment(1), updatedAt: serverTimestamp(),
      }))
      const stored = (await getDoc(reference)).data()
      assert.equal(stored?.revision, 4)
      assert.equal(stored?.active, true)
      assert.equal(stored?.name, changes.name)
      assert.equal(stored?.createdAt.toMillis(), created?.createdAt.toMillis())
    }
  })

  test('direct master writes reject unsupported shapes, invalid references, bad revisions, and disabled staff', async () => {
    await seedStaff('enabled-user')
    await seedStaff('disabled-user', false)
    const db = contextFor('enabled-user')
    const disabled = contextFor('disabled-user')
    await assertFails(setDoc(doc(disabled, 'homeowners', 'denied'), homeownerData()))
    await assertFails(setDoc(doc(db, 'homeowners', 'extra'), { ...homeownerData(), unexpected: true }))
    await assertSucceeds(setDoc(doc(db, 'homeowners', 'homeowner-1'), homeownerData()))
    await assertFails(updateDoc(doc(db, 'homeowners', 'homeowner-1'), { name: 'Bad revision', revision: 5, updatedAt: serverTimestamp() }))
    await assertFails(setDoc(doc(db, 'properties', 'bad-property'), {
      name: 'Bad property', homeownerId: 'homeowner-1', constructionCompanyId: 'missing',
      address: validAddress, nameSearch: validNameSearch, ...masterMetadata(),
    }))
  })

  test('legacy company and homeowner records support lifecycle-only writes without field mutation', async () => {
    await seedStaff('enabled-user')
    const legacyTimestamp = Timestamp.fromMillis(1_700_000_000_000)
    for (const [collectionName, id] of [
      ['constructionCompanies', 'legacy-company'],
      ['homeowners', 'legacy-homeowner'],
    ]) {
      await seedDocument(`${collectionName}/${id}`, {
        name: 'Legacy record', nameSearch: validNameSearch, active: true, revision: 1,
        createdAt: legacyTimestamp, updatedAt: legacyTimestamp,
      })
      const reference = doc(contextFor('enabled-user'), collectionName, id)
      await assertSucceeds(updateDoc(reference, {
        active: false, revision: increment(1), updatedAt: serverTimestamp(),
      }))
      await assertSucceeds(updateDoc(reference, {
        active: true, revision: increment(1), updatedAt: serverTimestamp(),
      }))
      await assertFails(updateDoc(reference, {
        name: 'Smuggled change', active: false,
        revision: increment(1), updatedAt: serverTimestamp(),
      }))
      const stored = (await getDoc(reference)).data()
      assert.equal(stored?.name, 'Legacy record')
      assert.equal(stored?.active, true)
      assert.equal(stored?.revision, 3)
    }
  })

  test('missing and invalid stored revisions reject direct updates and lifecycle writes', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')
    const invalidRevisions = [undefined, 0, 1.5, '1', Number.MAX_SAFE_INTEGER]
    for (const [index, revision] of invalidRevisions.entries()) {
      for (const operation of ['update', 'lifecycle']) {
        const id = `bad-${index}-${operation}`
        const seeded = {
          ...homeownerData(), createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(1),
        }
        if (revision === undefined) delete seeded.revision
        else seeded.revision = revision
        await seedDocument(`homeowners/${id}`, seeded)
        const changes = operation === 'update'
          ? { name: 'Rejected', nameSearch: validNameSearch }
          : { active: false }
        await assertFails(updateDoc(doc(db, 'homeowners', id), {
          ...changes, revision: increment(1), updatedAt: serverTimestamp(),
        }))
      }
    }
  })

  test('property updates and reactivation reject missing or inactive references', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')
    await createDirectMasterFixtures(db)
    await seedDocument('homeowners/inactive-homeowner', { ...homeownerData(), active: false })
    await seedDocument('constructionCompanies/inactive-company', { ...companyData(), active: false })
    const reference = doc(db, 'properties', 'property-1')

    for (const changes of [
      { homeownerId: 'missing-homeowner' },
      { homeownerId: 'inactive-homeowner' },
      { constructionCompanyId: 'missing-company' },
      { constructionCompanyId: 'inactive-company' },
    ]) {
      await assertFails(updateDoc(reference, {
        ...changes, revision: increment(1), updatedAt: serverTimestamp(),
      }))
    }

    await assertSucceeds(updateDoc(reference, {
      active: false, revision: increment(1), updatedAt: serverTimestamp(),
    }))
    await seedDocument('homeowners/homeowner-1', { ...homeownerData(), active: false })
    await assertFails(updateDoc(reference, {
      active: true, revision: increment(1), updatedAt: serverTimestamp(),
    }))
    assert.equal((await getDoc(reference)).data()?.active, false)
  })

  test('direct property reference changes never propagate to linked cases', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')
    await createDirectMasterFixtures(db)
    await assertSucceeds(setDoc(doc(db, 'constructionCompanies', 'company-2'), companyData({ name: 'Company 2' })))
    await assertSucceeds(setDoc(doc(db, 'homeowners', 'homeowner-2'), homeownerData({ name: 'Homeowner 2' })))
    const caseBefore = validCase({ updatedAt: Timestamp.fromMillis(1_700_000_000_000) })
    await seedDocument('cases/case-1', caseBefore)

    await assertSucceeds(updateDoc(doc(db, 'properties', 'property-1'), {
      homeownerId: 'homeowner-2', constructionCompanyId: 'company-2',
      revision: increment(1), updatedAt: serverTimestamp(),
    }))
    const storedCase = (await getDoc(doc(db, 'cases', 'case-1'))).data()
    assert.equal(storedCase?.homeownerId, 'homeowner-1')
    assert.equal(storedCase?.constructionCompanyId, 'company-1')
    assert.equal(storedCase?.updatedAt.toMillis(), caseBefore.updatedAt.toMillis())
  })

  test('concurrent direct master updates both commit with atomic revisions and last-write-wins payload', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')
    const reference = doc(db, 'homeowners', 'homeowner-1')
    await assertSucceeds(setDoc(reference, homeownerData({ name: 'Original' })))
    const firstSearch = { ...validNameSearch, normalized: 'first' }
    const secondSearch = { ...validNameSearch, normalized: 'second' }
    await Promise.all([
      assertSucceeds(updateDoc(reference, { name: 'First', nameSearch: firstSearch, revision: increment(1), updatedAt: serverTimestamp() })),
      assertSucceeds(updateDoc(reference, { name: 'Second', nameSearch: secondSearch, revision: increment(1), updatedAt: serverTimestamp() })),
    ])
    const stored = (await getDoc(reference)).data()
    assert.equal(stored?.revision, 3)
    assert.equal(stored?.nameSearch.normalized, stored?.name === 'First' ? 'first' : 'second')
  })

  test('case updates reject a whitespace-only terminal reason', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    const db = contextFor('enabled-user')

    await assertFails(updateDoc(doc(db, 'cases', 'case-1'), {
      status: 'cancelled', statusReason: '  ', updatedAt: serverTimestamp(),
    }))
  })

  test('applied-warranty updates reject invalid notification and terminal values', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', validWarranty())
    const db = contextFor('enabled-user')

    await assertFails(warrantyUpdateBatch(db, { notificationStatus: 'unknown' }).commit())
    await assertFails(warrantyUpdateBatch(db, { status: 'invalid', statusReason: '' }).commit())
  })

  test('terminal case and warranty transitions require a reason and cannot return to active', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', validWarranty())
    const db = contextFor('enabled-user')
    const caseRef = doc(db, 'cases', 'case-1')
    const warrantyRef = doc(db, 'cases', 'case-1', 'appliedWarranties', 'warranty-1')

    const invalidWarrantyBatch = writeBatch(db)
    invalidWarrantyBatch.update(caseRef, { updatedAt: serverTimestamp() })
    invalidWarrantyBatch.update(warrantyRef, {
      status: 'invalid',
      statusReason: null,
      updatedAt: serverTimestamp(),
    })
    await assertFails(invalidWarrantyBatch.commit())
    const warrantyBatch = writeBatch(db)
    warrantyBatch.update(caseRef, { updatedAt: serverTimestamp() })
    warrantyBatch.update(warrantyRef, {
      status: 'invalid',
      statusReason: 'Synthetic invalidation',
      updatedAt: serverTimestamp(),
    })
    await assertFails(warrantyBatch.commit())
    const restoreWarrantyBatch = writeBatch(db)
    restoreWarrantyBatch.update(caseRef, { updatedAt: serverTimestamp() })
    restoreWarrantyBatch.update(warrantyRef, {
      status: 'active',
      statusReason: null,
      updatedAt: serverTimestamp(),
    })
    await assertFails(restoreWarrantyBatch.commit())

    await assertFails(updateDoc(caseRef, {
      status: 'cancelled', statusReason: '', updatedAt: serverTimestamp(),
    }))
    await assertSucceeds(updateDoc(caseRef, {
      status: 'cancelled', statusReason: 'Synthetic cancellation', updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(caseRef, {
      status: 'active', statusReason: null, updatedAt: serverTimestamp(),
    }))
  })

  test('undeclared master fields are rejected', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')

    await assertFails(setDoc(doc(db, 'branches', 'branch-1'), {
      name: 'Test branch',
      active: true,
      unexpected: true,
    }))
  })

  test('undeclared case fields are rejected', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    const db = contextFor('enabled-user')

    await assertFails(updateDoc(doc(db, 'cases', 'case-1'), {
      caseWideExpiryDate: '2031-09-09',
      updatedAt: serverTimestamp(),
    }))
  })

  test('case business dates are editable in canonical shape', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    const db = contextFor('enabled-user')
    const caseRef = doc(db, 'cases', 'case-1')

    await assertSucceeds(updateDoc(caseRef, {
      applicationDate: '2026-10-10', handoverDate: '2026-01-01', updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(caseRef, { applicationDate: '2026-2-3', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(caseRef, { applicationDate: '2026-02-30', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(caseRef, { applicationDate: '2028-02-29', updatedAt: serverTimestamp() }))
  })

  test('legacy cases remain readable but a normal edit must backfill both business dates', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    const legacy = validCase()
    delete legacy.applicationDate
    delete legacy.handoverDate
    await seedDocument('cases/case-1', legacy)
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', validWarranty())
    await seedDocument('branches/branch-2', { name: 'Second branch', active: true })
    const db = contextFor('enabled-user')
    const caseRef = doc(db, 'cases', 'case-1')

    await assertSucceeds(getDoc(caseRef))
    await assertFails(updateDoc(caseRef, { responsibleBranchId: 'branch-2', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(caseRef, {
      responsibleBranchId: 'branch-2', applicationDate: '2026-09-08', handoverDate: '2026-09-09', updatedAt: serverTimestamp(),
    }))
  })

  test('legacy case still permits an atomic warranty-only parent timestamp update', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    const legacy = validCase()
    delete legacy.applicationDate
    delete legacy.handoverDate
    await seedDocument('cases/case-1', legacy)
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', validWarranty())
    const db = contextFor('enabled-user')
    await assertFails(warrantyUpdateBatch(db, { notificationStatus: 'notified' }).commit())
  })

  test('case identifiers and applied-warranty period are immutable', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', validWarranty())
    const db = contextFor('enabled-user')

    for (const immutableChange of [
      { caseNumber: '000002' },
      { sequenceValue: 2 },
      { registrationWarrantyId: 'warranty-2' },
      { registeredAt: Timestamp.fromMillis(1_800_000_000_000) },
    ]) {
      await assertFails(updateDoc(doc(db, 'cases', 'case-1'), {
        ...immutableChange,
        updatedAt: serverTimestamp(),
      }))
    }
    const periodBatch = writeBatch(db)
    periodBatch.update(doc(db, 'cases', 'case-1'), { updatedAt: serverTimestamp() })
    periodBatch.update(doc(db, 'cases', 'case-1', 'appliedWarranties', 'warranty-1'), {
      periodYears: 10,
      updatedAt: serverTimestamp(),
    })
    await assertFails(periodBatch.commit())
  })

  test('active case editing accepts active references and rejects arbitrary or inactive property references', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      const batch = writeBatch(db)
      batch.set(doc(db, 'homeowners', 'homeowner-2'), {
        name: 'Second homeowner', active: true, nameSearch: validNameSearch,
      })
      batch.set(doc(db, 'constructionCompanies', 'company-2'), {
        name: 'Second company', active: true, nameSearch: validNameSearch,
      })
      batch.set(doc(db, 'branches', 'branch-2'), { name: 'Second branch', active: true })
      batch.set(doc(db, 'branches', 'branch-inactive'), { name: 'Inactive branch', active: false })
      batch.set(doc(db, 'properties', 'property-2'), {
        name: 'Second property', active: true, nameSearch: validNameSearch,
        homeownerId: 'homeowner-2', constructionCompanyId: 'company-2',
        address: { postalCode: '1000002', prefecture: 'Tokyo', municipality: 'Chiyoda', streetTownAndNumber: '2-2', buildingName: null },
      })
      batch.set(doc(db, 'properties', 'property-inactive'), {
        name: 'Inactive property', active: false, nameSearch: validNameSearch,
        homeownerId: 'homeowner-2', constructionCompanyId: 'company-2',
        address: { postalCode: '1000003', prefecture: 'Tokyo', municipality: 'Chiyoda', streetTownAndNumber: '3-3', buildingName: null },
      })
      batch.set(doc(db, 'homeowners', 'homeowner-inactive'), {
        name: 'Inactive homeowner', active: false, nameSearch: validNameSearch,
      })
      batch.set(doc(db, 'properties', 'property-inactive-homeowner'), {
        name: 'Bad property', active: true, nameSearch: validNameSearch,
        homeownerId: 'homeowner-inactive', constructionCompanyId: 'company-2',
        address: { postalCode: '1000004', prefecture: 'Tokyo', municipality: 'Chiyoda', streetTownAndNumber: '4-4', buildingName: null },
      })
      batch.set(doc(db, 'constructionCompanies', 'company-inactive'), {
        name: 'Inactive company', active: false, nameSearch: validNameSearch,
      })
      batch.set(doc(db, 'properties', 'property-inactive-company'), {
        name: 'Bad company property', active: true, nameSearch: validNameSearch,
        homeownerId: 'homeowner-2', constructionCompanyId: 'company-inactive',
        address: { postalCode: '1000005', prefecture: 'Tokyo', municipality: 'Chiyoda', streetTownAndNumber: '5-5', buildingName: null },
      })
      await batch.commit()
    })
    const db = contextFor('enabled-user')
    const caseRef = doc(db, 'cases', 'case-1')

    await assertSucceeds(updateDoc(caseRef, {
      constructionCompanyId: 'company-2', updatedAt: serverTimestamp(),
    }))
    assert.equal((await getDoc(caseRef)).data()?.constructionCompanyId, 'company-2')
    await assertSucceeds(updateDoc(caseRef, {
      homeownerId: 'homeowner-2', updatedAt: serverTimestamp(),
    }))
    assert.equal((await getDoc(caseRef)).data()?.homeownerId, 'homeowner-2')
    await assertFails(updateDoc(caseRef, {
      responsibleBranchId: 'branch-inactive', updatedAt: serverTimestamp(),
    }))
    await assertSucceeds(updateDoc(caseRef, {
      propertyId: 'property-2', homeownerId: 'homeowner-2', constructionCompanyId: 'company-2',
      responsibleBranchId: 'branch-2', updatedAt: serverTimestamp(),
    }))
    assert.equal((await getDoc(caseRef)).data()?.propertyId, 'property-2')

    await assertSucceeds(updateDoc(caseRef, {
      propertyId: 'property-1', homeownerId: 'homeowner-2', constructionCompanyId: 'company-1',
      updatedAt: serverTimestamp(),
    }))
    assert.equal((await getDoc(caseRef)).data()?.propertyId, 'property-1')

    for (const invalid of [
      { propertyId: 'missing', homeownerId: 'homeowner-2', constructionCompanyId: 'company-2' },
      { propertyId: 'property-inactive', homeownerId: 'homeowner-2', constructionCompanyId: 'company-2' },
      { propertyId: 'property-inactive-homeowner', homeownerId: 'homeowner-2', constructionCompanyId: 'company-2' },
      { propertyId: 'property-inactive-company', homeownerId: 'homeowner-2', constructionCompanyId: 'company-2' },
      { homeownerId: 'homeowner-missing' },
      { homeownerId: 'homeowner-inactive' },
      { constructionCompanyId: 'company-missing' },
      { constructionCompanyId: 'company-inactive' },
    ]) {
      await assertFails(updateDoc(caseRef, { ...invalid, updatedAt: serverTimestamp() }))
      assert.equal((await getDoc(caseRef)).data()?.propertyId, 'property-1')
    }
  })

  test('applied-warranty mutation is denied to clients even with an atomic parent timestamp update', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', validWarranty())
    const db = contextFor('enabled-user')
    const caseRef = doc(db, 'cases', 'case-1')
    const warrantyRef = doc(db, 'cases', 'case-1', 'appliedWarranties', 'warranty-1')

    await assertFails(updateDoc(warrantyRef, {
      notificationStatus: 'notified',
      updatedAt: serverTimestamp(),
    }))

    const batch = writeBatch(db)
    batch.update(caseRef, { updatedAt: serverTimestamp() })
    batch.update(warrantyRef, {
      notificationStatus: 'notified',
      updatedAt: serverTimestamp(),
    })
    await assertFails(batch.commit())
  })

  test('unchanged inactive master references do not block terminal or warranty updates', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', validWarranty())
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await updateDoc(doc(db, 'properties', 'property-1'), { active: false })
      await updateDoc(doc(db, 'homeowners', 'homeowner-1'), { active: false })
      await updateDoc(doc(db, 'constructionCompanies', 'company-1'), { active: false })
      await updateDoc(doc(db, 'branches', 'branch-1'), { active: false })
    })
    const db = contextFor('enabled-user')
    const caseRef = doc(db, 'cases', 'case-1')
    const warrantyRef = doc(db, 'cases', 'case-1', 'appliedWarranties', 'warranty-1')
    const warrantyBatch = writeBatch(db)
    warrantyBatch.update(caseRef, { updatedAt: serverTimestamp() })
    warrantyBatch.update(warrantyRef, {
      notificationStatus: 'notified',
      updatedAt: serverTimestamp(),
    })
    await assertFails(warrantyBatch.commit())
    await assertSucceeds(updateDoc(caseRef, {
      status: 'cancelled',
      statusReason: 'Synthetic cancellation',
      updatedAt: serverTimestamp(),
    }))
  })
})

describe('deletion, counter, and reservation invariants', () => {
  test('physical deletes are denied for all prototype business paths', async () => {
    await seedStaff('enabled-user')
    const seeded = [
      ['branches/branch-1', { name: 'Test branch', active: true }],
      ['constructionCompanies/company-1', { name: 'Test company', active: true, nameSearch: validNameSearch }],
      ['homeowners/homeowner-1', { name: 'Test homeowner', active: true, nameSearch: validNameSearch }],
      ['properties/property-1', {
        name: 'Test property', active: true, nameSearch: validNameSearch,
        homeownerId: 'homeowner-1', constructionCompanyId: 'company-1',
        address: { postalCode: '1000001', prefecture: 'Tokyo', municipality: 'Chiyoda', streetTownAndNumber: '1-1', buildingName: null },
      }],
      ['warrantyServices/service-1', { name: 'Test warranty', defaultPeriodYears: 5, active: true }],
      ['cases/case-1', validCase()],
      ['cases/case-1/appliedWarranties/warranty-1', validWarranty()],
      ['systemCounters/caseNumber', { nextValue: 2, lastCaseId: 'case-1' }],
      ['caseNumberReservations/000001', { caseId: 'case-1' }],
    ]
    for (const [path, data] of seeded) await seedDocument(path, data)
    const db = contextFor('enabled-user')

    for (const [path] of seeded) await assertFails(deleteDoc(doc(db, path)))
  })

  test('counter and reservation writes are denied to clients', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')

    await assertFails(setDoc(doc(db, 'systemCounters', 'other'), { nextValue: 1 }))
    await assertFails(setDoc(doc(db, 'systemCounters', 'caseNumber'), { nextValue: 0, lastCaseId: null }))
    await assertFails(setDoc(doc(db, 'caseNumberReservations', '1'), { caseId: 'case-1' }))
    await assertFails(setDoc(doc(db, 'caseNumberReservations', '000001'), { caseId: '' }))
    await seedDocument('caseNumberReservations/000001', { caseId: 'case-1' })
    await assertFails(updateDoc(doc(db, 'caseNumberReservations', '000001'), { caseId: 'case-2' }))
  })

  test('even a complete atomic registration batch is denied to clients', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    const db = contextFor('enabled-user')
    await assertFails(directRegistrationBatch(db).commit())
  })
})
