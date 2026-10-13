export const BULK_IMPORT_MAX_ROWS: number
export const BULK_IMPORT_MAX_BYTES: number
export const CSV_TEMPLATE_HEADERS: readonly string[]
export function createBulkImportTemplate(): string
export function parseBulkImportCsv(csv: string): Array<{line:number;values:Record<string,string>}>
export type BulkImportError = {line:number;field:string;message:string}
export type PreparedBulkImportRow = {line:number;externalKey:string;branchCode:string;years:number;fields:Record<string,any>;sourceValues:Record<string,string>}
export function prepareBulkImportRows(csv:string, options?:{format?:'common'|'uh';group?:Record<string,any>}): {rows:PreparedBulkImportRow[];errors:BulkImportError[]}
