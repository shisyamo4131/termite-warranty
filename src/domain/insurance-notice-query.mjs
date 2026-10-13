import { insuranceNoticeExpiry } from './insurance-state.mjs'
import { withInsuranceDefaults } from './monthly-query.mjs'
import { calculateExpiryDate } from './warranty.mjs'

// Independent of the monthly/dashboard contracts, so old backups remain valid.
export function insuranceNoticeProjection(input) {
  if (input.insuranceStateVersion !== undefined && input.insuranceStateVersion !== 1) throw Error('Unknown insurance state version.')
  const row = withInsuranceDefaults(input)
  const expiry = row.status !== 'active' ? '' : row.insuranceStateVersion === 1 ? insuranceNoticeExpiry(row) : row.insuranceExpiryDate
  if (expiry) calculateExpiryDate(expiry, 1)
  return { insuranceNoticeQueryVersion: 1, insuranceNoticeQueryExpiry: expiry || '' }
}

export function insuranceNoticeProjectionMatches(row) {
  const expected = insuranceNoticeProjection(row)
  return Object.entries(expected).every(([key, value]) => row[key] === value)
}
