import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createReferenceFetchCache, referenceFetchKey, ReferenceFetchInvalidatedError } from '../src/domain/reference-fetch-cache.mjs'

test('reference results share pending work, expire and support explicit refresh', async () => {
  let time = 0, calls = 0
  const cache = createReferenceFetchCache({ now: () => time, ttlMs: 10 })
  const load = async () => ++calls
  const first = cache.get('catalog', load), second = cache.get('catalog', load)
  assert.equal(first, second); assert.equal(await first, 1)
  assert.equal(await cache.get('catalog', load), 1)
  time = 10; assert.equal(await cache.get('catalog', load), 2)
  assert.equal(await cache.get('catalog', load, { force: true }), 3)
})
test('invalidation and force reject late responses, errors retry and empty successes cache', async () => {
  const cache = createReferenceFetchCache(); let resolve
  const pending = cache.get('key', () => new Promise(r => { resolve = r }))
  await Promise.resolve(); cache.clear(); resolve(['obsolete'])
  await assert.rejects(pending, ReferenceFetchInvalidatedError)
  await assert.rejects(cache.get('key', async () => { throw new Error('failure') }), /failure/)
  assert.deepEqual(await cache.get('key', async () => []), [])
  assert.deepEqual(await cache.get('key', async () => assert.fail('empty success must cache')), [])
  const beforeForce = cache.get('late', () => new Promise(r => { resolve = r }))
  await Promise.resolve()
  assert.equal(await cache.get('late', async () => 'fresh', { force: true }), 'fresh')
  resolve('stale'); await assert.rejects(beforeForce, ReferenceFetchInvalidatedError)
})
test('scope and conditions form stable isolated keys and retained results are bounded', async () => {
  const scope = { uid: 'one', role: 'staff', company: 'c', branch: 'b', scope: 'branch' }
  const key = referenceFetchKey(scope, 'catalog', { companyId: 'c', search: 'name' })
  assert.equal(key, referenceFetchKey(scope, 'catalog', { search: 'name', companyId: 'c' }))
  for (const field of Object.keys(scope)) assert.notEqual(key, referenceFetchKey({ ...scope, [field]: 'different' }, 'catalog', { companyId: 'c', search: 'name' }))
  const cache = createReferenceFetchCache()
  for (let i = 0; i < 70; i++) await cache.get(String(i), async () => i)
  assert.equal(cache.size(), 64)
  cache.clear(); assert.equal(cache.size(), 0)
})
