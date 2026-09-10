import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import {
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import {
  CaseEditConflictError,
  updateCaseTransaction,
} from '../../app/composables/usePrototypeData.ts'

const projectId = 'demo-termite-warranty'
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180') {
  throw new Error('Case edit tests require the dedicated local emulator at 127.0.0.1:8180.')
}
let testEnvironment
const baselineTime = Timestamp.fromMillis(1_700_000_000_000)

before(async () => {
  const rules = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8')
  testEnvironment = await initializeTestEnvironment({ projectId, firestore: { rules } })
})
beforeEach(async () => {
  await testEnvironment.clearFirestore()
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'staffAccounts', 'staff-1'), {
      email: 'staff-1@example.invalid', displayName: 'Synthetic Staff', role: 'general_staff', enabled: true,
    })
    batch.set(doc(db, 'homeowners', 'homeowner-1'), { name: 'Homeowner', active: true })
    batch.set(doc(db, 'homeowners', 'homeowner-2'), { name: 'Homeowner 2', active: true })
    batch.set(doc(db, 'homeowners', 'homeowner-inactive'), { name: 'Inactive Homeowner', active: false })
    batch.set(doc(db, 'constructionCompanies', 'company-1'), { name: 'Company', active: true })
    batch.set(doc(db, 'constructionCompanies', 'company-2'), { name: 'Company 2', active: true })
    batch.set(doc(db, 'constructionCompanies', 'company-inactive'), { name: 'Inactive Company', active: false })
    batch.set(doc(db, 'properties', 'property-1'), {
      name: 'Property', active: true, homeownerId: 'homeowner-1', constructionCompanyId: 'company-1',
    })
    batch.set(doc(db, 'properties', 'property-2'), {
      name: 'Property 2', active: true, homeownerId: 'homeowner-2', constructionCompanyId: 'company-2',
    })
    batch.set(doc(db, 'properties', 'property-inactive'), {
      name: 'Inactive Property', active: false, homeownerId: 'homeowner-2', constructionCompanyId: 'company-2',
    })
    batch.set(doc(db, 'properties', 'property-inactive-homeowner'), {
      name: 'Property With Inactive Homeowner', active: true,
      homeownerId: 'homeowner-inactive', constructionCompanyId: 'company-2',
    })
    batch.set(doc(db, 'properties', 'property-inactive-company'), {
      name: 'Property With Inactive Company', active: true,
      homeownerId: 'homeowner-2', constructionCompanyId: 'company-inactive',
    })
    for (const id of ['branch-1', 'branch-2', 'branch-3']) {
      batch.set(doc(db, 'branches', id), { name: id, active: true })
    }
    batch.set(doc(db, 'branches', 'branch-inactive'), { name: 'branch-inactive', active: false })
    batch.set(doc(db, 'cases', 'case-1'), {
      caseNumber: '000001', sequenceValue: 1, propertyId: 'property-1', homeownerId: 'homeowner-1',
      constructionCompanyId: 'company-1', responsibleBranchId: 'branch-1', status: 'active', statusReason: null,
      registrationWarrantyId: 'warranty-1', registeredAt: baselineTime, updatedAt: baselineTime,
    })
    batch.set(doc(db, 'cases', 'case-1', 'appliedWarranties', 'warranty-1'), {
      warrantyServiceId: 'service-1', periodYears: 5, startDate: '2026-09-10', expiryDate: '2031-09-09',
      notificationStatus: 'not notified', status: 'active', statusReason: null,
      createdAt: baselineTime, updatedAt: baselineTime,
    })
    await batch.commit()
  })
})
after(async () => testEnvironment?.cleanup())

const input = (branchId) => ({
  id: 'case-1', baselineUpdatedAt: baselineTime, propertyId: 'property-1',
  constructionCompanyId: 'company-1', responsibleBranchId: branchId,
  status: 'active', statusReason: null,
})

const caseRef = (db) => doc(db, 'cases', 'case-1')
const readCase = async (db) => (await getDoc(caseRef(db))).data()

const assertImmutableCaseFields = (saved) => {
  assert.equal(saved?.caseNumber, '000001')
  assert.equal(saved?.sequenceValue, 1)
  assert.equal(saved?.registrationWarrantyId, 'warranty-1')
  assert.equal(saved?.registeredAt.isEqual(baselineTime), true)
}

test('two editors with the same baseline allow one winner and reject the stale writer unchanged', async () => {
  const db = testEnvironment.authenticatedContext('staff-1').firestore()
  const results = await Promise.allSettled([
    updateCaseTransaction(db, input('branch-2')),
    updateCaseTransaction(db, input('branch-3')),
  ])
  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1)
  const rejected = results.find(({ status }) => status === 'rejected')
  assert.equal(rejected?.reason instanceof CaseEditConflictError, true)
  const winnerBranch = results[0].status === 'fulfilled' ? 'branch-2' : 'branch-3'
  const saved = (await getDoc(doc(db, 'cases', 'case-1'))).data()
  assert.equal(saved?.responsibleBranchId, winnerBranch)
  assert.equal(saved?.propertyId, 'property-1')
  assert.equal(saved?.homeownerId, 'homeowner-1')
  assert.equal(saved?.constructionCompanyId, 'company-1')
  assert.equal(saved?.status, 'active')
  assert.equal(saved?.statusReason, null)
})

test('an applied-warranty update advances the parent timestamp and makes an open edit stale', async () => {
  const db = testEnvironment.authenticatedContext('staff-1').firestore()
  const batch = writeBatch(db)
  batch.update(doc(db, 'cases', 'case-1'), { updatedAt: serverTimestamp() })
  batch.update(doc(db, 'cases', 'case-1', 'appliedWarranties', 'warranty-1'), {
    notificationStatus: 'notified', updatedAt: serverTimestamp(),
  })
  await assertSucceeds(batch.commit())
  await assert.rejects(updateCaseTransaction(db, input('branch-2')), CaseEditConflictError)
  const saved = (await getDoc(doc(db, 'cases', 'case-1'))).data()
  assert.equal(saved?.responsibleBranchId, 'branch-1')
  assert.equal(saved?.status, 'active')
  assert.equal((await getDoc(doc(db, 'cases', 'case-1', 'appliedWarranties', 'warranty-1'))).data()?.notificationStatus, 'notified')
})

test('changing property derives its current homeowner and company while preserving immutable fields', async () => {
  const db = testEnvironment.authenticatedContext('staff-1').firestore()
  await updateCaseTransaction(db, {
    ...input('branch-2'),
    propertyId: 'property-2',
    constructionCompanyId: 'company-1',
  })
  const saved = await readCase(db)
  assert.equal(saved?.propertyId, 'property-2')
  assert.equal(saved?.homeownerId, 'homeowner-2')
  assert.equal(saved?.constructionCompanyId, 'company-2')
  assert.equal(saved?.responsibleBranchId, 'branch-2')
  assert.equal(saved?.status, 'active')
  assert.equal(saved?.statusReason, null)
  assertImmutableCaseFields(saved)
})

test('editing only the company persists the selected active company', async () => {
  const db = testEnvironment.authenticatedContext('staff-1').firestore()
  await updateCaseTransaction(db, { ...input('branch-1'), constructionCompanyId: 'company-2' })
  const saved = await readCase(db)
  assert.equal(saved?.propertyId, 'property-1')
  assert.equal(saved?.homeownerId, 'homeowner-1')
  assert.equal(saved?.constructionCompanyId, 'company-2')
  assertImmutableCaseFields(saved)
})

for (const status of ['cancelled', 'invalid']) {
  test(`${status} requires a nonblank reason, trims it, and leaves no partial blank update`, async () => {
    const db = testEnvironment.authenticatedContext('staff-1').firestore()
    const before = await readCase(db)
    await assert.rejects(updateCaseTransaction(db, {
      ...input('branch-2'), status, statusReason: '   ',
    }), /理由が必要/)
    assert.deepEqual(await readCase(db), before)

    await updateCaseTransaction(db, {
      ...input('branch-2'), status, statusReason: '  confirmed reason  ',
    })
    const saved = await readCase(db)
    assert.equal(saved?.status, status)
    assert.equal(saved?.statusReason, 'confirmed reason')
    assert.equal(saved?.responsibleBranchId, 'branch-2')
    assertImmutableCaseFields(saved)
  })
}

for (const scenario of [
  { name: 'missing property', changes: { propertyId: 'property-missing' } },
  { name: 'inactive property', changes: { propertyId: 'property-inactive' } },
  { name: 'property with inactive homeowner', changes: { propertyId: 'property-inactive-homeowner' } },
  { name: 'property with inactive company', changes: { propertyId: 'property-inactive-company' } },
  { name: 'missing company', changes: { constructionCompanyId: 'company-missing' } },
  { name: 'inactive company', changes: { constructionCompanyId: 'company-inactive' } },
  { name: 'missing branch', changes: { responsibleBranchId: 'branch-missing' } },
  { name: 'inactive branch', changes: { responsibleBranchId: 'branch-inactive' } },
]) {
  test(`${scenario.name} is rejected with the full case unchanged`, async () => {
    const db = testEnvironment.authenticatedContext('staff-1').firestore()
    const before = await readCase(db)
    await assert.rejects(updateCaseTransaction(db, { ...input('branch-2'), ...scenario.changes }))
    assert.deepEqual(await readCase(db), before)
  })
}

test('property-homeowner propagation preserves the baseline and a following edit retains the propagated homeowner', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const batch = writeBatch(db)
    batch.update(doc(db, 'properties', 'property-1'), { homeownerId: 'homeowner-2' })
    batch.update(caseRef(db), { homeownerId: 'homeowner-2' })
    await batch.commit()
  })

  const db = testEnvironment.authenticatedContext('staff-1').firestore()
  const propagated = await readCase(db)
  assert.equal(propagated?.homeownerId, 'homeowner-2')
  assert.equal(propagated?.updatedAt.isEqual(baselineTime), true)

  await updateCaseTransaction(db, input('branch-2'))
  const saved = await readCase(db)
  assert.equal(saved?.homeownerId, 'homeowner-2')
  assert.equal(saved?.responsibleBranchId, 'branch-2')
  assertImmutableCaseFields(saved)
})
