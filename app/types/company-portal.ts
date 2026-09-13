import type { Timestamp } from 'firebase/firestore'

export type CompanyWorkItemStatus = 'awaiting_response' | 'draft' | 'submitted' | 'needs_correction' | 'approved'

export interface CompanyAccountProfile {
  accountType: 'construction_company'
  uid: string
  constructionCompanyId: string
  companyName: string
  displayName: string
  email: string
  role: 'construction_company'
  enabled: true
}

export interface StaffAccountProfile {
  accountType: 'staff'
  uid: string
  displayName: string
  role: 'developer_superuser' | 'house_solution_administrator' | 'general_staff'
  enabled: true
}

export type SessionProfile = StaffAccountProfile | CompanyAccountProfile

export interface WorkItemResponse {
  contactName: string
  contactEmail: string
  requestedPeriodYears: 5 | 10
  notes: string | null
  renewalDecision?: 'renew' | 'decline'
  applicationDate?: string
  handoverDate?: string
  warrantyStartDate?: string | null
  homeownerName?: string
  propertyName?: string
  propertyAddress?: {
    postalCode: string
    prefecture: string
    municipality: string
    streetTownAndNumber: string
    buildingName: string | null
  }
}

export interface CompanyCaseWorkItem {
  id: string
  caseId: string
  kind: 'new_case' | 'renewal'
  constructionCompanyId: string
  caseNumber: string | null
  propertyName: string
  homeownerName: string
  currentExpiryDate: string | null
  status: CompanyWorkItemStatus
  response: WorkItemResponse | null
  reviewComment: string | null
  revision: number
  submittedAt: Timestamp | null
  approvedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface NewCaseWorkItemInput {
  contactName: string
  contactEmail: string
  requestedPeriodYears: 5 | 10
  notes: string | null
  applicationDate: string
  handoverDate: string
  warrantyStartDate: string
  homeownerName: string
  propertyName: string
  propertyAddress: {
    postalCode: string
    prefecture: string
    municipality: string
    streetTownAndNumber: string
    buildingName: string | null
  }
}
