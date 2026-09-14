const stringValue = (input) => typeof input === 'string' ? input : ''

export function selectActiveMasterCatalog(allMasters) {
  const masters = Object.fromEntries(Object.entries(allMasters).map(([name, rows]) => [
    name,
    rows.filter((item) => item.active === true),
  ]))
  const activeHomeowners = new Set(masters.homeowners.map(({ id }) => id))
  const activeCompanies = new Set(masters.constructionCompanies.map(({ id }) => id))
  masters.properties = masters.properties.filter((property) =>
    activeHomeowners.has(String(property.homeownerId))
    && activeCompanies.has(String(property.constructionCompanyId)),
  )
  return masters
}

export function filterCaseRows(rows, rawFilters = {}) {
  const filters = {
    caseNumber: stringValue(rawFilters.caseNumber),
    homeownerId: stringValue(rawFilters.homeownerId),
    propertyId: stringValue(rawFilters.propertyId),
    constructionCompanyId: stringValue(rawFilters.constructionCompanyId),
    responsibleBranchId: stringValue(rawFilters.responsibleBranchId),
    warrantyServiceId: stringValue(rawFilters.warrantyServiceId),
    warrantyServiceType: stringValue(rawFilters.warrantyServiceType),
    prefecture: stringValue(rawFilters.prefecture),
    municipality: stringValue(rawFilters.municipality),
    notificationStatus: stringValue(rawFilters.notificationStatus),
    expiryDate: stringValue(rawFilters.expiryDate),
    applicationDateFrom: stringValue(rawFilters.applicationDateFrom),
    applicationDateTo: stringValue(rawFilters.applicationDateTo),
    handoverDateFrom: stringValue(rawFilters.handoverDateFrom),
    handoverDateTo: stringValue(rawFilters.handoverDateTo),
  }
  const hasWarrantyFilter = Boolean(
    filters.warrantyServiceId || filters.warrantyServiceType || filters.notificationStatus || filters.expiryDate,
  )

  return rows.filter((row) => {
    if (filters.caseNumber && row.caseNumber !== filters.caseNumber) return false
    if (filters.homeownerId && row.homeownerId !== filters.homeownerId) return false
    if (filters.propertyId && row.propertyId !== filters.propertyId) return false
    if (filters.constructionCompanyId && row.constructionCompanyId !== filters.constructionCompanyId) return false
    if (filters.responsibleBranchId && row.responsibleBranchId !== filters.responsibleBranchId) return false
    if (filters.prefecture && row.propertyPrefecture !== filters.prefecture) return false
    if (filters.municipality && row.propertyMunicipality !== filters.municipality) return false
    if (filters.applicationDateFrom && row.applicationDate < filters.applicationDateFrom) return false
    if (filters.applicationDateTo && row.applicationDate > filters.applicationDateTo) return false
    if (filters.handoverDateFrom && row.handoverDate < filters.handoverDateFrom) return false
    if (filters.handoverDateTo && row.handoverDate > filters.handoverDateTo) return false
    if (!hasWarrantyFilter) return true

    return (row.appliedWarranties ?? []).some((warranty) =>
      (!filters.warrantyServiceId || warranty.warrantyServiceId === filters.warrantyServiceId)
      && (!filters.warrantyServiceType || warranty.warrantyServiceType === filters.warrantyServiceType)
      && (!filters.notificationStatus || warranty.notificationStatus === filters.notificationStatus)
      && (!filters.expiryDate || warranty.expiryDate === filters.expiryDate),
    )
  })
}

export function validateCaseFilterRanges(rawFilters = {}) {
  const applicationDateFrom = stringValue(rawFilters.applicationDateFrom)
  const applicationDateTo = stringValue(rawFilters.applicationDateTo)
  const handoverDateFrom = stringValue(rawFilters.handoverDateFrom)
  const handoverDateTo = stringValue(rawFilters.handoverDateTo)
  if (applicationDateFrom && applicationDateTo && applicationDateFrom > applicationDateTo) {
    return '申込日の開始日は終了日以前にしてください。'
  }
  if (handoverDateFrom && handoverDateTo && handoverDateFrom > handoverDateTo) {
    return '引渡日の開始日は終了日以前にしてください。'
  }
  return null
}
