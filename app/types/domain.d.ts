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
  export function projectCaseRows(input: {
    cases: Map<string, Record<string, any>>
    warranties: Map<string, Record<string, any>[]>
    masters: Map<string, Map<string, Record<string, any>>>
    today: string
  }): Array<{
    id: string
    caseNumber: string
    homeownerName: string
    propertyAddress: string
    constructionCompanyName: string
    branchName: string
    hasNotNotified: boolean
    isAlertEligible: boolean
  }>
}
