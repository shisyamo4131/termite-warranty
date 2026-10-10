import { calculateExpiryDate } from './warranty.mjs'
export const DASHBOARD_VERSION = 1
// Exact inverse of alertStartDate's calendar subtraction, including month-end.
export function warrantyNoticeCutoff(today, months) {
  calculateExpiryDate(today, 1)
  if (!Number.isInteger(months) || months < 1 || months > 12) throw new Error('案内時期を確認してください。')
  const [year, month, day] = today.split('-').map(Number)
  const end = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const targetEnd = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(day === end ? targetEnd : Math.min(day, targetEnd))
  return target.toISOString().slice(0,10)
}
