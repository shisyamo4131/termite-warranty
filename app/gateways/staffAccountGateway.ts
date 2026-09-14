import { sendPasswordResetEmail, type Auth } from 'firebase/auth'
import { httpsCallable, type Functions } from 'firebase/functions'

export type StaffRole = 'house_solution_administrator' | 'general_staff'

export interface StaffAccountRow {
  uid: string
  email: string
  displayName: string
  role: StaffRole
  enabled: boolean
}

export interface StaffAccountInvoker {
  invoke<TInput, TResult>(name: string, input: TInput): Promise<TResult>
}

export const createStaffAccountGateway = (invoker: StaffAccountInvoker, sendSetupEmail: (email: string) => Promise<void>) => ({
  list: () => invoker.invoke<Record<string, never>, { targetRole: StaffRole; accounts: StaffAccountRow[] }>('listManageableStaffAccounts', {}),
  create: (input: { email: string; displayName: string }) =>
    invoker.invoke<typeof input, StaffAccountRow>('createStaffAccount', input),
  update: (input: { uid: string; email: string; displayName: string }) =>
    invoker.invoke<typeof input, Pick<StaffAccountRow, 'uid' | 'email' | 'displayName'>>('updateStaffAccount', input),
  setEnabled: (input: { uid: string; enabled: boolean }) =>
    invoker.invoke<typeof input, { uid: string; enabled: boolean }>('setStaffAccountEnabled', input),
  sendPasswordSetupEmail: sendSetupEmail,
})

export const createFirebaseStaffAccountGateway = (functions: Functions, auth: Auth) => createStaffAccountGateway({
  async invoke<TInput, TResult>(name: string, input: TInput) {
    const callable = httpsCallable<TInput, TResult>(functions, name)
    return (await callable(input)).data
  },
}, async (email) => {
  auth.languageCode = 'ja'
  await sendPasswordResetEmail(auth, email)
})
