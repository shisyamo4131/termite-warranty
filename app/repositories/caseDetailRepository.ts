import { projectCaseRows } from '../../src/domain/case-rows.mjs'
import type { CaseDetailQueryState, MasterCollection, QueryDocument } from '../types/prototype-data.ts'
import type { CaseQuerySource } from './firestoreCaseQuerySource.ts'
import { emptyMasterCatalog, masterCatalogFromMaps } from './masterCatalogRepository.ts'
import { masterReferenceSignature, planMasterReferenceQueries } from './masterReferencePlan.ts'

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
  const referenceChunks = new Map<string, { name: MasterCollection; documents: Map<string, Record<string, unknown>> }>()
  const referenceReady = new Set<string>()
  const parentUnsubscribes: Array<() => void> = []
  let referenceUnsubscribes: Array<() => void> = []
  let referenceGeneration: symbol | undefined
  let referenceSignature = ''
  let expectedReferenceChunks = 0
  let warrantyUnsubscribe: (() => void) | undefined
  let warrantySubscriptionToken: symbol | undefined
  let caseDocument: QueryDocument | null = null
  let caseReady = false
  let warrantyReady = false
  let caseExists = false
  let error: Error | null = null
  let active = true

  const combinedMasters = () => {
    const combined = new Map<MasterCollection, Map<string, Record<string, unknown>>>()
    for (const { name, documents } of referenceChunks.values()) {
      const target = combined.get(name) ?? new Map<string, Record<string, unknown>>()
      for (const [id, data] of documents) target.set(id, data)
      combined.set(name, target)
    }
    return combined
  }

  const isReady = () => caseReady
    && referenceReady.size === expectedReferenceChunks
    && (!caseExists || warrantyReady)

  const emit = () => {
    if (!active) return
    const masters = combinedMasters()
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

  const stopReferences = () => {
    referenceGeneration = undefined
    referenceUnsubscribes.forEach(unsubscribe => unsubscribe())
    referenceUnsubscribes = []
    referenceChunks.clear()
    referenceReady.clear()
    expectedReferenceChunks = 0
  }

  const replaceReferences = () => {
    const descriptors = planMasterReferenceQueries(caseDocument ? [caseDocument] : [], warranties)
    const signature = masterReferenceSignature(descriptors)
    if (signature === referenceSignature) return
    stopReferences()
    referenceSignature = signature
    expectedReferenceChunks = descriptors.length
    if (descriptors.length === 0) return

    const generation = Symbol('case-detail-references')
    referenceGeneration = generation
    for (const descriptor of descriptors) {
      referenceUnsubscribes.push(source.subscribeMastersByIds(descriptor.name, descriptor.ids, items => {
        if (!active || referenceGeneration !== generation) return
        referenceChunks.set(descriptor.key, {
          name: descriptor.name,
          documents: new Map(items.map(item => [item.id, item.data])),
        })
        referenceReady.add(descriptor.key)
        emit()
      }, cause => {
        if (referenceGeneration !== generation) return
        fail(cause)
      }))
    }
  }

  parentUnsubscribes.push(source.subscribeCase(caseId, document => {
    if (!active) return
    caseReady = true
    cases.clear()
    caseDocument = document
    if (!document) {
      caseExists = false
      warranties.clear()
      warrantyReady = false
      warrantySubscriptionToken = undefined
      warrantyUnsubscribe?.()
      warrantyUnsubscribe = undefined
      replaceReferences()
      emit()
      return
    }
    caseExists = true
    cases.set(document.id, document.data)
    replaceReferences()
    if (!warrantyUnsubscribe) {
      warrantyReady = false
      const subscriptionToken = Symbol(caseId)
      warrantySubscriptionToken = subscriptionToken
      warrantyUnsubscribe = source.subscribeWarranties(caseId, documents => {
        if (!active || !caseExists || warrantySubscriptionToken !== subscriptionToken) return
        warranties.set(caseId, documents.map(item => ({ id: item.id, ...item.data })))
        warrantyReady = true
        replaceReferences()
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
    stopReferences()
    parentUnsubscribes.forEach(unsubscribe => unsubscribe())
    warrantyUnsubscribe?.()
    parentUnsubscribes.length = 0
    warrantyUnsubscribe = undefined
  }
}
