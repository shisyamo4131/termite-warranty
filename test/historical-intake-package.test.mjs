import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { inspectHistoricalIntakePackage } from '../scripts/lib/historical-intake-package.mjs'

const hash = value => createHash('sha256').update(value).digest('hex')
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'historical-intake-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const manifest = { schemaVersion: 1, workbookId: 'fictional-workbook', transformVersion: 'fixture-1', sources: [], decisions: ['H-01','H-02','S-01','S-02','S-03','U-01'].map(id => ({ id, status: 'approved', reference: 'fictional-approval' })) }
  for (const [index, group] of ['HSC','SHS','UH'].entries()) {
    const count = [99,66,277][index]
    const body = JSON.stringify({ workbookId: manifest.workbookId, sheetId: index, group, values: [['header'], ...Array.from({length: count}, (_, row) => [`fictional-${row}`])] })
    await writeFile(join(directory, `${group}.json`), body)
    manifest.sources.push({ group, sheetId: index, path: `${group}.json`, sha256: hash(body), expectedRows: count })
  }
  await writeFile(join(directory, 'mapping.json'), '{}')
  manifest.mapping = { path: 'mapping.json', sha256: hash('{}') }
  const path = join(directory, 'manifest.json')
  const save = () => writeFile(path, JSON.stringify(manifest))
  await save()
  return { directory, manifest, path, save }
}

test('442 fictional rows: repeatable, read-only, not an import approval', async t => {
  const f = await fixture(t), before = await readFile(f.path)
  const first = await inspectHistoricalIntakePackage(f.path)
  assert.equal(first.packageConsistent, true)
  assert.equal(first.totalRows, 442)
  assert.equal(first.importReady, false)
  assert.deepEqual(await inspectHistoricalIntakePackage(f.path), first)
  assert.deepEqual(await readFile(f.path), before)
})
test('source and mapping changes are detected without leaking values', async t => {
  const f = await fixture(t)
  await writeFile(join(f.directory, 'HSC.json'), 'PRIVATE_CHANGED_VALUE')
  await writeFile(join(f.directory, 'mapping.json'), 'PRIVATE_MAPPING')
  const report = await inspectHistoricalIntakePackage(f.path)
  assert.equal(report.packageConsistent, false)
  assert.deepEqual(report.errors.map(e => e.code), ['MAPPING_CHANGED','SOURCE_CHANGED'])
  assert.equal(JSON.stringify(report).includes('PRIVATE'), false)
})
test('wrong workbook, counts, and duplicate groups are rejected', async t => {
  const f = await fixture(t)
  f.manifest.workbookId = 'wrong-workbook'
  await f.save()
  assert.equal((await inspectHistoricalIntakePackage(f.path)).errors.filter(e => e.code === 'SOURCE_IDENTITY').length, 3)
  f.manifest.workbookId = 'fictional-workbook'
  f.manifest.sources[0].expectedRows++
  await f.save()
  assert.ok((await inspectHistoricalIntakePackage(f.path)).errors.some(e => e.code === 'ROW_COUNT'))
  f.manifest.sources[1] = f.manifest.sources[0]
  await f.save()
  assert.ok((await inspectHistoricalIntakePackage(f.path)).errors.some(e => e.code === 'MISSING_GROUP'))
})
test('missing approval evidence and duplicate decisions are rejected', async t => {
  const f = await fixture(t)
  delete f.manifest.decisions[0].reference
  f.manifest.decisions[1] = f.manifest.decisions[2]
  await f.save()
  const report = await inspectHistoricalIntakePackage(f.path)
  assert.equal(report.packageConsistent, false)
  assert.ok(report.errors.some(e => e.code === 'MISSING_DECISION'))
})
test('CLI exits 2 for pending, 0 for consistent, 1 for invalid; apply is unavailable', async t => {
  const f = await fixture(t)
  const cli = (...args) => spawnSync(process.execPath, ['scripts/check-historical-intake.mjs', ...args], { encoding: 'utf8' })
  assert.equal(cli('--manifest', f.path).status, 0)
  for (const entry of f.manifest.decisions.slice(2)) entry.status = 'pending'
  await f.save()
  const pending = cli('--manifest', f.path)
  assert.equal(pending.status, 2)
  assert.deepEqual(JSON.parse(pending.stdout).pendingQuestions, ['S-01','S-02','S-03','U-01'])
  assert.equal(cli('--manifest', f.path, '--apply').status, 1)
  const missing = cli('--manifest', join(f.directory, 'PRIVATE_MISSING.json'))
  assert.equal(missing.status, 1)
  assert.equal(missing.stdout.includes('PRIVATE'), false)
})
