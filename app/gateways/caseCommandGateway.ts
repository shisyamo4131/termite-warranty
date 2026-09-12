import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'
import { httpsCallable, type Functions } from 'firebase/functions'
import { matchesCaseUpdateBaseline } from '../../src/domain/case-rows.mjs'
import type {
  AppliedWarrantyCallableMutation,
  AppliedWarrantyMutation,
  CaseRegistration,
  CaseUpdate,
} from '../types/prototype-data.ts'
import { toTimestampBaseline } from '../utils/appliedWarrantyDraft.ts'
import { parseCanonicalLocalDate } from '../utils/canonicalLocalDate.ts'

export class CaseEditConflictError extends Error {
  constructor() {
    super('他のユーザーが案件を更新しました。最新データを確認してやり直してください。')
    this.name = 'CaseEditConflictError'
  }
}

export async function updateCaseTransaction(firestore: Firestore, input: CaseUpdate) {
  return runTransaction(firestore, async (transaction) => {
    const caseRef = doc(firestore, 'cases', input.id)
    const snapshot = await transaction.get(caseRef)
    if (!snapshot.exists()) throw new Error('対象の案件が見つかりません。')
    const current = snapshot.data()
    if (!matchesCaseUpdateBaseline(current.updatedAt, input.baselineUpdatedAt)) throw new CaseEditConflictError()
    if (current.status !== 'active') throw new CaseEditConflictError()
    if (typeof input.homeownerOverridden !== 'boolean'
      || typeof input.constructionCompanyOverridden !== 'boolean'
      || typeof input.propertyDefaultsApplied !== 'boolean') {
      throw new Error('案件の選択状態が不正です。')
    }
    if (!parseCanonicalLocalDate(input.applicationDate)) throw new Error('申込日を正しい日付で入力してください。')
    if (!parseCanonicalLocalDate(input.handoverDate)) throw new Error('引渡日を正しい日付で入力してください。')

    const propertyChanged = input.propertyId !== current.propertyId
    const resolvePropertyDefaults = propertyChanged || input.propertyDefaultsApplied
    const homeownerChanged = input.homeownerId !== current.homeownerId
    const companyChanged = input.constructionCompanyId !== current.constructionCompanyId
    if (((resolvePropertyDefaults && input.homeownerOverridden) || (!resolvePropertyDefaults && homeownerChanged)) && !input.homeownerId) {
      throw new Error('有効な施主を選択してください。')
    }
    if (((resolvePropertyDefaults && input.constructionCompanyOverridden) || (!resolvePropertyDefaults && companyChanged)) && !input.constructionCompanyId) {
      throw new Error('有効な工務店を選択してください。')
    }

    let homeownerId = input.homeownerId
    let constructionCompanyId = input.constructionCompanyId
    if (resolvePropertyDefaults) {
      const propertySnapshot = await transaction.get(doc(firestore, 'properties', input.propertyId))
      const property = propertySnapshot.data()
      if (!propertySnapshot.exists() || property?.active !== true) throw new Error('有効な物件を選択してください。')
      const defaultHomeownerId = String(property.homeownerId ?? '')
      const defaultCompanyId = String(property.constructionCompanyId ?? '')
      if (!defaultHomeownerId || !defaultCompanyId) throw new Error('物件の参照情報が不足しています。')
      const [defaultHomeowner, defaultCompany] = await Promise.all([
        transaction.get(doc(firestore, 'homeowners', defaultHomeownerId)),
        transaction.get(doc(firestore, 'constructionCompanies', defaultCompanyId)),
      ])
      if (!defaultHomeowner.exists() || defaultHomeowner.data()?.active !== true) throw new Error('物件の施主が無効です。')
      if (!defaultCompany.exists() || defaultCompany.data()?.active !== true) throw new Error('物件の工務店が無効です。')
      if (!input.homeownerOverridden) homeownerId = defaultHomeownerId
      if (!input.constructionCompanyOverridden) constructionCompanyId = defaultCompanyId
    }
    if ((resolvePropertyDefaults && input.homeownerOverridden) || (!resolvePropertyDefaults && homeownerChanged)) {
      const homeowner = await transaction.get(doc(firestore, 'homeowners', homeownerId))
      if (!homeowner.exists() || homeowner.data()?.active !== true) throw new Error('有効な施主を選択してください。')
    }
    if ((resolvePropertyDefaults && input.constructionCompanyOverridden) || (!resolvePropertyDefaults && companyChanged)) {
      const company = await transaction.get(doc(firestore, 'constructionCompanies', constructionCompanyId))
      if (!company.exists() || company.data()?.active !== true) throw new Error('有効な工務店を選択してください。')
    }
    const statusReason = input.status === 'active' ? null : input.statusReason?.trim() || null
    if (input.status !== 'active' && !statusReason) throw new Error('取消・無効には理由が必要です。')

    transaction.update(caseRef, {
      propertyId: input.propertyId,
      homeownerId,
      constructionCompanyId,
      responsibleBranchId: input.responsibleBranchId,
      applicationDate: input.applicationDate,
      handoverDate: input.handoverDate,
      status: input.status,
      statusReason,
      updatedAt: serverTimestamp(),
    })
  })
}

export interface CaseCommandInvoker {
  invoke<TInput, TResult>(name: string, input: TInput): Promise<TResult>
  updateCase(input: CaseUpdate): Promise<unknown>
}

export const createCaseCommandGateway = (invoker: CaseCommandInvoker) => ({
  registerCase: (input: CaseRegistration) =>
    invoker.invoke<CaseRegistration, { id: string; caseNumber: string }>('registerCase', input),
  updateCase: (input: CaseUpdate) => invoker.updateCase(input),
  addAppliedWarranty: (input: AppliedWarrantyMutation) => invoker.invoke<AppliedWarrantyCallableMutation, { id: string; startDate: string }>(
    'addAppliedWarranty',
    { ...input, expectedCaseUpdatedAt: toTimestampBaseline(input.expectedCaseUpdatedAt) },
  ),
  updateAppliedWarranty: (input: AppliedWarrantyMutation) => invoker.invoke<AppliedWarrantyCallableMutation, { id: string }>(
    'updateAppliedWarranty',
    { ...input, expectedCaseUpdatedAt: toTimestampBaseline(input.expectedCaseUpdatedAt) },
  ),
})

export const createFirebaseCaseCommandGateway = (firestore: Firestore, functions: Functions) =>
  createCaseCommandGateway({
    async invoke<TInput, TResult>(name: string, input: TInput) {
      const callable = httpsCallable<TInput, TResult>(functions, name)
      return (await callable(input)).data
    },
    updateCase: input => updateCaseTransaction(firestore, input),
  })
