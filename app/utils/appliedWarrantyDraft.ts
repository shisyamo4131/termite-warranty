import { calculateExpiryDate, calculateExtensionStartDate } from '../../src/domain/warranty.mjs'
import type { CaseRow, TimestampBaseline } from '../types/prototype-data.ts'
import { currentLocalDate, parseCanonicalLocalDate } from './canonicalLocalDate.ts'

export const toTimestampBaseline = (value: CaseRow['updatedAtBaseline'] | undefined): TimestampBaseline | null => {
  if (!value || !Number.isSafeInteger(value.seconds) || !Number.isInteger(value.nanoseconds)) return null
  return { seconds: value.seconds, nanoseconds: value.nanoseconds }
}

export const initialAppliedWarrantyStartDate = (
  warranties: Array<{ expiryDate: string }>,
  fallback = currentLocalDate(),
) => {
  const latest = warranties
    .map(item => item.expiryDate)
    .filter(value => parseCanonicalLocalDate(value))
    .sort()
    .at(-1)
  return latest ? calculateExtensionStartDate(latest) : fallback
}

export const hydrateAppliedWarrantyDraft = (
  row: Pick<CaseRow, 'updatedAtBaseline' | 'appliedWarranties'>,
  warranty: CaseRow['appliedWarranties'][number] | null | undefined,
) => ({
  baseline: row.updatedAtBaseline,
  warrantyServiceId: warranty?.warrantyServiceId ?? '',
  startDate: warranty?.startDate ?? initialAppliedWarrantyStartDate(row.appliedWarranties),
  expiryDate: warranty?.expiryDate ?? '',
  notificationStatus: warranty?.notificationStatus ?? 'not notified',
  status: warranty?.status ?? 'active',
  statusReason: warranty?.statusReason ?? '',
})

export const recalculatedAppliedWarrantyExpiry = (startDate: string, periodYears: number) =>
  calculateExpiryDate(startDate, periodYears)
