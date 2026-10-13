import { calculateExpiryDate, calculateExtensionStartDate } from './warranty.mjs'
import { activeInsuranceReports, insuranceReportKind, insuranceReportTarget, warrantyTransactions } from './property-warranty.mjs'

export const INSURANCE_STATE_VERSION = 1
export const INSURANCE_OPERATION_PROTOCOL = 1
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && (() => { try { calculateExpiryDate(value, 1); return true } catch { return false } })()
const matching = (a, b) => a.warrantyPeriodId === b.warrantyPeriodId && a.startDate === b.startDate && a.expiryDate === b.expiryDate
function skeleton(row, basisRevision) {
  if (!row.handoverDate || !row.years) return []
  return warrantyTransactions(row).flatMap(warranty => {
    const middle = calculateExpiryDate(warranty.startDate, 5)
    return [
      { half: 1, startDate: warranty.startDate, expiryDate: middle },
      { half: 2, startDate: calculateExtensionStartDate(middle), expiryDate: warranty.expiryDate },
    ].map(period => ({ id: `${warranty.id}:${basisRevision}:${period.half}`, warrantyPeriodId: warranty.id, basisRevision, ...period, state: null, ...(warranty.identifiable ? {} : { unknownReason: '保証区間を特定できません。' }) }))
  })
}
export function activeInsuranceWaivers(row) {
  const events = row.insuranceWaiverEvents ?? []
  const undone = new Set(events.filter(event => event.kind === 'undoWaive').map(event => event.targetId))
  return events.filter(event => event.kind === 'waive' && !undone.has(event.id))
}
// Migration is deterministic from stored evidence, never from the execution day.
export function materializeInsuranceState(row, { at = '', sourceFingerprint = '', newRegistration = false, reconcile = false, basisRevision = row.insuranceBasisRevision ?? 1 } = {}) {
  if (row.insuranceStateVersion != null && row.insuranceStateVersion !== 1) throw new Error('保険記録の形式が変更されています。画面を再読込してください。')
  if (!Number.isSafeInteger(basisRevision) || basisRevision < 1) throw new Error('保険期間の世代が不正です。')
  const canonical = row.insuranceStateVersion === 1 && basisRevision === row.insuranceBasisRevision
  if (canonical && !reconcile && !newRegistration) {
    const errors = validateInsuranceState(row)
    if (errors.length) throw new Error(errors.join('\n'))
    return { ...row, insurancePeriods:row.insurancePeriods.map(period => ({...period})), insuranceWaiverEvents:row.insuranceWaiverEvents.map(event => ({...event})) }
  }
  const reports = activeInsuranceReports(row)
  const events = row.insuranceEvents
  const periodsShape = skeleton(row,basisRevision)
  const undoneReports = Array.isArray(events) ? events.filter(event => event.kind === 'undoReport') : []
  const reportEvidenceInvalid = undoneReports.some(event => !events.some(target => target.kind === 'report' && target.requestId === event.targetRequestId)) || new Set(undoneReports.map(event => event.targetRequestId)).size !== undoneReports.length
  const provenance = newRegistration || (row.history ?? []).some(event => ['register', 'import'].includes(event.kind)) || !!row.receivedRecordId
  const explicitPending = provenance && row.insuranceReported === false && Array.isArray(events) && !reports.length && !row.insuranceHistoryIncomplete && !reportEvidenceInvalid && periodsShape.some(period => period.startDate === row.insuranceStartDate && period.expiryDate === row.insuranceExpiryDate)
  const latestEnd = reports.map(report => report.expiryDate).filter(validDate).sort().at(-1) ?? ''
  const waivers = activeInsuranceWaivers(row)
  const periods = periodsShape.map(period => {
    const saved = canonical ? row.insurancePeriods?.find(value => value.id === period.id && matching(value, period)) : null
    const matches = reports.filter(value => matching(value, period))
    const report = matches[0]
    const waiver = waivers.find(value => value.periodId === period.id && value.startDate === period.startDate && value.expiryDate === period.expiryDate)
    if (period.unknownReason) return period
    if (reportEvidenceInvalid || matches.length > 1 || report && typeof report.requestId !== 'string') return { ...period, unknownReason:'報告・取消履歴の対応を確認できません。' }
    if (waiver && report) return { ...period, unknownReason: '報告と報告不要の記録が重複しています。' }
    if (waiver) return { ...period, state: 'waived', waiverId: waiver.id }
    if (report) return { ...period, state: 'reported', reportId: report.requestId }
    if (saved) return saved.state === 'reported' || saved.state === 'waived' ? { ...period, state: 'pending' } : { ...saved }
    if (newRegistration || explicitPending && period.startDate >= row.insuranceStartDate || latestEnd && period.startDate > latestEnd && !row.insuranceHistoryIncomplete) return { ...period, state: 'pending' }
    return { ...period, unknownReason: 'この期間の報告状態を確認できません。' }
  })
  const result = { ...row, insuranceStateVersion: 1, insuranceBasisRevision: basisRevision, insurancePeriods: periods, insuranceWaiverEvents: row.insuranceWaiverEvents ?? [] }
  if (!canonical && !newRegistration && row.insuranceStateVersion == null) result.insuranceMigration = { version: 1, at, previousRevision: row.revision ?? 0, sourceFingerprint }
  return result
}
export function insurancePeriodStates(row) {
  if (row.insuranceStateVersion === 1) return (row.insurancePeriods ?? []).map(period => ({ ...period }))
  try { return materializeInsuranceState(row).insurancePeriods } catch { return [] }
}
export function insuranceProjection(row) {
  const result = { insuranceProjectionVersion: 1, warrantyNoticePending: row.status === 'active' && row.warrantyNotified !== true && row.years < row.maxYears && validDate(row.expiryDate) }
  for (let index = 1; index <= 3; index++) { result[`insurancePendingStart${index}`] = ''; result[`insurancePendingEnd${index}`] = '' }
  if (row.status !== 'active') return result
  const ranges = []
  for (const period of insurancePeriodStates(row)) {
    if (period.state !== 'pending') continue
    const last = ranges.at(-1)
    if (last && calculateExtensionStartDate(last.expiryDate) === period.startDate) last.expiryDate = period.expiryDate
    else ranges.push({ startDate: period.startDate, expiryDate: period.expiryDate })
  }
  if (ranges.length > 3) throw new Error('保険期間の検索範囲が上限を超えています。')
  ranges.forEach((range, index) => { result[`insurancePendingStart${index + 1}`] = range.startDate; result[`insurancePendingEnd${index + 1}`] = range.expiryDate })
  return result
}
export function validateInsuranceState(row, { today } = {}) {
  const errors = []
  if (row.insuranceStateVersion !== 1 || !Number.isSafeInteger(row.insuranceBasisRevision) || row.insuranceBasisRevision < 1) return ['保険記録の形式を確認してください。']
  let expected
  try { expected = skeleton(row, row.insuranceBasisRevision) } catch { return ['保証期間を確認してください。'] }
  const periods = row.insurancePeriods
  if (!Array.isArray(periods) || periods.length !== expected.length || periods.length > 6) return ['保険期間の数が一致しません。']
  const reports = activeInsuranceReports(row), waivers = activeInsuranceWaivers(row)
  if (!Array.isArray(row.insuranceWaiverEvents)) return ['報告不要の履歴を確認してください。']
  const ids = new Set(), undone = new Set()
  for (const event of row.insuranceWaiverEvents) {
    if (!event || !['waive','undoWaive'].includes(event.kind) || !/^[\w-]{1,128}$/.test(event.id??'') || !/^[\w-]{1,128}$/.test(event.actorUid??'') || !/^.{1,180}$/.test(event.periodId??'') || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.at??'') || ids.has(event.id)) { errors.push('報告不要の履歴形式が不正です。'); continue }
    if (event.kind === 'waive') {
      if (typeof event.reason !== 'string' || !event.reason.trim() || event.reason.length > 2000 || typeof event.actorName !== 'string' || !validDate(event.startDate) || !validDate(event.expiryDate) || event.startDate > event.expiryDate) errors.push('報告不要の理由・対象期間を確認してください。')
    } else {
      const target = row.insuranceWaiverEvents.find(value => value.kind === 'waive' && value.id === event.targetId && value.periodId === event.periodId)
      if (!target || !ids.has(event.targetId) || undone.has(event.targetId)) errors.push('報告不要の取消対象を確認してください。')
      undone.add(event.targetId)
    }
    ids.add(event.id)
  }
  if (waivers.some(event => !periods.some(period => period.id === event.periodId && period.state === 'waived' && period.waiverId === event.id))) errors.push('現在の期間に対応しない報告不要があります。')
  periods.forEach((period, index) => {
    const shape = expected[index]
    if (!shape || ['id','warrantyPeriodId','basisRevision','half','startDate','expiryDate'].some(key => period[key] !== shape[key])) errors.push('保険期間の対応が一致しません。')
    if (![null,'pending','reported','waived'].includes(period.state)) errors.push('保険状態が不正です。')
    if (period.state === 'reported' && !reports.some(report => report.requestId === period.reportId && matching(report, period))) errors.push('報告記録との対応が一致しません。')
    if (period.state === 'waived' && !waivers.some(waiver => waiver.id === period.waiverId && waiver.periodId === period.id && waiver.startDate === period.startDate && waiver.expiryDate === period.expiryDate)) errors.push('報告不要の記録との対応が一致しません。')
    if (period.state !== 'reported' && reports.some(report => matching(report,period))) errors.push('報告済みの期間と状態が一致しません。')
    if (today && row.status === 'active' && period.state === null && period.expiryDate >= today) errors.push('現在または将来の保険状態を確認してください。')
  })
  return [...new Set(errors)]
}
export function insuranceProjectionMatches(row) {
  if (validateInsuranceState(row).length) return false
  const expected = insuranceProjection(row)
  return Object.entries(expected).every(([key, value]) => row[key] === value)
}
function monthEnd(month) { const value = new Date(`${month}-01T00:00:00Z`); value.setUTCMonth(value.getUTCMonth() + 1, 0); return value.toISOString().slice(0,10) }
function targetMonth(period, row) {
  if (period.startDate === row.handoverDate) return period.startDate.slice(0,7)
  const previous = new Date(`${period.startDate}T00:00:00Z`); previous.setUTCDate(previous.getUTCDate() - 1)
  return previous.toISOString().slice(0,7)
}
export function insuranceReportingCandidates(row) {
  const periods = insurancePeriodStates(row), reports = activeInsuranceReports(row)
  if (!reports.length) return periods.filter(period => period.state === 'pending')
  const latestEnd = reports.map(report => report.expiryDate).sort().at(-1)
  const undoneWaivers = new Set((row.insuranceWaiverEvents ?? []).filter(event => event.kind === 'undoWaive').map(event => event.periodId))
  const undoneReports = new Set((row.insuranceEvents ?? []).filter(event => event.kind === 'undoReport').map(event => event.targetRequestId))
  return periods.filter(period => period.state === 'pending' && (period.startDate > latestEnd || undoneWaivers.has(period.id) || (row.insuranceEvents ?? []).some(event => event.kind === 'report' && undoneReports.has(event.requestId) && matching(event, period))))
}
export function periodReportSelection(row, month) {
  if (row.status !== 'active') return { kind: '', target: null }
  const reports = activeInsuranceReports(row)
  const periods = insurancePeriodStates(row)
  let target
  if (!reports.length) {
    if (!row.expiryDate || row.expiryDate < `${month}-01`) return { kind: '', target: null }
    const date = row.expiryDate < monthEnd(month) ? row.expiryDate : monthEnd(month)
    target = periods.find(period => period.startDate <= date && period.expiryDate >= date)
  } else target = insuranceReportingCandidates(row).find(period => targetMonth(period, row) <= month)
  if (!target) return { kind: '', target: null }
  if (target.state === null || row.insuranceHistoryIncomplete) return { kind: 'review', target: null }
  if (target.state !== 'pending') return { kind: '', target: null }
  const start = reports.length ? targetMonth(target, row) : row.handoverDate.slice(0,7)
  if (month < start) return { kind: '', target: null }
  const warranty = warrantyTransactions(row).find(period => period.id === target.warrantyPeriodId)
  if (!warranty?.identifiable) return { kind: 'review', target: null }
  return { kind: `${month > start ? 'past-' : ''}${reports.length ? 'renewal' : 'new'}`, target: { insurancePeriodId: target.id, warrantyPeriodId: warranty.id, warrantyPeriodLabel: warranty.label, warrantyStartDate: warranty.startDate, warrantyExpiryDate: warranty.expiryDate, startDate: target.startDate, expiryDate: target.expiryDate } }
}
export function periodMonthlyRange(row) {
  if (row.status !== 'active') return { insuranceQueryStart: '', insuranceQueryEnd: '' }
  const periods = insurancePeriodStates(row)
  if (row.insuranceHistoryIncomplete || periods.some(period => period.state === null)) return { insuranceQueryStart:'0001-01', insuranceQueryEnd:'9999-12' }
  const candidates = insuranceReportingCandidates(row)
  if (!candidates.length) return { insuranceQueryStart:'', insuranceQueryEnd:'' }
  if (activeInsuranceReports(row).length) return { insuranceQueryStart: candidates.map(period => targetMonth(period, row)).sort()[0], insuranceQueryEnd:'9999-12' }
  return { insuranceQueryStart: candidates[0].startDate.slice(0,7), insuranceQueryEnd: candidates.at(-1).expiryDate.slice(0,7) }
}
export function insuranceNoticeExpiry(row) {
  if (!activeInsuranceReports(row).length) return ''
  const target = insuranceReportingCandidates(row)[0]
  if (!target || target.startDate === row.handoverDate) return ''
  const date = new Date(`${target.startDate}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0,10)
}

function reportingBasisMonth(row, kind, startDate) {
  if (kind === 'new') return validDate(row.handoverDate) ? row.handoverDate.slice(0,7) : ''
  if (kind !== 'renewal' || !validDate(startDate) || startDate === '0001-01-01') return ''
  const previous = new Date(`${startDate}T00:00:00Z`)
  previous.setUTCDate(previous.getUTCDate() - 1)
  return previous.toISOString().slice(0,7)
}

// Re-output uses saved report kind and exact period identity, never the current
// next-report candidate or the month in which an operator marked it reported.
export function confirmedInsuranceReportRows(row) {
  if (row.status !== 'active') return []
  const reports = activeInsuranceReports(row), periods = insurancePeriodStates(row), warranties = warrantyTransactions(row)
  let expected
  try { expected = skeleton(row,row.insuranceBasisRevision ?? 1) } catch { return [] }
  return periods.filter(period => period.state === 'reported').flatMap(period => {
    const shape = expected.find(value=>value.id===period.id)
    if (!shape || ['warrantyPeriodId','basisRevision','half','startDate','expiryDate'].some(key=>period[key]!==shape[key]) || periods.filter(value=>value.id===period.id).length!==1) return []
    if (typeof period.reportId !== 'string' || !period.reportId || reports.filter(report=>report.requestId===period.reportId).length!==1) return []
    if (activeInsuranceWaivers(row).some(waiver=>waiver.periodId===period.id)) return []
    const matches = reports.filter(report => matching(report,period))
    const report = matches[0], warranty = warranties.find(value => value.id === period.warrantyPeriodId)
    if (matches.length !== 1 || report.requestId !== period.reportId || !warranty?.identifiable || !validDate(period.startDate) || !validDate(period.expiryDate)) return []
    if (report.insurancePeriodId !== undefined && report.insurancePeriodId !== period.id) return []
    const reportBasisMonth = reportingBasisMonth(row, report.reportKind, period.startDate)
    if (!reportBasisMonth) return []
    return [{...row, reportState:'reported', reportId:report.requestId, reportKind:report.reportKind, reportBasisMonth,
      reportTarget:{insurancePeriodId:period.id,warrantyPeriodId:warranty.id,warrantyPeriodLabel:warranty.label,warrantyStartDate:warranty.startDate,warrantyExpiryDate:warranty.expiryDate,startDate:period.startDate,expiryDate:period.expiryDate}}]
  })
}

export function insuranceReportedQueryProjection(row) {
  return {insuranceReportedQueryVersion:1,insuranceReportedQueryMonths:[...new Set(confirmedInsuranceReportRows(row).map(value=>value.reportBasisMonth))].sort()}
}

export function insuranceMonthlyRows(rows, month, {includeDone=false}={}) {
  let unclassifiedCount = 0
  const result = rows.flatMap(row => {
    if (row.status !== 'active') return []
    const kind = row.insuranceNeedsReview ? 'review' : insuranceReportKind(row,month)
    const target = kind && kind !== 'review' ? insuranceReportTarget(row,month) : null
    const reportKind = kind && !target ? 'review' : kind
    const reportBasisMonth = target ? reportingBasisMonth(row,kind.replace(/^past-/,''),target.startDate) : ''
    const confirmed = includeDone ? confirmedInsuranceReportRows(row) : []
    // Count unclassifiable candidate properties, not all unknown records in the database.
    const unknownReport = includeDone && activeInsuranceReports(row).some(report => !confirmed.some(value=>value.reportId===report.requestId))
    if (includeDone && (reportKind === 'review' || unknownReport || target && !reportBasisMonth)) unclassifiedCount++
    const pending = reportKind && (!includeDone || target && reportBasisMonth === month)
      ? [{...row,reportKind,reportTarget:target,reportState:reportKind === 'review' ? 'review' : 'pending',...(reportBasisMonth ? {reportBasisMonth} : {})}]
      : []
    return [...pending,...confirmed.filter(value=>value.reportBasisMonth === month)]
  })
  return {rows:result,unclassifiedCount}
}
