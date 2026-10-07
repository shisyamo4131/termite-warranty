import test from 'node:test'
import assert from 'node:assert/strict'
import { CSV_TEMPLATE_HEADERS, createBulkImportTemplate, parseBulkImportCsv, prepareBulkImportRows } from '../src/domain/property-bulk-import.mjs'

const sample = { '外部キー': 'source-000001', '支店コード': '0001', '物件名': '架空施主', '申込日': '2026-10-01', '引渡日': '2026-10-05', '上棟日': '', '最長保証期間': '20', '現在保証年数': '10', '建築面積': '99.25', '住所': '', '郵便番号': '0010001', '建物名': '', '断熱材あり': 'あり', '資材名': '', '施主電話番号': '', '既存保証番号': '', '備考': '' }
const csv = (...records) => createBulkImportTemplate() + records.map(record => CSV_TEMPLATE_HEADERS.map(key => `"${String(record[key] ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n'

test('CSV preserves leading zeros, quoted comma/newline/quotes and Unicode', () => {
  const value = { ...sample, '物件名': '架空,施主\n"二行"' }
  const rows = parseBulkImportCsv(csv(value))
  assert.equal(rows[0].line, 2)
  assert.equal(rows[0].values['支店コード'], '0001')
  assert.equal(rows[0].values['郵便番号'], '0010001')
  assert.equal(rows[0].values['物件名'], value['物件名'])
})
test('generic import fills only missing address and material when insulation exists', () => {
  const result = prepareBulkImportRows(csv(sample))
  assert.deepEqual(result.errors, [])
  assert.equal(result.rows[0].fields.address, '不明')
  assert.equal(result.rows[0].fields.insulationMaterials, '不明')
  assert.equal(result.rows[0].fields.ownerName, sample['物件名'])
  const absent = prepareBulkImportRows(csv({ ...sample, '断熱材あり': 'なし' }))
  assert.equal(absent.rows[0].fields.insulationMaterials, '')
  assert.ok(prepareBulkImportRows(csv({ ...sample, '建築面積': '' })).errors.length)
})
test('UH uses month first day and exactly 92 days without prefix matching', () => {
  const value = { ...sample, '外部キー': '0123-2026001', '支店コード': '9999', '申込日': '2026-01', '上棟日': '2026-01-31', '引渡日': '', '最長保証期間': '10' }
  const result = prepareBulkImportRows(csv(value), { format: 'uh' })
  assert.deepEqual(result.errors, [])
  assert.equal(result.rows[0].fields.applicationDate, '2026-01-01')
  assert.equal(result.rows[0].fields.handoverDate, '2026-05-03')
  assert.ok(prepareBulkImportRows(csv({ ...value, '引渡日': '2026-05-02' }), { format: 'uh' }).errors.length)
})
test('UH max warranty is exactly 10; common max 20 and 30 are preserved', () => {
  const value = { ...sample, '外部キー': '0123-2026001', '申込日': '2026-01', '上棟日': '2026-01-31', '引渡日': '', '最長保証期間': '10' }
  assert.deepEqual(prepareBulkImportRows(csv(value), { format: 'uh' }).errors, [])
  for (const maxYears of ['20', '30']) {
    assert.ok(prepareBulkImportRows(csv({ ...value, '最長保証期間': maxYears }), { format: 'uh' }).errors.some(error => error.message === 'UHの最長保証期間は10年です。'))
    const common = prepareBulkImportRows(csv({ ...sample, '最長保証期間': maxYears }))
    assert.deepEqual(common.errors, [])
    assert.equal(common.rows[0].fields.maxYears, Number(maxYears))
  }
})
test('whole file errors include duplicate keys, malformed last row and no silent skips', () => {
  assert.ok(prepareBulkImportRows(csv(sample, sample)).errors.some(error => error.message.includes('外部キーが重複')))
  const result = prepareBulkImportRows(csv(sample, { ...sample, '外部キー': 'second', '申込日': '2026-02-30' }))
  assert.equal(result.errors[0].line, 3)
  assert.deepEqual(prepareBulkImportRows(csv({ ...sample, '現在保証年数': '20' })).errors, [])
  assert.ok(prepareBulkImportRows(csv({ ...sample, '断熱材あり': 'true' })).errors.length)
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
          const docs = [...documents].filter(([path, value]) => path.split('/').length === 2 && path.startsWith(ref.path + '/') && ref.filters.every(([key, op, expected]) => op === '==' && value[key] === expected)).slice(0, ref.maximum).map(([path]) => snapshot(doc(path)))
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
const seed = () => ({ 'staffAccounts/staff': { enabled: true, role: 'general_staff' }, 'staffAccounts/other': { enabled: true, role: 'general_staff' }, 'constructionCompanies/company': { name: '架空会社', enabled: true, defaultGroupId: 'HSC' }, 'warrantyGroups/HSC': { name: 'HSC', prefix: 'HSC', fiscalStartMonth: 1, enabled: true }, 'companyBranches/branch': { name: '架空支店', constructionCompanyId: 'company', branchCode: '0001', enabled: true } })

// Functions use the generated deployment domain; test preparation is explicit.
const server = () => import('../functions/property-bulk-import.js')
const request = (records = [sample], extra = {}) => ({ action: 'preview', groupId: 'HSC', companyId: 'company', csv: csv(...records), format: 'common', requestId: 'request-1', ...extra })
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
  assert.equal(db.documents.get(`propertyWarranties/${result.ids[0]}`).address, '不明')
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
test('branch remapping after preview blocks commit, then concurrent duplicate import has one winner', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const db = fakeDb(seed()), input = request(), preview = await operation(db, input, 'staff')
  const branch = db.documents.get('companyBranches/branch')
  db.documents.delete('companyBranches/branch'); db.documents.set('companyBranches/newbranch', branch)
  await assert.rejects(operation(db, { ...input, action: 'commit', confirmed: true, previewHash: preview.previewHash }, 'staff'), /再度プレビュー/)
  assert.equal(db.stats.writes.length, 0)
  const fresh = await operation(db, input, 'staff')
  const commit = { ...input, action: 'commit', confirmed: true, previewHash: fresh.previewHash }
  const results = await Promise.allSettled([operation(db, commit, 'staff'), operation(db, { ...commit, requestId: 'request-2' }, 'staff')])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal([...db.documents.keys()].filter(path => path.startsWith('propertyWarranties/')).length, 1)
})
test('imported existing number advances high water and cannot collide with new allocations', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const db = fakeDb(seed()), input = request([{ ...sample, '既存保証番号': 'HSC-26-099' }, { ...sample, '外部キー': 'second' }])
  const preview = await operation(db, input, 'staff')
  assert.deepEqual(preview.errors, [])
  assert.deepEqual(preview.rows.map(row => row.warrantyNumber), ['HSC-26-099', 'HSC-26-100'])
  await operation(db, { ...input, action: 'commit', confirmed: true, previewHash: preview.previewHash }, 'staff')
  assert.equal(db.documents.get('warrantyCounters/HSC_2026').lastValue, 100)
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
test('UH canonical name works for generated group ID and rejects mismatched group', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const value = { ...sample, '外部キー': '0123-2026001', '申込日': '2026-01', '上棟日': '2026-01-31', '引渡日': '', '最長保証期間': '10' }
  const data = seed()
  data['warrantyGroups/generated-id'] = { ...data['warrantyGroups/HSC'], name: 'UH', prefix: '' }
  data['constructionCompanies/company'].defaultGroupId = 'generated-id'
  const db = fakeDb(data), input = request([value], { format: 'uh', groupId: 'generated-id' })
  assert.deepEqual((await operation(db, input, 'staff')).errors, [])
  assert.ok((await operation(db, { ...input, format: 'common', csv: csv(sample) }, 'staff')).errors.some(error => error.field === '形式'))
  assert.ok((await operation(fakeDb(seed()), request([value], { format: 'uh' }), 'staff')).errors.some(error => error.field === '形式'))
})
test('extended past imports preserve all periods and unknown billing without extension history', async () => {
  const { propertyBulkImportOperation: operation } = await server()
  const { warrantyTransactions, insuranceReportTarget, extensionUndoPreview } = await import('../src/domain/property-warranty.mjs')
  const db = fakeDb(seed()), input = request([{ ...sample, '外部キー': 'past-20', '申込日': '2015-01-01', '引渡日': '2015-01-01', '現在保証年数': '20', '既存保証番号': 'HSC-15-001' }, { ...sample, '外部キー': 'past-30', '申込日': '2005-01-01', '引渡日': '2005-01-01', '現在保証年数': '30', '最長保証期間': '30', '既存保証番号': 'HSC-05-001' }])
  const preview = await operation(db, input, 'staff')
  assert.deepEqual(preview.errors, [])
  const result = await operation(db, { ...input, action: 'commit', confirmed: true, previewHash: preview.previewHash }, 'staff')
  for (let i = 0; i < result.ids.length; i++) {
    const value = db.documents.get(`propertyWarranties/${result.ids[i]}`)
    assert.equal(value.years, i ? 30 : 20)
    assert.equal(value.periods.length, i ? 3 : 2)
    assert.equal(value.importedWarrantyPeriods.length, value.periods.length)
    assert.ok(warrantyTransactions(value).every(period => period.identifiable && period.billingState === 'unknown'))
    assert.equal(value.history.filter(event => event.kind === 'extend').length, 0)
    assert.equal(extensionUndoPreview(value), null)
    assert.equal(value.insuranceReported, false)
    assert.equal(value.insuranceEvents.length, 0)
    assert.ok(insuranceReportTarget(value, '2026-10')?.warrantyPeriodId.startsWith(`import-${result.ids[i]}-`))
  }
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
