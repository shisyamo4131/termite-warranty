import { httpsCallable, type Functions } from 'firebase/functions'
import type { NewCaseWorkItemInput, WorkItemResponse } from '../types/company-portal.ts'

export interface CompanyPortalInvoker {
  invoke<TInput, TResult>(name: string, input: TInput): Promise<TResult>
}

export const createCompanyPortalGateway = (invoker: CompanyPortalInvoker) => ({
  createAccount: (input: { constructionCompanyId: string; email: string }) =>
    invoker.invoke<typeof input, { uid: string }>('createConstructionCompanyAccount', input),
  setAccountEnabled: (input: { uid: string; enabled: boolean }) =>
    invoker.invoke<typeof input, { uid: string; enabled: boolean }>('setConstructionCompanyAccountEnabled', input),
  createRenewalWorkItem: (input: { caseId: string }) =>
    invoker.invoke<typeof input, { id: string }>('createRenewalWorkItem', input),
  createNewCaseWorkItem: (response: NewCaseWorkItemInput, submit: boolean) =>
    invoker.invoke<{ response: NewCaseWorkItemInput; submit: boolean }, { id: string }>('createNewCaseWorkItem', { response, submit }),
  updateWorkItem: (input: { id: string; expectedRevision: number; response: WorkItemResponse; submit: boolean }) =>
    invoker.invoke<typeof input, { id: string; status: string }>('updateCompanyCaseWorkItem', input),
  reviewWorkItem: (input: {
    id: string
    expectedRevision: number
    action: 'approve' | 'return'
    reviewComment?: string
    branchId?: string
    warrantyServiceId?: string
  }) => invoker.invoke<typeof input, { id: string; status: string }>('reviewCompanyCaseWorkItem', input),
})

export const createFirebaseCompanyPortalGateway = (functions: Functions) => createCompanyPortalGateway({
  async invoke<TInput, TResult>(name: string, input: TInput) {
    const callable = httpsCallable<TInput, TResult>(functions, name)
    return (await callable(input)).data
  },
})
