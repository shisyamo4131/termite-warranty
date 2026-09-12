const text = (value) => typeof value === 'string' ? value : ''

export const toCaseListWarranty = (id, warranty = {}) => ({
  id: text(id),
  warrantyServiceId: text(warranty.warrantyServiceId),
  expiryDate: text(warranty.expiryDate),
  notificationStatus: text(warranty.notificationStatus),
  status: text(warranty.status),
})

export const buildCaseListProjection = (warranties = []) => ({
  appliedWarranties: warranties
    .map(warranty => toCaseListWarranty(warranty.id, warranty))
    .sort((left, right) => left.id.localeCompare(right.id)),
})

export const readCaseListWarranties = (caseData = {}) => {
  const warranties = caseData?.listProjection?.appliedWarranties
  return Array.isArray(warranties)
    ? warranties.map(warranty => toCaseListWarranty(warranty?.id, warranty))
    : []
}
