// Operational metadata only. Never place document bodies or credentials here.
export const RUNTIME_PATH = 'recovery/runtime'
export const ACTIVATION_PATH = '_recovery/activation'
export const ACCESS_PATH = '_recovery/access'
export const RECOVERY_ROLES = ['developer_superuser', 'house_solution_administrator']
export const PROPERTY_READ_ACTIONS = ['catalog', 'list', 'propertyList','certificateList','billingList', 'detail', 'alertSettings', 'accounts']
export class RecoveryError extends Error {
  constructor(message, code = 'failed-precondition') { super(message); this.code = code }
}
export function databaseId(value) {
  if (value === '(default)' || typeof value === 'string' && /^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(value) && !/^[0-9a-f]{8}-/.test(value)) return value
  throw new RecoveryError('Invalid database identifier.')
}
export function runtimeState(value) {
  if (!value || !['normal', 'recovering', 'verification'].includes(value.phase) || !Number.isSafeInteger(value.generation) || value.generation < 1) throw new RecoveryError('Recovery state is unavailable.')
  return { phase: value.phase, generation: value.generation, databaseId: databaseId(value.databaseId), controlDatabaseId: databaseId(value.controlDatabaseId) }
}
export function assertRequest(state, generation, mutation, administrator) {
  if (generation !== state.generation) throw new RecoveryError('接続先が変更されました。画面を再読込してください。')
  if (state.phase === 'recovering' || state.phase === 'verification' && (mutation || !administrator)) throw new RecoveryError('メンテナンス中のため、この操作はできません。')
}
export function assertTransition(state, next, { activeOperations = 0, approval, verified = false } = {}) {
  runtimeState(state)
  if (next === 'recovering' && state.phase === 'normal') return
  if (!Number.isInteger(activeOperations) || activeOperations !== 0) throw new RecoveryError('Active operations must be drained.')
  if (next === 'verification' && state.phase === 'recovering' && verified && typeof approval === 'string' && approval.trim()) return
  if (next === 'normal' && state.phase === 'verification' && verified && typeof approval === 'string' && approval.trim()) return
  throw new RecoveryError('Transition requires verification and external approval evidence.')
}
