import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

export const POSTAL_SOURCE_URL = 'https://www.post.japanpost.jp/service/search/zipcode/download/utf/zip/utf_ken_all.zip'
export const POSTAL_SCHEMA_VERSION = 1
export const POSTAL_NORMALIZATION_VERSION = 2
const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const publicDir = join(root, 'public', 'postal-data')

export function parseCsvLine(line) {
  const values = []; let value = ''; let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1 } else quoted = !quoted
    } else if (char === ',' && !quoted) { values.push(value); value = '' } else value += char
  }
  if (quoted) throw new Error('malformed CSV: unclosed quoted field')
  values.push(value)
  return values
}

export function normalizePostalRow(fields) {
  if (!Array.isArray(fields) || fields.length < 9) return null
  const postalCode = String(fields[2] ?? '').trim()
  const prefecture = String(fields[6] ?? '').trim()
  const municipality = String(fields[7] ?? '').trim()
  const town = String(fields[8] ?? '').trim()
  if (!/^\d{7}$/.test(postalCode) || !prefecture || !municipality) return null
  const noTown = town === '以下に掲載がない場合'
    || town.endsWith('の次に番地がくる場合')
    || town === `${municipality}一円`
  return { postalCode, prefecture, municipality, streetTownAndNumber: noTown ? '' : town }
}

export function parsePostalCsv(text) {
  const rows = []; const seen = new Set()
  for (const line of String(text).replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim()) continue
    const row = normalizePostalRow(parseCsvLine(line))
    if (!row) continue
    const key = JSON.stringify(row)
    if (!seen.has(key)) { seen.add(key); rows.push(row) }
  }
  rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'ja'))
  return rows
}

export function shardPostalRows(rows) {
  const shards = new Map()
  for (const row of rows) {
    const key = row.postalCode.slice(0, 3)
    if (!shards.has(key)) shards.set(key, [])
    shards.get(key).push(row)
  }
  return shards
}

function unzipFirstFile(archive) {
  const signature = archive.readUInt32LE(0)
  if (signature !== 0x04034b50) throw new Error('postal source is not a ZIP archive')
  const method = archive.readUInt16LE(8)
  const compressedSize = archive.readUInt32LE(18)
  const nameLength = archive.readUInt16LE(26)
  const extraLength = archive.readUInt16LE(28)
  const start = 30 + nameLength + extraLength
  const compressed = archive.subarray(start, start + compressedSize)
  if (method === 0) return compressed
  if (method === 8) return inflateRawSync(compressed)
  throw new Error(`unsupported postal ZIP compression: ${method}`)
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const stableJson = (value) => `${JSON.stringify(value)}\n`

export async function updateManifestLastCheckedAt(manifestPath, checkedAt, fsOps = { readFile, writeFile, rename, rm }) {
  const existing = JSON.parse(await fsOps.readFile(manifestPath, 'utf8'))
  const updated = { ...existing, lastCheckedAt: checkedAt }
  const temporaryPath = join(dirname(manifestPath), '.postal-manifest.update.tmp')
  const backupPath = `${manifestPath}.previous`
  await fsOps.writeFile(temporaryPath, stableJson(updated), 'utf8')
  let movedExisting = false
  try {
    await fsOps.rm(backupPath, { force: true })
    await fsOps.rename(manifestPath, backupPath)
    movedExisting = true
    await fsOps.rename(temporaryPath, manifestPath)
    await fsOps.rm(backupPath, { force: true })
    return updated
  } catch (error) {
    await fsOps.rm(temporaryPath, { force: true })
    if (movedExisting) {
      await fsOps.rm(manifestPath, { force: true })
      await fsOps.rename(backupPath, manifestPath)
    }
    throw error
  } finally { await fsOps.rm(temporaryPath, { force: true }) }
}

export async function generatePostalAssets(rows, { outputDir = publicDir, sourceUrl = POSTAL_SOURCE_URL, sourceBasisDate, lastCheckedAt, sourceSha256 = null, generatedAt = new Date().toISOString() } = {}) {
  const tempDir = await mkdtemp(join(tmpdir(), 'termite-postal-'))
  try {
    await mkdir(tempDir, { recursive: true })
    const shards = shardPostalRows(rows)
    const shardEntries = []
    for (const key of [...shards.keys()].sort()) {
      const content = stableJson(shards.get(key))
      await writeFile(join(tempDir, `${key}.json`), content, 'utf8')
      shardEntries.push({ key, file: `${key}.json`, count: shards.get(key).length, sha256: sha256(content) })
    }
    const manifest = {
      schemaVersion: POSTAL_SCHEMA_VERSION, normalizationVersion: POSTAL_NORMALIZATION_VERSION, sourceUrl, sourceBasisDate: sourceBasisDate ?? null,
      sourceSha256, lastCheckedAt: lastCheckedAt ?? new Date().toISOString(), generatedAt,
      recordCount: rows.length, shardCount: shardEntries.length, shards: shardEntries,
      aggregateSha256: sha256(shardEntries.map((entry) => `${entry.key}:${entry.sha256}:${entry.count}`).join('\n')),
    }
    await writeFile(join(tempDir, 'manifest.json'), stableJson(manifest), 'utf8')
    const backupDir = `${outputDir}.previous`
    await rm(backupDir, { recursive: true, force: true })
    let movedExisting = false
    try {
      await rename(outputDir, backupDir)
      movedExisting = true
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    try {
      await rename(tempDir, outputDir)
      if (movedExisting) await rm(backupDir, { recursive: true, force: true })
    } catch (error) {
      if (movedExisting) await rename(backupDir, outputDir)
      throw error
    }
    return manifest
  } finally { await rm(tempDir, { recursive: true, force: true }) }
}

async function downloadSource(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`postal source download failed: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

export async function updatePostalData({ url = POSTAL_SOURCE_URL, basisDate, checkOnly = false } = {}) {
  if (!checkOnly && !/^\d{4}-\d{2}-\d{2}$/.test(String(basisDate ?? ''))) {
    throw new Error('applying postal data requires --basis-date=YYYY-MM-DD')
  }
  const archive = await downloadSource(url)
  const sourceSha256 = sha256(archive)
  const text = unzipFirstFile(archive).toString('utf8')
  const rows = parsePostalCsv(text)
  if (!rows.length) throw new Error('postal source produced no valid rows')
  if (checkOnly) return { sourceSha256, recordCount: rows.length, checkedAt: new Date().toISOString() }
  try {
    const manifestPath = join(publicDir, 'manifest.json')
    const existing = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (existing.sourceSha256 === sourceSha256 && existing.recordCount === rows.length && existing.normalizationVersion === POSTAL_NORMALIZATION_VERSION) {
      return updateManifestLastCheckedAt(manifestPath, new Date().toISOString())
    }
  } catch { /* missing or invalid assets require a complete staged regeneration */ }
  return generatePostalAssets(rows, { sourceUrl: url, sourceBasisDate: basisDate, sourceSha256 })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const apply = process.argv.includes('--apply')
  const explicitCheck = process.argv.includes('--check-only')
  const checkOnly = explicitCheck || !apply
  const basisDateArg = process.argv.find((arg) => arg.startsWith('--basis-date='))
  const confirmationArg = process.argv.find((arg) => arg.startsWith('--confirm='))
  const basisDate = basisDateArg?.slice('--basis-date='.length)
  const confirmation = confirmationArg?.slice('--confirm='.length)
  if (apply && (explicitCheck || confirmation !== 'postal-data' || !/^\d{4}-\d{2}-\d{2}$/.test(String(basisDate ?? '')))) {
    console.error('apply requires --basis-date=YYYY-MM-DD and --confirm=postal-data, without --check-only')
    process.exitCode = 1
  } else {
    updatePostalData({ checkOnly, basisDate })
      .then((manifest) => console.log(JSON.stringify(manifest, null, 2)))
      .catch((error) => { console.error(error.message); process.exitCode = 1 })
  }
}
