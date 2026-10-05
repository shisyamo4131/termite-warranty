// Presentation only: never changes the reporting target or persisted periods.
export function nextInsuranceReportLabel(row) {
  if (row.status === 'cancelled') return '対象外（物件・保証取消）'
  if (row.status === 'draft') return '本登録前'
  const incomplete = row.insuranceHistoryIncomplete || (!row.insuranceEvents && (row.insuranceEverRenewed || (row.insuranceReported && !row.insuranceLastReport)))
  if (incomplete) return '要確認（記録不足）'
  if (row.insuranceReported === false) return '初回報告が必要'
  if (row.insuranceReported !== true || !row.expiryDate || !row.insuranceExpiryDate) return '要確認'
  if (row.insuranceExpiryDate >= row.expiryDate) return '次回報告不要（保証延長がなければ）'
  const month = String(row.insuranceRenewalMonth ?? '').match(/^(\d{4})-?(0[1-9]|1[0-2])$/)
  return month ? `${month[1]}年${month[2]}月分` : '要確認'
}
