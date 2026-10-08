export type AuthDiagnosticStage = 'persistence' | 'sign_in' | 'profile_read' | 'profile_listen' | 'password_reset'
export const AUTH_DIAGNOSTIC_STAGES: string[]
export const AUTH_DIAGNOSTIC_CODES: string[]
export const AUTH_DIAGNOSTIC_TTL: number
export function validAuthDiagnostic(row: unknown, now?: number): boolean
export function createAuthDiagnostics(options: { storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, send: (body: unknown) => Promise<boolean>, now?: () => number, uuid: () => string, online?: () => boolean }): { record: (stage: AuthDiagnosticStage, error: unknown) => void, flush: () => Promise<void> }
