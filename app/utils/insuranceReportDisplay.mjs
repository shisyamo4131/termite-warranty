import { insurancePeriodStates, insuranceReportingCandidates, insuranceNoticeExpiry } from '../../src/domain/insurance-state.mjs'
import { activeInsuranceReports, japanDate } from '../../src/domain/property-warranty.mjs'
export function matchesSelectedInsurancePeriod(period, selected) {
  return !!selected && period.startDate === selected.startDate && period.expiryDate === selected.expiryDate && period.warrantyPeriodId === selected.warrantyPeriodId && (!selected.insurancePeriodId || period.id === selected.insurancePeriodId)
}
export function currentInsuranceSummary(row, today = japanDate()) {
  const period = insurancePeriodStates(row).find(period => period.startDate <= today && today <= period.expiryDate)
  if (!period) return '現在の対象期間なし'
  const status = {pending:'未報告',reported:'報告済み',waived:'報告不要'}[period.state] ?? '要確認（記録不足）'
  return `${period.startDate} ～ ${period.expiryDate} ／ ${status}`
}
// Presentation only: target selection remains in the common domain module.
export function nextInsuranceReportLabel(row) {
  if (row.status === 'cancelled') return '対象外（物件・保証取消）'
  if (row.status === 'draft') return '本登録前'
  if (row.insuranceStateVersion === 1) {
    const periods=insurancePeriodStates(row), candidates=insuranceReportingCandidates(row)
    if (periods.some(period=>period.state===null)) return '要確認（記録不足）'
    if (!candidates.length) return periods.some(period=>period.state==='waived') ? '登録済み期間に未報告なし（報告不要を含む）' : '登録済み期間に未報告なし'
    if (!activeInsuranceReports(row).length) return '初回報告が必要（対象年月で期間を確認）'
    const month=(insuranceNoticeExpiry(row) || row.handoverDate).slice(0,7)
    return /^\d{4}-\d{2}$/.test(month) ? `${month.slice(0,4)}年${month.slice(5)}月分` : '要確認'
  }
  const incomplete = row.insuranceHistoryIncomplete || (!row.insuranceEvents && (row.insuranceEverRenewed || (row.insuranceReported && !row.insuranceLastReport)))
  if (incomplete) return '要確認（記録不足）'
  if (row.insuranceReported === false) return '初回報告が必要'
  if (row.insuranceReported !== true || !row.expiryDate || !row.insuranceExpiryDate) return '要確認'
  if (row.insuranceExpiryDate >= row.expiryDate) return '次回報告不要（保証延長がなければ）'
  const month = String(row.insuranceRenewalMonth ?? '').match(/^(\d{4})-?(0[1-9]|1[0-2])$/)
  return month ? `${month[1]}年${month[2]}月分` : '要確認'
}
