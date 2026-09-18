import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { generatePostalAssets, normalizePostalRow, parseCsvLine, parsePostalCsv, updateManifestLastCheckedAt } from '../scripts/postal-data.mjs'
import { createHostedPostalLookupProvider } from '../src/domain/hosted-postal-lookup.mjs'
import { createHash } from 'node:crypto'

test('postal CSV parser handles quoting, duplicates, special no-town descriptions, and malformed quotes', () => {
  const csv = '"13101","0000000","1000001","トウキョウト","チヨダク","イカニケイサイガナイバアイ","東京都","千代田区","以下に掲載がない場合",0,0,0,0,0,0\n'
    + '13101,0000000,1000001,トウキョウト,チヨダク,イカニケイサイガナイバアイ,東京都,千代田区,以下に掲載がない場合,0,0,0,0,0,0\n'
  assert.deepEqual(parseCsvLine('a,"b,c","d""e"'), ['a', 'b,c', 'd"e'])
  assert.deepEqual(parsePostalCsv(csv), [{ postalCode: '1000001', prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '' }])
  assert.equal(normalizePostalRow(['', '', '1000002', '', '', '', '東京都', '千代田区', '千代田区一円']).streetTownAndNumber, '')
  assert.equal(normalizePostalRow(['', '', '1000003', '', '', '', '東京都', '千代田区', '麹町の次に番地がくる場合']).streetTownAndNumber, '')
  assert.equal(normalizePostalRow(['', '', '1000004', '', '', '', '東京都', '千代田区', '丸の内']).streetTownAndNumber, '丸の内')
  assert.throws(() => parseCsvLine('a,"unterminated'), /unclosed quoted field/)
  assert.equal(normalizePostalRow(['13101', '', 'bad']), null)
})

test('unchanged manifest check date update restores the original after replacement failure', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'postal-manifest-'))
  const manifestPath = join(dir, 'manifest.json')
  const original = { sourceSha256: 'same', recordCount: 1, lastCheckedAt: 'old' }
  await writeFile(manifestPath, `${JSON.stringify(original)}\n`, 'utf8')
  const failingFs = {
    ...fs,
    rename: async (from, to) => {
      if (to === manifestPath && from.endsWith('.tmp')) throw new Error('injected replacement failure')
      return fs.rename(from, to)
    },
  }
  try {
    await assert.rejects(updateManifestLastCheckedAt(manifestPath, 'new', failingFs), /injected replacement failure/)
    assert.deepEqual(JSON.parse(await readFile(manifestPath, 'utf8')), original)
    assert.deepEqual(await readdir(dir), ['manifest.json'])
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('postal asset generation is deterministic with fixed timestamps and shard metadata', async () => {
  const rows = parsePostalCsv('13101,,1000001,,, ,東京都,千代田区,町域A,,,,,,\n13101,,1500001,,, ,東京都,渋谷区,町域B,,,,,,\n')
  const first = await mkdtemp(join(tmpdir(), 'postal-test-'))
  const second = await mkdtemp(join(tmpdir(), 'postal-test-'))
  try {
    const options = { sourceBasisDate: '2026-08-31', lastCheckedAt: '2026-09-18T00:00:00.000Z', generatedAt: '2026-09-18T00:00:00.000Z', sourceSha256: 'fixture' }
    const a = await generatePostalAssets(rows, { ...options, outputDir: first })
    const b = await generatePostalAssets(rows, { ...options, outputDir: second })
    assert.deepEqual(a, b)
    assert.deepEqual(await readdir(first), await readdir(second))
    for (const file of await readdir(first)) assert.equal(await readFile(join(first, file), 'utf8'), await readFile(join(second, file), 'utf8'))
    assert.equal(a.recordCount, 2)
    assert.equal(a.shardCount, 2)
  } finally {
    await rm(first, { recursive: true, force: true }); await rm(second, { recursive: true, force: true })
  }
})

test('hosted provider validates shard integrity and returns resolved, missing, and error states', async () => {
  const text = '[{"postalCode":"1000001","prefecture":"東京都","municipality":"千代田区","streetTownAndNumber":"千代田"}]\n'
  const sha256 = createHash('sha256').update(text).digest('hex')
  const manifest = { schemaVersion: 1, shards: [{ key: '100', file: '100.json', count: 1, sha256 }] }
  const fetcher = async (url) => url.endsWith('manifest.json')
    ? { ok: true, json: async () => manifest }
    : { ok: true, text: async () => text }
  const provider = createHostedPostalLookupProvider({ fetcher })
  assert.deepEqual(await provider.lookup({ postalCode: '100-0001' }), { status: 'resolved', address: { postalCode: '1000001', prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '千代田' } })
  assert.deepEqual(await provider.lookup({ postalCode: '999-9999' }), { status: 'not_found' })
  const broken = createHostedPostalLookupProvider({ fetcher: async (url) => url.endsWith('manifest.json') ? { ok: true, json: async () => manifest } : { ok: true, text: async () => '[]\n' } })
  assert.deepEqual(await broken.lookup({ postalCode: '1000001' }), { status: 'unavailable' })
})
