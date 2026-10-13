import { japanDate, normalizeAlertSettings } from './domain/property-warranty.mjs'
import { warrantyNoticeCutoff } from './domain/dashboard.mjs'
import { HttpsError } from 'firebase-functions/v2/https'

const stamp = snapshot => snapshot.exists ? `${snapshot.updateTime?.seconds}:${snapshot.updateTime?.nanoseconds}` : 'missing'

export async function insuranceNoticeCandidates(db, filter, staff) {
  if (!staff || filter.alertKind !== 'insurance' || Object.keys(filter).some(key => key !== 'alertKind')) return null
  const basisDate = japanDate()
  const refs = ['prototypeSettings/alerts', 'prototypeSettings/insuranceStates', 'prototypeSettings/insuranceNoticeQueries'].map(path => db.doc(path))
  const before = await db.getAll(...refs)
  const state = before[1].data(), ready = before[2].data()
  if (state?.version !== 1 || ready?.version !== 1 || !Number.isSafeInteger(ready.generation) || ready.generation < 1 ||
      typeof ready.operationId !== 'string' || !ready.operationId) throw new HttpsError('failed-precondition', '保険案内の準備状態を確認してください。')
  const settings = normalizeAlertSettings(before[0].data())
  const snapshot = await db.collection('propertyWarranties')
    .where('insuranceNoticeQueryExpiry', '>', '')
    .where('insuranceNoticeQueryExpiry', '<=', warrantyNoticeCutoff(basisDate, settings.insuranceMonths)).get()
  const after = await db.getAll(...refs.slice(1))
  if (before.slice(1).some((value, index) => stamp(value) !== stamp(after[index]))) throw new HttpsError('failed-precondition', '保険案内の準備状態が変更されました。')
  return { snapshot, settings, basisDate }
}
