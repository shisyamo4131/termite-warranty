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
test('retired HS catalog rejects default, search and hierarchy before master reads', async () => {
  const db = database()
  for (const input of [{}, {search:''}, {search:'Found'}, {groupId:'g'}, {companyId:'match-0'}, {purpose:'companyOptions'}, {purpose:'referenceStore'}]) {
    await assert.rejects(propertyPrototypeOperation({}, db, {action:'catalog',...input}, 'admin'), e=>['invalid-argument','failed-precondition'].includes(e.code))
    assert.deepEqual(db.queries, [])
    assert(db.reads.every(path=>path.startsWith('staffAccounts/')))
  }
})

test('portal catalog retains only the scoped reference store request and rejects extra conditions', async () => {
  const db=database()
  db.records.set('constructionCompanyAccounts/user',{enabled:true,role:'construction_company',constructionCompanyId:'match-0',scope:'branch',branchId:'match-3'})
  const result=await propertyPrototypeOperation({},db,{action:'catalog',purpose:'referenceStore'},'user')
  assert.deepEqual(result.companies.map(c=>c.id),['match-0'])
  assert.deepEqual(result.branches.map(c=>c.id),['match-3'])
  assert.equal(result.groups.length,1)
  db.queries.length=0
  for(const input of [{},{purpose:'referenceStore',companyId:'other-0'},{purpose:'referenceStore',search:''},{purpose:'unknown'}])await assert.rejects(propertyPrototypeOperation({},db,{action:'catalog',...input},'user'),{code:'invalid-argument'})
  assert.deepEqual(db.queries,[])
})

test('portal catalog rejects malformed account scope before master queries', async () => {
  const db=database()
  for(const patch of [{constructionCompanyId:''},{constructionCompanyId:'bad/path'},{scope:'branch',branchId:''},{scope:'branch',branchId:'bad/path'}]){
    db.records.set('constructionCompanyAccounts/user',{enabled:true,role:'construction_company',constructionCompanyId:'match-0',scope:'company',...patch})
    await assert.rejects(propertyPrototypeOperation({},db,{action:'catalog',purpose:'referenceStore'},'user'),{code:'permission-denied'})
  }
  assert.deepEqual(db.queries,[])
})

test('company/branch saves read the reference only once in the transaction and retain missing/disabled validation', async () => {
  const db = database()
  const address = { prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '架空1' }
  await propertyPrototypeOperation({}, db, { action: 'saveCompany', name: 'New', defaultGroupId: 'g', address }, 'admin')
  assert.equal(db.reads.filter(path => path === 'warrantyGroups/g').length, 1)
  await propertyPrototypeOperation({}, db, { action: 'saveBranch', name: 'New', constructionCompanyId: 'match-0', address }, 'admin')
  assert.equal(db.reads.filter(path => path === 'constructionCompanies/match-0').length, 1)
  await assert.rejects(propertyPrototypeOperation({}, db, { action: 'saveCompany', id: 'new-missing', name: 'Missing', defaultGroupId: 'missing', address }, 'admin'), { code: 'not-found' })
  db.records.set('warrantyGroups/disabled', { enabled: false })
  await assert.rejects(propertyPrototypeOperation({}, db, { action: 'saveCompany', id: 'new-disabled', name: 'Disabled', defaultGroupId: 'disabled', address }, 'admin'), { code: 'failed-precondition' })
})

test('disabled masters reject stale edits and reenable only their state without replacing legacy fields',async()=>{
  const db=database(),address={prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'1'}
  for(const [kind,collection,action,fields] of [
    ['company','constructionCompanies','saveCompany',{defaultGroupId:'g',address}],
    ['branch','companyBranches','saveBranch',{constructionCompanyId:'match-0'}],
    ['group','warrantyGroups','saveGroup',{prefix:'INACTIVE',fiscalStartMonth:1}],
  ]){
    const key='disabled-'+kind,original={name:'Original',enabled:false,...fields,legacyOnly:'preserved'}
    db.records.set(`${collection}/${key}`,original)
    for(const enabled of [false,true])await assert.rejects(propertyPrototypeOperation({},db,{action,id:key,name:'Changed',...fields,enabled},'admin'),/先に有効化/)
    assert.deepEqual(db.records.get(`${collection}/${key}`),original)
    await assert.rejects(propertyPrototypeOperation({},db,{action:'reenableMaster',kind,id:key,name:'Changed'},'admin'),/別々/)
    await propertyPrototypeOperation({},db,{action:'reenableMaster',kind,id:key,runtimeGeneration:1,runtimeProtocol:2},'admin')
    const {updatedAt,...result}=db.records.get(`${collection}/${key}`)
    assert.deepEqual(result,{...original,enabled:true})
    assert.ok(updatedAt)
    await propertyPrototypeOperation({},db,{action,id:key,name:'Changed',...fields},'admin')
    assert.equal(db.records.get(`${collection}/${key}`).name,'Changed')
  }
})


test('prefix overflow fails before equality query or write',async()=>{
 const db=database(),before=new Map(db.records)
 await assert.rejects(propertyPrototypeOperation({},db,{action:'saveGroup',id:'long',name:'架空',prefix:'A'.repeat(1500),fiscalStartMonth:1},'admin'),{code:'invalid-argument'})
 assert.deepEqual(db.queries,[]);assert.deepEqual(db.records,before)
 db.records.set('warrantyGroups/long',{enabled:false,prefix:'A'.repeat(1500)})
 await assert.rejects(propertyPrototypeOperation({},db,{action:'reenableMaster',kind:'group',id:'long'},'admin'),{code:'failed-precondition'})
 assert.deepEqual(db.queries,[]);assert.equal(db.records.get('warrantyGroups/long').enabled,false)
})
