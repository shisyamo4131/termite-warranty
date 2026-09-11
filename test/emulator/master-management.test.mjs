import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteApp, initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import {
  createMasterTransaction,
  setMasterActiveTransaction,
  updateMasterTransaction,
} from '../../functions/master-management.js'

const projectId = 'demo-termite-warranty'
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180') {
  throw new Error('Master integration tests require the dedicated local Firestore emulator at 127.0.0.1:8180.')
}

let testEnvironment
let adminApp
let firestore

const metadata = () => ({ revision: 1, createdAt: Timestamp.now(), updatedAt: Timestamp.now() })
const propertyFields = (overrides = {}) => ({
  name: 'Synthetic property',
  homeownerId: 'homeowner-1',
  constructionCompanyId: 'company-1',
  address: {
    postalCode: '100-0001', prefecture: 'Tokyo', municipality: 'Chiyoda',
    streetTownAndNumber: '1-1', buildingName: null,
  },
  ...overrides,
})
const companyFields = (overrides = {}) => ({
  name: 'Synthetic company',
  address: {
    postalCode: '100-0001', prefecture: 'Tokyo', municipality: 'Chiyoda',
    streetTownAndNumber: '1-1', buildingName: null,
  },
  telephone: null, fax: null, contactPerson: null, contactDetails: null, email: null, notes: null,
  ...overrides,
})

async function seedBase() {
  const batch = firestore.batch()
  batch.set(firestore.doc('staffAccounts/staff-1'), {
    email: 'staff-1@example.invalid', displayName: 'Staff 1', role: 'general_staff', enabled: true,
  })
  batch.set(firestore.doc('constructionCompanies/company-1'), {
    name: 'Company 1', active: true, nameSearch: { normalized: '', one: {}, two: {} }, ...metadata(),
  })
  batch.set(firestore.doc('constructionCompanies/company-2'), {
    name: 'Company 2', active: true, nameSearch: { normalized: '', one: {}, two: {} }, ...metadata(),
  })
  batch.set(firestore.doc('homeowners/homeowner-1'), {
    name: 'Homeowner 1', active: true, nameSearch: { normalized: '', one: {}, two: {} }, ...metadata(),
  })
  batch.set(firestore.doc('homeowners/homeowner-2'), {
    name: 'Homeowner 2', active: true, nameSearch: { normalized: '', one: {}, two: {} }, ...metadata(),
  })
  await batch.commit()
}

before(async () => {
  testEnvironment = await initializeTestEnvironment({ projectId })
  adminApp = initializeApp({ projectId }, 'master-management-integration-test')
  firestore = getFirestore(adminApp)
})
beforeEach(async () => {
  await testEnvironment.clearFirestore()
  await seedBase()
})
after(async () => {
  await testEnvironment?.cleanup()
  await deleteApp(adminApp)
})

test('trusted create supports exactly four masters with revision metadata and server N-Grams', async () => {
  const company = await createMasterTransaction(firestore, {
    masterType: 'constructionCompany', fields: companyFields({ name: ' Ａあ工務店 ' }),
  }, 'staff-1')
  const homeowner = await createMasterTransaction(firestore, {
    masterType: 'homeowner', fields: { name: 'New owner' },
  }, 'staff-1')
  const service = await createMasterTransaction(firestore, {
    masterType: 'warrantyService', fields: { name: 'Five year', defaultPeriodYears: 5 },
  }, 'staff-1')
  const property = await createMasterTransaction(firestore, {
    masterType: 'property', fields: propertyFields(),
  }, 'staff-1')

  for (const [collection, result] of [
    ['constructionCompanies', company], ['homeowners', homeowner],
    ['warrantyServices', service], ['properties', property],
  ]) {
    const data = (await firestore.doc(`${collection}/${result.id}`).get()).data()
    assert.equal(data.revision, 1)
    assert.ok(data.createdAt instanceof Timestamp)
    assert.ok(data.updatedAt instanceof Timestamp)
  }
  const companyData = (await firestore.doc(`constructionCompanies/${company.id}`).get()).data()
  assert.equal(companyData.nameSearch.normalized, 'aア工務店')
  assert.equal(companyData.nameSearch.two['aア'], true)
  assert.equal(companyData.address.postalCode, '1000001')
  assert.equal(companyData.telephone, null)
  const propertyData = (await firestore.doc(`properties/${property.id}`).get()).data()
  assert.equal(propertyData.address.postalCode, '1000001')
})

test('update and activation use optimistic revision conflicts without partial writes', async () => {
  const created = await createMasterTransaction(firestore, {
    masterType: 'homeowner', fields: { name: 'Original' },
  }, 'staff-1')
  const updated = await updateMasterTransaction(firestore, {
    masterType: 'homeowner', id: created.id, expectedRevision: 1, fields: { name: 'Updated' },
  }, 'staff-1')
  assert.equal(updated.revision, 2)
  await assert.rejects(
    updateMasterTransaction(firestore, {
      masterType: 'homeowner', id: created.id, expectedRevision: 1, fields: { name: 'Stale' },
    }, 'staff-1'),
    (error) => error?.code === 'aborted',
  )
  assert.equal((await firestore.doc(`homeowners/${created.id}`).get()).data().name, 'Updated')
  const toggled = await setMasterActiveTransaction(firestore, {
    masterType: 'homeowner', id: created.id, expectedRevision: 2, active: false,
  }, 'staff-1')
  assert.equal(toggled.revision, 3)
  assert.equal((await firestore.doc(`homeowners/${created.id}`).get()).data().active, false)
})

test('all four masters retain IDs and increment revisions through update, inactivate, and reactivate', async () => {
  const scenarios = [
    {
      masterType: 'constructionCompany', collection: 'constructionCompanies',
      createFields: companyFields({ name: '旧あ' }), updateFields: companyFields({ name: '新い', telephone: ' 03-1234-5678 ' }),
    },
    {
      masterType: 'homeowner', collection: 'homeowners',
      createFields: { name: '旧あ' }, updateFields: { name: '新い' },
    },
    {
      masterType: 'warrantyService', collection: 'warrantyServices',
      createFields: { name: 'Old warranty', defaultPeriodYears: 5 },
      updateFields: { name: 'New warranty', defaultPeriodYears: 10 },
    },
    {
      masterType: 'property', collection: 'properties',
      createFields: propertyFields({ name: '旧あ' }), updateFields: propertyFields({ name: '新い' }),
    },
  ]

  for (const scenario of scenarios) {
    const created = await createMasterTransaction(firestore, {
      masterType: scenario.masterType, fields: scenario.createFields,
    }, 'staff-1')
    const updated = await updateMasterTransaction(firestore, {
      masterType: scenario.masterType, id: created.id, expectedRevision: 1, fields: scenario.updateFields,
    }, 'staff-1')
    assert.equal(updated.id, created.id)
    assert.equal(updated.revision, 2)

    let data = (await firestore.doc(`${scenario.collection}/${created.id}`).get()).data()
    assert.equal(data.name, scenario.updateFields.name)
    if (scenario.masterType !== 'warrantyService') {
      assert.deepEqual(data.nameSearch.two, { '新イ': true })
      assert.equal(data.nameSearch.two['旧ア'], undefined)
    }
    if (scenario.masterType === 'constructionCompany') {
      assert.equal(data.telephone, '03-1234-5678')
      assert.equal(data.address.postalCode, '1000001')
    }

    const inactive = await setMasterActiveTransaction(firestore, {
      masterType: scenario.masterType, id: created.id, expectedRevision: 2, active: false,
    }, 'staff-1')
    assert.deepEqual(inactive, { id: created.id, revision: 3 })
    data = (await firestore.doc(`${scenario.collection}/${created.id}`).get()).data()
    assert.equal(data.active, false)
    assert.equal(data.revision, 3)
    const active = await setMasterActiveTransaction(firestore, {
      masterType: scenario.masterType, id: created.id, expectedRevision: 3, active: true,
    }, 'staff-1')
    assert.deepEqual(active, { id: created.id, revision: 4 })
    data = (await firestore.doc(`${scenario.collection}/${created.id}`).get()).data()
    assert.equal(data.active, true)
    assert.equal(data.revision, 4)
  }
})

test('missing staff rejection leaves an existing master unchanged', async () => {
  const created = await createMasterTransaction(firestore, {
    masterType: 'homeowner', fields: { name: 'Unchanged' },
  }, 'staff-1')
  const before = (await firestore.doc(`homeowners/${created.id}`).get()).data()
  await assert.rejects(
    updateMasterTransaction(firestore, {
      masterType: 'homeowner', id: created.id, expectedRevision: 1, fields: { name: 'Denied' },
    }, 'missing-staff'),
    (error) => error?.code === 'permission-denied',
  )
  assert.deepEqual((await firestore.doc(`homeowners/${created.id}`).get()).data(), before)
})

test('usable property rejects inactive references and disabled staff', async () => {
  await firestore.doc('homeowners/homeowner-1').update({ active: false })
  await assert.rejects(
    createMasterTransaction(firestore, { masterType: 'property', fields: propertyFields() }, 'staff-1'),
    /有効な施主/,
  )
  await firestore.doc('homeowners/homeowner-1').update({ active: true })
  await firestore.doc('staffAccounts/staff-1').update({ enabled: false })
  await assert.rejects(
    createMasterTransaction(firestore, { masterType: 'homeowner', fields: { name: 'Denied' } }, 'staff-1'),
    (error) => error?.code === 'permission-denied',
  )
})

test('property homeowner and company update never propagates to linked cases across statuses', async () => {
  const property = await createMasterTransaction(firestore, {
    masterType: 'property', fields: propertyFields(),
  }, 'staff-1')
  const batch = firestore.batch()
  const unchangedTimes = new Map()
  for (const [id, status] of [['active-case', 'active'], ['cancelled-case', 'cancelled'], ['invalid-case', 'invalid']]) {
    const updatedAt = Timestamp.fromMillis(1000)
    unchangedTimes.set(id, updatedAt)
    batch.set(firestore.doc(`cases/${id}`), {
      propertyId: property.id,
      homeownerId: 'homeowner-1',
      constructionCompanyId: 'company-1',
      status,
      statusReason: status === 'active' ? null : `Synthetic ${status}`,
      updatedAt,
      preservedField: `preserved-${id}`,
    })
  }
  const unrelatedBefore = {
    propertyId: 'another-property', homeownerId: 'homeowner-1', constructionCompanyId: 'company-1', status: 'active', updatedAt: Timestamp.fromMillis(2000),
  }
  batch.set(firestore.doc('cases/unrelated'), unrelatedBefore)
  await batch.commit()

  const result = await updateMasterTransaction(firestore, {
    masterType: 'property', id: property.id, expectedRevision: 1,
    fields: propertyFields({ homeownerId: 'homeowner-2', constructionCompanyId: 'company-2' }),
  }, 'staff-1')
  assert.deepEqual(result, { id: property.id, revision: 2 })
  for (const id of unchangedTimes.keys()) {
    const data = (await firestore.doc(`cases/${id}`).get()).data()
    assert.equal(data.homeownerId, 'homeowner-1')
    assert.equal(data.constructionCompanyId, 'company-1')
    assert.equal(data.updatedAt.toMillis(), unchangedTimes.get(id).toMillis())
    assert.equal(data.status, id.replace('-case', ''))
    assert.equal(data.statusReason, id === 'active-case' ? null : `Synthetic ${id.replace('-case', '')}`)
    assert.equal(data.preservedField, `preserved-${id}`)
  }
  const propertyData = (await firestore.doc(`properties/${property.id}`).get()).data()
  assert.equal(propertyData.homeownerId, 'homeowner-2')
  assert.equal(propertyData.constructionCompanyId, 'company-2')
  assert.equal(propertyData.revision, 2)
  assert.equal(propertyData.nameSearch.normalized, 'syntheticproperty')
  const unrelated = (await firestore.doc('cases/unrelated').get()).data()
  assert.deepEqual(unrelated, unrelatedBefore)
})

test('inactive property rejects a missing homeowner reference without changing linked cases', async () => {
  const property = await createMasterTransaction(firestore, { masterType: 'property', fields: propertyFields() }, 'staff-1')
  await firestore.doc(`properties/${property.id}`).update({ active: false })
  await firestore.doc('cases/case-1').set({ propertyId: property.id, homeownerId: 'homeowner-1' })
  await assert.rejects(
    updateMasterTransaction(firestore, {
      masterType: 'property', id: property.id, expectedRevision: 1,
      fields: propertyFields({ homeownerId: 'missing-homeowner' }),
    }, 'staff-1'),
    /施主が見つかりません/,
  )
  assert.equal((await firestore.doc(`properties/${property.id}`).get()).data().revision, 1)
  assert.equal((await firestore.doc('cases/case-1').get()).data().homeownerId, 'homeowner-1')
})
