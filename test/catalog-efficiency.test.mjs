import assert from 'node:assert/strict'
import { test } from 'node:test'
import { propertyPrototypeOperation } from '../functions/property-warranty.js'

function database() {
  const records = new Map([['staffAccounts/admin', { enabled: true, role: 'house_solution_administrator' }]])
  const reads = [], queries = []
  const snap = path => ({ id: path.split('/').at(-1), exists: records.has(path), data: () => records.get(path) })
  const doc = path => ({ path, id: path.split('/').at(-1), get: async () => { reads.push(path); return snap(path) } })
  const collection = name => {
    const query = (conditions = [], limit = Infinity) => ({
      where: (field, op, value) => query([...conditions, [typeof field === 'string' ? field : '__name__', op, value]], limit),
      orderBy: () => query(conditions, limit), limit: value => query(conditions, value), doc: key => doc(`${name}/${key ?? 'new'}`),
      get: async () => {
        const docs = [...records].filter(([path, value]) => path.startsWith(`${name}/`) && conditions.every(([field, , expected]) => (field === '__name__' ? path.split('/').at(-1) : value[field]) === expected))
          .sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, limit).map(([path]) => snap(path))
        queries.push({ name, conditions, fetched: docs.length, limit }); reads.push(...docs.map(d => `${name}/${d.id}`)); return { docs }
      },
    })
    return query()
  }
  const db = { doc, collection, records, reads, queries, getAll: async (...refs) => refs.map(ref => ({ ...snap(ref.path), ref })), runTransaction: async fn => fn({ get: async ref => ref.get(), set: (ref, value) => records.set(ref.path, { ...records.get(ref.path), ...value }) }) }
  for (let i = 0; i < 25; i++) {
    records.set(`constructionCompanies/match-${i}`, { name: `Found ${i}`, defaultGroupId: 'g', updatedAt: i, enabled: i !== 0 })
    records.set(`constructionCompanies/other-${i}`, { name: `Other ${i}`, defaultGroupId: 'other', updatedAt: 100 + i })
    records.set(`companyBranches/match-${i}`, { name: `Branch ${i}`, constructionCompanyId: 'match-0', updatedAt: i, enabled: i !== 0 })
    records.set(`companyBranches/other-${i}`, { name: `Other ${i}`, constructionCompanyId: 'other-0', updatedAt: 100 + i })
  }
  records.set('warrantyGroups/g', { name: 'G', enabled: true })
  return db
}

test('property list queries the exact warranty number in the database and preserves bounded defaults and account scope', async () => {
  const db = database()
  for (let i = 0; i < 50; i++) db.records.set(`propertyWarranties/p-${i}`, { warrantyNumber: `QA-26-${i}`, name: '架空物件', constructionCompanyId: i === 0 ? 'other' : 'match-0', branchId: 'b', updatedAt: i })
  let result = await propertyPrototypeOperation({}, db, { action: 'propertyList' }, 'admin')
  assert.equal(result.rows.length, 20); assert.equal(result.limited, true)
  db.queries.length = 0
  result = await propertyPrototypeOperation({}, db, { action: 'propertyList', filter: { warrantyNumber: ' QA-26-0 ' } }, 'admin')
  assert.deepEqual(result.rows.map(r => r.id), ['p-0'])
  assert.equal(result.limited, false)
  assert.deepEqual(db.queries[0].conditions, [['warrantyNumber', '==', 'QA-26-0']])
  assert.equal(db.queries[0].fetched, 1)
  for (const number of ['26-0', 'QA-26', 'qa-26-0', 'missing']) assert.equal((await propertyPrototypeOperation({}, db, { action: 'propertyList', filter: { warrantyNumber: number } }, 'admin')).rows.length, 0)
  db.records.set('constructionCompanyAccounts/user', { enabled: true, role: 'construction_company', constructionCompanyId: 'match-0', scope: 'branch', branchId: 'b' })
  assert.equal((await propertyPrototypeOperation({}, db, { action: 'propertyList', filter: { warrantyNumber: 'QA-26-0' } }, 'user')).rows.length, 0)
  assert.equal((await propertyPrototypeOperation({}, db, { action: 'propertyList', filter: { warrantyNumber: 'QA-26-1' } }, 'user')).rows.length, 1)
  db.records.get('constructionCompanyAccounts/user').branchId = 'elsewhere'
  assert.equal((await propertyPrototypeOperation({}, db, { action: 'propertyList', filter: { warrantyNumber: 'QA-26-1' } }, 'user')).rows.length, 0)
  for (const filter of [{ search: '架空' }, { groupId: 'g' }, { warrantyNumber: 123 }]) await assert.rejects(propertyPrototypeOperation({}, db, { action: 'propertyList', filter }, 'admin'), { code: 'invalid-argument' })
})
test('default catalog remains freshest 20, filtered candidates beyond twenty stay complete with fewer reads', async () => {
  const db = database()
  let result = await propertyPrototypeOperation({}, db, { action: 'catalog' }, 'admin')
  assert.equal(result.companies.length, 20); assert.equal(result.branches.length, 20)
  db.queries.length = 0
  result = await propertyPrototypeOperation({}, db, { action: 'catalog', groupId: 'g', companyId: 'match-0' }, 'admin')
  assert.equal(result.companies.length, 25); assert.equal(result.branches.length, 25)
  assert.equal(result.companies.find(c => c.id === 'match-0').enabled, false)
  assert.equal(result.branches.find(c => c.id === 'match-0').enabled, false)
  assert.deepEqual(db.queries.map(q => [q.name, q.fetched]), [['constructionCompanies', 25], ['companyBranches', 25], ['warrantyGroups', 1]])
  assert.deepEqual(db.queries[0].conditions, [['defaultGroupId', '==', 'g']])
  assert.deepEqual(db.queries[1].conditions, [['constructionCompanyId', '==', 'match-0']])
})
test('company search purpose skips all branch reads while preserving search matches and legacy shape', async () => {
  const db = database()
  const result = await propertyPrototypeOperation({}, db, { action: 'catalog', search: 'Found', purpose: 'companyOptions' }, 'admin')
  assert.equal(result.companies.length, 25); assert.deepEqual(result.branches, [])
  assert.equal(db.queries.some(q => q.name === 'companyBranches'), false)
  assert.equal(result.groups.length, 1)
})
test('company/branch account scope cannot request another company and still limits default branch lookup', async () => {
  const db = database()
  db.records.set('constructionCompanyAccounts/user', { enabled: true, role: 'construction_company', constructionCompanyId: 'match-0', scope: 'branch', branchId: 'match-3' })
  const result = await propertyPrototypeOperation({}, db, { action: 'catalog' }, 'user')
  assert.deepEqual(result.companies.map(c => c.id), ['match-0'])
  assert.deepEqual(result.branches.map(c => c.id), ['match-3'])
  await assert.rejects(propertyPrototypeOperation({}, db, { action: 'catalog', companyId: 'other-0' }, 'user'), { code: 'permission-denied' })
})
test('company/branch saves read the reference only once in the transaction and retain missing/disabled validation', async () => {
  const db = database()
  const address = { prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '架空1' }
  await propertyPrototypeOperation({}, db, { action: 'saveCompany', name: 'New', defaultGroupId: 'g', address }, 'admin')
  assert.equal(db.reads.filter(path => path === 'warrantyGroups/g').length, 1)
  await propertyPrototypeOperation({}, db, { action: 'saveBranch', name: 'New', constructionCompanyId: 'match-0', address }, 'admin')
  assert.equal(db.reads.filter(path => path === 'constructionCompanies/match-0').length, 1)
  await assert.rejects(propertyPrototypeOperation({}, db, { action: 'saveCompany', name: 'Missing', defaultGroupId: 'missing', address }, 'admin'), { code: 'not-found' })
  db.records.set('warrantyGroups/disabled', { enabled: false })
  await assert.rejects(propertyPrototypeOperation({}, db, { action: 'saveCompany', name: 'Disabled', defaultGroupId: 'disabled', address }, 'admin'), { code: 'failed-precondition' })
})
