import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { normalizeBranchCode } from '../src/domain/branch-code.mjs'
import { CSV_TEMPLATE_HEADERS, createBulkImportTemplate, parseBulkImportCsv, prepareBulkImportRows } from '../src/domain/property-bulk-import.mjs'

const sample = { '外部キー': 'source-000001', '支店コード': '0001', '物件名': '架空施主', '申込日': '2026-10-01', '引渡日': '2026-10-05', '上棟日': '', '最長保証期間': '20', '現在保証年数': '10', '建築面積': '99.25', '住所': '東京都架空市1-1', '郵便番号': '0010001', '建物名': '', '断熱材あり': 'あり', '資材名': '架空資材', '施主電話番号': '', '既存保証番号': '', '備考': '' }
const csv = (...records) => createBulkImportTemplate() + records.map(record => CSV_TEMPLATE_HEADERS.map(key => `"${String(record[key.replace('（＊）','').replace('本支店コード','支店コード')] ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n'

test('branch codes have no 200 or 2000 character limit and reject controls before trimming',()=>{
  for(const code of ['0001','0'.repeat(201),'0'+'長'.repeat(2200)]){
    assert.equal(normalizeBranchCode(' '+code+' '),code)
    const prepared=prepareBulkImportRows(csv({...sample,'支店コード':' '+code+' '}))
    assert.deepEqual(prepared.errors,[])
    assert.equal(prepared.rows[0].branchCode,code)
  }
  assert.equal(normalizeBranchCode('  '),'')
  for(const control of ['\0','\t','\n','\r','\u001f','\u007f']){
    assert.throws(()=>normalizeBranchCode(control+'0001'),/制御文字/)
    assert.match(prepareBulkImportRows(csv({...sample,'支店コード':'0001'+control})).errors[0].message,/制御文字/)
  }
})

test('new branch header and legacy branch header retain the same internal source keys',()=>{
  assert.equal(CSV_TEMPLATE_HEADERS[1],'本支店コード（＊）')
  const current=csv(sample), legacy=current.replace('本支店コード（＊）','支店コード（＊）')
  assert.deepEqual(parseBulkImportCsv(legacy),parseBulkImportCsv(current))
  assert.equal(prepareBulkImportRows(legacy).rows[0].sourceValues['支店コード'],'0001')
  assert.throws(()=>parseBulkImportCsv(current.replace('本支店コード（＊）','本支店コード')),/見出し/)
})

test('CSV preserves leading zeros, quoted comma/newline/quotes and Unicode', () => {
  const value = { ...sample, '物件名': '架空,施主\n"二行"' }
  const rows = parseBulkImportCsv(csv(value))
  assert.equal(rows[0].line, 2)
  assert.equal(rows[0].values['支店コード'], '0001')
  assert.equal(rows[0].values['郵便番号'], '0010001')
  assert.equal(rows[0].values['物件名'], value['物件名'])
})
test('group policy controls missing address and insulation material without bypassing required fields', () => {
  const empty={...sample,'住所':'','資材名':''};
  const result=prepareBulkImportRows(csv(empty),{group:{addressRequired:false,insulationMaterialsRequired:false}});
  assert.deepEqual(result.errors,[]);assert.equal(result.rows[0].fields.address,'');assert.equal(result.rows[0].fields.insulationMaterials,'');
  assert.ok(prepareBulkImportRows(csv(empty)).errors.length);
  assert.ok(prepareBulkImportRows(csv({...sample,'資材名':''})).errors.length);
  assert.deepEqual(prepareBulkImportRows(csv({...sample,'断熱材あり':'なし','資材名':''})).errors,[]);
  assert.ok(prepareBulkImportRows(csv({...sample,'建築面積':''})).errors.length);
  assert.equal(Object.hasOwn(result.rows[0].fields,'ownerName'),false);
})
test('UH takes complete staff-prepared dates without calculating or matching branch prefix', () => {
  const value={...sample,'外部キー':'0123-2026001','支店コード':'9999','申込日':'2026-01-01','引渡日':'2026-05-02','最長保証期間':'10'};
  const options={group:{name:'UH'}};const result=prepareBulkImportRows(csv(value),options);
  assert.deepEqual(result.errors,[]);assert.equal(result.rows[0].fields.handoverDate,'2026-05-02');
  assert.equal(result.rows[0].years,10);
  assert.ok(prepareBulkImportRows(csv({...value,'申込日':'2026-01'}),options).errors.length);
  assert.ok(prepareBulkImportRows(csv({...value,'引渡日':''}),options).errors.length);
  assert.ok(prepareBulkImportRows(csv(value),{format:'uh',...options}).errors.length);
})
test('UH max warranty is exactly 10; common max 20 and 30 are preserved', () => {
  const value = { ...sample, '外部キー': '0123-2026001', '申込日': '2026-01-01', '引渡日': '2026-05-03', '最長保証期間': '10' }
  assert.deepEqual(prepareBulkImportRows(csv(value), { group: {name:'UH'} }).errors, [])
  for (const maxYears of ['20', '30']) {
    assert.ok(prepareBulkImportRows(csv({ ...value, '最長保証期間': maxYears }), { group: {name:'UH'} }).errors.some(error => error.message === 'UHの最長保証期間は10年です。'))
    const common = prepareBulkImportRows(csv({ ...sample, '最長保証期間': maxYears }))
    assert.deepEqual(common.errors, [])
    assert.equal(common.rows[0].fields.maxYears, Number(maxYears))
  }
})

test('Excel year-first slash dates normalize while received source values stay unchanged', () => {
  for (const [application, handover, expectedApplication, expectedHandover] of [
    ['2018/4/1','2018/6/30','2018-04-01','2018-06-30'],
    ['2026/01/08','2026/10/8','2026-01-08','2026-10-08'],
    ['2024/2/29','2024-03-01','2024-02-29','2024-03-01'],
  ]) {
    const input={...sample,'申込日':application,'引渡日':handover}
    const result=prepareBulkImportRows(csv(input))
    assert.deepEqual(result.errors,[])
    assert.equal(result.rows[0].fields.applicationDate,expectedApplication)
    assert.equal(result.rows[0].fields.handoverDate,expectedHandover)
    assert.equal(result.rows[0].sourceValues['申込日'],application)
    assert.equal(result.rows[0].sourceValues['引渡日'],handover)
    assert.equal(result.rows[0].branchCode,'0001')
  }
})

test('Excel date support rejects impossible, incomplete, ambiguous and serial values with row and field', () => {
  for (const value of ['2026/2/29','2026/2/30','2026/13/1','2026/0/1','2026/1/0','2026/1/32','2026/10','10/8/2026','26/10/8','20261008','46303','2026/10-08','2026-1-8','2026/10/8 00:00:00','']) {
    for (const field of ['申込日','引渡日']) {
      const result=prepareBulkImportRows(csv(sample,{...sample,'外部キー':'bad-date',[field]:value}))
      assert.equal(result.errors.length,1,value)
      assert.equal(result.errors[0].line,3)
      assert.ok(result.errors[0].message.includes(field))
    }
  }
})
test('whole file errors include duplicate keys, malformed last row and no silent skips', () => {
  assert.ok(prepareBulkImportRows(csv(sample, sample)).errors.some(error => error.message.includes('外部キーが重複')))
  const result = prepareBulkImportRows(csv(sample, { ...sample, '外部キー': 'second', '申込日': '2026-02-30' }))
  assert.equal(result.errors[0].line, 3)
  assert.deepEqual(prepareBulkImportRows(csv({ ...sample, '現在保証年数': '20' })).errors, [])
  assert.ok(prepareBulkImportRows(csv({ ...sample, '断熱材あり': 'true' })).errors.length)
})
test('quoted external keys reject internal controls accepted by the CSV parser', () => {
  for (const character of ['\t', '\n', '\r', '\u007f']) {
    const value = { ...sample, '外部キー': `source${character}invalid` }
    assert.equal(parseBulkImportCsv(csv(value))[0].values['外部キー'], value['外部キー'])
    const prepared = prepareBulkImportRows(csv(sample, value))
    assert.equal(prepared.errors.length, 1)
    assert.match(prepared.errors[0].message, /外部キー/)
  }
})
test('CSV rejects control characters at key edges and trims ordinary spaces', () => {
  for (const value of ['\tfirst', 'last\n', '\rwrapped\u007f']) {
    assert.match(prepareBulkImportRows(csv({ ...sample, '外部キー': value })).errors[0].message, /外部キー/)
  }
  assert.equal(prepareBulkImportRows(csv({ ...sample, '外部キー': '  source-000001  ' })).rows[0].externalKey, sample['外部キー'])
})
test('strict template, quoting, capacity and unknown columns reject malformed input', () => {
  assert.throws(() => parseBulkImportCsv(createBulkImportTemplate()), /取込対象/)
  assert.throws(() => parseBulkImportCsv(csv(sample).replace('"備考"', '"取消状態"')), /見出し/)
  assert.throws(() => parseBulkImportCsv(createBulkImportTemplate() + '"not closed'), /閉じられて/)
  assert.throws(() => parseBulkImportCsv(createBulkImportTemplate() + '"x"suffix'), /引用符の後/)
  assert.throws(() => parseBulkImportCsv(csv(...Array(301).fill(sample))), /300/)
  assert.throws(() => parseBulkImportCsv('x'.repeat(1024 * 1024 + 1)), /1MB/)
})

// A deterministic transaction double stages writes and applies only after success.
function fakeDb(seed = {}) {
  const documents = new Map(Object.entries(seed)), serial = { next: 1 }, stats = { reads: [], writes: [] }
  const snapshot = ref => ({ id: ref.id, ref, exists: documents.has(ref.path), data: () => documents.get(ref.path) })
  const doc = path => ({ path, id: path.split('/').at(-1), get: async () => snapshot(doc(path)) })
  function collection(path, filters = [], maximum = Infinity) {
    return { path, filters, maximum, doc: id => doc(`${path}/${id ?? `fake-${serial.next++}`}`), where: (key, op, value) => collection(path, [...filters, [key, op, value]], maximum), limit: n => collection(path, filters, n) }
  }
  let last = Promise.resolve()
  const db = { doc, collection, stats, documents, runTransaction: callback => {
    const run = last.then(async () => {
      const staged = [], tx = {
        get: async ref => {
          if (staged.length) throw new Error('read after write')
          stats.reads.push(ref.path)
          if (!ref.filters) return snapshot(ref)
          const docs = [...documents].filter(([path, value]) => path.split('/').length === 2 && path.startsWith(ref.path + '/') && ref.filters.every(([key, op, expected]) => {
            if (op === '==') return value[key] === expected
            if (op === 'in') { assert.ok(expected.length > 0 && expected.length <= 30); return expected.includes(value[key]) }
            throw Error('unsupported query operator')
          })).slice(0, ref.maximum).map(([path]) => snapshot(doc(path)))
          return { docs, empty: !docs.length }
        },
        create: (ref, value) => { if (db.failAtWrite === staged.length + 1) throw new Error('injected write failure'); if (documents.has(ref.path)) throw new Error('already exists'); staged.push([ref, value]) },
        set: (ref, value) => staged.push([ref, value]),
      }
      const result = await callback(tx)
      for (const [ref, value] of staged) { documents.set(ref.path, value); stats.writes.push(ref.path) }
      return result
    })
    last = run.catch(() => {})
    return run
  } }
  return db
}
const branchReservationPath = 'branchCodeReservations/' + createHash('sha256').update('company\0' + '0001').digest('hex')
const seed = () => ({ 'staffAccounts/staff': { enabled: true, role: 'general_staff' }, 'staffAccounts/other': { enabled: true, role: 'general_staff' }, 'constructionCompanies/company': { name: '架空会社', enabled: true, defaultGroupId: 'HSC' }, 'warrantyGroups/HSC': { name: 'HSC', prefix: 'HSC', fiscalStartMonth: 1, enabled: true, externalKeyRequired: true }, 'companyBranches/branch': { name: '架空支店', constructionCompanyId: 'company', branchCode: '0001', enabled: true }, [branchReservationPath]: { constructionCompanyId: 'company', branchCode: '0001', branchId: 'branch' } })

// Functions use the generated deployment domain; test preparation is explicit.
const server = () => import('../functions/property-bulk-import.js')
const request = (records = [sample], extra = {}) => ({ action: 'preview', groupId: 'HSC', companyId: 'company', csv: csv(...records), format: 'common', requestId: 'request-1', ...extra })

test('long branch codes compare full values and legacy header commits replay without rewriting its digest',async()=>{
  const {propertyBulkImportOperation:operation}=await server()
  const code='0'+'長'.repeat(2200), data=seed()
  data['companyBranches/branch'].branchCode=code
  delete data[branchReservationPath]
  data['branchCodeReservations/'+createHash('sha256').update('company\0'+code).digest('hex')]={constructionCompanyId:'company',branchCode:code,branchId:'branch'}
  data['companyBranches/near-match']={constructionCompanyId:'company',branchCode:code+'different',enabled:true}
  const db=fakeDb(data),input=request([{...sample,'支店コード':code}])
  input.csv=input.csv.replace('本支店コード（＊）','支店コード（＊）')
  const preview=await operation(db,input,'staff')
  assert.deepEqual(preview.errors,[])
  assert.equal(preview.rows[0].branchId,'branch')
  const commit={...input,action:'commit',confirmed:true,previewHash:preview.previewHash}
  await operation(db,commit,'staff')
  assert.equal((await operation(db,commit,'staff')).replayed,true)
  await assert.rejects(operation(db,{...commit,csv:input.csv.replace('支店コード（＊）','本支店コード（＊）')},'staff'),/再利用/)
})
test('one invalid quoted key rejects the entire file without writes', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  for (const character of ['\t', '\n', '\r', '\u007f']) {
    const db = fakeDb(seed()), input = request([sample, { ...sample, '外部キー': `bad${character}key` }])
    const preview = await operation(db, input, 'staff')
    assert.match(preview.errors[0].message, /外部キー/)
    await assert.rejects(operation(db, { ...input, action: 'commit', confirmed: true, previewHash: preview.previewHash }, 'staff'), /全件/)
    assert.equal(db.stats.writes.length, 0)
  }
})
test('transaction success, exact replay, new request duplicate and changed content', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const db = fakeDb(seed()), input = request()
  const preview = await operation(db, input, 'staff')
  assert.deepEqual(preview.errors, [])
  assert.equal(db.stats.writes.length, 0)
  const commit = { ...input, action: 'commit', confirmed: true, previewHash: preview.previewHash }
  const result = await operation(db, commit, 'staff')
  assert.equal(result.count, 1)
  assert.equal(result.replayed, false)
  const writes = db.stats.writes.length
  assert.equal((await operation(db, commit, 'staff')).replayed, true)
  assert.equal(db.stats.writes.length, writes)
  await assert.rejects(operation(db, { ...commit, requestId: 'request-2' }, 'staff'), error => error.details.safeToDiscard === true)
  await assert.rejects(operation(db, { ...commit, csv: csv({ ...sample, '物件名': 'changed' }) }, 'staff'), error => /再利用/.test(error.message) && error.details?.safeToDiscard !== true)
  await assert.rejects(operation(db, commit, 'other'), /再利用/)
  assert.equal(db.documents.get(`propertyWarranties/${result.ids[0]}`).address, sample['住所'])
  assert.equal(db.documents.get('warrantyCounters/HSC_2026').lastValue, 1)
})
test('late row failure and unknown branch cause zero writes including numbering', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const db = fakeDb(seed())
  for (const records of [[sample, { ...sample, '外部キー': 'second', '建築面積': '' }], [{ ...sample, '支店コード': 'unknown' }]]) {
    const input = request(records), preview = await operation(db, input, 'staff')
    assert.ok(preview.errors.length)
    await assert.rejects(operation(db, { ...input, action: 'commit', confirmed: true, previewHash: preview.previewHash }, 'staff'), /全件/)
    assert.equal(db.stats.writes.length, 0)
  }
})
test('preview preserves known and unknown branch codes; blank code never registers head office', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const db = fakeDb(seed())
  const known = await operation(db, request(), 'staff')
  assert.equal(known.rows[0].branchCode, '0001')
  assert.equal(known.rows[0].branchId, 'branch')
  const input = request([{ ...sample, '支店コード': '0999' }])
  const unknown = await operation(db, input, 'staff')
  assert.equal(unknown.rows[0].branchCode, '0999')
  assert.equal(unknown.rows[0].branchId, '')
  assert.equal(unknown.rows[0].branchLabel, '')
  assert.equal(unknown.errors[0].field, '本支店コード')
  await assert.rejects(operation(db, { ...input, action: 'commit', confirmed: true, previewHash: unknown.previewHash }, 'staff'), /全件/)
  const blankInput = request([{ ...sample, '支店コード': '' }])
  const blank = await operation(db, blankInput, 'staff')
  assert.equal(blank.rows.length, 0)
  assert.match(blank.errors[0].message, /支店コード/)
  await assert.rejects(operation(db, { ...blankInput, action: 'commit', confirmed: true, previewHash: blank.previewHash }, 'staff'), /全件/)
  assert.deepEqual(db.stats.writes, [])
})
test('branch remapping after preview blocks commit, then concurrent duplicate import has one winner', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const db = fakeDb(seed()), input = request(), preview = await operation(db, input, 'staff')
  const branch = db.documents.get('companyBranches/branch')
  db.documents.delete('companyBranches/branch'); db.documents.set('companyBranches/newbranch', branch)
  db.documents.set(branchReservationPath, { constructionCompanyId: 'company', branchCode: '0001', branchId: 'newbranch' })
  await assert.rejects(operation(db, { ...input, action: 'commit', confirmed: true, previewHash: preview.previewHash }, 'staff'), /再度プレビュー/)
  assert.equal(db.stats.writes.length, 0)
  const fresh = await operation(db, input, 'staff')
  const commit = { ...input, action: 'commit', confirmed: true, previewHash: fresh.previewHash }
  const results = await Promise.allSettled([operation(db, commit, 'staff'), operation(db, { ...commit, requestId: 'request-2' }, 'staff')])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal([...db.documents.keys()].filter(path => path.startsWith('propertyWarranties/')).length, 1)
})
test('increment import allocates all numbers after the existing high water mark', async () => {
  const {propertyBulkImportOperation:operation}=await server();const data=seed();data['warrantyCounters/HSC_2026']={lastValue:99};
  const db=fakeDb(data),input=request([sample,{...sample,'外部キー':'second'}]),preview=await operation(db,input,'staff');
  assert.deepEqual(preview.errors,[]);assert.deepEqual(preview.rows.map(row=>row.warrantyNumber),['HSC-26-100','HSC-26-101']);
  await operation(db,{...input,action:'commit',confirmed:true,previewHash:preview.previewHash},'staff');
  assert.equal(db.documents.get('warrantyCounters/HSC_2026').lastValue,101);
})
test('staged write exception leaves properties, keys, receipts, source and counter untouched', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const db = fakeDb(seed()), input = request([sample, { ...sample, '外部キー': 'second' }])
  const preview = await operation(db, input, 'staff')
  db.failAtWrite = 4
  const before = [...db.documents]
  await assert.rejects(operation(db, { ...input, action: 'commit', confirmed: true, previewHash: preview.previewHash }, 'staff'), /injected write failure/)
  assert.deepEqual([...db.documents], before)
  assert.equal(db.stats.writes.length, 0)
})
test('model handles 279 distinct synthetic records atomically; service capacity remains separate', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const db = fakeDb(seed()), input = request(Array.from({ length: 279 }, (_, index) => ({ ...sample, '外部キー': `synthetic-${index}` })))
  const preview = await operation(db, input, 'staff')
  assert.deepEqual(preview.errors, [])
  const result = await operation(db, { ...input, action: 'commit', confirmed: true, previewHash: preview.previewHash }, 'staff')
  assert.equal(result.count, 279)
  assert.equal(db.stats.writes.length, 279 * 3 + 2)
})
test('nonstaff, disabled account, existing direct key and ended guarantee cannot import', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const db = fakeDb(seed()), input = request()
  await assert.rejects(operation(db, input, 'missing'), /HS担当者/)
  db.documents.get('staffAccounts/staff').enabled = false
  await assert.rejects(operation(db, input, 'staff'), /HS担当者/)
  db.documents.get('staffAccounts/staff').enabled = true
  db.documents.set('propertyWarranties/old', { externalKey: sample['外部キー'] })
  assert.ok((await operation(db, input, 'staff')).errors.some(error => error.field === '外部キー'))
  const past = request([{ ...sample, '外部キー': 'past', '申込日': '2000-01-01', '引渡日': '2000-01-01' }])
  assert.ok((await operation(db, past, 'staff')).errors.some(error => error.field === '保証期間'))
  assert.equal(db.stats.writes.length, 0)
})
test('actual group policy chooses UH validation even with a generated ID and common format', async () => {
  const {propertyBulkImportOperation:operation}=await server();const data=seed();
  data['warrantyGroups/generated-id']={...data['warrantyGroups/HSC'],name:'UH',prefix:'',addressRequired:false,insulationMaterialsRequired:false};
  data['constructionCompanies/company'].defaultGroupId='generated-id';
  const db=fakeDb(data),input=request([{...sample,'外部キー':'0123-2026001','最長保証期間':'10','住所':'','資材名':''}],{groupId:'generated-id'});
  const preview=await operation(db,input,'staff');assert.deepEqual(preview.errors,[]);assert.equal(preview.rows[0].address,'');
  assert.ok((await operation(db,{...input,format:'uh'},'staff')).errors.some(error=>error.field==='形式'));
})
test('increment import is always initial 10 years and rejects expired initial warranty despite a 30-year cap', async () => {
  const {propertyBulkImportOperation:operation}=await server();const db=fakeDb(seed()),input=request([{...sample,'最長保証期間':'30'}]);
  const preview=await operation(db,input,'staff');assert.deepEqual(preview.errors,[]);
  const result=await operation(db,{...input,action:'commit',confirmed:true,previewHash:preview.previewHash},'staff');
  const value=db.documents.get('propertyWarranties/'+result.ids[0]);assert.equal(value.years,10);assert.equal(value.periods.length,1);
  assert.deepEqual(value.billingItems,[{id:'initial',...value.periods[0],state:'pending'}]);
  assert.equal(value.importedWarrantyPeriods,undefined);assert.equal(value.framingDate,undefined);assert.equal(value.insuranceReported,false);
  const past=request([{...sample,'外部キー':'old','申込日':'2000-01-01','引渡日':'2000-01-01','最長保証期間':'30'}],{requestId:'expired'});
  const expired=await operation(db,past,'staff');assert.ok(expired.errors.some(error=>error.field==='保証期間'));
  const before=[...db.documents];await assert.rejects(operation(db,{...past,action:'commit',confirmed:true,previewHash:expired.previewHash},'staff'),/全件/);assert.deepEqual([...db.documents],before);
})
test('status allows only same enabled staff, receipt absence stays unknown', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const db = fakeDb(seed()), input = request(), status = { action: 'status', requestId: input.requestId }
  assert.deepEqual(await operation(db, status, 'staff'), { pending: true })
  const preview = await operation(db, input, 'staff')
  const result = await operation(db, { ...input, action: 'commit', confirmed: true, previewHash: preview.previewHash }, 'staff')
  assert.deepEqual(await operation(db, status, 'staff'), { count: result.count, ids: result.ids, replayed: true })
  await assert.rejects(operation(db, status, 'other'), /確認できません/)
  db.documents.get('staffAccounts/staff').enabled = false
  await assert.rejects(operation(db, status, 'staff'), /HS担当者/)
  db.documents.get('staffAccounts/staff').enabled = true
  db.documents.get(`propertyImportReceipts/${input.requestId}`).ids = []
  await assert.rejects(operation(db, status, 'staff'), /記録/)
})

test('optional-key groups cannot import and destination rejection uses only three reads',async()=>{
 const {propertyBulkImportOperation:operation}=await server();const data=seed();delete data['warrantyGroups/HSC'].externalKeyRequired;
 const db=fakeDb(data),input=request(),preview=await operation(db,input,'staff');
 assert.ok(preview.errors.some(error=>/外部キー必須/.test(error.message)));assert.equal(db.stats.reads.length,3);
 await assert.rejects(operation(db,{...input,action:'commit',confirmed:true,previewHash:preview.previewHash},'staff'),/全件/);assert.equal(db.stats.writes.length,0);
});
test('required markers and the 14-column contract reject old and unmarked headers',()=>{
 assert.equal(CSV_TEMPLATE_HEADERS.length,14);assert.equal(CSV_TEMPLATE_HEADERS.filter(key=>key.endsWith('（＊）')).length,8);
 for(const name of ['上棟日','現在保証年数','既存保証番号'])assert.equal(CSV_TEMPLATE_HEADERS.includes(name),false);
 assert.throws(()=>parseBulkImportCsv(csv(sample).replace('外部キー（＊）','外部キー')),/見出し/);
});
test('group policy changes after preview invalidate commit without partial writes',async()=>{
 const {propertyBulkImportOperation:operation}=await server();const db=fakeDb(seed()),input=request(),preview=await operation(db,input,'staff');
 db.documents.get('warrantyGroups/HSC').addressRequired=false;
 await assert.rejects(operation(db,{...input,action:'commit',confirmed:true,previewHash:preview.previewHash},'staff'),/再度プレビュー/);assert.equal(db.stats.writes.length,0);
});
