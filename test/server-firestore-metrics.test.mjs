import assert from 'node:assert/strict'
import { test } from 'node:test'
import { measureFirestoreOperation, observedFirestore } from '../functions/firestore-metrics.js'
import { reportClientMetrics, validateClientMetrics } from '../functions/client-metrics.js'

function fixture({ retry = false, failCommit = false } = {}) {
  const data = new Map([['constructionCompanies/personal-id', { name: 'private-name' }]])
  const snapshot = ref => ({ ref, exists: data.has(ref.path), data: () => data.get(ref.path) })
  const db = {
    doc(path) { return { path, get: async () => snapshot(db.doc(path)), set: async value => { data.set(path, value) }, delete: async () => { data.delete(path) }, update: async () => { throw new Error('private-error') } } },
    collection(path) { return { path, where() { return this }, async get() { const docs = [...data.keys()].filter(key => key.startsWith(path + '/')).map(key => snapshot(db.doc(key))); return { docs, size: docs.length, empty: !docs.length } } } },
    async getAll(...refs) { return refs.map(snapshot) },
    async runTransaction(callback) {
      const tx = { get: ref => ref.get(), getAll: (...refs) => db.getAll(...refs), set() { return tx }, delete() { return tx } }
      if (retry) await callback(tx)
      const result = await callback(tx)
      if (failCommit) throw new Error('private-commit-error')
      return result
    },
  }
  return db
}
const totals = record => record.rows.reduce((all, row) => { for (const [key, value] of Object.entries(row.counters)) all[key] = (all[key] ?? 0) + value; return all }, {})
async function capture(callback, operation = 'propertyPrototype', action = 'detail') {
  let record
  const result = await measureFirestoreOperation(operation, action, callback, value => { record = value })
  return { result, record, totals: totals(record) }
}

test('server observations count missing/empty/getAll and redact identifiers/data/errors', async () => {
  const native = fixture()
  const { record, totals: counts } = await capture(async () => {
    const db = observedFirestore(native)
    const found = await db.doc('constructionCompanies/personal-id').get()
    assert.equal(found.data().name, 'private-name')
    assert.equal(found.ref.path, 'constructionCompanies/personal-id')
    await db.doc('constructionCompanies/missing-id').get()
    await db.collection('companyBranches').where('name', '==', 'private-query').get()
    await db.getAll(db.doc('constructionCompanies/personal-id'), db.doc('constructionCompanies/missing-id'))
    await assert.rejects(db.doc('constructionCompanies/personal-id').update({ name: 'private-name' }))
  }, 'private-operation', 'private-action')
  assert.equal(counts.getCalls, 2); assert.equal(counts.queryCalls, 1); assert.equal(counts.getAllCalls, 1)
  assert.equal(counts.returnedDocuments, 2); assert.equal(counts.missingDocuments, 2); assert.equal(counts.emptyQueries, 1)
  assert.equal(counts.writeAttempts, 1); assert.equal(counts.writeFailures, 1); assert.equal(counts.writeConfirmed, undefined)
  assert.equal(record.operation, 'other'); assert.equal(record.action, 'none')
  assert.doesNotMatch(JSON.stringify(record), /personal-id|missing-id|private-/)
})

test('transaction callback retries count attempts but only confirmed final writes', async () => {
  const { totals: counts, record } = await capture(async () => {
    const db = observedFirestore(fixture({ retry: true }))
    assert.equal(await db.runTransaction(async tx => {
      await tx.get(db.collection('constructionCompanies').where('name', '==', 'private-query'))
      tx.set(db.doc('constructionCompanies/id'), {}).delete(db.doc('companyBranches/id'))
      return 'business-result'
    }), 'business-result')
  })
  assert.equal(counts.transactionAttempts, 2); assert.equal(counts.transactionRetries, 1)
  assert.equal(counts.writeAttempts, 4); assert.equal(counts.writeConfirmed, 2)
  assert.equal(counts.deleteAttempts, 2); assert.equal(counts.deleteConfirmed, 1)
  assert.equal(counts.discardedTransactionWrites, 2)
  assert.equal(record.rows.find(row => row.collection === 'constructionCompanies').counters.queryCalls, 2)
})

test('failed commit never confirms queued writes and preserves original error', async () => {
  let record
  await assert.rejects(measureFirestoreOperation('propertyPrototype', 'save', async () => {
    const db = observedFirestore(fixture({ failCommit: true }))
    await db.runTransaction(async tx => tx.set(db.doc('constructionCompanies/id'), {}))
  }, value => { record = value }), /private-commit-error/)
  const counts = totals(record)
  assert.equal(record.outcome, 'failure'); assert.equal(counts.transactionFailures, 1)
  assert.equal(counts.writeFailures, 1); assert.equal(counts.writeConfirmed, undefined)
})

test('failed reads retain their original rejection and logging cannot mask it', async () => {
  const original = Error('private-read-failure')
  const native = { doc: path => ({ path, get: async () => { throw original } }) }
  let log
  await assert.rejects(measureFirestoreOperation('propertyPrototype', 'detail', async () => {
    await observedFirestore(native).doc('constructionCompanies/private-id').get()
  }, value => { log = value; throw Error('logging failure') }), error => error === original)
  assert.equal(totals(log).readFailures, 1)
  assert.equal(totals(log).getCalls, 1)
  assert.equal(totals(log).returnedDocuments, undefined)
  assert.equal(log.outcome, 'failure')
  assert.doesNotMatch(JSON.stringify(log), /private-/)
})

test('parallel request contexts and recovery/telemetry categories remain separate; logger failure is soft', async () => {
  const native = fixture()
  const output = await Promise.all([capture(async () => {
    await new Promise(resolve => setTimeout(resolve, 8))
    await observedFirestore(native, 'control', 'recovery').doc('recovery/runtime').get()
  }), capture(async () => {
    await observedFirestore(native, 'business', 'telemetry').doc('staffAccounts/private-user').get()
    await observedFirestore(native).doc('constructionCompanies/personal-id').get()
  })])
  assert.equal(output[0].totals.getCalls, 1); assert.equal(output[1].totals.getCalls, 2)
  assert.deepEqual(output[0].record.rows.map(row => row.category), ['recovery'])
  assert.deepEqual(output[1].record.rows.map(row => row.category), ['telemetry','business'])
  assert.equal(await measureFirestoreOperation('propertyPrototype', 'detail', () => 123, () => { throw Error('logger unavailable') }), 123)
  assert.equal(observedFirestore(native), native)
})

test('client batches reject arbitrary dimensions, extreme counters and noncanonical bodies', async () => {
  const valid = { version: 1, rows: [{ operation: 'referenceStore', counters: { queryCalls: 1, returnedDocuments: 200 } }] }
  assert.deepEqual(validateClientMetrics(valid), valid.rows)
  for (const input of [{ ...valid, uid: 'private-user' }, { ...valid, rows: Array(41).fill(valid.rows[0]) }, { version: 1, rows: [] }, { version: 1, rows: [{ operation: 'private-query', counters: { getCalls: 1 } }] }, ...[-1, 1.5, 1_000_001, NaN, '1'].map(value => ({ version: 1, rows: [{ operation: 'session', counters: { getCalls: value } }] })), { version: 1, rows: [{ operation: 'session', counters: { privateLabel: 1 } }] }]) assert.throws(() => validateClientMetrics(input), { code: 'invalid-argument' })
  const db = fixture()
  await db.doc('staffAccounts/enabled').set({ enabled: true })
  await db.doc('staffAccounts/disabled').set({ enabled: false })
  await db.doc('constructionCompanyAccounts/portal').set({ enabled: true })
  let log
  assert.deepEqual(await reportClientMetrics({ auth: { uid: 'enabled' }, data: valid }, db, value => { log = value }), { accepted: true })
  assert.equal(log.source, 'client_reported'); assert.equal(log.event, 'firestore_metrics'); assert.doesNotMatch(JSON.stringify(log), /enabled|staffAccounts/)
  assert.deepEqual(await reportClientMetrics({ auth: { uid: 'portal' }, data: valid }, db, () => {}), { accepted: true })
  for (const uid of ['disabled','missing']) await assert.rejects(reportClientMetrics({ auth: { uid }, data: valid }, db), { code: 'permission-denied' })
  await assert.rejects(reportClientMetrics({ data: valid }, db), { code: 'unauthenticated' })
  assert.deepEqual(await reportClientMetrics({ auth: { uid: 'enabled' }, data: valid }, db, () => { throw Error('unavailable') }), { accepted: false })
})
