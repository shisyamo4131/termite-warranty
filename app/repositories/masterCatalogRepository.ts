import type { DocumentData, Firestore } from 'firebase/firestore'
import { selectActiveMasterCatalog } from '../../src/domain/case-filters.mjs'
import type { MasterCatalog, MasterCollection, MasterOption, QueryDocument } from '../types/prototype-data.ts'

export const masterCollections: readonly MasterCollection[] = [
  'branches',
  'constructionCompanies',
  'homeowners',
  'properties',
  'warrantyServices',
]

export const emptyMasterCatalog = (): MasterCatalog => ({
  branches: [],
  constructionCompanies: [],
  homeowners: [],
  properties: [],
  warrantyServices: [],
})

export const toMasterOption = (document: QueryDocument): MasterOption => ({
  ...document.data,
  id: document.id,
  name: String(document.data.name ?? ''),
})

export const documentsFromSnapshot = (documents: Array<{ id: string; data: () => DocumentData }>): QueryDocument[] =>
  documents.map(item => ({ id: item.id, data: item.data() as Record<string, unknown> }))

export interface MasterCatalogSource {
  getCollection(name: MasterCollection): Promise<QueryDocument[]>
}

// Retain explicit failures for stale callers; never silently return partial candidates.
export const createFirestoreMasterCatalogSource = (_firestore: Firestore): MasterCatalogSource => ({
  async getCollection(_name) { throw new Error('旧マスタ全件取得は利用できません。') },
})

export const loadAllMasterCatalog = async (_source: MasterCatalogSource): Promise<MasterCatalog> => {
  throw new Error('旧マスタ全件取得は利用できません。')
}

export const selectActiveMasters = (allMasters: MasterCatalog) =>
  selectActiveMasterCatalog(allMasters) as MasterCatalog

export const masterCatalogFromMaps = (
  maps: Map<MasterCollection, Map<string, Record<string, unknown>>>,
): MasterCatalog => Object.fromEntries(masterCollections.map(name => [
  name,
  [...(maps.get(name)?.entries() ?? [])].map(([id, data]) => toMasterOption({ id, data })),
])) as MasterCatalog
