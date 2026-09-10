const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const CASE_STATUS = Object.freeze({
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  INVALID: 'invalid',
})

export const APPLIED_WARRANTY_STATUS = CASE_STATUS

export const NOTIFICATION_STATUS = Object.freeze({
  NOT_NOTIFIED: 'not notified',
  NOTIFIED: 'notified',
  NOT_REQUIRED: 'not required',
})

function parseIsoDate(value, fieldName) {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) {
    throw new TypeError(`${fieldName} must use YYYY-MM-DD format`)
  }

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const monthIndex = Number(monthText) - 1
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, monthIndex, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`${fieldName} must be a valid calendar date`)
  }

  return date
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10)
}

function requirePositiveWholeYears(periodYears) {
  if (!Number.isInteger(periodYears) || periodYears <= 0) {
    throw new RangeError('periodYears must be a positive integer')
  }
}

export function calculateExpiryDate(startDate, periodYears) {
  requirePositiveWholeYears(periodYears)
  const start = parseIsoDate(startDate, 'startDate')
  const anniversary = new Date(
    Date.UTC(
      start.getUTCFullYear() + periodYears,
      start.getUTCMonth(),
      start.getUTCDate(),
    ),
  )
  anniversary.setUTCDate(anniversary.getUTCDate() - 1)
  return formatIsoDate(anniversary)
}

export function calculateExtensionStartDate(expiryDate) {
  const nextDay = parseIsoDate(expiryDate, 'expiryDate')
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  return formatIsoDate(nextDay)
}

export function isAlertEligible({
  caseStatus,
  appliedWarrantyStatus,
  expiryDate,
  today,
}) {
  if (
    caseStatus !== CASE_STATUS.ACTIVE ||
    appliedWarrantyStatus !== APPLIED_WARRANTY_STATUS.ACTIVE
  ) {
    return false
  }

  const expiry = parseIsoDate(expiryDate, 'expiryDate')
  const currentDate = parseIsoDate(today, 'today')
  const alertStarts = new Date(expiry)
  alertStarts.setUTCDate(alertStarts.getUTCDate() - 30)

  return currentDate >= alertStarts && currentDate <= expiry
}

export function deriveInitialEnrolmentDate(appliedWarranties) {
  const activeStartDates = appliedWarranties
    .filter(({ status }) => status === APPLIED_WARRANTY_STATUS.ACTIVE)
    .map(({ startDate }) => {
      parseIsoDate(startDate, 'startDate')
      return startDate
    })

  if (activeStartDates.length === 0) {
    return null
  }

  return activeStartDates.sort()[0]
}
