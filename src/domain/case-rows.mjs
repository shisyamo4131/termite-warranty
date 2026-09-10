import { isAlertEligible } from './warranty.mjs'

const millis = (value) => Number(value?.toMillis?.() ?? value ?? 0)

export const matchesCaseUpdateBaseline = (current, expected) => Boolean(
  current && expected && typeof current.isEqual === 'function' && current.isEqual(expected),
)

export function projectCaseRows({ cases, warranties, masters, today }) {
  const lookup = (collectionName, id) => masters.get(collectionName)?.get(String(id)) ?? {}
  const rows = [...cases.entries()].map(([id, item]) => {
    const property = lookup('properties', item.propertyId)
    const homeowner = lookup('homeowners', item.homeownerId)
    const company = lookup('constructionCompanies', item.constructionCompanyId)
    const branch = lookup('branches', item.responsibleBranchId)
    const applied = warranties.get(id) ?? []
    return {
      id,
      caseNumber: String(item.caseNumber ?? ''),
      propertyId: String(item.propertyId ?? ''),
      homeownerId: String(item.homeownerId ?? ''),
      constructionCompanyId: String(item.constructionCompanyId ?? ''),
      responsibleBranchId: String(item.responsibleBranchId ?? ''),
      status: String(item.status ?? ''),
      statusReason: item.statusReason == null ? null : String(item.statusReason),
      updatedAtBaseline: item.updatedAt ?? null,
      propertyName: String(property.name ?? '—'),
      homeownerName: String(homeowner.name ?? '—'),
      propertyPrefecture: String(property.address?.prefecture ?? ''),
      propertyMunicipality: String(property.address?.municipality ?? ''),
      propertyAddress: [
        property.address?.prefecture,
        property.address?.municipality,
        property.address?.streetTownAndNumber,
        property.address?.buildingName,
      ].filter(Boolean).join(''),
      constructionCompanyName: String(company.name ?? '—'),
      branchName: String(branch.name ?? '—'),
      appliedWarranties: applied.map((warranty) => ({
        id: String(warranty.id ?? ''),
        warrantyServiceId: String(warranty.warrantyServiceId ?? ''),
        expiryDate: String(warranty.expiryDate ?? ''),
        notificationStatus: String(warranty.notificationStatus ?? ''),
        status: String(warranty.status ?? ''),
      })),
      hasNotNotified: applied.some((warranty) => warranty.notificationStatus === 'not notified'),
      isAlertEligible: applied.some((warranty) => isAlertEligible({
        caseStatus: item.status,
        appliedWarrantyStatus: warranty.status,
        expiryDate: warranty.expiryDate,
        today,
      })),
    }
  })

  rows.sort((left, right) => {
    const leftCase = cases.get(left.id) ?? {}
    const rightCase = cases.get(right.id) ?? {}
    return millis(rightCase.updatedAt) - millis(leftCase.updatedAt)
      || millis(rightCase.registeredAt) - millis(leftCase.registeredAt)
  })
  return rows
}
