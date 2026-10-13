export const MONTHLY_QUERY_VERSION: 1
export function validMonth(month: unknown): boolean
export function selectedMonthToBasisMonth(month: string): string
export function withInsuranceDefaults(row: Record<string, any>): Record<string, any>
export function monthlyQueryProjection(row: Record<string, any>): Record<string, any>
export function monthlyProjectionMatches(row: Record<string, any>): boolean
