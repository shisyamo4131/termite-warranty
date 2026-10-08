import { HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { CLIENT_METRIC_OPERATIONS, CLIENT_METRIC_COUNTERS } from './domain/client-firestore-metrics.mjs'

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const keysAre = (value, keys) => plain(value) && Object.keys(value).every(key => keys.includes(key))
const invalid = () => { throw new HttpsError('invalid-argument', '計測値の形式を確認してください。') }
export function validateClientMetrics(input) {
  if (!keysAre(input, ['version','rows']) || input.version !== 1 || !Array.isArray(input.rows) || input.rows.length < 1 || input.rows.length > 40) invalid()
  return input.rows.map(row => {
    if (!keysAre(row, ['operation','counters']) || !CLIENT_METRIC_OPERATIONS.includes(row.operation) || !keysAre(row.counters, CLIENT_METRIC_COUNTERS) || !Object.keys(row.counters).length) invalid()
    const counters = {}
    for (const [key, value] of Object.entries(row.counters)) {
      if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) invalid()
      counters[key] = value
    }
    return { operation: row.operation, counters }
  })
}
export async function reportClientMetrics(request, db, emit = record => logger.info('firestore_client_metrics', record)) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'ログインしてください。')
  // Reject arbitrary labels/payloads before any account lookup or logging.
  const rows = validateClientMetrics(request.data)
  const staff = await db.doc(`staffAccounts/${request.auth.uid}`).get()
  let enabled = staff.exists && staff.data()?.enabled === true
  if (!staff.exists) enabled = (await db.doc(`constructionCompanyAccounts/${request.auth.uid}`).get()).data()?.enabled === true
  if (!enabled) throw new HttpsError('permission-denied', '利用可能なアカウントを確認できません。')
  try { emit({ event: 'firestore_metrics', schemaVersion: 1, source: 'client_reported', rows }) }
  catch { return { accepted: false } }
  return { accepted: true }
}
