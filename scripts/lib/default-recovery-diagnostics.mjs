// Only fixed diagnostic codes cross the release-proof boundary. Never serialize errors.
const stages = new Set(['release-proof', 'project-metadata', 'functions-proof', 'hosting-proof',
  'provider-input', 'provider-live', 'provider-history', 'provider-config', 'provider-baseline',
  'provider-stability', 'hosting-site', 'hosting-version', 'hosting-files', 'hosting-stability',
  'api-read', 'public-config-read'])
const reasons = new Set(['unknown', 'http-error', 'transport-error', 'invalid-response',
  'identity-mismatch', 'configuration-mismatch', 'baseline-mismatch', 'hash-mismatch',
  'snapshot-changed', 'artifact-mismatch'])
const diagnostics = new WeakMap()

export function proofFailure(stage, reason, httpStatus) {
  const error = new Error('Release verification blocked.')
  const diagnostic = {
    stage: stages.has(stage) ? stage : 'release-proof',
    reasonCode: reasons.has(reason) ? reason : 'unknown',
  }
  if (diagnostic.reasonCode === 'http-error' && Number.isInteger(httpStatus) && httpStatus >= 400 && httpStatus <= 599) {
    diagnostic.httpStatus = httpStatus
  }
  diagnostics.set(error, Object.freeze(diagnostic))
  return error
}

export function proofDiagnostic(error, fallbackStage) {
  const fallback = stages.has(fallbackStage) ? fallbackStage : 'release-proof'
  const known = error && (typeof error === 'object' || typeof error === 'function') ? diagnostics.get(error) : undefined
  if (!known) return { stage: fallback, reasonCode: 'unknown' }
  return { ...known, stage: known.stage === 'release-proof' ? fallback : known.stage }
}

export async function proofFetch(fetcher, url, options, stage) {
  let response
  try { response = await fetcher(url, options) }
  catch { throw proofFailure(stage, 'transport-error') }
  if (!response.ok) throw proofFailure(stage, 'http-error', response.status)
  return response
}
