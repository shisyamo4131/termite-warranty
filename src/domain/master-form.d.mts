export type MasterType = 'constructionCompany' | 'homeowner' | 'warrantyService' | 'property'

export interface MasterAddressDraft {
  postalCode: string
  prefecture: string
  municipality: string
  streetTownAndNumber: string
  buildingName: string
}

interface NamedDraft<T extends MasterType> {
  masterType: T
  name: string
}

export interface WarrantyServiceFormDraft extends NamedDraft<'warrantyService'> {
  defaultPeriodYears: number
}

export interface PropertyFormDraft extends NamedDraft<'property'> {
  homeownerId: string
  constructionCompanyId: string
  address: MasterAddressDraft
}

export interface ConstructionCompanyFormDraft extends NamedDraft<'constructionCompany'> {
  address: MasterAddressDraft
  telephone: string
  fax: string
  contactPerson: string
  contactDetails: string
  email: string
  notes: string
}

export interface HomeownerFormDraft extends NamedDraft<'homeowner'> {
  address: MasterAddressDraft
  telephone: string
  fax: string
  notes: string
}

export type MasterFormDraft =
  | WarrantyServiceFormDraft
  | PropertyFormDraft
  | ConstructionCompanyFormDraft
  | HomeownerFormDraft

export interface MasterRowInput {
  name?: string
  defaultPeriodYears?: number
  homeownerId?: string
  constructionCompanyId?: string
  address?: Omit<Partial<MasterAddressDraft>, 'buildingName'> & { buildingName?: string | null }
  telephone?: string | null
  fax?: string | null
  contactPerson?: string | null
  contactDetails?: string | null
  email?: string | null
  notes?: string | null
}

export interface MasterAddressFields extends Omit<MasterAddressDraft, 'buildingName'> {
  buildingName: string | null
}

export type MasterWriteFields =
  | { name: string; defaultPeriodYears: number }
  | { name: string; homeownerId: string; constructionCompanyId: string; address: MasterAddressFields }
  | { name: string; address: MasterAddressFields; telephone: string | null; fax: string | null; contactPerson: string | null; contactDetails: string | null; email: string | null; notes: string | null }
  | { name: string; address: MasterAddressFields; telephone: string | null; fax: string | null; notes: string | null }

export type MasterFormDraftByType = {
  warrantyService: WarrantyServiceFormDraft
  property: PropertyFormDraft
  constructionCompany: ConstructionCompanyFormDraft
  homeowner: HomeownerFormDraft
}

export function createMasterFormDraft<T extends MasterType>(masterType: T, row?: MasterRowInput | null): MasterFormDraftByType[T]
export function masterFormDraftToFields(form: MasterFormDraft): MasterWriteFields
