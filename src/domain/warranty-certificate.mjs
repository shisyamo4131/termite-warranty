import { warrantyTransactions, csvCell, propertyAddress } from './property-warranty.mjs'
import { calculateExpiryDate } from './warranty.mjs'

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
export function certificateRows(rows, month, { includeDone = false } = {}) {
  return rows.filter(row => row.status === 'active').flatMap(row => certificatePeriods(row)
    .filter(p => includeDone ? p.certificateMonth === month : p.certificateMonth <= month && !p.certificateIssued)
    .map(p => ({ ...row, certificatePeriodId: p.id, certificatePeriodLabel: p.label, certificateStartDate: p.startDate,
      certificateExpiryDate: p.expiryDate, certificateIssued: p.certificateIssued, certificateIdentifiable: p.identifiable,
      certificateMonth: p.certificateMonth })))
    .sort((a,b) => a.certificateMonth.localeCompare(b.certificateMonth) || String(a.warrantyNumber).localeCompare(String(b.warrantyNumber)) || a.certificatePeriodId.localeCompare(b.certificatePeriodId))
}
export function certificateCsv(rows) {
  const headers = ['保証書No','物件名','引渡日','担当工務店','担当本支店','住所','保証グループ','外部キー','発行対象','保証開始日','保証満了日','保証年数','引渡日_年','引渡日_月','引渡日_日','保証開始日_年','保証開始日_月','保証開始日_日','保証満了日_年','保証満了日_月','保証満了日_日']
  const values = [headers, ...rows.map(row => {
    try {
      if (row.status !== 'active') throw new Error('有効な物件／保証ではありません。')
      const handoverParts = certificateDateParts(row.handoverDate)
      const periods = certificatePeriods(row)
      const index = periods.findIndex(period => period.id === row.certificatePeriodId && period.identifiable
        && period.startDate === row.certificateStartDate && period.expiryDate === row.certificateExpiryDate)
      if (index < 0) throw new Error('発行対象の保証期間を確認できません。一覧を更新してください。')
      const startDate = periods[0].startDate
      if (row.startDate != null && row.startDate !== startDate) throw new Error('元の保証開始日と引渡日が一致しません。')
      const expiryDate = periods[index].expiryDate
      const label = index ? `延長保証（${index}回目）` : '初回保証'
      return [row.warrantyNumber,row.name,row.handoverDate,row.companyLabel,row.branchLabel,
        [propertyAddress(row),row.buildingName].filter(Boolean).join(' '),row.groupLabel ?? row.groupName,row.externalKey,
        label,startDate,expiryDate,(index + 1) * 10,...handoverParts,...certificateDateParts(startDate),...certificateDateParts(expiryDate)]
    } catch (error) {
      throw new Error(`保証書CSVを出力できません（保証番号：${row.warrantyNumber || row.id || '不明'}）。${error.message}`)
    }
  })]
  return '\uFEFF' + values.map(row => row.map(csvCell).join(',')).join('\r\n')
}

function certificateDateParts(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('日付をYYYY-MM-DD形式で確認してください。')
  try { calculateExpiryDate(value, 1) } catch { throw new Error('存在しない日付が含まれています。') }
  const [year, month, day] = value.split('-')
  return [year, Number(month), Number(day)]
}
