import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const groups = ['HSC', 'SHS', 'UH']
const questions = ['H-01', 'H-02', 'S-01', 'S-02', 'S-03', 'U-01']
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const text = value => typeof value === 'string' && value.trim().length > 0
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const validCell = value => value === null || ['string', 'boolean'].includes(typeof value) || typeof value === 'number' && Number.isFinite(value)
const nonempty = row => row.some(value => value !== null && value !== '')
const invalid = code => { throw new Error(code) }

// Local, read-only package checks. This never constructs a Firestore write plan.
export async function inspectHistoricalIntakePackage(manifestPath) {
  const errors = [], summaries = [], pendingQuestions = []
  const result = () => ({ schemaVersion: 1, packageConsistent: errors.length === 0, importReady: false, pendingQuestions, sources: summaries, errors })
  const readBounded = async path => {
    const info = await stat(path)
    if (!info.isFile() || info.size > 16 * 1024 * 1024) invalid('INPUT_SIZE_OR_TYPE')
    const bytes = await readFile(path)
    if (bytes.length > 16 * 1024 * 1024) invalid('INPUT_SIZE_OR_TYPE')
    return bytes
  }
  let bytes, manifest
  try { bytes = await readBounded(manifestPath); manifest = JSON.parse(bytes.toString('utf8')) }
  catch { errors.push({ code: 'MANIFEST_UNREADABLE' }); return result() }
  if (!manifest || manifest.schemaVersion !== 1 || !text(manifest.workbookId) || !text(manifest.transformVersion)
    || !Array.isArray(manifest.sources) || manifest.sources.length !== 3
    || !Array.isArray(manifest.decisions) || manifest.decisions.length !== questions.length) {
    errors.push({ code: 'MANIFEST_SHAPE' }); return result()
  }
  const seenQuestions = new Set()
  if (!manifest.mapping || !text(manifest.mapping.path) || !hash(manifest.mapping.sha256)) {
    errors.push({ code: 'MAPPING_SHAPE' })
  } else {
    try {
      const mappingBytes = await readBounded(resolve(dirname(manifestPath), manifest.mapping.path))
      if (digest(mappingBytes) !== manifest.mapping.sha256) errors.push({ code: 'MAPPING_CHANGED' })
    } catch { errors.push({ code: 'MAPPING_UNREADABLE' }) }
  }
  for (const entry of manifest.decisions) {
    if (!entry || !questions.includes(entry.id) || seenQuestions.has(entry.id)
      || !['pending', 'approved'].includes(entry.status)
      || entry.status === 'approved' && !text(entry.reference)) {
      errors.push({ code: 'DECISION_SHAPE' }); continue
    }
    seenQuestions.add(entry.id)
    if (entry.status === 'pending') pendingQuestions.push(entry.id)
  }
  const seenGroups = new Set(), seenSheets = new Set()
  for (const source of manifest.sources) {
    const group = groups.includes(source?.group) ? source.group : undefined
    const reject = code => errors.push({ ...(group ? { group } : {}), code })
    if (!group || seenGroups.has(group) || !Number.isSafeInteger(source.sheetId) || source.sheetId < 0
      || seenSheets.has(source.sheetId) || !text(source.path) || !hash(source.sha256)
      || !Number.isSafeInteger(source.expectedRows) || source.expectedRows < 1) {
      reject('SOURCE_SHAPE'); continue
    }
    seenGroups.add(group); seenSheets.add(source.sheetId)
    let sourceBytes, sheet
    try {
      sourceBytes = await readBounded(resolve(dirname(manifestPath), source.path))
      if (digest(sourceBytes) !== source.sha256) { reject('SOURCE_CHANGED'); continue }
      sheet = JSON.parse(sourceBytes.toString('utf8'))
    } catch { reject('SOURCE_UNREADABLE'); continue }
    if (!sheet || sheet.workbookId !== manifest.workbookId || sheet.sheetId !== source.sheetId || sheet.group !== group) {
      reject('SOURCE_IDENTITY'); continue
    }
    if (!Array.isArray(sheet.values) || sheet.values.length < 2 || sheet.values.length > 10001
      || sheet.values.some(row => !Array.isArray(row) || row.length > 100 || row.some(value => !validCell(value)))
      || !nonempty(sheet.values[0])) { reject('SOURCE_VALUES'); continue }
    const rows = sheet.values.slice(1).filter(nonempty).length
    if (rows !== source.expectedRows) reject('ROW_COUNT')
    summaries.push({ group, rows, sha256: source.sha256 })
  }
  if (seenGroups.size !== groups.length) errors.push({ code: 'MISSING_GROUP' })
  if (seenQuestions.size !== questions.length) errors.push({ code: 'MISSING_DECISION' })
  const report = result()
  report.packageDigest = digest(bytes)
  report.totalRows = summaries.reduce((sum, source) => sum + source.rows, 0)
  return report
}
