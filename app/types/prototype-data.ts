import type { Timestamp } from 'firebase/firestore'

export interface MasterOption {
  id: string
  name: string
  active?: boolean
  homeownerId?: string
  constructionCompanyId?: string
  defaultPeriodYears?: number
  address?: {
    postalCode?: string
    prefecture?: string
    municipality?: string
    streetTownAndNumber?: string
    buildingName?: string | null
  }
  nameSearch?: {
    normalized?: string
    one?: Record<string, true>
    two?: Record<string, true>
  }
}

export interface CaseRegistration {
  applicationDate: string
  handoverDate: string
  propertyId: string
  homeownerId: string
  constructionCompanyId: string
  homeownerOverridden: boolean
  constructionCompanyOverridden: boolean
  branchId: string
  warrantyServiceId: string
  startDate: string
}

export interface AppliedWarrantyRow {
  id: string
  warrantyServiceId: string
  expiryDate: string
  notificationStatus: string
  status: string
  statusReason: string | null
  periodYears: number
  startDate: string
  warrantyServiceName: string
}

export interface CaseRow {
  id: string
  caseNumber: string
  propertyId: string
  homeownerId: string
  constructionCompanyId: string
  responsibleBranchId: string
  status: string
  statusReason: string | null
  applicationDate: string
  handoverDate: string
  updatedAtBaseline: Timestamp | null
  propertyName: string
  homeownerName: string
  propertyPrefecture: string
  propertyMunicipality: string
  propertyAddress: string
  constructionCompanyName: string
  branchName: string
  appliedWarranties: AppliedWarrantyRow[]
  hasNotNotified: boolean
  isAlertEligible: boolean
}

export interface CaseUpdate {
  id: string
  baselineUpdatedAt: Timestamp
  applicationDate: string
  handoverDate: string
  propertyId: string
  homeownerId: string
  constructionCompanyId: string
  homeownerOverridden: boolean
  constructionCompanyOverridden: boolean
  propertyDefaultsApplied: boolean
  responsibleBranchId: string
  status: 'active' | 'cancelled' | 'invalid'
  statusReason: string | null
}

export interface CaseFilters {
  caseNumber: string | null
  homeownerId: string | null
  propertyId: string | null
  constructionCompanyId: string | null
  responsibleBranchId: string | null
  warrantyServiceId: string | null
  prefecture: string | null
  municipality: string | null
  notificationStatus: string | null
  expiryDate: string | null
}

export interface AppliedWarrantyMutation {
  caseId: string
  warrantyId?: string
  expectedCaseUpdatedAt: Timestamp
  warrantyServiceId?: string
  startDate?: string
  expiryDate?: string
  notificationStatus?: 'not notified' | 'notified' | 'not required'
  status?: 'active' | 'cancelled' | 'invalid'
  statusReason?: string | null
}

export interface TimestampBaseline {
  seconds: number
  nanoseconds: number
}

export type AppliedWarrantyCallableMutation = Omit<AppliedWarrantyMutation, 'expectedCaseUpdatedAt'> & {
  expectedCaseUpdatedAt: TimestampBaseline | null
}

export type MasterCollection = 'branches' | 'constructionCompanies' | 'homeowners' | 'properties' | 'warrantyServices'
export type MasterCatalog = Record<MasterCollection, MasterOption[]>
export type QueryStatus = 'loading' | 'ready' | 'error'

export interface CaseListQueryState {
  status: QueryStatus
  rows: CaseRow[]
  masters: MasterCatalog
  error: Error | null
}

export interface CaseDetailQueryState {
  status: QueryStatus
  row: CaseRow | null
  masters: MasterCatalog
  error: Error | null
}

export interface QueryDocument {
  id: string
  data: Record<string, unknown>
}
