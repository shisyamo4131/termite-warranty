import { isAlertEligible } from './warranty.mjs'

const millis = (value) => Number(value?.toMillis?.() ?? value ?? 0)

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
      homeownerName: String(homeowner.name ?? '—'),
      propertyAddress: [
        property.address?.prefecture,
        property.address?.municipality,
        property.address?.streetTownAndNumber,
        property.address?.buildingName,
      ].filter(Boolean).join(''),
      constructionCompanyName: String(company.name ?? '—'),
      branchName: String(branch.name ?? '—'),
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
