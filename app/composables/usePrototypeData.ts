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
  propertyId: string
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
  }>
  hasNotNotified: boolean
  isAlertEligible: boolean
}

export interface CaseUpdate {
  id: string
  baselineUpdatedAt: Timestamp
  propertyId: string
  constructionCompanyId: string
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

    let homeownerId = String(current.homeownerId ?? '')
    let constructionCompanyId = input.constructionCompanyId
    if (input.propertyId !== current.propertyId) {
      const propertySnapshot = await transaction.get(doc(firestore, 'properties', input.propertyId))
      const property = propertySnapshot.data()
      if (!propertySnapshot.exists() || property?.active !== true) throw new Error('有効な物件を選択してください。')
      homeownerId = String(property.homeownerId ?? '')
      constructionCompanyId = String(property.constructionCompanyId ?? '')
    }
    const statusReason = input.status === 'active' ? null : input.statusReason?.trim() || null
    if (input.status !== 'active' && !statusReason) throw new Error('取消・無効には理由が必要です。')

    transaction.update(caseRef, {
      propertyId: input.propertyId,
      homeownerId,
      constructionCompanyId,
      responsibleBranchId: input.responsibleBranchId,
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

  return { activeMasters, loadAllMasters, loadActiveMasters, registerCase, updateCase, subscribeCaseRows }
}
