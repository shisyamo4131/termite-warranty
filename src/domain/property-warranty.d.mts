export const initialGroups: Array<{id:string;name:string;prefix:string;fiscalStartMonth:number;template:string;externalKeyRequired?:boolean;externalKeyLabel?:string}>
export function japanDate(now?:Date):string
export function fiscalYear(date:string,startMonth:number):number
export function normalizeWarrantyPrefix(value:unknown):string
export function warrantyNumber(group:{prefix:string;fiscalStartMonth:number},date:string,sequence:number):string
export function coveragePeriods(start:string,years:number):Array<{startDate:string;expiryDate:string}>
export function importedWarrantyPeriods(start:string,years:number,sourceRecordId:string):Array<{startDate:string;expiryDate:string;index:number;sourceRecordId:string;id:string}>
export function normalizeProperty(input:Record<string,unknown>,formal:boolean,group?:Record<string,unknown>):Record<string,unknown>
export function propertyAddress(input?:Record<string,unknown>):string
export function matchesProperty(row:Record<string,any>,filter?:Record<string,any>):boolean
export function reportRows(rows:Array<Record<string,any>>,from:string,to:string,includeCancelled?:boolean):Array<Record<string,any>>
export function csvCell(value:unknown):string

export function alertStartDate(expiryDate:string,months?:number):string
export function expiryAlertEligible(row:Record<string,any>,kind:string,today?:string,months?:number):boolean
export function insuranceExpiryDate(startDate:string):string
export function normalizeAlertSettings(input?:Record<string,unknown>):{warrantyMonths:number;insuranceMonths:number}
export function initialInsurance(date:string):Record<string,any>
export function initialInsurancePeriodAt(row:Record<string,any>,referenceDate:string):Record<string,any>|null
export function insuranceReportKind(row:Record<string,any>,month:string,today?:string):string
export function nextInsurancePeriod(row:Record<string,any>):Record<string,any>
export function applicationWarnings(fields:Record<string,any>,today?:string):string[]
export function billingRows(rows:Array<Record<string,any>>,month:string):Array<Record<string,any>>

export function activeExtensions(row:Record<string,any>):Array<Record<string,any>>
export function extensionUndoPreview(row:Record<string,any>):null | {targetRequestId:string;targetDate:string;years:number;periods:Array<{startDate:string;expiryDate:string}>;expiryDate:string;blockers:string[]}
export function warrantyTransactions(row:Record<string,any>):Array<Record<string,any>>
export function activeInsuranceReports(row:Record<string,any>):Array<Record<string,any>>
export function latestInsuranceReport(row:Record<string,any>):Record<string,any>|null
export function insuranceReportTarget(row:Record<string,any>,month:string,today?:string):Record<string,any>|null
export function handoverChangeBlockers(row:Record<string,any>|null):string[]

export function normalizeExtensionApplication(input:Record<string,unknown>):{extensionApplicationDate:string;reason:string}
export function extensionApplicationDeadline(startDate:string):string
