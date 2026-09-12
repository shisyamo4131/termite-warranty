import { collection, doc, getDocs, increment, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type DocumentData } from 'firebase/firestore'
import { normalizeMasterFields } from '../../src/domain/master-data.mjs'
import type { MasterType, MasterWriteFields } from '../../src/domain/master-form.mjs'
import { matchesSearchTokenMap } from '../../src/domain/search-tokens.mjs'
import { createBoundedListQuery } from '../repositories/boundedListQuery.ts'
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
  email?: string | null
  notes?: string | null
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
  homeownerId: data.homeownerId,
  constructionCompanyId: data.constructionCompanyId,
  address: data.address,
  telephone: data.telephone ?? null,
  fax: data.fax ?? null,
  contactPerson: data.contactPerson ?? null,
  contactDetails: data.contactDetails ?? null,
  email: data.email ?? null,
  notes: data.notes ?? null,
})

export const matchesManagedMasterName = (master: ManagedMaster, value: string) =>
  matchesSearchTokenMap(master.nameSearch, value)

export function useMasterManagement(masterType: MasterType) {
  const { $firebase } = useNuxtApp()
  const subscribe = (onRows: (rows: ManagedMaster[]) => void, onError: (message: string) => void, cursor?: ListCursor) =>
    onSnapshot(
      createBoundedListQuery(collection($firebase.firestore, COLLECTION_BY_TYPE[masterType]), cursor),
      (snapshot) => onRows(snapshot.docs.map((item) => asMaster(item.id, item.data()))),
      () => onError('マスターデータを読み込めませんでした。'),
    )
  const subscribeById = (id: string, onRow: (row: ManagedMaster | null) => void, onError: (message: string) => void) => onSnapshot(
    doc($firebase.firestore, COLLECTION_BY_TYPE[masterType], id),
    (snapshot) => onRow(snapshot.exists() ? asMaster(snapshot.id, snapshot.data()) : null),
    () => onError('マスターデータを読み込めませんでした。'),
  )
  const subscribeCompanyProperties = (companyId: string, onRows: (rows: ManagedMaster[]) => void, onError: (message: string) => void) => onSnapshot(
    createBoundedListQuery(query(collection($firebase.firestore, 'properties'), where('constructionCompanyId', '==', companyId))),
    (snapshot) => onRows(snapshot.docs.map((item) => asMaster(item.id, item.data()))),
    () => onError('紐づく物件を読み込めませんでした。'),
  )
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

  return { subscribe, subscribeById, subscribeCompanyProperties, subscribePropertyReferences, createMaster, updateMaster, setMasterActive, loadPropertyReferences }
}
