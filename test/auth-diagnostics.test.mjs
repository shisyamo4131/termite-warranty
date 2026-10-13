import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { createAuthDiagnostics, AUTH_DIAGNOSTIC_TTL } from '../src/domain/auth-diagnostics.mjs'
import { createAuthDiagnosticReceiver } from '../functions/auth-diagnostics.js'
import { existingImportValues } from '../functions/property-bulk-import.js'

const storage = () => {
  let value = null
  return { getItem: () => value, setItem: (_, text) => { value = text }, removeItem: () => { value = null } }
}
const row = () => ({ id: randomUUID(), at: Date.now(), stage: 'sign_in', code: 'auth/network-request-failed', online: true })
test('auth failures survive reload, strip secrets and are sent after reconnection', async () => {
  const saved = storage(), sent = []
  const queue = createAuthDiagnostics({ storage: saved, uuid: randomUUID, online: () => false, send: async () => assert.fail('offline') })
  queue.record('sign_in', { code: 'auth/network-request-failed', message: 'private password email', customData: { email: 'private' } })
  assert.equal(saved.getItem().includes('private'), false)
  const restored = createAuthDiagnostics({ storage: saved, uuid: randomUUID, send: async body => { sent.push(body); return true } })
  await restored.flush()
  assert.equal(sent[0].rows.length, 1)
  assert.equal(sent[0].rows[0].online, false)
  assert.equal(saved.getItem(), null)
})
test('failure retry backs off; duplicate flush and in-flight additions are safe', async () => {
  const saved = storage(); let time = Date.now(), calls = 0, done
  const queue = createAuthDiagnostics({ storage: saved, now: () => time, uuid: randomUUID, send: () => { calls++; return new Promise(resolve => { done = resolve }) } })
  queue.record('sign_in', { code: 'unknown' })
  queue.record('profile_read', {})
  await queue.flush(); assert.equal(calls, 1)
  done(false); await new Promise(resolve => setImmediate(resolve))
  await queue.flush(); assert.equal(calls, 1)
  time += 15_000
  const pending = queue.flush(); assert.equal(calls, 2)
  queue.record('password_reset', {})
  done(true); await pending
  assert.equal(JSON.parse(saved.getItem()).length, 1)
})
test('queue expires, caps at 20, rejects corrupted storage and tolerates disabled storage', async () => {
  const saved = storage(); let time = Date.now()
  const options = { storage: saved, now: () => time, uuid: randomUUID, online: () => false, send: async () => true }
  const queue = createAuthDiagnostics(options)
  for (let i = 0; i < 25; i++) queue.record('sign_in', { code: 'untrusted-secret' })
  assert.equal(JSON.parse(saved.getItem()).length, 20)
  assert.equal(saved.getItem().includes('untrusted-secret'), false)
  time += AUTH_DIAGNOSTIC_TTL + 1
  await queue.flush(); assert.equal(saved.getItem(), null)
  saved.setItem('', JSON.stringify([{ ...row(), email: 'private' }]))
  createAuthDiagnostics(options); assert.equal(saved.getItem(), null)
  const denied = createAuthDiagnostics({ ...options, storage: { getItem() { throw Error() }, setItem() { throw Error() }, removeItem() { throw Error() } } })
  assert.doesNotThrow(() => denied.record('persistence', {}))
})
test('unauthenticated receiver accepts only bounded nonsecret fields, deduplicates and limits rate', () => {
  let time = Date.now(); const logs = []
  const receive = createAuthDiagnosticReceiver({ now: () => time, emit: value => logs.push(value) })
  const request = { data: { version: 1, rows: [row()] }, rawRequest: { ip: 'private-ip' } }
  assert.deepEqual(receive(request), { accepted: true })
  receive(request); assert.equal(logs.length, 1)
  assert.equal(JSON.stringify(logs).includes('private-ip'), false)
  assert.throws(() => receive({ ...request, data: { ...request.data, email: 'private' } }), /形式/)
  assert.throws(() => receive({ ...request, data: { version: 1, rows: [{ ...row(), message: 'private' }] } }), /形式/)
  assert.throws(() => receive({ ...request, data: { version: 1, rows: Array.from({ length: 11 }, row) } }), /形式/)
  assert.throws(() => receive({ ...request, data: { version: 1, rows: [{ ...row(), at: time - AUTH_DIAGNOSTIC_TTL - 1 }] } }), /形式/)
  for (let i = 0; i < 4; i++) receive(request)
  assert.throws(() => receive(request), /再送/)
  time += 60_000; receive(request)
})
test('chunk queries include every duplicate and boundary with no global limit', async () => {
  const calls = [], values = Array.from({ length: 300 }, (_, i) => String(i))
  const existing = new Set(['0','1','29','30','59','60','299'])
  const collection = { where: (field, op, chunk) => ({ field, op, chunk }) }
  const tx = { get: async query => { calls.push(query); return { docs: query.chunk.filter(value => existing.has(value)).map(value => ({ data: () => ({ externalKey: value }) })) } } }
  const found = await existingImportValues(tx, collection, 'externalKey', [...values, '0'])
  assert.deepEqual(found, existing); assert.equal(calls.length, 10)
  assert.ok(calls.every(call => call.op === 'in' && call.chunk.length === 30))
  calls.length = 0
  assert.equal((await existingImportValues(tx, collection, 'externalKey', [])).size, 0)
  assert.equal(calls.length, 0)
})
