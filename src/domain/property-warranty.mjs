import { calculateExpiryDate, calculateExtensionStartDate } from './warranty.mjs'
import { createSearchPlan, generateSearchTokens } from './search-tokens.mjs'
import { propertyFieldRequirements } from './property-field-requirements.mjs'
import { activeInsuranceWaivers, insuranceNoticeExpiry, periodReportSelection } from './insurance-state.mjs'

export const initialGroups = [
  { id: 'HSC', name: 'HSC', prefix: 'HSC', fiscalStartMonth: 1, template: 'sample' },
  { id: 'SHS', name: 'SHS', prefix: 'SHS', fiscalStartMonth: 4, template: 'sample' },
  { id: 'UH', name: 'UH', prefix: '', fiscalStartMonth: 1, template: 'sample', externalKeyRequired: true, externalKeyLabel: 'お施主様契約No' },
]
export function japanDate(now = new Date()) { return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10) }
export function fiscalYear(date, startMonth) {
  calculateExpiryDate(date, 1)
  const [year, month] = date.split('-').map(Number)
  return year - (month < startMonth ? 1 : 0)
}
export function normalizeWarrantyPrefix(value) { return String(value ?? '').trim() }
export function warrantyNumber(group, date, sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error('採番値が不正です。')
  const prefix = normalizeWarrantyPrefix(group.prefix)
  return `${prefix ? prefix + '-' : ''}${String(fiscalYear(date, group.fiscalStartMonth)).slice(-2)}-${String(sequence).padStart(3, '0')}`
}
export function coveragePeriods(start, years) {
  if (![10, 20, 30].includes(years)) throw new Error('保証年数が不正です。')
  const periods = []
  for (let i = 0; i < years / 10; i++) {
    const expiryDate = calculateExpiryDate(start, 10)
    periods.push({ startDate: start, expiryDate })
    start = calculateExtensionStartDate(expiryDate)
  }
  return periods
}
// These identify source-supported intervals, not historical extension operations.
export function importedWarrantyPeriods(start, years, sourceRecordId) {
  if (typeof sourceRecordId !== 'string' || !/^[\w-]{1,128}$/.test(sourceRecordId)) throw new Error('取込情報の識別子が不正です。')
  return coveragePeriods(start, years).map((period, index) => ({ ...period, index, sourceRecordId, id: index ? `import-${sourceRecordId}-${index}` : 'initial' }))
}
// During migration, explicit single-field values (including empty) take precedence.
export function propertyAddress(input = {}) {
  if (Object.hasOwn(input, 'address')) return String(input.address ?? '').trim()
  return ['prefecture', 'municipality', 'streetTownAndNumber'].map(key => String(input[key] ?? '').trim()).join('')
}
export function normalizeProperty(input, formal, group = {}) {
  const requirements = propertyFieldRequirements(group)
  const result = {}
  if (Object.hasOwn(input, 'ownerName')) throw new Error('名称項目が変更されました。画面を再読込してください。')
  for (const key of ['name', 'ownerTelephone', 'postalCode', 'buildingName', 'handoverDate', 'applicationDate', 'notes', 'insulationMaterials']) {
    result[key] = String(input[key] ?? '').trim()
    if (result[key].length > 2000) throw new Error('入力内容が長すぎます。')
  }
  result.address = propertyAddress(input)
  if (result.address.length > 2000) throw new Error('入力内容が長すぎます。')
  result.postalCode = result.postalCode.replace(/[-\s]/g, '')
  result.buildingArea = input.buildingArea === '' || input.buildingArea == null ? null : Number(input.buildingArea)
  result.maxYears = Number(input.maxYears ?? 20)
  result.foundationInsulation = input.foundationInsulation === true
  if (input.foundationInsulation != null && typeof input.foundationInsulation !== 'boolean') throw new Error('基礎断熱材の有無を選択してください。')
  if (formal && requirements.insulationMaterialsRequired && result.foundationInsulation && !result.insulationMaterials) throw new Error('基礎断熱材が有の場合は使用資材を入力してください。')
  if (result.postalCode && !/^\d{7}$/.test(result.postalCode)) throw new Error('郵便番号は7桁で入力してください。空欄でも登録できます。')
  if (![10, 20, 30].includes(result.maxYears)) throw new Error('最長保証期間は10年・20年・30年です。')
  if (!result.name) throw new Error('物件名を入力してください。')
  if (result.applicationDate) calculateExpiryDate(result.applicationDate, 1)
  if (formal && !result.applicationDate) throw new Error('本登録には申込日が必要です。')
  if (result.handoverDate) calculateExpiryDate(result.handoverDate, 10)
  if (formal && !result.handoverDate) throw new Error('本登録には引渡日が必要です。')
  if (result.buildingArea !== null && (!Number.isFinite(result.buildingArea) || result.buildingArea <= 0)) throw new Error('建築面積は正の数で入力してください。')
  if (result.buildingArea !== null && Math.abs(result.buildingArea * 100 - Math.round(result.buildingArea * 100)) > 0.000001) throw new Error('建築面積は小数2桁までです。')
  if (formal && requirements.addressRequired && !result.address) throw new Error('本登録には住所が必要です。')
  if (formal && result.buildingArea === null) throw new Error('本登録には建築面積が必要です。')
  return result
}
export function matchesProperty(row, filter = {}) {
  if (filter.warrantyNumber && row.warrantyNumber !== filter.warrantyNumber.trim()) return false
  if (filter.handoverMissing === 'yes' && row.handoverDate) return false
  if (filter.companyId && row.constructionCompanyId !== filter.companyId) return false
  if (filter.branchId && row.branchId !== filter.branchId) return false
  if (filter.groupId && row.groupId !== filter.groupId) return false
  if (filter.handoverMonth && row.handoverDate?.slice(0,7) !== filter.handoverMonth) return false
  if (filter.fiscalYear && String(row.fiscalYear) !== String(filter.fiscalYear)) return false
  if (filter.status && row.status !== filter.status) return false
  for (const [key, from, to] of [['applicationDate','applicationFrom','applicationTo'],['handoverDate','handoverFrom','handoverTo']]) {
    if (filter[from] && (!row[key] || row[key] < filter[from])) return false
    if (filter[to] && (!row[key] || row[key] > filter[to])) return false
  }
  if (filter.search) {
    const plan = createSearchPlan(filter.search)
    const tokens = generateSearchTokens([row.name, propertyAddress(row)].join(' '))
    if (!plan.requiredTwoCharacterTokens.every(token => tokens.twoCharacter.includes(token))) return false
  }
  if (filter.expiryBefore && (row.status !== 'active' || row.expiryDate > filter.expiryBefore)) return false
  return true
}

export function initialInsurance(handoverDate) {
  const expiry = insuranceExpiryDate(handoverDate)
  return { insuranceStartDate: handoverDate, insuranceExpiryDate: expiry, insuranceRenewalMonth: expiry.slice(0,7).replace('-', ''), insuranceReported: false, insuranceEverRenewed: false, insuranceLastReport: null }
}
// The caller must supply the approved reference date; this calculation does not
// choose the reporting month/operation-date policy or write reporting history.
export function initialInsurancePeriodAt(row, referenceDate) {
  calculateExpiryDate(referenceDate, 1)
  if (row.status !== 'active' || row.insuranceReported || !row.handoverDate || !row.expiryDate) return null
  if (referenceDate < row.handoverDate || referenceDate > row.expiryDate) return null
  let period = initialInsurance(row.handoverDate)
  while (period.insuranceExpiryDate < referenceDate) period = { ...period, ...nextInsurancePeriod(period) }
  if (period.insuranceExpiryDate > row.expiryDate) return null
  return period
}
function initialInsuranceForMonth(row, month) {
  if (row.expiryDate && row.expiryDate < `${month}-01`) return null
  const lastDay = new Date(`${month}-01T00:00:00Z`)
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0)
  const monthEnd = lastDay.toISOString().slice(0, 10)
  // Keep warranties ending within the selected month selectable by HS.
  return initialInsurancePeriodAt(row, row.expiryDate < monthEnd ? row.expiryDate : monthEnd)
}
export function insuranceReportKind(row, month, today = japanDate()) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('対象年月を指定してください。')
  calculateExpiryDate(`${month}-01`, 1)
  if (row.insuranceStateVersion === 1) return periodReportSelection(row, month).kind
  if (row.status !== 'active' || !row.insuranceExpiryDate || !row.insuranceRenewalMonth) return ''
  const ym = month.replace('-', '')
  if (!row.insuranceReported) {
    // Reporting a past month must not change its target according to execution day.
    if (row.insuranceHistoryIncomplete || activeInsuranceReports(row).length || !row.expiryDate || !row.handoverDate) return 'review'
    if (!initialInsuranceForMonth(row, month)) return ''
    const first = row.handoverDate?.slice(0,7)
    return first === month ? 'new' : first < month ? 'past-new' : ''
  }
  if (!row.expiryDate || row.expiryDate <= row.insuranceExpiryDate) return ''
  return row.insuranceRenewalMonth === ym ? 'renewal' : row.insuranceRenewalMonth < ym ? 'past-renewal' : ''
}
export function nextInsurancePeriod(row) {
  const start = calculateExtensionStartDate(row.insuranceExpiryDate)
  const expiry = insuranceExpiryDate(start)
  return { insuranceStartDate: start, insuranceExpiryDate: expiry, insuranceRenewalMonth: expiry.slice(0,7).replace('-', '') }
}
export function applicationWarnings(fields, today = japanDate()) {
  return [fields.applicationDate > today ? '申込日が未来です。' : '', fields.handoverDate && fields.applicationDate > fields.handoverDate ? '申込日が引渡日より後です。' : ''].filter(Boolean)
}
// Application dates belong to individual extension operations, not the property.
export function normalizeExtensionApplication(input) {
  const date = input.extensionApplicationDate
  if (typeof date !== 'string' || !date) throw new Error('延長申込日を入力してください。')
  try { calculateExpiryDate(date, 1) } catch { throw new Error('延長申込日は正しい年月日で入力してください。') }
  const reason = input.reason ?? ''
  if (typeof reason !== 'string' || reason.length > 2000) throw new Error('理由は2000文字以内で入力してください。')
  return { extensionApplicationDate: date, reason: reason.trim() }
}
export function extensionApplicationDeadline(startDate) {
  calculateExpiryDate(startDate, 1)
  const date = new Date(`${startDate.slice(0, 7)}-01T00:00:00Z`)
  date.setUTCDate(0)
  return date.toISOString().slice(0, 10)
}
// Keep original events; undo events point to the extension they reverse.
export function activeExtensions(row) {
  const history = row.history ?? []
  const undone = new Set(history.filter(h => h.kind === 'undoExtend').map(h => h.targetRequestId))
  return history.filter(h => h.kind === 'extend' && !undone.has(h.requestId))
}
export function extensionUndoPreview(row) {
  const target = activeExtensions(row).at(-1)
  if (row.status !== 'active' || !target?.requestId || ![20,30].includes(row.years) || target.before?.years !== row.years - 10 || !row.handoverDate) return null
  const periods = coveragePeriods(row.handoverDate, row.years - 10)
  const blockers = []
  const bill = warrantyTransactions(row).find(p => p.id === target.requestId)
  if (bill?.billingState !== 'pending') blockers.push(bill?.billingState === 'billed' ? 'この延長の請求済みを先に取り消してください。' : 'この延長の請求状態を確認してください。')
  if (row.insuranceReported && row.insuranceExpiryDate > periods.at(-1).expiryDate || activeInsuranceReports(row).some(report => report.expiryDate > periods.at(-1).expiryDate)) blockers.push('この延長区間にかかる保険報告を先に取り消してください。')
  if (activeInsuranceWaivers(row).some(event => event.expiryDate > periods.at(-1).expiryDate)) blockers.push('この延長区間の報告不要を先に取り消してください。終了した期間は開発側へ確認を依頼してください。')
  if (row.warrantyNotified) blockers.push('現在の満了案内を先に未案内に戻してください。')
  return { targetRequestId: target.requestId, targetDate: target.date, years: row.years - 10, periods, expiryDate: periods.at(-1).expiryDate, blockers }
}
// IDs identify transactions, not dates: cancelling and re-extending creates a new ID.
export function warrantyTransactions(row) {
  if (!row.handoverDate || !row.years) return []
  const periods = coveragePeriods(row.handoverDate, row.years)
  const extensions = activeExtensions(row)
  return periods.map((period, index) => {
    const event = index ? extensions.find(h => h.before?.years === index * 10) : null
    const received = !event && index && Array.isArray(row.importedWarrantyPeriods) && typeof row.receivedRecordId === 'string'
      ? row.importedWarrantyPeriods.filter(value => value.index === index && value.sourceRecordId === row.receivedRecordId && value.id === `import-${row.receivedRecordId}-${index}` && value.startDate === period.startDate && value.expiryDate === period.expiryDate)
      : []
    const id = index ? event ? event.requestId : received.length === 1 ? received[0].id : null : 'initial'
    const saved = (row.billingItems ?? []).find(b => b.id === id)
    return { ...period, id: id || `unknown-${index}`, label: index ? `延長${index}` : '初回', billingKind: index ? '延長' : '新規', billingDate: index ? event?.extensionApplicationDate || period.startDate : row.applicationDate || '', extensionApplicationDate: index ? event?.extensionApplicationDate || '' : '', extensionApplicationDateMissing: !!index && !event?.extensionApplicationDate, extensionReason: index ? event?.reason || '' : '', billingState: saved?.state || 'unknown', identifiable: !!id }
  })
}
export function activeInsuranceReports(row) {
  if (Array.isArray(row.insuranceEvents)) {
    const undone = new Set(row.insuranceEvents.filter(e => e.kind === 'undoReport').map(e => e.targetRequestId))
    return row.insuranceEvents.filter(e => e.kind === 'report' && !undone.has(e.requestId))
  }
  if (!row.insuranceLastReport) return []
  const saved = row.insuranceLastReport
  return [{ ...saved, kind: 'report', reportKind: saved.kind, requestId: 'legacy-report', startDate: row.insuranceStartDate, expiryDate: row.insuranceExpiryDate, warrantyPeriodId: warrantyTransactions(row).find(p => p.startDate <= row.insuranceStartDate && row.insuranceStartDate <= p.expiryDate)?.id || '', legacy: true }]
}
export function latestInsuranceReport(row) { return activeInsuranceReports(row).at(-1) || null }
export function insuranceReportTarget(row, month, today = japanDate()) {
  if (row.insuranceStateVersion === 1) return periodReportSelection(row, month).target
  const kind = insuranceReportKind(row, month, today)
  if (!kind || kind === 'review') return null
  const next = ['renewal','past-renewal'].includes(kind) ? nextInsurancePeriod(row) : initialInsuranceForMonth(row, month)
  const period = warrantyTransactions(row).find(p => p.startDate <= next.insuranceStartDate && next.insuranceStartDate <= p.expiryDate)
  if (!period?.identifiable) return null
  return { warrantyPeriodId: period.id, warrantyPeriodLabel: period.label, warrantyStartDate: period.startDate, warrantyExpiryDate: period.expiryDate, startDate: next.insuranceStartDate, expiryDate: next.insuranceExpiryDate }
}
export function handoverChangeBlockers(row) {
  if (!row || row.status === 'draft') return []
  const reasons = []
  if (activeInsuranceWaivers(row).length) reasons.push('報告不要をすべて取り消してください。終了した期間は開発側へ確認を依頼してください。')
  if (row.years > 10 || activeExtensions(row).length) reasons.push('有効な保証延長をすべて取り消してください。')
  if (row.insuranceReported || activeInsuranceReports(row).length) reasons.push('初回分を含む保険の報告済みをすべて取り消してください。')
  if (row.insuranceHistoryIncomplete || (!Array.isArray(row.insuranceEvents) && row.insuranceEverRenewed && !row.insuranceLastReport)) reasons.push('旧データの保険報告記録が不足しています。開発側へ確認を依頼してください。')
  if (warrantyTransactions(row).some(p => p.billingState === 'billed')) reasons.push('初回分を含む請求済みをすべて取り消してください。')
  if (warrantyTransactions(row).some(p => p.billingState === 'unknown')) reasons.push('未確認の請求状態を確認してください。')
  return reasons
}
export function billingRows(rows, month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('対象年月を指定してください。')
  calculateExpiryDate(`${month}-01`, 1)
  return rows.filter(r => r.status === 'active').flatMap(r => warrantyTransactions(r).filter(p => p.billingDate.startsWith(month)).map(p => ({...r, billingKind:p.billingKind, billingDate:p.billingDate, billingEventId:p.id, billingState:p.billingState, billingStartDate:p.startDate, billingExpiryDate:p.expiryDate})))
}
export function reportRows(rows, from, to, includeCancelled = false) {
  calculateExpiryDate(from, 1); calculateExpiryDate(to, 1)
  if (from > to) throw new Error('期間の開始日は終了日以前にしてください。')
  return rows.filter(row => (row.status === 'active' || includeCancelled && row.status === 'cancelled') && row.handoverDate && row.handoverDate >= from && row.handoverDate <= to)
}
export function csvCell(value) {
  const text = String(value ?? '')
  // Prevent spreadsheet formula evaluation in exported, user-controlled cells.
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`
}

// Calendar-month lead time, clamped to the last valid day of the target month.
export function alertStartDate(expiryDate, months = 2) {
  calculateExpiryDate(expiryDate, 1)
  if (!Number.isInteger(months) || months < 1 || months > 12) throw new Error('案内時期は1〜12か月前で指定してください。')
  const [year, month, day] = expiryDate.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 - months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}
export function expiryAlertEligible(row, kind, today = japanDate(), months = 2) {
  calculateExpiryDate(today, 1)
  if (kind === 'warranty' && !(row.years < row.maxYears)) return false
  const expiry = kind === 'insurance' ? row.insuranceStateVersion === 1 ? insuranceNoticeExpiry(row) : row.insuranceExpiryDate : row.expiryDate
  return row.status === 'active' && !!expiry && today >= alertStartDate(expiry, months)
}
export function insuranceExpiryDate(startDate) {
  return startDate ? calculateExpiryDate(startDate, 5) : ''
}
export function normalizeAlertSettings(input = {}) {
  const result = {}
  for (const key of ['warrantyMonths', 'insuranceMonths']) {
    const value = Number(input[key] ?? 2)
    if (!Number.isInteger(value) || value < 1 || value > 12) throw new Error('案内時期は1〜12か月前で指定してください。')
    result[key] = value
  }
  return result
}
