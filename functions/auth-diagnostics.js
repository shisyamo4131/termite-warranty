import { HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { validAuthDiagnostic } from './domain/auth-diagnostics.mjs'

// Bounded per-instance protection, not a distributed abuse-prevention guarantee.
export function createAuthDiagnosticReceiver({ now = Date.now, emit = value => logger.warn('auth_client_failure', value) } = {}) {
  let minute = -1, requests = 0
  const sources = new Map(), seen = new Map()
  return request => {
    const data = request.data, time = now()
    if (!data || Object.keys(data).some(key => !['version', 'rows'].includes(key)) || data.version !== 1 || !Array.isArray(data.rows) || data.rows.length < 1 || data.rows.length > 10 || !data.rows.every(row => validAuthDiagnostic(row, time))) {
      throw new HttpsError('invalid-argument', '診断情報の形式が不正です。')
    }
    const current = Math.floor(time / 60_000)
    if (current !== minute) { minute = current; requests = 0; sources.clear() }
    const source = request.rawRequest?.ip ?? 'unknown'
    if (requests >= 60 || (sources.get(source) ?? 0) >= 6) throw new HttpsError('resource-exhausted', '時間をおいて再送してください。')
    requests++; sources.set(source, (sources.get(source) ?? 0) + 1)
    for (const [id, at] of seen) if (at < time - 300_000) seen.delete(id)
    for (const row of data.rows) {
      if (seen.has(row.id)) continue
      emit({ event: 'auth_client_failure', schemaVersion: 1, source: 'client_reported', ...row })
      seen.set(row.id, time)
      if (seen.size > 3000) seen.delete(seen.keys().next().value)
    }
    return { accepted: true }
  }
}
