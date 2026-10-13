import { databaseId, RecoveryError } from './recovery.mjs'

export const FIXED_PROTOCOL = 2
export function fixedRuntimeState(value) {
  if (!value || value.protocol !== FIXED_PROTOCOL || value.databaseId !== '(default)'
    || !['normal', 'recovering', 'verification'].includes(value.phase)
    || !Number.isSafeInteger(value.generation) || value.generation < 1) {
    throw new RecoveryError('Fixed recovery state is unavailable.')
  }
  const controlDatabaseId = databaseId(value.controlDatabaseId)
  if (controlDatabaseId === '(default)') throw new RecoveryError('Recovery control must be separate.')
  return { protocol: FIXED_PROTOCOL, phase: value.phase, generation: value.generation, databaseId: '(default)', controlDatabaseId }
}
export function sameFixedEpoch(left, right) {
  return left.protocol === right.protocol && left.phase === right.phase && left.generation === right.generation
    && left.databaseId === right.databaseId && left.controlDatabaseId === right.controlDatabaseId
}
export function assertFixedRequest(state, generation, protocol, mutation, administrator) {
  fixedRuntimeState(state)
  if (protocol !== FIXED_PROTOCOL || generation !== state.generation) throw new RecoveryError('接続状態が変更されました。画面を再読込してください。')
  if (state.phase === 'recovering' || state.phase === 'verification' && (mutation || !administrator)) throw new RecoveryError('メンテナンス中のため、この操作はできません。')
}
