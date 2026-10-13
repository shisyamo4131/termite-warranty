export const FIRESTORE_DOCUMENT_LIMIT: number
export function firestoreDocumentBytes(row:Record<string,any>,documentPath:string):number
export function assertInsuranceCapacity(row:Record<string,any>,options:{documentPath:string;today:string}):{bytes:number;maximumBytes:number}
