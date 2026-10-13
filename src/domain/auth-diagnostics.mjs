export const AUTH_DIAGNOSTIC_STAGES = ['persistence', 'sign_in', 'profile_read', 'profile_listen', 'password_reset']
export const AUTH_DIAGNOSTIC_CODES = ['auth/network-request-failed', 'auth/invalid-credential', 'auth/too-many-requests', 'auth/user-disabled', 'auth/invalid-email', 'auth/operation-not-allowed', 'auth/web-storage-unsupported', 'permission-denied', 'unavailable', 'deadline-exceeded', 'account-timeout', 'unknown']
export const AUTH_DIAGNOSTIC_TTL = 24 * 60 * 60 * 1000
const keys = ['id', 'at', 'stage', 'code', 'online']
export function validAuthDiagnostic(row, now = Date.now()) {
  return row && typeof row === 'object' && !Array.isArray(row) && Object.keys(row).length === keys.length && Object.keys(row).every(key => keys.includes(key)) &&
    typeof row.id === 'string' && /^[a-f0-9-]{36}$/.test(row.id) && Number.isSafeInteger(row.at) && row.at >= now - AUTH_DIAGNOSTIC_TTL && row.at <= now + 60_000 &&
    AUTH_DIAGNOSTIC_STAGES.includes(row.stage) && AUTH_DIAGNOSTIC_CODES.includes(row.code) && typeof row.online === 'boolean'
}
// This queue never retains the original error, credentials, URL or account identity.
export function createAuthDiagnostics({ storage, send, now = Date.now, uuid, online = () => true }) {
  const key = 'tw-auth-diagnostics-v1'
  let rows = [], busy = false, nextAttempt = 0, failures = 0
  try {
    const saved = JSON.parse(storage?.getItem(key) ?? '[]')
    if (Array.isArray(saved)) rows = saved.filter(row => validAuthDiagnostic(row, now())).slice(-20)
  } catch { /* Storage denial must not prevent sign-in. */ }
  const persist = () => { try { if (rows.length) storage?.setItem(key, JSON.stringify(rows)); else storage?.removeItem(key) } catch {} }
  persist()
  const flush = async () => {
    rows = rows.filter(row => validAuthDiagnostic(row, now())); persist()
    if (busy || !rows.length || !online() || now() < nextAttempt) return
    busy = true
    const batch = rows.slice(0, 10), ids = new Set(batch.map(row => row.id))
    try {
      if (await send({ version: 1, rows: batch }) !== true) throw new Error('diagnostic-rejected')
      rows = rows.filter(row => !ids.has(row.id)); failures = 0; nextAttempt = 0
    } catch {
      failures++; nextAttempt = now() + Math.min(300_000, 15_000 * 2 ** Math.min(failures - 1, 5))
    } finally { busy = false; persist() }
  }
  return {
    record(stage, error) {
      if (!AUTH_DIAGNOSTIC_STAGES.includes(stage)) return
      const value = error?.code === undefined && error?.message === 'account-timeout' ? 'account-timeout' : error?.code
      const code = AUTH_DIAGNOSTIC_CODES.includes(value) ? value : 'unknown'
      rows = [...rows.filter(row => validAuthDiagnostic(row, now())), { id: uuid(), at: now(), stage, code, online: online() }].slice(-20)
      persist(); void flush()
    },
    flush,
  }
}
