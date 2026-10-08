import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import * as domain from '../src/domain/client-firestore-metrics.mjs'

async function harness() {
  const source = await readFile(new URL('../app/utils/firestoreMetrics.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const auth = { currentUser: null }, sent = [], listeners = []
  let authCallback, interval, visibility, fail = false, stopped = 0, finishRead
  const sdk = { onSnapshot(ref, next) { listeners.push(next); return () => {} }, getDoc() { return new Promise(resolve => { finishRead = resolve }) } }
  const exports = {}
  const require = name => name === 'firebase/firestore' ? sdk : name === 'firebase/functions' ? { httpsCallable: () => async payload => { sent.push(payload); if (fail) throw Error('offline') } } : name === 'firebase/auth' ? { onAuthStateChanged: (_, callback) => { authCallback = callback; return () => stopped++ } } : domain
  const document = { visibilityState: 'visible', addEventListener(_, cb) { visibility = cb }, removeEventListener() { visibility = undefined } }
  new Function('require', 'exports', 'setInterval', 'clearInterval', 'document', code)(require, exports, cb => { interval = cb; return 1 }, () => stopped++, document)
  const stop = exports.startFirestoreMetrics(auth, {})
  const snapshot = { exists: () => true, metadata: { fromCache: false, hasPendingWrites: false } }
  return { api: exports, sent, stop, snapshot, listeners, document, get stopped() { return stopped }, finishRead: () => finishRead(snapshot), fail: () => { fail = true }, user(uid) { auth.currentUser = uid ? { uid } : null; authCallback(auth.currentUser) }, async tick() { interval(); await new Promise(resolve => setImmediate(resolve)) }, async hide() { document.visibilityState = 'hidden'; visibility(); await new Promise(resolve => setImmediate(resolve)) } }
}
test('transport drops unauthenticated observations, aggregates signed-in counters and stops cleanly', async () => {
  const h = await harness()
  h.api.recordMetric('session', { getCalls: 5 }); await h.tick(); assert.equal(h.sent.length, 0)
  h.user('fictional-a'); h.api.recordMetric('session', { getCalls: 2 }); h.api.recordMetric('session', { getCalls: 3 })
  await h.tick(); assert.deepEqual(h.sent, [{ version: 1, rows: [{ operation: 'session', counters: { getCalls: 5 } }] }])
  await h.tick(); assert.equal(h.sent.length, 1)
  h.stop(); assert.equal(h.stopped, 2)
})
test('public recovery observation survives login changes, private late completions do not', async () => {
  const h = await harness()
  h.api.createMeasuredFirestore('recovery').onSnapshot({}, () => {})
  h.listeners[0](h.snapshot)
  h.user('fictional-a')
  const pending = h.api.createMeasuredFirestore('session').getDoc({})
  h.user('fictional-b')
  h.finishRead(); await pending
  h.listeners[0](h.snapshot); await h.tick()
  assert.equal(h.sent.length, 1)
  assert.deepEqual(h.sent[0].rows, [{ operation: 'recovery', counters: { listenerSnapshots: 1, listenerDocumentSnapshots: 1 } }])
  h.stop()
})
test('failed telemetry is discarded without retry storm; hidden tab flushes pending aggregates', async () => {
  const h = await harness(); h.user('fictional-a'); h.fail()
  h.api.recordMetric('session', { getCalls: 1 }); await h.hide()
  assert.equal(h.sent.length, 1); await h.tick(); assert.equal(h.sent.length, 1)
  h.api.recordMetric('session', { getCalls: 2 }); h.user(null); h.user('fictional-b'); await h.tick()
  assert.equal(h.sent.length, 1); h.stop()
})
