import { projectCaseRows } from '../../src/domain/case-rows.mjs'
import { readCaseListWarranties } from '../../src/domain/case-list-projection.mjs'
import type { CaseListQueryState, ListCursor, MasterCollection, QueryDocument } from '../types/prototype-data.ts'
import type { CaseQuerySource } from './firestoreCaseQuerySource.ts'
import { listCursorFromDocuments } from './boundedListQuery.ts'
import { emptyMasterCatalog, masterCatalogFromMaps, masterCollections } from './masterCatalogRepository.ts'
import { masterReferenceSignature, planMasterReferenceQueries } from './masterReferencePlan.ts'

const asError = (error: unknown) => error instanceof Error ? error : new Error('案件データを読み込めませんでした。')

export const initialCaseListQueryState = (): CaseListQueryState => ({
  status: 'loading',
  rows: [],
  masters: emptyMasterCatalog(),
  nextCursor: null,
  error: null,
})

export const subscribeCaseList = (
  source: CaseQuerySource,
  onState: (state: CaseListQueryState) => void,
  today: () => string,
  cursor?: ListCursor,
  complete = false,
) => {
  const cases = new Map<string, Record<string, unknown>>()
  const warranties = new Map<string, Record<string, unknown>[]>()
  const catalogMasters = new Map<MasterCollection, Map<string, Record<string, unknown>>>()
  const referenceChunks = new Map<string, { name: MasterCollection; documents: Map<string, Record<string, unknown>> }>()
  const masterReady = new Set<MasterCollection>()
  const referenceReady = new Set<string>()
  const parentUnsubscribes: Array<() => void> = []
  let referenceUnsubscribes: Array<() => void> = []
  let referenceGeneration: symbol | undefined
  let referenceSignature = ''
  let expectedReferenceChunks = 0
  let casesReady = false
  let nextCursor: ListCursor | null = null
  let error: Error | null = null
  let active = true

  const combinedMasters = () => {
    const combined = new Map<MasterCollection, Map<string, Record<string, unknown>>>()
    for (const name of masterCollections) combined.set(name, new Map(catalogMasters.get(name)))
    for (const { name, documents } of referenceChunks.values()) {
      const target = combined.get(name) ?? new Map<string, Record<string, unknown>>()
      for (const [id, data] of documents) target.set(id, data)
      combined.set(name, target)
    }
    return combined
  }

  const isReady = () => casesReady
    && masterCollections.every(name => masterReady.has(name))
    && referenceReady.size === expectedReferenceChunks

  const emit = () => {
    if (!active) return
    const masters = combinedMasters()
    onState({
      status: error ? 'error' : isReady() ? 'ready' : 'loading',
      rows: projectCaseRows({ cases, warranties, masters, today: today() }),
      masters: masterCatalogFromMaps(masters),
      nextCursor,
      error,
    })
  }

  const stopReferences = () => {
    referenceGeneration = undefined
    referenceUnsubscribes.forEach(unsubscribe => unsubscribe())
    referenceUnsubscribes = []
    referenceChunks.clear()
    referenceReady.clear()
    expectedReferenceChunks = 0
  }

  const fail = (cause: unknown) => {
    if (!active) return
    error = asError(cause)
    cases.clear()
    warranties.clear()
    nextCursor = null
    stopReferences()
    referenceSignature = ''
    emit()
  }

  const replaceReferences = (documents: QueryDocument[]) => {
    const descriptors = planMasterReferenceQueries(documents, warranties)
    const signature = masterReferenceSignature(descriptors)
    if (signature === referenceSignature) return

    stopReferences()
    referenceSignature = signature
    expectedReferenceChunks = descriptors.length
    if (descriptors.length === 0) return

    const generation = Symbol('case-list-references')
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

  for (const name of masterCollections) {
    parentUnsubscribes.push(source.subscribeMaster(name, documents => {
      if (!active) return
      catalogMasters.set(name, new Map(documents.map(item => [item.id, item.data])))
      masterReady.add(name)
      emit()
    }, fail, undefined, complete))
  }

  parentUnsubscribes.push(source.subscribeCases(documents => {
    if (!active) return
    try {
      nextCursor = complete ? null : listCursorFromDocuments(documents)
    } catch (cause) {
      fail(cause)
      return
    }
    cases.clear()
    warranties.clear()
    for (const item of documents) {
      cases.set(item.id, item.data)
      warranties.set(item.id, readCaseListWarranties(item.data))
    }
    casesReady = true
    if (!complete) replaceReferences(documents)
    emit()
  }, fail, cursor, complete))

  emit()

  return () => {
    if (!active) return
    active = false
    stopReferences()
    parentUnsubscribes.forEach(unsubscribe => unsubscribe())
    parentUnsubscribes.length = 0
  }
}
