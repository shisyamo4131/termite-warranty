import assert from 'node:assert/strict'
import test from 'node:test'

import {
  APPLIED_WARRANTY_STATUS,
  CASE_STATUS,
  calculateExpiryDate,
  calculateExtensionStartDate,
  deriveInitialEnrolmentDate,
  isAlertEligible,
} from '../src/domain/warranty.mjs'

test('expiry is the day before the whole-year anniversary', () => {
  assert.equal(calculateExpiryDate('2026-09-10', 5), '2031-09-09')
})

test('February 29 start produces February 28 expiry after one year', () => {
  assert.equal(calculateExpiryDate('2024-02-29', 1), '2025-02-28')
  assert.equal(calculateExpiryDate('2024-02-29', 4), '2028-02-28')
})

test('extension starts on the day after the prior expiry', () => {
  assert.equal(calculateExtensionStartDate('2026-12-31'), '2027-01-01')
})

test('alert window includes 30 days before expiry and the expiry date', () => {
  const input = {
    caseStatus: CASE_STATUS.ACTIVE,
    appliedWarrantyStatus: APPLIED_WARRANTY_STATUS.ACTIVE,
    expiryDate: '2026-10-10',
  }

  assert.equal(isAlertEligible({ ...input, today: '2026-09-10' }), true)
  assert.equal(isAlertEligible({ ...input, today: '2026-10-10' }), true)
  assert.equal(isAlertEligible({ ...input, today: '2026-09-09' }), false)
  assert.equal(isAlertEligible({ ...input, today: '2026-10-11' }), false)
})

test('alert window remains inclusive across a year boundary', () => {
  const input = {
    caseStatus: CASE_STATUS.ACTIVE,
    appliedWarrantyStatus: APPLIED_WARRANTY_STATUS.ACTIVE,
    expiryDate: '2027-01-15',
  }

  assert.equal(isAlertEligible({ ...input, today: '2026-12-16' }), true)
  assert.equal(isAlertEligible({ ...input, today: '2026-12-15' }), false)
})

test('cancelled or invalid cases and warranties are not alert eligible', () => {
  const input = {
    caseStatus: CASE_STATUS.ACTIVE,
    appliedWarrantyStatus: APPLIED_WARRANTY_STATUS.ACTIVE,
    expiryDate: '2026-10-10',
    today: '2026-09-10',
  }

  assert.equal(
    isAlertEligible({ ...input, caseStatus: CASE_STATUS.CANCELLED }),
    false,
  )
  assert.equal(
    isAlertEligible({
      ...input,
      appliedWarrantyStatus: APPLIED_WARRANTY_STATUS.INVALID,
    }),
    false,
  )
  assert.equal(isAlertEligible({ ...input, caseStatus: CASE_STATUS.INVALID }), false)
  assert.equal(
    isAlertEligible({
      ...input,
      appliedWarrantyStatus: APPLIED_WARRANTY_STATUS.CANCELLED,
    }),
    false,
  )
})

test('initial enrolment date is the oldest active warranty start', () => {
  assert.equal(
    deriveInitialEnrolmentDate([
      { status: APPLIED_WARRANTY_STATUS.CANCELLED, startDate: '2020-01-01' },
      { status: APPLIED_WARRANTY_STATUS.ACTIVE, startDate: '2026-04-01' },
      { status: APPLIED_WARRANTY_STATUS.ACTIVE, startDate: '2025-04-01' },
    ]),
    '2025-04-01',
  )
  assert.equal(
    deriveInitialEnrolmentDate([
      { status: APPLIED_WARRANTY_STATUS.INVALID, startDate: '2020-01-01' },
    ]),
    null,
  )
})

test('invalid dates and non-positive periods are rejected', () => {
  assert.throws(() => calculateExpiryDate('2026-02-30', 1), RangeError)
  assert.throws(() => calculateExpiryDate('2026-02-28', 0), RangeError)
  assert.throws(() => calculateExpiryDate('2026/02/28', 1), TypeError)
})
