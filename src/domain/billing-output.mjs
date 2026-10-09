import { warrantyTransactions, csvCell } from './property-warranty.mjs'
export function pendingBillingPeriods(row) {
  return row.status === 'active' ? warrantyTransactions(row).filter(p => p.identifiable && p.billingState === 'pending' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(p.billingDate.slice(0,7))) : []
}
export function billingProjection(row) {
  return { billingQueryVersion:1, billingPendingMonth:pendingBillingPeriods(row).map(p=>p.billingDate.slice(0,7)).sort()[0] ?? '' }
}
export function pendingBillingRows(rows, month) {
  return rows.flatMap(row=>pendingBillingPeriods(row).filter(p=>p.billingDate.slice(0,7)<=month).map(p=>({...row,
    billingKind:p.billingKind,billingDate:p.billingDate,billingEventId:p.id,billingPeriodLabel:p.label,
    billingState:p.billingState,billingStartDate:p.startDate,billingExpiryDate:p.expiryDate})))
    .sort((a,b)=>a.billingDate.localeCompare(b.billingDate)||String(a.warrantyNumber).localeCompare(String(b.warrantyNumber))||a.billingEventId.localeCompare(b.billingEventId))
}
export function billingCsv(rows) {
  const values=[['手続き','請求対象基準日','工務店','本支店','保証番号','物件名','申込日','引渡日','請求対象保証開始日','請求対象保証満了日','請求状態'],
    ...rows.map(r=>[r.billingKind,r.billingDate,r.companyLabel,r.branchLabel,r.warrantyNumber,r.name,r.applicationDate,r.handoverDate,r.billingStartDate,r.billingExpiryDate,r.billingState==='billed'?'請求済み':'未請求'])]
  return '\uFEFF'+values.map(row=>row.map(csvCell).join(',')).join('\r\n')
}
