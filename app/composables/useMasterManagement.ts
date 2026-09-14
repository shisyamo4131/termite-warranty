import { collection, collectionGroup, deleteField, doc, documentId, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, type DocumentData } from 'firebase/firestore'
import { normalizeMasterFields } from '../../src/domain/master-data.mjs'
import type { MasterType, MasterWriteFields } from '../../src/domain/master-form.mjs'
import { matchesSearchTokenMap, normalizeSearchText } from '../../src/domain/search-tokens.mjs'
import { createBoundedListQuery, createOrderedListQuery } from '../repositories/boundedListQuery.ts'
import type { ListCursor } from '../types/prototype-data.ts'

export type { MasterType } from '../../src/domain/master-form.mjs'

export interface ManagedMaster {
  id: string
  name: string
  active: boolean
  nameSearch?: {
    normalized: string
    one: Record<string, true>
    two: Record<string, true>
  }
  defaultPeriodYears?: number
  shortName?: string
  homeownerId?: string
  constructionCompanyId?: string
  address?: {
    postalCode: string
    prefecture: string
    municipality: string
    streetTownAndNumber: string
    buildingName: string | null
  }
  telephone?: string | null
  fax?: string | null
  contactPerson?: string | null
  contactDetails?: string | null
  notes?: string | null
}

export interface ConstructionCompanyAccountSummary {
  email: string
  enabled: boolean
}

const COLLECTION_BY_TYPE: Record<MasterType, string> = {
  constructionCompany: 'constructionCompanies',
  homeowner: 'homeowners',
  warrantyService: 'warrantyServices',
  property: 'properties',
}

const asMaster = (id: string, data: DocumentData): ManagedMaster => ({
  id,
  name: String(data.name ?? ''),
  active: data.active === true,
  nameSearch: data.nameSearch,
  defaultPeriodYears: data.defaultPeriodYears,
  shortName: String(data.shortName ?? data.name ?? ''),
  homeownerId: data.homeownerId,
  constructionCompanyId: data.constructionCompanyId,
  address: data.address,
  telephone: data.telephone ?? null,
  fax: data.fax ?? null,
  contactPerson: data.contactPerson ?? null,
  contactDetails: data.contactDetails ?? null,
  notes: data.notes ?? null,
})

export const matchesManagedMasterName = (master: ManagedMaster, value: string) => {
  const normalized = normalizeSearchText(value)
  if (!normalized) return true
  if (normalized.length < 2) return normalizeSearchText(master.name).includes(normalized)
  return matchesSearchTokenMap(master.nameSearch, value)
    && normalizeSearchText(master.name).includes(normalized)
}

export function useMasterManagement(masterType: MasterType) {
  const { $firebase } = useNuxtApp()
  const subscribe = (onRows: (rows: ManagedMaster[]) => void, onError: (message: string) => void, cursor?: ListCursor, complete = false) =>
    onSnapshot(
      complete
        ? createOrderedListQuery(collection($firebase.firestore, COLLECTION_BY_TYPE[masterType]))
        : createBoundedListQuery(collection($firebase.firestore, COLLECTION_BY_TYPE[masterType]), cursor),
      (snapshot) => onRows(snapshot.docs.map((item) => asMaster(item.id, item.data()))),
      () => onError('マスターデータを読み込めませんでした。'),
    )
  const subscribeById = (id: string, onRow: (row: ManagedMaster | null) => void, onError: (message: string) => void) => onSnapshot(
    doc($firebase.firestore, COLLECTION_BY_TYPE[masterType], id),
    (snapshot) => onRow(snapshot.exists() ? asMaster(snapshot.id, snapshot.data()) : null),
    () => onError('マスターデータを読み込めませんでした。'),
  )
  const subscribeProperties = (field: 'constructionCompanyId' | 'homeownerId', id: string, onRows: (rows: ManagedMaster[]) => void, onError: (message: string) => void) => onSnapshot(
    createBoundedListQuery(query(collection($firebase.firestore, 'properties'), where(field, '==', id))),
    (snapshot) => onRows(snapshot.docs.map((item) => asMaster(item.id, item.data()))),
    () => onError('関連する物件を読み込めませんでした。'),
  )
  const subscribeCompanyProperties = (companyId: string, onRows: (rows: ManagedMaster[]) => void, onError: (message: string) => void) =>
    subscribeProperties('constructionCompanyId', companyId, onRows, onError)
  const subscribeHomeownerProperties = (homeownerId: string, onRows: (rows: ManagedMaster[]) => void, onError: (message: string) => void) =>
    subscribeProperties('homeownerId', homeownerId, onRows, onError)
  const subscribeConstructionCompanyAccount = (companyId: string, onRow: (row: ConstructionCompanyAccountSummary | null) => void, onError: (message: string) => void) => onSnapshot(
    query(collection($firebase.firestore, 'constructionCompanyAccounts'), where('constructionCompanyId', '==', companyId), limit(1)),
    (snapshot) => {
      const data = snapshot.docs[0]?.data()
      onRow(data ? { email: String(data.email ?? ''), enabled: data.enabled === true } : null)
    },
    () => onError('工務店アカウントを読み込めませんでした。'),
  )
  const subscribeWarrantyServiceProperties = (serviceId: string, onRows: (rows: ManagedMaster[]) => void, onError: (message: string) => void) => {
    let generation = 0
    let stopped = false
    const unsubscribe = onSnapshot(
      query(
        collectionGroup($firebase.firestore, 'appliedWarranties'),
        where('warrantyServiceId', '==', serviceId),
        where('status', '==', 'active'),
        orderBy('updatedAt', 'desc'),
        orderBy(documentId(), 'desc'),
        limit(20),
      ),
      async (snapshot) => {
        const currentGeneration = ++generation
        try {
          const caseIds = [...new Set(snapshot.docs.map(item => item.ref.parent.parent?.id).filter((id): id is string => Boolean(id)))]
          const caseSnapshots = await Promise.all(caseIds.map(id => getDoc(doc($firebase.firestore, 'cases', id))))
          const propertyIds = [...new Set(caseSnapshots.flatMap((item) => {
            const data = item.data()
            return item.exists() && data?.status === 'active' && data.propertyId ? [String(data.propertyId)] : []
          }))]
          const propertySnapshots = await Promise.all(propertyIds.map(id => getDoc(doc($firebase.firestore, 'properties', id))))
          const properties = propertySnapshots.flatMap((item) => {
            const data = item.data()
            return item.exists() && data?.active === true ? [asMaster(item.id, data)] : []
          })
          if (!stopped && currentGeneration === generation) onRows(properties)
        } catch {
          if (!stopped && currentGeneration === generation) onError('対象物件を読み込めませんでした。')
        }
      },
      () => onError('対象物件を読み込めませんでした。'),
    )
    return () => { stopped = true; generation += 1; unsubscribe() }
  }
  const subscribePropertyReferences = (homeownerId: string, companyId: string, onRows: (rows: { homeowner: ManagedMaster | null; company: ManagedMaster | null }) => void, onError: (message: string) => void) => {
    let homeowner: ManagedMaster | null = null; let company: ManagedMaster | null = null
    const emit = () => onRows({ homeowner, company })
    return [
      onSnapshot(doc($firebase.firestore, 'homeowners', homeownerId), snapshot => { homeowner = snapshot.exists() ? asMaster(snapshot.id, snapshot.data()) : null; emit() }, () => onError('施主データを読み込めませんでした。')),
      onSnapshot(doc($firebase.firestore, 'constructionCompanies', companyId), snapshot => { company = snapshot.exists() ? asMaster(snapshot.id, snapshot.data()) : null; emit() }, () => onError('工務店データを読み込めませんでした。')),
    ]
  }

  const createMaster = async (fields: MasterWriteFields) => {
    const reference = doc(collection($firebase.firestore, COLLECTION_BY_TYPE[masterType]))
    await setDoc(reference, {
      ...normalizeMasterFields(masterType, fields),
      active: true,
      revision: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { id: reference.id }
  }
  const updateMaster = async (id: string, fields: MasterWriteFields) => {
    await updateDoc(doc($firebase.firestore, COLLECTION_BY_TYPE[masterType], id), {
      ...normalizeMasterFields(masterType, fields),
      ...(masterType === 'constructionCompany' ? { email: deleteField() } : {}),
      revision: increment(1),
      updatedAt: serverTimestamp(),
    })
    return { id }
  }
  const setMasterActive = async (id: string, active: boolean) => {
    await updateDoc(doc($firebase.firestore, COLLECTION_BY_TYPE[masterType], id), {
      active,
      revision: increment(1),
      updatedAt: serverTimestamp(),
    })
    return { id }
  }
  const loadPropertyReferences = async (include: { homeownerId?: string; constructionCompanyId?: string } = {}) => {
    const [homeowners, companies] = await Promise.all([
      getDocs(collection($firebase.firestore, 'homeowners')),
      getDocs(collection($firebase.firestore, 'constructionCompanies')),
    ])
    return {
      homeowners: homeowners.docs.map((item) => asMaster(item.id, item.data()))
        .filter((item) => item.active || item.id === include.homeownerId),
      companies: companies.docs.map((item) => asMaster(item.id, item.data()))
        .filter((item) => item.active || item.id === include.constructionCompanyId),
    }
  }

  return {
    subscribe,
    subscribeById,
    subscribeCompanyProperties,
    subscribeHomeownerProperties,
    subscribeConstructionCompanyAccount,
    subscribeWarrantyServiceProperties,
    subscribePropertyReferences,
    createMaster,
    updateMaster,
    setMasterActive,
    loadPropertyReferences,
  }
}
