export type PendingImportScope = { projectId:string; actorUid:string }
export type PendingImport = PendingImportScope & { version:1; requestId:string; groupId:string; companyId:string; format:'common'|'uh'; csvHash:string; previewHash:string }
export function pendingImportStorageKey(scope:PendingImportScope):string
export function loadPendingImport(storage:Pick<Storage,'getItem'>,scope:PendingImportScope):PendingImport|null
export function savePendingImport(storage:Pick<Storage,'getItem'|'setItem'>,scope:PendingImportScope,value:Omit<PendingImport,'version'|'projectId'|'actorUid'>):PendingImport
export function clearPendingImport(storage:Pick<Storage,'getItem'|'removeItem'>,scope:PendingImportScope,requestId:string):void
export function hashImportCsv(csv:string):Promise<string>
