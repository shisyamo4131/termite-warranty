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
import { normalizeMasterFields } from '../../src/domain/master-data.mjs'

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
const homeownerFields = (overrides = {}) => ({
  name: 'Synthetic homeowner',
  address: { postalCode: '100-0001', prefecture: 'Tokyo', municipality: 'Chiyoda', streetTownAndNumber: '1-1', buildingName: null },
  telephone: null, fax: null, notes: null,
  ...overrides,
})
const warrantyFields = (overrides = {}) => ({ name: 'Synthetic warranty', defaultPeriodYears: 5, ...overrides })
const businessFields = (data) => {
  const { active, revision, createdAt, updatedAt, ...fields } = data
  return fields
}

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
    masterType: 'homeowner', fields: homeownerFields({ name: 'New owner' }),
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

test('trusted homeowner create and update normalize the required address and preserve optional contacts', async () => {
  const created = await createMasterTransaction(firestore, {
    masterType: 'homeowner',
    fields: homeownerFields({
      address: { postalCode: '100-0001', prefecture: ' Tokyo ', municipality: ' Chiyoda ', streetTownAndNumber: ' 1-1 ', buildingName: ' Building ', },
      telephone: ' 03-1111-2222 ', fax: ' 03-3333-4444 ', notes: ' note ',
    }),
  }, 'staff-1')
  let data = (await firestore.doc(`homeowners/${created.id}`).get()).data()
  assert.deepEqual(data.address, { postalCode: '1000001', prefecture: 'Tokyo', municipality: 'Chiyoda', streetTownAndNumber: '1-1', buildingName: 'Building' })
  assert.equal(data.telephone, '03-1111-2222')
  assert.equal(data.fax, '03-3333-4444')
  assert.equal(data.notes, 'note')

  await updateMasterTransaction(firestore, {
    masterType: 'homeowner', id: created.id,
    fields: homeownerFields({ address: { postalCode: '1500001', prefecture: 'Tokyo', municipality: 'Shibuya', streetTownAndNumber: '2-2', buildingName: null }, telephone: '', fax: '', notes: '' }),
  }, 'staff-1')
  data = (await firestore.doc(`homeowners/${created.id}`).get()).data()
  assert.deepEqual(data.address, { postalCode: '1500001', prefecture: 'Tokyo', municipality: 'Shibuya', streetTownAndNumber: '2-2', buildingName: null })
  assert.equal(data.telephone, null)
  assert.equal(data.fax, null)
  assert.equal(data.notes, null)
})

test('concurrent update and lifecycle mutations use commit-order revisions without partial writes', async () => {
  const created = await createMasterTransaction(firestore, {
    masterType: 'homeowner', fields: homeownerFields({ name: 'Original' }),
  }, 'staff-1')
  const [updated, toggled] = await Promise.all([
    updateMasterTransaction(firestore, {
      masterType: 'homeowner', id: created.id, fields: homeownerFields({ name: 'Updated' }),
    }, 'staff-1'),
    setMasterActiveTransaction(firestore, {
      masterType: 'homeowner', id: created.id, active: false,
    }, 'staff-1'),
  ])
  assert.deepEqual(new Set([updated.revision, toggled.revision]), new Set([2, 3]))
  const data = (await firestore.doc(`homeowners/${created.id}`).get()).data()
  assert.equal(data.revision, 3)
  assert.equal(data.name, 'Updated')
  assert.equal(data.active, false)
})

test('sequential update and lifecycle preserve the non-targeted state in either order', async () => {
  const scenarios = [
    ['update-then-lifecycle', async (id, fields) => {
      await updateMasterTransaction(firestore, { masterType: 'homeowner', id, fields }, 'staff-1')
      await setMasterActiveTransaction(firestore, { masterType: 'homeowner', id, active: false }, 'staff-1')
    }],
    ['lifecycle-then-update', async (id, fields) => {
      await setMasterActiveTransaction(firestore, { masterType: 'homeowner', id, active: false }, 'staff-1')
      await updateMasterTransaction(firestore, { masterType: 'homeowner', id, fields }, 'staff-1')
    }],
  ]
  const fields = homeownerFields({ name: 'Changed', address: { postalCode: '150-0001', prefecture: 'Tokyo', municipality: 'Shibuya', streetTownAndNumber: '2-2', buildingName: 'Building' }, telephone: '1', fax: '2', notes: 'changed' })
  for (const [, apply] of scenarios) {
    const created = await createMasterTransaction(firestore, { masterType: 'homeowner', fields: homeownerFields({ name: 'Original' }) }, 'staff-1')
    const before = (await firestore.doc(`homeowners/${created.id}`).get()).data()
    await apply(created.id, fields)
    const after = (await firestore.doc(`homeowners/${created.id}`).get()).data()
    assert.equal(after.active, false)
    assert.equal(after.revision, 3)
    assert.equal(after.createdAt.isEqual(before.createdAt), true)
    assert.deepEqual(businessFields(after), normalizeMasterFields('homeowner', fields))
  }
})

test('concurrent updates for all four masters retain both committed revisions and the higher-revision payload', async () => {
  const scenarios = [
    ['constructionCompany', 'constructionCompanies', companyFields,
      companyFields({ name: ' Company A ', address: { postalCode: '101-0001', prefecture: 'One', municipality: 'One City', streetTownAndNumber: '1-1', buildingName: 'A' }, telephone: '1', fax: '2', contactPerson: 'A', contactDetails: 'A details', email: 'a@example.invalid', notes: 'A note' }),
      companyFields({ name: ' Company B ', address: { postalCode: '102-0002', prefecture: 'Two', municipality: 'Two City', streetTownAndNumber: '2-2', buildingName: 'B' }, telephone: '3', fax: '4', contactPerson: 'B', contactDetails: 'B details', email: 'b@example.invalid', notes: 'B note' })],
    ['homeowner', 'homeowners', homeownerFields,
      homeownerFields({ name: ' Homeowner A ', address: { postalCode: '103-0003', prefecture: 'Three', municipality: 'Three City', streetTownAndNumber: '3-3', buildingName: 'A' }, telephone: '5', fax: '6', notes: 'A note' }),
      homeownerFields({ name: ' Homeowner B ', address: { postalCode: '104-0004', prefecture: 'Four', municipality: 'Four City', streetTownAndNumber: '4-4', buildingName: 'B' }, telephone: '7', fax: '8', notes: 'B note' })],
    ['warrantyService', 'warrantyServices', warrantyFields,
      warrantyFields({ name: 'Warranty A', defaultPeriodYears: 2 }),
      warrantyFields({ name: 'Warranty B', defaultPeriodYears: 9 })],
    ['property', 'properties', propertyFields,
      propertyFields({ name: ' Property A ', homeownerId: 'homeowner-1', constructionCompanyId: 'company-1', address: { postalCode: '105-0005', prefecture: 'Five', municipality: 'Five City', streetTownAndNumber: '5-5', buildingName: 'A' } }),
      propertyFields({ name: ' Property B ', homeownerId: 'homeowner-2', constructionCompanyId: 'company-2', address: { postalCode: '106-0006', prefecture: 'Six', municipality: 'Six City', streetTownAndNumber: '6-6', buildingName: 'B' } })],
  ]
  for (const [masterType, collection, makeFields, firstFields, secondFields] of scenarios) {
    const created = await createMasterTransaction(firestore, {
      masterType, fields: makeFields({ name: 'Original' }),
    }, 'staff-1')
    const createdData = (await firestore.doc(`${collection}/${created.id}`).get()).data()
    const [first, second] = await Promise.all([
      updateMasterTransaction(firestore, { masterType, id: created.id, fields: firstFields }, 'staff-1'),
      updateMasterTransaction(firestore, { masterType, id: created.id, fields: secondFields }, 'staff-1'),
    ])
    assert.deepEqual(new Set([first.revision, second.revision]), new Set([2, 3]))
    const data = (await firestore.doc(`${collection}/${created.id}`).get()).data()
    assert.equal(data.revision, 3)
    assert.equal(data.active, true)
    assert.equal(data.createdAt.isEqual(createdData.createdAt), true)
    assert.deepEqual(
      businessFields(data),
      normalizeMasterFields(masterType, first.revision > second.revision ? firstFields : secondFields),
    )
  }
})

test('all four masters retain IDs and increment revisions through update, inactivate, and reactivate', async () => {
  const scenarios = [
    {
      masterType: 'constructionCompany', collection: 'constructionCompanies',
      createFields: companyFields({ name: '旧あ' }), updateFields: companyFields({ name: '新い', telephone: ' 03-1234-5678 ' }),
    },
    {
      masterType: 'homeowner', collection: 'homeowners',
      createFields: homeownerFields({ name: '旧あ' }), updateFields: homeownerFields({ name: '新い' }),
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
    const createdData = (await firestore.doc(`${scenario.collection}/${created.id}`).get()).data()
    const updated = await updateMasterTransaction(firestore, {
      masterType: scenario.masterType, id: created.id, fields: scenario.updateFields,
    }, 'staff-1')
    assert.equal(updated.id, created.id)
    assert.equal(updated.revision, 2)

    let data = (await firestore.doc(`${scenario.collection}/${created.id}`).get()).data()
    assert.equal(data.name, scenario.updateFields.name)
    assert.equal(data.active, true)
    assert.equal(data.createdAt.isEqual(createdData.createdAt), true)
    assert.equal(data.updatedAt.isEqual(createdData.updatedAt), false)
    if (scenario.masterType !== 'warrantyService') {
      assert.deepEqual(data.nameSearch.two, { '新イ': true })
      assert.equal(data.nameSearch.two['旧ア'], undefined)
    }
    if (scenario.masterType === 'constructionCompany') {
      assert.equal(data.telephone, '03-1234-5678')
      assert.equal(data.address.postalCode, '1000001')
    }

    const inactive = await setMasterActiveTransaction(firestore, {
      masterType: scenario.masterType, id: created.id, active: false,
    }, 'staff-1')
    assert.deepEqual(inactive, { id: created.id, revision: 3 })
    data = (await firestore.doc(`${scenario.collection}/${created.id}`).get()).data()
    assert.equal(data.active, false)
    assert.equal(data.revision, 3)
    assert.equal(data.createdAt.isEqual(createdData.createdAt), true)
    assert.deepEqual(businessFields(data), normalizeMasterFields(scenario.masterType, scenario.updateFields))
    const active = await setMasterActiveTransaction(firestore, {
      masterType: scenario.masterType, id: created.id, active: true,
    }, 'staff-1')
    assert.deepEqual(active, { id: created.id, revision: 4 })
    data = (await firestore.doc(`${scenario.collection}/${created.id}`).get()).data()
    assert.equal(data.active, true)
    assert.equal(data.revision, 4)
    assert.equal(data.createdAt.isEqual(createdData.createdAt), true)
    assert.deepEqual(businessFields(data), normalizeMasterFields(scenario.masterType, scenario.updateFields))
  }
})

test('missing or disabled staff reject update and lifecycle mutations atomically', async () => {
  const operations = [
    ['update', (id, actorUid) => updateMasterTransaction(firestore, { masterType: 'homeowner', id, fields: homeownerFields({ name: 'Rejected' }) }, actorUid)],
    ['lifecycle', (id, actorUid) => setMasterActiveTransaction(firestore, { masterType: 'homeowner', id, active: false }, actorUid)],
  ]
  for (const [staffState, actorUid] of [['missing', 'missing-staff'], ['disabled', 'staff-1']]) {
    for (const [, operation] of operations) {
      const created = await createMasterTransaction(firestore, { masterType: 'homeowner', fields: homeownerFields({ name: 'Unchanged' }) }, 'staff-1')
      if (staffState === 'disabled') await firestore.doc('staffAccounts/staff-1').update({ enabled: false })
      const before = (await firestore.doc(`homeowners/${created.id}`).get()).data()
      await assert.rejects(operation(created.id, actorUid), (error) => error?.code === 'permission-denied')
      assert.deepEqual((await firestore.doc(`homeowners/${created.id}`).get()).data(), before)
      if (staffState === 'disabled') await firestore.doc('staffAccounts/staff-1').update({ enabled: true })
    }
  }
})

test('missing, invalid, or non-incrementable stored revisions reject update and lifecycle atomically', async () => {
  const revisions = [
    ['missing', undefined], ['zero', 0], ['fractional', 1.5], ['string', '1'],
    ['max-safe', Number.MAX_SAFE_INTEGER], ['non-safe', Number.MAX_SAFE_INTEGER + 1],
  ]
  const operations = [
    ['update', (id) => updateMasterTransaction(firestore, { masterType: 'homeowner', id, fields: homeownerFields({ name: 'Rejected' }) }, 'staff-1')],
    ['lifecycle', (id) => setMasterActiveTransaction(firestore, { masterType: 'homeowner', id, active: false }, 'staff-1')],
  ]
  for (const [label, revision] of revisions) {
    for (const [operationLabel, operation] of operations) {
      const id = `${label}-${operationLabel}`
      const data = {
        ...homeownerFields({ name: 'Unchanged' }), active: true,
        createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(1),
      }
      if (revision !== undefined) data.revision = revision
      await firestore.doc(`homeowners/${id}`).set(data)
      const before = (await firestore.doc(`homeowners/${id}`).get()).data()
      await assert.rejects(operation(id), (error) => error?.code === 'failed-precondition')
      assert.deepEqual((await firestore.doc(`homeowners/${id}`).get()).data(), before)
    }
  }
  await assert.rejects(
    setMasterActiveTransaction(firestore, { masterType: 'homeowner', id: 'missing', active: false }, 'staff-1'),
    (error) => error?.code === 'not-found',
  )
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
    createMasterTransaction(firestore, { masterType: 'homeowner', fields: homeownerFields({ name: 'Denied' }) }, 'staff-1'),
    (error) => error?.code === 'permission-denied',
  )
})

test('active property update rejects inactive or missing references without changing the property', async () => {
  const property = await createMasterTransaction(firestore, { masterType: 'property', fields: propertyFields() }, 'staff-1')
  const attempts = [
    async () => firestore.doc('homeowners/homeowner-1').update({ active: false }),
    async () => firestore.doc('constructionCompanies/company-1').delete(),
  ]
  for (const prepareReferenceFailure of attempts) {
    await seedBase()
    const before = (await firestore.doc(`properties/${property.id}`).get()).data()
    await prepareReferenceFailure()
    await assert.rejects(
      updateMasterTransaction(firestore, { masterType: 'property', id: property.id, fields: propertyFields() }, 'staff-1'),
      (error) => error?.code === 'failed-precondition',
    )
    assert.deepEqual((await firestore.doc(`properties/${property.id}`).get()).data(), before)
  }
})

test('inactive property reactivation rejects inactive or missing current references without changing the property', async () => {
  const attempts = [
    async () => firestore.doc('homeowners/homeowner-1').update({ active: false }),
    async () => firestore.doc('constructionCompanies/company-1').delete(),
  ]
  for (const prepareReferenceFailure of attempts) {
    const property = await createMasterTransaction(firestore, { masterType: 'property', fields: propertyFields() }, 'staff-1')
    await setMasterActiveTransaction(firestore, { masterType: 'property', id: property.id, active: false }, 'staff-1')
    await prepareReferenceFailure()
    const before = (await firestore.doc(`properties/${property.id}`).get()).data()
    await assert.rejects(
      setMasterActiveTransaction(firestore, { masterType: 'property', id: property.id, active: true }, 'staff-1'),
      (error) => error?.code === 'failed-precondition',
    )
    assert.deepEqual((await firestore.doc(`properties/${property.id}`).get()).data(), before)
    await seedBase()
  }
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
    masterType: 'property', id: property.id,
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
      masterType: 'property', id: property.id,
      fields: propertyFields({ homeownerId: 'missing-homeowner' }),
    }, 'staff-1'),
    /施主が見つかりません/,
  )
  assert.equal((await firestore.doc(`properties/${property.id}`).get()).data().revision, 1)
  assert.equal((await firestore.doc('cases/case-1').get()).data().homeownerId, 'homeowner-1')
})
