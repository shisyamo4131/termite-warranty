import { createHash } from 'node:crypto'

// Versioned command identity: sorted keys, explicit absence, no runtime envelope.
// Only fields consumed by the command are included; no master lookup or server clock.
const canonical = value => value === undefined ? ['absent'] : value === null ? ['null']
  : Array.isArray(value) ? ['array', value.map(canonical)]
  : typeof value === 'object' ? ['object', Object.keys(value).sort().map(key => [key, canonical(value[key])])]
  : [typeof value, value]
const select = (value, keys) => Object.fromEntries(keys.map(key => [key, value?.[key]]))
export const inputHash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
export function propertyInputHash(input) {
  const common = select(input, ['action', 'id', 'revision', 'reason'])
  const fields = {
    save: ['fields', 'confirmDates'], register: ['fields', 'confirmDates', 'confirmRegistration', 'confirmWarnings'],
    extend: ['extensionApplicationDate'], undoExtend: ['targetRequestId'], cancel: ['confirmCancellation'], restore: [],
    notify: ['notified'], report: ['month', 'reportTarget'], undoReport: ['targetReportId'],
    waiveInsurance: ['insurancePeriodId'], undoInsuranceWaiver: ['insurancePeriodId'],
    bill: ['warrantyPeriodId', 'startDate', 'expiryDate'], undoBill: ['warrantyPeriodId', 'startDate', 'expiryDate'],
    confirmUnbilled: ['warrantyPeriodId', 'startDate', 'expiryDate'],
    issueCertificate: ['month', 'periods'], billPeriods: ['month', 'groupId', 'periods'],
    undoCertificate: ['warrantyPeriodId', 'startDate', 'expiryDate'],
  }
  const command = { ...common, ...select(input, fields[input.action] ?? []) }
  if (command.fields) command.fields = select(command.fields, ['name','ownerName','ownerTelephone','postalCode','buildingName','handoverDate','applicationDate','notes','insulationMaterials','address','buildingArea','maxYears','foundationInsulation','constructionCompanyId','branchId','externalKey'])
  if (command.reportTarget) command.reportTarget = select(command.reportTarget, ['warrantyPeriodId','startDate','expiryDate'])
  if (Array.isArray(command.periods)) command.periods = command.periods.map(period => select(period, ['id','startDate','expiryDate']))
  return inputHash(command)
}
export function masterInputHash(input) {
  const keys = ['action','name','enabled']
  if (input.action === 'saveCompany') keys.push('defaultGroupId','address','telephone','fax','contactPerson','notes')
  if (input.action === 'saveBranch') keys.push('constructionCompanyId','groupId','address','telephone','fax','branchCode')
  if (input.action === 'saveGroup') keys.push('prefix','fiscalStartMonth','billingRecipient','externalKeyRequired','externalKeyLabel','addressRequired','insulationMaterialsRequired')
  return inputHash(select(input, keys))
}
