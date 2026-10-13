import { createAuthDiagnostics, type AuthDiagnosticStage } from '../../src/domain/auth-diagnostics.mjs'

let diagnostics: ReturnType<typeof createAuthDiagnostics> | undefined
export function recordAuthFailure(stage: AuthDiagnosticStage, error: unknown) {
  try { diagnostics?.record(stage, error) } catch { /* Diagnostics must preserve the original failure. */ }
}
export function startAuthDiagnostics(endpoint: string) {
  let storage: Storage | undefined
  try { storage = window.sessionStorage } catch {}
  const queue = createAuthDiagnostics({
    storage, uuid: () => crypto.randomUUID(), online: () => navigator.onLine,
    send: async body => {
      // Explicitly omit Auth tokens: this path must work after sign-in fails.
      const response = await fetch(endpoint, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: body }), signal: AbortSignal.timeout(10_000) })
      return response.ok && (await response.json()).result?.accepted === true
    },
  })
  diagnostics = queue
  const flush = () => { void queue.flush() }
  window.addEventListener('online', flush)
  const timer = window.setInterval(flush, 60_000)
  flush()
  return () => { window.removeEventListener('online', flush); window.clearInterval(timer); if (diagnostics === queue) diagnostics = undefined }
}
