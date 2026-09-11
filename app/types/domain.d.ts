declare module '*src/domain/warranty.mjs' {
  export function calculateExpiryDate(startDate: string, periodYears: number): string
  export function isAlertEligible(input: {
    caseStatus: string
    appliedWarrantyStatus: string
    expiryDate: string
    today: string
  }): boolean
}

declare module '*src/domain/search-tokens.mjs' {
  export function normalizeSearchText(value: string): string
  export function matchesSearchTokenMap(
    nameSearch: { two: Record<string, true> } | null | undefined,
    value: string,
  ): boolean
}

declare module '*src/domain/case-rows.mjs' {
  export function matchesCaseUpdateBaseline(current: unknown, expected: unknown): boolean
  export function projectCaseRows(input: {
    cases: Map<string, Record<string, any>>
    warranties: Map<string, Record<string, any>[]>
    masters: Map<string, Map<string, Record<string, any>>>
    today: string
  }): Array<{
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
    updatedAtBaseline: unknown
    propertyName: string
    homeownerName: string
    propertyPrefecture: string
    propertyMunicipality: string
    propertyAddress: string
    constructionCompanyName: string
    branchName: string
    appliedWarranties: Array<{
      id: string
      warrantyServiceId: string
      expiryDate: string
      notificationStatus: string
      status: string
      statusReason: string | null
      periodYears: number
      startDate: string
      warrantyServiceName: string
    }>
    hasNotNotified: boolean
    isAlertEligible: boolean
  }>
}

declare module '*src/domain/case-filters.mjs' {
  export function selectActiveMasterCatalog<T extends Record<string, Array<{
    id: string
    active?: boolean
    homeownerId?: unknown
    constructionCompanyId?: unknown
  }>>>(masters: T): T
  export function filterCaseRows<T extends {
    caseNumber: string
    homeownerId: string
    propertyId: string
    constructionCompanyId: string
    responsibleBranchId: string
    propertyPrefecture: string
    propertyMunicipality: string
    appliedWarranties: Array<{
      warrantyServiceId: string
      notificationStatus: string
      expiryDate: string
    }>
  }>(rows: T[], filters: Record<string, string | null | undefined>): T[]
}
