import { shallowRef } from 'vue'

export interface RecoveryRuntime {
  phase: 'normal' | 'recovering' | 'verification' | 'unavailable'
  generation: number
  databaseId: string
  controlDatabaseId: string | null
}
export const recoveryRuntime = shallowRef<RecoveryRuntime>({ phase: 'unavailable', generation: 0, databaseId: '(default)', controlDatabaseId: null })
export const recoveryProblem = shallowRef('')
// Frozen for this page lifetime. A queued command must never adopt a new generation.
let requestGeneration = 0
export function initializeRecovery(value: RecoveryRuntime) { recoveryRuntime.value = value; requestGeneration = value.generation }
export function withRuntimeGeneration<T>(input: T) { return requestGeneration > 0 ? { ...input, runtimeGeneration: requestGeneration } : input }
