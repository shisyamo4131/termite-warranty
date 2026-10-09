import { warrantyTransactions, csvCell } from './property-warranty.mjs'

export function certificatePeriods(row) {
  return warrantyTransactions(row).map(period => ({ ...period,
    certificateIssued: (row.certificateItems ?? []).some(item => item.id === period.id && item.startDate === period.startDate && item.expiryDate === period.expiryDate && item.issued === true),
    certificateMonth: period.startDate.slice(0, 7)
  }))
}
export function certificateProjection(row) {
  const periods = row.status === 'active' ? certificatePeriods(row) : []
  return { certificateQueryVersion: 1,
    certificateQueryMonths: [...new Set(periods.map(p => p.certificateMonth))].sort(),
    certificatePendingMonth: periods.filter(p => !p.certificateIssued).map(p => p.certificateMonth).sort()[0] ?? '' }
}
export function certificateRows(rows, month) {
  return rows.filter(row => row.status === 'active').flatMap(row => certificatePeriods(row)
    .filter(p => p.certificateMonth === month || p.certificateMonth < month && !p.certificateIssued)
    .map(p => ({ ...row, certificatePeriodId: p.id, certificatePeriodLabel: p.label, certificateStartDate: p.startDate,
      certificateExpiryDate: p.expiryDate, certificateIssued: p.certificateIssued, certificateIdentifiable: p.identifiable,
      certificateMonth: p.certificateMonth })))
    .sort((a,b) => a.certificateMonth.localeCompare(b.certificateMonth) || String(a.warrantyNumber).localeCompare(String(b.warrantyNumber)) || a.certificatePeriodId.localeCompare(b.certificatePeriodId))
}
export function certificateCsv(rows) {
  const values = [['保証書No','物件名','引渡日','担当工務店','担当本支店'], ...rows.map(row => [row.warrantyNumber,row.name,row.handoverDate,row.companyLabel,row.branchLabel])]
  return '\uFEFF' + values.map(row => row.map(csvCell).join(',')).join('\r\n')
}
