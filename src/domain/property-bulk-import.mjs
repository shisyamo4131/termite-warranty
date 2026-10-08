import { normalizeProperty } from './property-warranty.mjs'
import { calculateExpiryDate } from './warranty.mjs'
import { normalizeExternalKey } from './external-key.mjs'

export const BULK_IMPORT_MAX_ROWS = 300
export const BULK_IMPORT_MAX_BYTES = 1024 * 1024
export const CSV_TEMPLATE_HEADERS = Object.freeze(['外部キー', '支店コード', '物件名', '申込日', '引渡日', '上棟日', '最長保証期間', '現在保証年数', '建築面積', '住所', '郵便番号', '建物名', '断熱材あり', '資材名', '施主電話番号', '既存保証番号', '備考'])
const quote = value => `"${String(value).replaceAll('"', '""')}"`
export function createBulkImportTemplate() { return '\uFEFF' + CSV_TEMPLATE_HEADERS.map(quote).join(',') + '\r\n' }

// No spreadsheet expressions or automatic numeric/date coercion are evaluated.
export function parseBulkImportCsv(csv) {
  if (typeof csv !== 'string' || new TextEncoder().encode(csv).length > BULK_IMPORT_MAX_BYTES) throw new Error('CSVはUTF-8で1MB以内にしてください。')
  const source = csv.replace(/^\uFEFF/, '')
  const records = []
  let cells = [], value = '', quoted = false, closed = false, line = 1, startLine = 1
  const cell = () => { cells.push(value); value = ''; closed = false }
  const record = () => { cell(); records.push({ line: startLine, cells }); cells = []; startLine = line + 1 }
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') { value += '"'; i++ } else { quoted = false; closed = true }
      } else { value += ch; if (ch === '\n') line++ }
      continue
    }
    if (ch === ',') { cell(); continue }
    if (ch === '\n' || ch === '\r') { record(); if (ch === '\r' && source[i + 1] === '\n') i++; line++; continue }
    if (closed) throw new Error(`${line}行目：閉じた引用符の後に文字があります。`)
    if (ch === '"') { if (value) throw new Error(`${line}行目：引用符の位置が不正です。`); quoted = true } else value += ch
  }
  if (quoted) throw new Error(`${startLine}行目：引用符が閉じられていません。`)
  if (value || cells.length || closed) { cell(); records.push({ line: startLine, cells }) }
  const header = records.shift()?.cells
  if (!header || header.length !== CSV_TEMPLATE_HEADERS.length || header.some((name, i) => name !== CSV_TEMPLATE_HEADERS[i])) throw new Error('見出しがテンプレートと一致しません。共通CSVテンプレートを利用してください。')
  const businessRows = records.filter(row => row.cells.some(value => value.trim()))
  if (!businessRows.length) throw new Error('取込対象がありません。')
  if (businessRows.length > BULK_IMPORT_MAX_ROWS) throw new Error(`取込対象は${BULK_IMPORT_MAX_ROWS}件以内にしてください。`)
  return businessRows.map(row => {
    if (row.cells.length !== header.length) throw new Error(`${row.line}行目：列数がテンプレートと一致しません。`)
    return { line: row.line, values: Object.fromEntries(header.map((name, i) => [name, name === '外部キー' ? row.cells[i] : row.cells[i].trim()])) }
  })
}

const required = (value, label, max = 2000) => {
  if (!value || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new Error(`${label}を正しく入力してください。`)
  return value
}
function date(value, label) {
  try { calculateExpiryDate(value, 1) } catch { throw new Error(`${label}は有効な年月日（YYYY-MM-DD）で入力してください。`) }
  return value
}
function prepareRow(record, format) {
  const v = record.values
  const externalKey = normalizeExternalKey(v['外部キー'])
  if (!externalKey) throw new Error('外部キーを正しく入力してください。')
  const branchCode = required(v['支店コード'], '支店コード', 200)
  let applicationDate = v['申込日'], handoverDate = v['引渡日']
  const framingDate = v['上棟日']
  if (format === 'uh') {
    if (!/^\d{4}-\d{7}$/.test(externalKey)) throw new Error('UHの外部キーはお施主様契約No（4桁-7桁）を入力してください。')
    if (/^\d{4}-\d{2}$/.test(applicationDate)) applicationDate += '-01'
    date(framingDate, '上棟日')
    const calculated = new Date(`${framingDate}T00:00:00Z`)
    calculated.setUTCDate(calculated.getUTCDate() + 92)
    const computed = calculated.toISOString().slice(0, 10)
    if (handoverDate && handoverDate !== computed) throw new Error('UHの引渡日は上棟日＋92日と一致させてください。')
    handoverDate = computed
  } else if (framingDate) date(framingDate, '上棟日')
  date(applicationDate, '申込日'); date(handoverDate, '引渡日')
  if (!/^(10|20|30)$/.test(v['現在保証年数']) || !/^(10|20|30)$/.test(v['最長保証期間'])) throw new Error('現在保証年数・最長保証期間は10・20・30を入力してください。')
  const years = Number(v['現在保証年数']), maxYears = Number(v['最長保証期間'])
  if (format === 'uh' && maxYears !== 10) throw new Error('UHの最長保証期間は10年です。')
  if (years > maxYears) throw new Error('現在保証年数は最長保証期間を超えられません。')
  if (!['あり', 'なし'].includes(v['断熱材あり'])) throw new Error('断熱材ありは「あり」または「なし」を入力してください。')
  const foundationInsulation = v['断熱材あり'] === 'あり'
  if (v['建築面積'] && !/^\d+(?:\.\d{1,2})?$/.test(v['建築面積'])) throw new Error('建築面積は正の数・小数2桁までで入力してください。')
  const fields = normalizeProperty({ name: v['物件名'], ownerTelephone: v['施主電話番号'], postalCode: v['郵便番号'], address: v['住所'] || '不明', buildingName: v['建物名'], applicationDate, handoverDate, maxYears, buildingArea: v['建築面積'], foundationInsulation, insulationMaterials: foundationInsulation ? v['資材名'] || '不明' : v['資材名'], notes: v['備考'] }, true)
  if (fields.ownerTelephone && !/^[0-9-]+$/.test(fields.ownerTelephone)) throw new Error('施主電話番号は半角数字とハイフンのみ入力してください。')
  return { line: record.line, externalKey, branchCode, framingDate, existingWarrantyNumber: v['既存保証番号'], years, fields, sourceValues: v }
}
export function prepareBulkImportRows(csv, { format = 'common' } = {}) {
  if (!['common', 'uh'].includes(format)) return { rows: [], errors: [{ line: 0, field: '形式', message: '取込形式が不正です。' }] }
  let records
  try { records = parseBulkImportCsv(csv) } catch (error) { return { rows: [], errors: [{ line: 0, field: 'CSV', message: error.message }] } }
  const rows = [], errors = [], seen = new Set(), numbers = new Set()
  for (const record of records) {
    try {
      const row = prepareRow(record, format)
      if (seen.has(row.externalKey)) throw new Error('ファイル内で外部キーが重複しています。')
      if (row.existingWarrantyNumber && numbers.has(row.existingWarrantyNumber)) throw new Error('ファイル内で既存保証番号が重複しています。')
      seen.add(row.externalKey); if (row.existingWarrantyNumber) numbers.add(row.existingWarrantyNumber)
      rows.push(row)
    } catch (error) { errors.push({ line: record.line, field: '入力', message: error.message }) }
  }
  return { rows, errors }
}
