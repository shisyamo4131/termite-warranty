import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteApp, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { collection, collectionGroup, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore'
import { registerCaseTransaction } from '../../functions/register-case.js'

const projectId = 'demo-termite-warranty'
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180') {
  throw new Error('Registration integration tests require the dedicated local Firestore emulator at 127.0.0.1:8180.')
}
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
let testEnvironment
let adminApp
let adminFirestore

async function seed(enabledService = true) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const batch = writeBatch(db)
    for (const uid of ['staff-1', 'staff-2']) {
      batch.set(doc(db, 'staffAccounts', uid), {
        email: `${uid}@example.invalid`,
        displayName: uid,
        role: 'general_staff',
        enabled: true,
      })
    }
    batch.set(doc(db, 'branches', 'branch-1'), { name: 'Synthetic branch', active: true })
    batch.set(doc(db, 'constructionCompanies', 'company-1'), {
      name: 'Synthetic company', active: true, nameSearch: { normalized: '', one: {}, two: {} },
    })
    batch.set(doc(db, 'constructionCompanies', 'company-2'), {
      name: 'Alternate company', active: true, nameSearch: { normalized: '', one: {}, two: {} },
    })
    batch.set(doc(db, 'constructionCompanies', 'company-inactive'), {
      name: 'Inactive company', active: false, nameSearch: { normalized: '', one: {}, two: {} },
    })
    batch.set(doc(db, 'homeowners', 'homeowner-1'), {
      name: 'Synthetic homeowner', active: true, nameSearch: { normalized: '', one: {}, two: {} },
    })
    batch.set(doc(db, 'homeowners', 'homeowner-2'), {
      name: 'Alternate homeowner', active: true, nameSearch: { normalized: '', one: {}, two: {} },
    })
    batch.set(doc(db, 'homeowners', 'homeowner-inactive'), {
      name: 'Inactive homeowner', active: false, nameSearch: { normalized: '', one: {}, two: {} },
    })
    batch.set(doc(db, 'properties', 'property-1'), {
      name: 'Synthetic property',
      active: true,
      nameSearch: { normalized: '', one: {}, two: {} },
      homeownerId: 'homeowner-1',
      constructionCompanyId: 'company-1',
      address: {
        postalCode: '1000001', prefecture: 'Tokyo', municipality: 'Chiyoda',
        streetTownAndNumber: '1-1', buildingName: null,
      },
    })
    batch.set(doc(db, 'warrantyServices', 'service-1'), {
      name: 'Synthetic warranty', defaultPeriodYears: 5, active: enabledService,
    })
    batch.set(doc(db, 'systemCounters', 'caseNumber'), { nextValue: 1, lastCaseId: null })
    await batch.commit()
  })
}

before(async () => {
  const rules = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8')
  testEnvironment = await initializeTestEnvironment({ projectId, firestore: { rules } })
  adminApp = initializeApp({ projectId }, 'registration-integration-test')
  adminFirestore = getFirestore(adminApp)
})

beforeEach(async () => testEnvironment.clearFirestore())
after(async () => {
  await testEnvironment?.cleanup()
  await deleteApp(adminApp)
})

test('concurrent app registrations allocate distinct complete case numbers', async () => {
  await seed()
  const [first, second] = await Promise.all([
    registerCaseTransaction(adminFirestore, input, 'staff-1'),
    registerCaseTransaction(adminFirestore, input, 'staff-2'),
  ])
  assert.deepEqual([first.caseNumber, second.caseNumber].sort(), ['000001', '000002'])

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const cases = await getDocs(collection(db, 'cases'))
    assert.equal(cases.size, 2)
    const caseIds = new Set(cases.docs.map(({ id }) => id))
    for (const caseSnapshot of cases.docs) {
      const data = caseSnapshot.data()
      assert.equal(data.sequenceValue, Number(data.caseNumber))
      assert.equal(data.homeownerId, 'homeowner-1')
      assert.equal(data.constructionCompanyId, 'company-1')
      assert.equal(data.applicationDate, '2026-09-08')
      assert.equal(data.handoverDate, '2026-09-09')
      const warranty = await getDoc(doc(caseSnapshot.ref, 'appliedWarranties', data.registrationWarrantyId))
      assert.equal(warranty.exists(), true)
      assert.equal(warranty.data()?.periodYears, 5)
      assert.equal(warranty.data()?.expiryDate, '2031-09-09')
      assert.equal((await getDoc(doc(db, 'caseNumberReservations', data.caseNumber))).data()?.caseId, caseSnapshot.id)
    }
    const counter = (await getDoc(doc(db, 'systemCounters', 'caseNumber'))).data()
    assert.equal(counter?.nextValue, 3)
    assert.equal(caseIds.has(counter?.lastCaseId), true)
  })
})

for (const scenario of [
  { name: 'missing application date', changes: { applicationDate: undefined }, pattern: /申込日/ },
  { name: 'invalid application date', changes: { applicationDate: '2026-02-30' }, pattern: /申込日/ },
  { name: 'non-canonical handover date', changes: { handoverDate: '2026-9-9' }, pattern: /引渡日/ },
]) {
  test(`${scenario.name} rejects registration atomically`, async () => {
    await seed()
    await assert.rejects(registerCaseTransaction(adminFirestore, { ...input, ...scenario.changes }, 'staff-1'), scenario.pattern)
    assert.equal((await adminFirestore.collection('cases').get()).empty, true)
    assert.deepEqual((await adminFirestore.doc('systemCounters/caseNumber').get()).data(), { nextValue: 1, lastCaseId: null })
  })
}

test('validation failure leaves the counter and related collections unchanged', async () => {
  await seed(false)
  await assert.rejects(registerCaseTransaction(adminFirestore, input, 'staff-1'), /有効な保証サービス/)

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const inspectionDb = context.firestore()
    assert.deepEqual((await getDoc(doc(inspectionDb, 'systemCounters', 'caseNumber'))).data(), { nextValue: 1, lastCaseId: null })
    assert.equal((await getDocs(collection(inspectionDb, 'cases'))).empty, true)
    assert.equal((await getDocs(collection(inspectionDb, 'caseNumberReservations'))).empty, true)
    assert.equal((await getDocs(collectionGroup(inspectionDb, 'appliedWarranties'))).empty, true)
  })
})

test('registration persists independently selected active homeowner and company overrides', async () => {
  await seed()
  const result = await registerCaseTransaction(adminFirestore, {
    ...input,
    homeownerId: 'homeowner-2',
    constructionCompanyId: 'company-2',
    homeownerOverridden: true,
    constructionCompanyOverridden: true,
  }, 'staff-1')
  const saved = (await adminFirestore.doc(`cases/${result.id}`).get()).data()
  assert.equal(saved.homeownerId, 'homeowner-2')
  assert.equal(saved.constructionCompanyId, 'company-2')
  assert.equal(saved.propertyId, 'property-1')
})

for (const scenario of [
  { name: 'missing selected homeowner', changes: { homeownerId: 'homeowner-missing', homeownerOverridden: true }, pattern: /有効な施主/ },
  { name: 'inactive selected homeowner', changes: { homeownerId: 'homeowner-inactive', homeownerOverridden: true }, pattern: /有効な施主/ },
  { name: 'missing selected company', changes: { constructionCompanyId: 'company-missing', constructionCompanyOverridden: true }, pattern: /有効な工務店/ },
  { name: 'inactive selected company', changes: { constructionCompanyId: 'company-inactive', constructionCompanyOverridden: true }, pattern: /有効な工務店/ },
]) {
  test(`${scenario.name} rejects registration atomically`, async () => {
    await seed()
    await assert.rejects(
      registerCaseTransaction(adminFirestore, { ...input, ...scenario.changes }, 'staff-1'),
      scenario.pattern,
    )
    assert.equal((await adminFirestore.collection('cases').get()).empty, true)
    assert.equal((await adminFirestore.collection('caseNumberReservations').get()).empty, true)
    assert.equal((await adminFirestore.collectionGroup('appliedWarranties').get()).empty, true)
    assert.deepEqual((await adminFirestore.doc('systemCounters/caseNumber').get()).data(), { nextValue: 1, lastCaseId: null })
  })
}

test('registration rejects missing override-intent flags before writing', async () => {
  await seed()
  const { homeownerOverridden, ...missingFlagInput } = input
  assert.equal(homeownerOverridden, false)
  await assert.rejects(registerCaseTransaction(adminFirestore, missingFlagInput, 'staff-1'), /施主の選択状態が不正/)
  assert.equal((await adminFirestore.collection('cases').get()).empty, true)
  assert.deepEqual((await adminFirestore.doc('systemCounters/caseNumber').get()).data(), { nextValue: 1, lastCaseId: null })
})

test('disabled staff cannot register through the trusted transaction', async () => {
  await seed()
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const batch = writeBatch(db)
    batch.update(doc(db, 'staffAccounts', 'staff-1'), { enabled: false })
    await batch.commit()
  })
  await assert.rejects(
    registerCaseTransaction(adminFirestore, input, 'staff-1'),
    (error) => error?.code === 'permission-denied',
  )
  assert.equal((await adminFirestore.collection('cases').get()).empty, true)
  assert.equal((await adminFirestore.doc('systemCounters/caseNumber').get()).data()?.nextValue, 1)
})

test('an inactive homeowner prevents registration and leaves state unchanged', async () => {
  await seed()
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const batch = writeBatch(db)
    batch.update(doc(db, 'homeowners', 'homeowner-1'), { active: false })
    await batch.commit()
  })
  await assert.rejects(registerCaseTransaction(adminFirestore, input, 'staff-1'), /施主が無効/)
  assert.equal((await adminFirestore.collection('cases').get()).empty, true)
  assert.equal((await adminFirestore.collection('caseNumberReservations').get()).empty, true)
  assert.equal((await adminFirestore.collectionGroup('appliedWarranties').get()).empty, true)
  assert.deepEqual((await adminFirestore.doc('systemCounters/caseNumber').get()).data(), { nextValue: 1, lastCaseId: null })
})

test('an inactive property-default company prevents registration even with active overrides', async () => {
  await seed()
  await adminFirestore.doc('constructionCompanies/company-1').update({ active: false })
  await assert.rejects(registerCaseTransaction(adminFirestore, {
    ...input,
    homeownerId: 'homeowner-2',
    constructionCompanyId: 'company-2',
    homeownerOverridden: true,
    constructionCompanyOverridden: true,
  }, 'staff-1'), /物件の工務店が無効/)
  assert.equal((await adminFirestore.collection('cases').get()).empty, true)
  assert.equal((await adminFirestore.collection('caseNumberReservations').get()).empty, true)
  assert.deepEqual((await adminFirestore.doc('systemCounters/caseNumber').get()).data(), { nextValue: 1, lastCaseId: null })
})

test('a later registration uses the current service period and date calculation', async () => {
  await seed()
  const first = await registerCaseTransaction(adminFirestore, input, 'staff-1')
  await adminFirestore.doc('warrantyServices/service-1').update({ defaultPeriodYears: 1 })
  const second = await registerCaseTransaction(adminFirestore, { ...input, startDate: '2024-02-29' }, 'staff-1')
  const firstCase = (await adminFirestore.doc(`cases/${first.id}`).get()).data()
  const secondCase = (await adminFirestore.doc(`cases/${second.id}`).get()).data()
  const firstWarranty = (await adminFirestore.doc(`cases/${first.id}/appliedWarranties/${firstCase.registrationWarrantyId}`).get()).data()
  const secondWarranty = (await adminFirestore.doc(`cases/${second.id}/appliedWarranties/${secondCase.registrationWarrantyId}`).get()).data()
  assert.equal(firstWarranty.periodYears, 5)
  assert.equal(firstWarranty.expiryDate, '2031-09-09')
  assert.equal(secondWarranty.periodYears, 1)
  assert.equal(secondWarranty.expiryDate, '2025-02-28')
})
