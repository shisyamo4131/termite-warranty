type Row = Record<string, any>
export function certificatePeriods(row: Row): Row[]
export function certificateProjection(row: Row): Row
export function certificateRows(rows: Row[], month: string): Row[]
export function certificateCsv(rows: Row[]): string
