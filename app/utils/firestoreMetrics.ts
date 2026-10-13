import * as sdk from 'firebase/firestore'
import { httpsCallable, type Functions } from 'firebase/functions'
import { onAuthStateChanged, type Auth } from 'firebase/auth'
import { createClientMetricBuffer, measuredFirestore } from '../../src/domain/client-firestore-metrics.mjs'

const buffer = createClientMetricBuffer()
let generation = 0
let canRecord: () => boolean = () => false
export const recordMetric = (operation: string, counters: Record<string, number>) => { if (canRecord()) buffer.record(operation, counters) }
// The public recovery marker has app lifetime, independent of account identity.
// It still emits counters only while a signed-in identity is established.
type MeasuredMethods = Pick<typeof sdk, 'getDoc'|'getDocs'|'setDoc'|'updateDoc'|'deleteDoc'|'onSnapshot'|'runTransaction'>
export const createMeasuredFirestore = (operation: string) => measuredFirestore<MeasuredMethods>(sdk, counters => recordMetric(operation, counters), () => operation === 'recovery' ? 0 : generation)

// One transport per app/tab. No durable queue, credentials, document IDs or values.
export function startFirestoreMetrics(auth: Auth, functions: Functions) {
  let uid = auth.currentUser?.uid, sending = false
  canRecord = () => Boolean(uid && auth.currentUser?.uid === uid)
  const send = httpsCallable(functions, 'reportFirestoreMetrics', { timeout: 10000 })
  const unsubscribe = onAuthStateChanged(auth, user => {
    if (uid !== user?.uid) { generation++; buffer.clear(); uid = user?.uid }
  })
  const flush = async () => {
    if (sending || !auth.currentUser || auth.currentUser.uid !== uid) return
    const rows = buffer.drain()
    if (!rows.length) return
    sending = true
    try { await send({ version: 1, rows }) }
    catch { /* Bounded best-effort transport. No recursive reporting/retry storm. */ }
    finally { sending = false }
  }
  const timer = setInterval(() => { void flush() }, 60000)
  const onHidden = () => { if (document.visibilityState === 'hidden') void flush() }
  document.addEventListener('visibilitychange', onHidden)
  return () => { clearInterval(timer); unsubscribe(); document.removeEventListener('visibilitychange', onHidden); generation++; buffer.clear(); canRecord = () => false }
}
