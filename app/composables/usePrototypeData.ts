import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { matchesCaseUpdateBaseline, projectCaseRows } from '../../src/domain/case-rows.mjs'
import { selectActiveMasterCatalog } from '../../src/domain/case-filters.mjs'

export interface MasterOption {
  id: string
  name: string
  [key: string]: unknown
}

export interface CaseRegistration {
  applicationDate: string
  handoverDate: string
  propertyId: string
  homeownerId: string
  constructionCompanyId: string
  homeownerOverridden: boolean
  constructionCompanyOverridden: boolean
  branchId: string
  warrantyServiceId: string
  startDate: string
}

export interface CaseRow {
  id: string
  caseNumber: string
  propertyId: string
  homeownerId: string
  constructionCompanyId: string
  responsibleBranchId: string
  status: string
  statusReason: string | null
  applicationDate: string
  handoverDate: string
  updatedAtBaseline: Timestamp | null
  propertyName: string
  homeownerName: string
  propertyPrefecture: string
  propertyMunicipality: string
  propertyAddress: string
  constructionCompanyName: string
  branchName: string
  appliedWarranties: Array<{
    id: string
    warrantyServiceId: string
    expiryDate: string
    notificationStatus: string
    status: string
    statusReason: string | null
    periodYears: number
    startDate: string
    warrantyServiceName: string
  }>
  hasNotNotified: boolean
  isAlertEligible: boolean
}

export interface CaseUpdate {
  id: string
  baselineUpdatedAt: Timestamp
  applicationDate: string
  handoverDate: string
  propertyId: string
  homeownerId: string
  constructionCompanyId: string
  homeownerOverridden: boolean
  constructionCompanyOverridden: boolean
  propertyDefaultsApplied: boolean
  responsibleBranchId: string
  status: 'active' | 'cancelled' | 'invalid'
  statusReason: string | null
}

export interface CaseFilters {
  caseNumber: string | null
  homeownerId: string | null
  propertyId: string | null
  constructionCompanyId: string | null
  responsibleBranchId: string | null
  warrantyServiceId: string | null
  prefecture: string | null
  municipality: string | null
  notificationStatus: string | null
  expiryDate: string | null
}

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
    if (!matchesCaseUpdateBaseline(current.updatedAt, input.baselineUpdatedAt)) {
      throw new CaseEditConflictError()
    }
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

export const masterCollections = [
  'branches',
  'constructionCompanies',
  'homeowners',
  'properties',
  'warrantyServices',
] as const
export type MasterCollection = (typeof masterCollections)[number]
export type MasterCatalog = Record<MasterCollection, MasterOption[]>

const toMaster = (id: string, data: DocumentData): MasterOption => ({ id, ...data, name: String(data.name ?? '') })

export const currentLocalDate = () => {
  const now = new Date()
  return formatCanonicalLocalDate(now)
}

const padDatePart = (value: number) => String(value).padStart(2, '0')

export const formatCanonicalLocalDate = (date: Date | null) => date
  ? `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
  : ''

export const parseCanonicalLocalDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3])
    ? date
    : null
}

export function usePrototypeData() {
  const { $firebase } = useNuxtApp()

  const loadAllMasters = async () => {
    const result = await Promise.all(
      masterCollections.map(async (name) => {
        const snapshot = await getDocs(collection($firebase.firestore, name))
        return [
          name,
          snapshot.docs.map((item) => toMaster(item.id, item.data())),
        ] as const
      }),
    )
    return Object.fromEntries(result) as MasterCatalog
  }

  const activeMasters = (allMasters: MasterCatalog) => selectActiveMasterCatalog(allMasters) as MasterCatalog

  const loadActiveMasters = async () => activeMasters(await loadAllMasters())

  const registerCase = async (input: CaseRegistration) => {
    const callable = httpsCallable<CaseRegistration, { id: string; caseNumber: string }>(
      $firebase.functions,
      'registerCase',
    )
    return (await callable(input)).data
  }

  const updateCase = async (input: CaseUpdate) => updateCaseTransaction($firebase.firestore, input)

  const subscribeCaseRows = (
    onRows: (rows: CaseRow[]) => void,
    onError?: () => void,
    onMasters?: (masters: MasterCatalog) => void,
  ) => {
    const cases = new Map<string, DocumentData>()
    const warranties = new Map<string, DocumentData[]>()
    const masters = new Map<string, Map<string, DocumentData>>()
    const unsubscribes: Unsubscribe[] = []
    const warrantySubscriptions = new Map<string, Unsubscribe>()
    const fail = () => {
      cases.clear()
      warranties.clear()
      onRows([])
      onError?.()
    }

    const emit = () => {
      onRows(projectCaseRows({ cases, warranties, masters, today: currentLocalDate() }))
      onMasters?.(Object.fromEntries(masterCollections.map((name) => [
        name,
        [...(masters.get(name)?.entries() ?? [])].map(([id, data]) => toMaster(id, data)),
      ])) as MasterCatalog)
    }

    for (const name of masterCollections) {
      unsubscribes.push(
        onSnapshot(
          collection($firebase.firestore, name),
          (snapshot) => {
            masters.set(name, new Map(snapshot.docs.map((item) => [item.id, item.data()])))
            emit()
          },
          fail,
        ),
      )
    }
    unsubscribes.push(
      onSnapshot(
        collection($firebase.firestore, 'cases'),
        (snapshot) => {
          const nextCaseIds = new Set(snapshot.docs.map((item) => item.id))
          for (const [caseId, unsubscribe] of warrantySubscriptions) {
            if (!nextCaseIds.has(caseId)) {
              unsubscribe()
              warrantySubscriptions.delete(caseId)
              warranties.delete(caseId)
            }
          }
          cases.clear()
          snapshot.docs.forEach((item) => {
            cases.set(item.id, item.data())
            if (!warrantySubscriptions.has(item.id)) {
              warrantySubscriptions.set(
                item.id,
                onSnapshot(
                  collection(item.ref, 'appliedWarranties'),
                  (warrantySnapshot) => {
                    warranties.set(item.id, warrantySnapshot.docs.map((warranty) => ({
                      id: warranty.id,
                      ...warranty.data(),
                    })))
                    emit()
                  },
                  fail,
                ),
              )
            }
          })
          emit()
        },
        fail,
      ),
    )
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe())
      warrantySubscriptions.forEach((unsubscribe) => unsubscribe())
    }
  }

  const subscribeCaseDetail = (
    caseId: string,
    onRow: (row: CaseRow | null) => void,
    onError?: () => void,
    onMasters?: (masters: MasterCatalog) => void,
  ) => {
    const cases = new Map<string, DocumentData>(); const warranties = new Map<string, DocumentData[]>(); const masters = new Map<string, Map<string, DocumentData>>(); const unsubscribes: Unsubscribe[] = []
    const emit = () => { const projected = projectCaseRows({ cases, warranties, masters, today: currentLocalDate() }); onRow(projected[0] ?? null); onMasters?.(Object.fromEntries(masterCollections.map(name => [name, [...(masters.get(name)?.entries() ?? [])].map(([id, data]) => toMaster(id, data))])) as MasterCatalog) }
    for (const name of masterCollections) unsubscribes.push(onSnapshot(collection($firebase.firestore, name), snapshot => { masters.set(name, new Map(snapshot.docs.map(item => [item.id, item.data()]))); emit() }, () => onError?.()))
    let warrantyUnsubscribe: Unsubscribe | undefined
    unsubscribes.push(onSnapshot(doc($firebase.firestore, 'cases', caseId), snapshot => { cases.clear(); warranties.clear(); warrantyUnsubscribe?.(); warrantyUnsubscribe = undefined; if (snapshot.exists()) { cases.set(snapshot.id, snapshot.data()); warrantyUnsubscribe = onSnapshot(collection(snapshot.ref, 'appliedWarranties'), warrantySnapshot => { warranties.set(caseId, warrantySnapshot.docs.map(item => ({ id: item.id, ...item.data() }))); emit() }, () => onError?.()) }; emit() }, () => onError?.()))
    return () => { unsubscribes.forEach(unsubscribe => unsubscribe()); warrantyUnsubscribe?.() }
  }

  return { activeMasters, loadAllMasters, loadActiveMasters, registerCase, updateCase, subscribeCaseRows, subscribeCaseDetail }
}
