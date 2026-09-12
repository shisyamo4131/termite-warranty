import { projectCaseRows } from '../../src/domain/case-rows.mjs'
import type { CaseListQueryState, MasterCollection } from '../types/prototype-data.ts'
import type { CaseQuerySource } from './firestoreCaseQuerySource.ts'
import { emptyMasterCatalog, masterCatalogFromMaps, masterCollections } from './masterCatalogRepository.ts'

const asError = (error: unknown) => error instanceof Error ? error : new Error('案件データを読み込めませんでした。')

export const initialCaseListQueryState = (): CaseListQueryState => ({
  status: 'loading',
  rows: [],
  masters: emptyMasterCatalog(),
  error: null,
})

export const subscribeCaseList = (
  source: CaseQuerySource,
  onState: (state: CaseListQueryState) => void,
  today: () => string,
) => {
  const cases = new Map<string, Record<string, unknown>>()
  const warranties = new Map<string, Record<string, unknown>[]>()
  const masters = new Map<MasterCollection, Map<string, Record<string, unknown>>>()
  const masterReady = new Set<MasterCollection>()
  const warrantyReady = new Set<string>()
  const parentUnsubscribes: Array<() => void> = []
  const warrantyUnsubscribes = new Map<string, () => void>()
  const warrantySubscriptionTokens = new Map<string, symbol>()
  let casesReady = false
  let error: Error | null = null
  let active = true

  const isReady = () => casesReady
    && masterCollections.every(name => masterReady.has(name))
    && [...cases.keys()].every(caseId => warrantyReady.has(caseId))

  const emit = () => {
    if (!active) return
    const rows = projectCaseRows({ cases, warranties, masters, today: today() })
    onState({
      status: error ? 'error' : isReady() ? 'ready' : 'loading',
      rows,
      masters: masterCatalogFromMaps(masters),
      error,
    })
  }

  const fail = (cause: unknown) => {
    if (!active) return
    error = asError(cause)
    cases.clear()
    warranties.clear()
    warrantyReady.clear()
    emit()
  }

  for (const name of masterCollections) {
    parentUnsubscribes.push(source.subscribeMaster(name, documents => {
      if (!active) return
      masters.set(name, new Map(documents.map(item => [item.id, item.data])))
      masterReady.add(name)
      emit()
    }, fail))
  }

  parentUnsubscribes.push(source.subscribeCases(documents => {
    if (!active) return
    const nextCaseIds = new Set(documents.map(item => item.id))
    for (const [caseId, unsubscribe] of warrantyUnsubscribes) {
      if (!nextCaseIds.has(caseId)) {
        warrantySubscriptionTokens.delete(caseId)
        unsubscribe()
        warrantyUnsubscribes.delete(caseId)
        warranties.delete(caseId)
        warrantyReady.delete(caseId)
      }
    }
    cases.clear()
    for (const item of documents) {
      cases.set(item.id, item.data)
      if (!warrantyUnsubscribes.has(item.id)) {
        const subscriptionToken = Symbol(item.id)
        warrantySubscriptionTokens.set(item.id, subscriptionToken)
        warrantyUnsubscribes.set(item.id, source.subscribeWarranties(item.id, warrantyDocuments => {
          if (!active || !cases.has(item.id) || warrantySubscriptionTokens.get(item.id) !== subscriptionToken) return
          warranties.set(item.id, warrantyDocuments.map(warranty => ({ id: warranty.id, ...warranty.data })))
          warrantyReady.add(item.id)
          emit()
        }, cause => {
          if (warrantySubscriptionTokens.get(item.id) !== subscriptionToken) return
          fail(cause)
        }))
      }
    }
    casesReady = true
    emit()
  }, fail))

  emit()

  return () => {
    if (!active) return
    active = false
    warrantySubscriptionTokens.clear()
    parentUnsubscribes.forEach(unsubscribe => unsubscribe())
    warrantyUnsubscribes.forEach(unsubscribe => unsubscribe())
    parentUnsubscribes.length = 0
    warrantyUnsubscribes.clear()
  }
}
