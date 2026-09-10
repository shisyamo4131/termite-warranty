import {
  collection,
  getDocs,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { projectCaseRows } from '../../src/domain/case-rows.mjs'

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
  homeownerName: string
  propertyAddress: string
  constructionCompanyName: string
  branchName: string
  hasNotNotified: boolean
  isAlertEligible: boolean
}

const masterCollections = [
  'branches',
  'constructionCompanies',
  'homeowners',
  'properties',
  'warrantyServices',
] as const

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

  const loadActiveMasters = async () => {
    const result = await Promise.all(
      masterCollections.map(async (name) => {
        const snapshot = await getDocs(collection($firebase.firestore, name))
        return [
          name,
          snapshot.docs
            .map((item) => toMaster(item.id, item.data()))
            .filter((item) => item.active === true),
        ] as const
      }),
    )
    const masters = Object.fromEntries(result) as Record<(typeof masterCollections)[number], MasterOption[]>
    const activeHomeowners = new Set(masters.homeowners.map(({ id }) => id))
    const activeCompanies = new Set(masters.constructionCompanies.map(({ id }) => id))
    masters.properties = masters.properties.filter((property) =>
      activeHomeowners.has(String(property.homeownerId))
      && activeCompanies.has(String(property.constructionCompanyId)),
    )
    return masters
  }

  const registerCase = async (input: CaseRegistration) => {
    const callable = httpsCallable<CaseRegistration, { id: string; caseNumber: string }>(
      $firebase.functions,
      'registerCase',
    )
    return (await callable(input)).data
  }

  const subscribeCaseRows = (onRows: (rows: CaseRow[]) => void, onError?: () => void) => {
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
                    warranties.set(item.id, warrantySnapshot.docs.map((warranty) => warranty.data()))
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

  return { loadActiveMasters, registerCase, subscribeCaseRows }
}
