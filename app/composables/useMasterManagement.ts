import { collection, getDocs, onSnapshot, type DocumentData } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { matchesSearchTokenMap } from '../../src/domain/search-tokens.mjs'

export type MasterType = 'constructionCompany' | 'homeowner' | 'warrantyService' | 'property'

export interface ManagedMaster {
  id: string
  name: string
  active: boolean
  revision: number
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
  revision: Number(data.revision),
  nameSearch: data.nameSearch,
  defaultPeriodYears: data.defaultPeriodYears,
  homeownerId: data.homeownerId,
  constructionCompanyId: data.constructionCompanyId,
  address: data.address,
})

export const matchesManagedMasterName = (master: ManagedMaster, value: string) =>
  matchesSearchTokenMap(master.nameSearch, value)

export function useMasterManagement(masterType: MasterType) {
  const { $firebase } = useNuxtApp()
  const subscribe = (onRows: (rows: ManagedMaster[]) => void, onError: (message: string) => void) =>
    onSnapshot(
      collection($firebase.firestore, COLLECTION_BY_TYPE[masterType]),
      (snapshot) => onRows(snapshot.docs.map((item) => asMaster(item.id, item.data()))),
      () => onError('マスターデータを読み込めませんでした。'),
    )

  const createMaster = async (fields: Record<string, unknown>) => {
    const callable = httpsCallable($firebase.functions, 'createMaster')
    return (await callable({ masterType, fields })).data
  }
  const updateMaster = async (id: string, expectedRevision: number, fields: Record<string, unknown>) => {
    const callable = httpsCallable($firebase.functions, 'updateMaster')
    return (await callable({ masterType, id, expectedRevision, fields })).data
  }
  const setMasterActive = async (id: string, expectedRevision: number, active: boolean) => {
    const callable = httpsCallable($firebase.functions, 'setMasterActive')
    return (await callable({ masterType, id, expectedRevision, active })).data
  }
  const loadPropertyReferences = async () => {
    const [homeowners, companies] = await Promise.all([
      getDocs(collection($firebase.firestore, 'homeowners')),
      getDocs(collection($firebase.firestore, 'constructionCompanies')),
    ])
    return {
      homeowners: homeowners.docs.map((item) => asMaster(item.id, item.data())).filter((item) => item.active),
      companies: companies.docs.map((item) => asMaster(item.id, item.data())).filter((item) => item.active),
    }
  }

  return { subscribe, createMaster, updateMaster, setMasterActive, loadPropertyReferences }
}
