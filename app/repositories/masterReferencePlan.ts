import type { MasterCollection, QueryDocument } from '../types/prototype-data.ts'
import { REFERENCE_QUERY_CHUNK_SIZE } from './boundedListQuery.ts'
import { masterCollections } from './masterCatalogRepository.ts'

export interface MasterReferenceDescriptor {
  name: MasterCollection
  ids: string[]
  key: string
}

export const planMasterReferenceQueries = (
  cases: QueryDocument[],
  warranties: Map<string, Record<string, unknown>[]>,
): MasterReferenceDescriptor[] => {
  const ids = new Map<MasterCollection, Set<string>>(masterCollections.map(name => [name, new Set()]))
  const add = (name: MasterCollection, value: unknown) => {
    if (typeof value === 'string' && value) ids.get(name)?.add(value)
  }
  for (const item of cases) {
    add('properties', item.data.propertyId)
    add('homeowners', item.data.homeownerId)
    add('constructionCompanies', item.data.constructionCompanyId)
    add('branches', item.data.responsibleBranchId)
    for (const warranty of warranties.get(item.id) ?? []) add('warrantyServices', warranty.warrantyServiceId)
  }

  return masterCollections.flatMap(name => {
    const sorted = [...(ids.get(name) ?? [])].sort()
    return Array.from({ length: Math.ceil(sorted.length / REFERENCE_QUERY_CHUNK_SIZE) }, (_, index) => {
      const chunkIds = sorted.slice(index * REFERENCE_QUERY_CHUNK_SIZE, (index + 1) * REFERENCE_QUERY_CHUNK_SIZE)
      return { name, ids: chunkIds, key: `${name}:${index}:${chunkIds.join('\u0000')}` }
    })
  })
}

export const masterReferenceSignature = (descriptors: MasterReferenceDescriptor[]) =>
  descriptors.map(item => item.key).join('|')
