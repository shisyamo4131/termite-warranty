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
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

const projectId = 'demo-termite-warranty'
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180') {
  throw new Error('Firestore Rules tests require the dedicated local emulator at 127.0.0.1:8180.')
}
let testEnvironment

const validNameSearch = {
  normalized: 'テスト',
  one: { 'テ': true, 'ス': true, 'ト': true },
  two: { 'テス': true, 'スト': true },
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

  test('direct client writes to all four callable-managed masters are denied', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')

    const data = {
      name: 'Test property',
      active: true,
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
    }
    await assertFails(setDoc(doc(db, 'properties', 'property-1'), data))
    await assertFails(setDoc(doc(db, 'constructionCompanies', 'company-1'), {
      name: 'Test company', active: true, nameSearch: validNameSearch,
    }))
    await assertFails(setDoc(doc(db, 'homeowners', 'homeowner-1'), {
      name: 'Test homeowner', active: true, nameSearch: validNameSearch,
    }))
    await assertFails(setDoc(doc(db, 'warrantyServices', 'service-1'), {
      name: 'Test warranty', defaultPeriodYears: 5, active: true,
    }))
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
    await assertSucceeds(warrantyBatch.commit())
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

  test('case homeowner and applied-warranty period are immutable', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', validWarranty())
    const db = contextFor('enabled-user')

    await assertFails(updateDoc(doc(db, 'cases', 'case-1'), {
      homeownerId: 'homeowner-2',
      updatedAt: serverTimestamp(),
    }))
    const periodBatch = writeBatch(db)
    periodBatch.update(doc(db, 'cases', 'case-1'), { updatedAt: serverTimestamp() })
    periodBatch.update(doc(db, 'cases', 'case-1', 'appliedWarranties', 'warranty-1'), {
      periodYears: 10,
      updatedAt: serverTimestamp(),
    })
    await assertFails(periodBatch.commit())
  })

  test('an applied-warranty mutation must atomically update its parent case', async () => {
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
    await assertSucceeds(batch.commit())
  })

  test('unchanged inactive master references do not block terminal or warranty updates', async () => {
    await seedStaff('enabled-user')
    await seedRegistrationPrerequisites()
    await seedDocument('cases/case-1', validCase())
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', validWarranty())
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await updateDoc(doc(db, 'properties', 'property-1'), { active: false })
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
    await assertSucceeds(warrantyBatch.commit())
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
