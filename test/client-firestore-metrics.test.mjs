import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createClientMetricBuffer, measuredFirestore } from '../src/domain/client-firestore-metrics.mjs'

const doc = (exists = true) => ({ exists: () => exists, metadata: { fromCache: false, hasPendingWrites: false } })
test('client counters exclude unapproved labels/data and bound retained values', () => {
  const buffer = createClientMetricBuffer()
  buffer.record('user@example.com', { getCalls: 1 })
  buffer.record('session', { getCalls: 999999, email: 'secret', returnedDocuments: -1 })
  buffer.record('session', { getCalls: 10, writeConfirmed: NaN })
  assert.deepEqual(buffer.drain(), [{ operation: 'session', counters: { getCalls: 1000000 } }])
  assert.deepEqual(buffer.drain(), [])
  buffer.record('session', { getCalls: 1 }); buffer.clear(); assert.deepEqual(buffer.drain(), [])
})
test('missing/empty reads and rejected writes are distinct observations', async () => {
  const buffer = createClientMetricBuffer(), error = new Error('not logged')
  const sdk = measuredFirestore({ getDoc: async () => doc(false), getDocs: async () => ({ size: 0 }), updateDoc: async () => { throw error } }, c => buffer.record('caseCommand', c))
  await sdk.getDoc('not serialized'); await sdk.getDocs('not serialized')
  await assert.rejects(sdk.updateDoc('secret'), e => e === error)
  const c = buffer.drain()[0].counters
  assert.equal(c.missingDocuments, 1); assert.equal(c.emptyQueries, 1); assert.equal(c.returnedDocuments, 0)
  assert.equal(c.writeAttempts, 1); assert.equal(c.writeFailures, 1); assert.equal(c.writeConfirmed, undefined)
})
test('listener cache/pending/initial/delta events and idempotent stop are separate', () => {
  const buffer = createClientMetricBuffer(); let callback, fail, stops = 0
  const sdk = measuredFirestore({ onSnapshot(_ref, next, error) { callback = next; fail = error; return () => stops++ } }, c => buffer.record('referenceStore', c))
  let received = 0, failures = 0
  const stop = sdk.onSnapshot({}, () => received++, () => failures++)
  const snapshot = (cache, pending, changes = []) => ({ docs: [{}, {}], size: 2, metadata: { fromCache: cache, hasPendingWrites: pending }, docChanges: () => changes })
  callback(snapshot(true, false)); callback(snapshot(false, true)); callback(snapshot(false, false))
  callback(snapshot(false, false, [{ type: 'removed' }, { type: 'modified' }]))
  fail(new Error('not logged')); stop(); stop()
  const c = buffer.drain()[0].counters
  assert.equal(received, 4); assert.equal(failures, 1); assert.equal(stops, 1)
  assert.equal(c.listenerInitialDocuments, 2); assert.equal(c.listenerCacheSnapshots, 1); assert.equal(c.listenerPendingSnapshots, 1)
  assert.equal(c.listenerModified, 1); assert.equal(c.listenerRemoved, 1); assert.equal(c.listenerStops, 1)
})
test('transactions count retry reads/attempts but only final committed writes', async () => {
  const buffer = createClientMetricBuffer()
  const tx = { get: async () => doc(), set() { return this }, delete() { return this } }
  const sdk = measuredFirestore({ async runTransaction(db, cb) { await cb(tx); return cb(tx) } }, c => buffer.record('caseCommand', c))
  assert.equal(await sdk.runTransaction({}, async t => { await t.get({}); t.set({}, {}).delete({}); return 'saved' }), 'saved')
  const c = buffer.drain()[0].counters
  assert.equal(c.transactionAttempts, 2); assert.equal(c.transactionRetries, 1); assert.equal(c.returnedDocuments, 2)
  assert.equal(c.writeAttempts, 4); assert.equal(c.writeConfirmed, 2); assert.equal(c.deleteConfirmed, 1)
})
test('aborted transaction never reports a confirmed write', async () => {
  const buffer = createClientMetricBuffer(), error = new Error('abort')
  const sdk = measuredFirestore({ async runTransaction(db, cb) { await cb({ set() {} }); throw error } }, c => buffer.record('caseCommand', c))
  await assert.rejects(sdk.runTransaction({}, async t => { t.set({}, {}); return 'uncommitted' }), e => e === error)
  const c = buffer.drain()[0].counters
  assert.equal(c.writeAttempts, 1); assert.equal(c.writeConfirmed, undefined); assert.equal(c.transactionFailures, 1)
})
test('telemetry failure cannot replace the SDK result or error', async () => {
  const value = doc(), error = new Error('original')
  const sdk = measuredFirestore({ getDoc: async () => value, updateDoc: async () => { throw error } }, () => { throw Error('metrics unavailable') })
  assert.equal(await sdk.getDoc({}), value)
  await assert.rejects(sdk.updateDoc({}), e => e === error)
})
test('old identity read completion and queued listener records are discarded', async () => {
  let epoch = 1, resolve, next
  const buffer = createClientMetricBuffer()
  const sdk = measuredFirestore({ getDoc: () => new Promise(r => { resolve = r }), onSnapshot(ref, callback) { next = callback; return () => {} } }, c => buffer.record('session', c), () => epoch)
  const pending = sdk.getDoc({})
  const stop = sdk.onSnapshot({}, () => {})
  epoch++; buffer.clear()
  resolve(doc()); assert.equal((await pending).exists(), true)
  next(doc()); stop()
  assert.deepEqual(buffer.drain(), [])
})
test('document observer notifications do not invent modified/deleted counts', () => {
  let observer
  const buffer = createClientMetricBuffer()
  const sdk = measuredFirestore({ onSnapshot(ref, options, value) { observer = value; return () => {} } }, c => buffer.record('session', c))
  let received = 0
  sdk.onSnapshot({}, { includeMetadataChanges: true }, { next() { received++ } })
  observer.next(doc()); observer.next(doc()); observer.next(doc(false))
  const c = buffer.drain()[0].counters
  assert.equal(received, 3); assert.equal(c.listenerDocumentSnapshots, 2)
  assert.equal(c.listenerModified, undefined); assert.equal(c.listenerRemoved, undefined)
})
