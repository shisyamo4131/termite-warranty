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
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
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
    return Object.fromEntries(result) as Record<(typeof masterCollections)[number], MasterOption[]>
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
