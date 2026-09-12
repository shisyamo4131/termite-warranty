import { projectCaseRows } from '../../src/domain/case-rows.mjs'
import type { CaseDetailQueryState, MasterCollection } from '../types/prototype-data.ts'
import type { CaseQuerySource } from './firestoreCaseQuerySource.ts'
import { emptyMasterCatalog, masterCatalogFromMaps, masterCollections } from './masterCatalogRepository.ts'

const asError = (error: unknown) => error instanceof Error ? error : new Error('案件データを読み込めませんでした。')

export const initialCaseDetailQueryState = (): CaseDetailQueryState => ({
  status: 'loading',
  row: null,
  masters: emptyMasterCatalog(),
  error: null,
})

export const subscribeCaseDetail = (
  source: CaseQuerySource,
  caseId: string,
  onState: (state: CaseDetailQueryState) => void,
  today: () => string,
) => {
  const cases = new Map<string, Record<string, unknown>>()
  const warranties = new Map<string, Record<string, unknown>[]>()
  const masters = new Map<MasterCollection, Map<string, Record<string, unknown>>>()
  const masterReady = new Set<MasterCollection>()
  const parentUnsubscribes: Array<() => void> = []
  let warrantyUnsubscribe: (() => void) | undefined
  let warrantySubscriptionToken: symbol | undefined
  let caseReady = false
  let warrantyReady = false
  let caseExists = false
  let error: Error | null = null
  let active = true

  const isReady = () => caseReady
    && masterCollections.every(name => masterReady.has(name))
    && (!caseExists || warrantyReady)

  const emit = () => {
    if (!active) return
    const projected = projectCaseRows({ cases, warranties, masters, today: today() })
    onState({
      status: error ? 'error' : isReady() ? 'ready' : 'loading',
      row: projected[0] ?? null,
      masters: masterCatalogFromMaps(masters),
      error,
    })
  }

  const fail = (cause: unknown) => {
    if (!active) return
    error = asError(cause)
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

  parentUnsubscribes.push(source.subscribeCase(caseId, document => {
    if (!active) return
    caseReady = true
    cases.clear()
    if (!document) {
      caseExists = false
      warranties.clear()
      warrantyReady = false
      warrantySubscriptionToken = undefined
      warrantyUnsubscribe?.()
      warrantyUnsubscribe = undefined
      emit()
      return
    }
    caseExists = true
    cases.set(document.id, document.data)
    if (!warrantyUnsubscribe) {
      warrantyReady = false
      const subscriptionToken = Symbol(caseId)
      warrantySubscriptionToken = subscriptionToken
      warrantyUnsubscribe = source.subscribeWarranties(caseId, documents => {
        if (!active || !caseExists || warrantySubscriptionToken !== subscriptionToken) return
        warranties.set(caseId, documents.map(item => ({ id: item.id, ...item.data })))
        warrantyReady = true
        emit()
      }, cause => {
        if (warrantySubscriptionToken !== subscriptionToken) return
        fail(cause)
      })
    }
    emit()
  }, fail))

  emit()

  return () => {
    if (!active) return
    active = false
    warrantySubscriptionToken = undefined
    parentUnsubscribes.forEach(unsubscribe => unsubscribe())
    warrantyUnsubscribe?.()
    parentUnsubscribes.length = 0
    warrantyUnsubscribe = undefined
  }
}
