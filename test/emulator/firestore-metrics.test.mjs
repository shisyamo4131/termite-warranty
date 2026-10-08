import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth as adminAuth } from 'firebase-admin/auth'
import { initializeApp as webApp, deleteApp as deleteWebApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import { measureFirestoreOperation, observedFirestore } from '../../functions/firestore-metrics.js'
import { LOCAL_RUNTIME, localRuntimeHost, localRuntimeUrl } from '../../src/config/local-emulator.mjs'

if (process.env.FIRESTORE_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.firestorePort)) throw Error('Dedicated fictional emulator required')
const app = initializeApp({ projectId: 'demo-termite-warranty' }, 'metrics-test')
const db = getFirestore(app)
const client = webApp({ projectId: 'demo-termite-warranty', apiKey: 'demo-only-key' }, 'metrics-test')
const auth = getAuth(client), functions = getFunctions(client, 'asia-northeast1')
const path = 'constructionCompanies/metrics-observation-fixture'
let uid
const totals = log => log.rows.reduce((all, row) => { for (const [key, value] of Object.entries(row.counters)) all[key] = (all[key] ?? 0) + value; return all }, {})
before(async () => {
  connectAuthEmulator(auth, localRuntimeUrl(LOCAL_RUNTIME.authPort), { disableWarnings: true })
  connectFunctionsEmulator(functions, LOCAL_RUNTIME.host, LOCAL_RUNTIME.functionsPort)
  uid = (await createUserWithEmailAndPassword(auth, 'metrics-fixture@example.invalid', 'Demo-only-password-123')).user.uid
  await db.doc(`staffAccounts/${uid}`).set({ enabled: true, role: 'general_staff' })
  await db.doc(path).set({ name: 'Synthetic metrics fixture', metricFixture: true })
})
after(async () => {
  await db.doc(path).delete()
  if (uid) { await db.doc(`staffAccounts/${uid}`).delete(); await adminAuth(app).deleteUser(uid) }
  await deleteWebApp(client); await deleteApp(app)
})

test('native SDK proxy preserves refs, snapshots, query cursors/getAll, batch and transaction retries', async () => {
  let log
  await measureFirestoreOperation('propertyPrototype', 'detail', async () => {
    const measured = observedFirestore(db)
    const ref = measured.doc(path)
    const snap = await ref.get()
    assert.equal(snap.ref.isEqual(ref), true)
    const pair = await measured.getAll(snap.ref, measured.doc(path + '-missing'))
    assert.equal(pair[0].exists, true); assert.equal(pair[1].exists, false)
    const query = measured.collection('constructionCompanies').where('metricFixture', '==', true)
    const result = await query.get()
    assert.equal(result.docs[0].data().metricFixture, true)
    assert.equal((await query.startAfter(result.docs[0]).get()).empty, true)
    let attempts = 0
    await measured.runTransaction(async tx => {
      await tx.getAll(ref)
      await tx.get(query)
      tx.update(ref, { count: 1 })
      if (!attempts++) { const error = Error('Synthetic retry'); error.code = 10; throw error }
    })
    await measured.batch().set(ref, { count: 2 }, { merge: true }).commit()
  }, value => { log = value })
  const count = totals(log)
  assert.equal(count.transactionAttempts, 2); assert.equal(count.transactionRetries, 1)
  assert.equal(count.writeAttempts, 3); assert.equal(count.writeConfirmed, 2)
  assert.equal(count.discardedTransactionWrites, 1); assert.equal(count.getAllCalls, 3)
  assert.equal(count.missingDocuments, 1); assert.equal(count.emptyQueries, 1)
  assert.doesNotMatch(JSON.stringify(log), /metrics-observation-fixture|Synthetic metrics fixture/)
  assert.equal(log.rows.find(row => row.collection === 'constructionCompanies').counters.queryCalls, 4)
})

test('native SDK failed writes/transactions do not confirm success', async () => {
  let log
  await measureFirestoreOperation('propertyPrototype', 'save', async () => {
    const measured = observedFirestore(db)
    await assert.rejects(measured.doc(path + '-missing').update({ count: 1 }))
    await assert.rejects(measured.runTransaction(async tx => {
      tx.set(measured.doc(path), { count: 99 })
      throw Error('Synthetic business rejection')
    }))
  }, value => { log = value })
  assert.equal(totals(log).writeConfirmed, undefined)
  assert.equal(totals(log).writeAttempts, 2)
  assert.equal(totals(log).writeFailures, 2)
  assert.equal((await db.doc(path).get()).data().count, 2)
})

test('HTTP telemetry callable accepts bounded aggregate and rejects text dimensions/disabled account', async () => {
  const call = httpsCallable(functions, 'reportFirestoreMetrics')
  const input = { version: 1, rows: [{ operation: 'referenceStore', counters: { queryCalls: 1, returnedDocuments: 2 } }] }
  assert.deepEqual((await call(input)).data, { accepted: true })
  await assert.rejects(call({ ...input, query: 'forbidden arbitrary text' }), { code: 'functions/invalid-argument' })
  await assert.rejects(call({ version: 1, rows: [{ operation: 'caseQuery', counters: { getCalls: 1_000_001 } }] }), { code: 'functions/invalid-argument' })
  await db.doc(`staffAccounts/${uid}`).update({ enabled: false })
  await assert.rejects(call(input), { code: 'functions/permission-denied' })
})
