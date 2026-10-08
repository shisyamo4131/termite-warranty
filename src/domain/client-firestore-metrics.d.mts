export const CLIENT_METRIC_OPERATIONS: readonly string[]
export const CLIENT_METRIC_COUNTERS: readonly string[]
export function createClientMetricBuffer(): { record(operation: string, counters: Record<string, number>): void; drain(): { operation: string; counters: Record<string, number> }[]; clear(): void }
export function measuredFirestore<T>(sdk: T, record: (counters: Record<string, number>) => void, getGeneration?: () => number): T
