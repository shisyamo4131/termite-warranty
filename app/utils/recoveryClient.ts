import { shallowRef } from 'vue'

export interface RecoveryRuntime {
  protocol: number
  phase: 'normal' | 'recovering' | 'verification' | 'unavailable'
  generation: number
  databaseId: string
  controlDatabaseId: string | null
}
export const recoveryRuntime = shallowRef<RecoveryRuntime>({ protocol: 2, phase: 'unavailable', generation: 0, databaseId: '(default)', controlDatabaseId: null })
export const recoveryProblem = shallowRef('')
// Frozen for this page lifetime. A queued command must never adopt a new generation.
let requestGeneration = 0
export function initializeRecovery(value: RecoveryRuntime) { recoveryRuntime.value = value; requestGeneration = value.generation }
export function withRuntimeGeneration<T>(input: T) { return { ...input, runtimeGeneration: requestGeneration, runtimeProtocol: 2 } }
export function directRecoveryMetadata() {
  if (requestGeneration < 1 || recoveryRuntime.value.phase !== 'normal' || recoveryRuntime.value.generation !== requestGeneration) throw new Error('接続状態を確認できません。再読込してください。')
  return { runtimeGeneration: requestGeneration, runtimeProtocol: 2, runtimeNonce: crypto.randomUUID() }
}
