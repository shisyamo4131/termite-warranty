import { insuranceProjection, insurancePeriodStates } from './insurance-state.mjs'
import { insuranceNoticeProjection } from './insurance-notice-query.mjs'
import { monthlyQueryProjection } from './monthly-query.mjs'

export const FIRESTORE_DOCUMENT_LIMIT = 1048576
const stringSize = value => new TextEncoder().encode(value).length + 1
function mapSize(value, depth=0) { return 32 + Object.entries(value).reduce((size, [key, item]) => { const bytes=valueSize(item,depth+1); if(bytes>FIRESTORE_DOCUMENT_LIMIT-89)throw new Error('保険記録の保存容量が不足しています。開発側へ確認してください。'); return size+stringSize(key)+bytes }, 0) }
function valueSize(value,depth=0) {
  if(depth>20)throw new Error('保存記録の階層が深すぎます。開発側へ確認してください。')
  if (value === null || typeof value === 'boolean') return 1
  if (typeof value === 'number' || value instanceof Date || typeof value?.toDate === 'function') return 8
  if (typeof value === 'string') return stringSize(value)
  if (value instanceof Uint8Array) return value.byteLength
  if (Array.isArray(value)) return value.reduce((size, item) => size + valueSize(item,depth+1), 0)
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) return mapSize(value,depth)
  throw new Error('保存容量を確認できない値が含まれています。')
}
export function firestoreDocumentBytes(row, documentPath) {
  if (typeof documentPath !== 'string' || !documentPath.includes('/')) throw new Error('保存先の確認が必要です。')
  return documentPath.split('/').reduce((size, component) => size + stringSize(component), 16) + mapSize(row)
}
// Reserve the entire resulting document for every subset, including range fields.
export function assertInsuranceCapacity(row, { documentPath, today }) {
  const cancellable = insurancePeriodStates(row).filter(period => period.state === 'waived' && period.expiryDate >= today)
  if (cancellable.length > 6) throw new Error('保険期間の数が不正です。')
  let maximumBytes = firestoreDocumentBytes(row, documentPath)
  for (let mask = 1; mask < 2 ** cancellable.length; mask++) {
    const selected = cancellable.filter((_, index) => mask & (1 << index))
    let candidate = { ...row, insurancePeriods: row.insurancePeriods.map(period => selected.some(target => target.id === period.id) ? { id:period.id,warrantyPeriodId:period.warrantyPeriodId,basisRevision:period.basisRevision,half:period.half,startDate:period.startDate,expiryDate:period.expiryDate,state:'pending' } : period), insuranceWaiverEvents: [...row.insuranceWaiverEvents, ...selected.map(period => ({ kind:'undoWaive',id:'x'.repeat(128),targetId:period.waiverId,periodId:period.id,actorUid:'x'.repeat(128),at:'9999-12-31T23:59:59.999Z' }))] }
    candidate = { ...candidate, ...insuranceProjection(candidate), ...monthlyQueryProjection(candidate), ...insuranceNoticeProjection(candidate) }
    maximumBytes = Math.max(maximumBytes, firestoreDocumentBytes(candidate, documentPath))
  }
  if (maximumBytes > FIRESTORE_DOCUMENT_LIMIT) throw new Error('保険記録を安全に保存する容量が不足しています。開発側へ確認してください。')
  return { bytes: firestoreDocumentBytes(row, documentPath), maximumBytes }
}
