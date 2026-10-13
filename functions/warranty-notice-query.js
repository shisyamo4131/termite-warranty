import { japanDate, normalizeAlertSettings } from './domain/property-warranty.mjs'
import { warrantyNoticeCutoff } from './domain/dashboard.mjs'
import { HttpsError } from 'firebase-functions/v2/https'

const stamp = snapshot => snapshot.exists ? `${snapshot.updateTime?.seconds}:${snapshot.updateTime?.nanoseconds}` : 'missing'

// Scope is derived from the authenticated actor, never from request filters.
export async function pendingWarrantyCandidates(db, filter, actor) {
  if (filter.alertKind !== 'warranty' || filter.notification !== 'pending' ||
      Object.keys(filter).some(key => !['alertKind', 'notification'].includes(key))) return null
  if (!actor || typeof actor !== 'object' || !actor.staff && (!['company','branch'].includes(actor.scope) || typeof actor.constructionCompanyId !== 'string' || !/^[\w-]{1,128}$/.test(actor.constructionCompanyId) || actor.scope === 'branch' && (typeof actor.branchId !== 'string' || !/^[\w-]{1,128}$/.test(actor.branchId)))) throw new HttpsError('permission-denied', '所属情報を確認してください。')
  const basisDate = japanDate()
  const refs = ['prototypeSettings/alerts', 'prototypeSettings/insuranceStates', 'prototypeSettings/dashboard'].map(path => db.doc(path))
  const before = await db.getAll(...refs)
  const insurance = before[1].data(), dashboard = before[2].data()
  if (insurance?.version !== 1 || dashboard?.version !== 1 ||
      !Number.isSafeInteger(dashboard.generation) || dashboard.generation < 1 ||
      insurance.generation !== dashboard.generation ||
      typeof dashboard.operationId !== 'string' || !dashboard.operationId ||
      insurance.operationId !== dashboard.operationId) throw new HttpsError('failed-precondition', '保証案内の準備状態を確認してください。')
  const settings = normalizeAlertSettings(before[0].data())
  let query = db.collection('propertyWarranties')
  if (!actor.staff) query = query.where('constructionCompanyId', '==', actor.constructionCompanyId)
  if (!actor.staff && actor.scope === 'branch') query = query.where('branchId', '==', actor.branchId)
  const snapshot = await query
    .where('warrantyNoticePending', '==', true)
    .where('expiryDate', '<=', warrantyNoticeCutoff(basisDate, settings.warrantyMonths)).get()
  // Keep migration fences; business settings/date are fixed at request start.
  const after = await db.getAll(...refs.slice(1))
  if (before.slice(1).some((value, index) => stamp(value) !== stamp(after[index]))) throw new HttpsError('failed-precondition', '保証案内の準備状態が変更されました。')
  return { snapshot, settings, basisDate }
}

export function warrantyNoticeOrder(a, b) {
  // Supported stored timestamps retain nanosecond precision; explicit null sorts
  // before timestamps in Firestore, hence last in this descending display.
  if (a.updatedAt === null && b.updatedAt !== null) return 1
  if (b.updatedAt === null && a.updatedAt !== null) return -1
  return (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0) ||
    (b.updatedAt?.nanoseconds ?? 0) - (a.updatedAt?.nanoseconds ?? 0) ||
    Buffer.compare(Buffer.from(b.id), Buffer.from(a.id))
}
