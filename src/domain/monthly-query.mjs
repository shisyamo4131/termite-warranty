import { billingProjection } from './billing-output.mjs'
import { certificateProjection } from './warranty-certificate.mjs'
import { activeInsuranceReports, insuranceExpiryDate, insuranceReportKind, warrantyTransactions } from './property-warranty.mjs'
import { periodMonthlyRange, insuranceReportedQueryProjection } from './insurance-state.mjs'

export const MONTHLY_QUERY_VERSION = 1
export function validMonth(month) {
  return typeof month === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month)
}
export function withInsuranceDefaults(row) {
  return { ...row, insuranceStartDate: row.insuranceStartDate ?? row.handoverDate ?? '', insuranceExpiryDate: row.insuranceExpiryDate ?? insuranceExpiryDate(row.handoverDate || ''), insuranceNeedsReview: !row.insuranceRenewalMonth, warrantyNotified: row.warrantyNotified === true }
}
function previousMonth(month) {
  const [year, value] = month.split('-').map(Number)
  return value === 1 ? `${String(year - 1).padStart(4, '0')}-12` : `${String(year).padStart(4, '0')}-${String(value - 1).padStart(2, '0')}`
}
export function selectedMonthToBasisMonth(month) {
  if (!validMonth(month) || month === '0001-01') throw new Error('前月を表示できる指定年月を選択してください。')
  return previousMonth(month)
}
// Search fields are derived from the same rules as the displayed report, never user input.
export function monthlyQueryProjection(input) {
  const result = { ...billingProjection(input), ...certificateProjection(input), ...insuranceReportedQueryProjection(input), monthlyQueryVersion: MONTHLY_QUERY_VERSION, insuranceQueryStart: '', insuranceQueryEnd: '', billingQueryMonths: [] }
  if (input.status !== 'active') return result
  const row = withInsuranceDefaults(input)
  result.billingQueryMonths = [...new Set(warrantyTransactions(row).map(item => item.billingDate.slice(0, 7)).filter(validMonth))].sort()
  if (input.insuranceStateVersion === 1) return { ...result, ...periodMonthlyRange(input) }
  if (row.insuranceNeedsReview || !row.insuranceReported && row.insuranceExpiryDate && row.insuranceRenewalMonth && (row.insuranceHistoryIncomplete || activeInsuranceReports(row).length || !row.expiryDate || !row.handoverDate)) {
    return { ...result, insuranceQueryStart: '0001-01', insuranceQueryEnd: '9999-12' }
  }
  if (row.insuranceReported) {
    const start = String(row.insuranceRenewalMonth ?? '').replace(/^(\d{4})(\d{2})$/, '$1-$2')
    if (validMonth(start) && insuranceReportKind(row, start)) return { ...result, insuranceQueryStart: start, insuranceQueryEnd: '9999-12' }
    return result
  }
  const start = row.handoverDate?.slice(0, 7)
  let end = row.expiryDate?.slice(0, 7)
  if (!validMonth(start) || !validMonth(end) || end < start || !insuranceReportKind(row, start)) return result
  // A legacy warranty can end part-way through an insurance block. Its final
  // months must not be fetched if the existing report rule excludes them.
  while (end >= start && !insuranceReportKind(row, end)) end = previousMonth(end)
  return end < start ? result : { ...result, insuranceQueryStart: start, insuranceQueryEnd: end }
}
export function monthlyProjectionMatches(row) {
  const expected = monthlyQueryProjection(row)
  return Object.entries(expected).every(([key, value]) => JSON.stringify(row[key]) === JSON.stringify(value))
}
