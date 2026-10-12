type Row = Record<string, any>
export function pendingBillingPeriods(row:Row):Row[]
export function billingProjection(row:Row):{billingQueryVersion:number;billingPendingMonth:string}
export function pendingBillingRows(rows:Row[],month:string,options?:{includeDone?:boolean}):Row[]
export function billingCsv(rows:Row[]):string
