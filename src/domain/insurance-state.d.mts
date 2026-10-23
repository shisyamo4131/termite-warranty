export interface InsurancePeriod { id:string; warrantyPeriodId:string; basisRevision:number; half:1|2; startDate:string; expiryDate:string; state:'pending'|'reported'|'waived'|null; reportId?:string; waiverId?:string; unknownReason?:string }
export const INSURANCE_STATE_VERSION: 1
export const INSURANCE_OPERATION_PROTOCOL: 1
export function insurancePeriodStates(row:Record<string,any>):InsurancePeriod[]
export function activeInsuranceWaivers(row:Record<string,any>):Array<Record<string,any>>
export function materializeInsuranceState(row:Record<string,any>,options?:{at?:string;sourceFingerprint?:string;newRegistration?:boolean;reconcile?:boolean;basisRevision?:number}):Record<string,any>
export function insuranceProjection(row:Record<string,any>):Record<string,any>
export function validateInsuranceState(row:Record<string,any>,options?:{today?:string}):string[]
export function insuranceProjectionMatches(row:Record<string,any>):boolean
export function insuranceReportingCandidates(row:Record<string,any>):InsurancePeriod[]
export function periodReportSelection(row:Record<string,any>,month:string):{kind:string;target:Record<string,any>|null}
export function periodMonthlyRange(row:Record<string,any>):{insuranceQueryStart:string;insuranceQueryEnd:string}
export function insuranceNoticeExpiry(row:Record<string,any>):string
export function confirmedInsuranceReportRows(row:Record<string,any>):Array<Record<string,any>>
export function insuranceReportedQueryProjection(row:Record<string,any>):{insuranceReportedQueryVersion:number;insuranceReportedQueryMonths:string[]}
export function insuranceMonthlyRows(rows:Array<Record<string,any>>,month:string,options?:{includeDone?:boolean}):{rows:Array<Record<string,any>>;unclassifiedCount:number}

export function waiveExpiredImportedPeriods(row:Record<string,any>,options:{today:string;actorUid:string;actorName:string;at:string}):Record<string,any>
