import { Filter } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { japanDate, normalizeAlertSettings } from './domain/property-warranty.mjs'
import { warrantyNoticeCutoff } from './domain/dashboard.mjs'

const roles = ['developer_superuser','house_solution_administrator','general_staff']
const fail = (code, message) => { throw new HttpsError(code, message) }
const stamp = snapshot => snapshot.exists ? `${snapshot.updateTime?.seconds}:${snapshot.updateTime?.nanoseconds}` : 'missing'
export async function dashboardCounts(db, { uid, runtimeGeneration, now = new Date() }) {
  const startedAt = now.toISOString(), basisDate = japanDate(now), basisMonth = basisDate.slice(0,7)
  const accountRef = db.doc(`staffAccounts/${uid}`)
  const account = (await accountRef.get()).data()
  if (account?.enabled !== true || !roles.includes(account.role)) fail('permission-denied','HS担当者のみダッシュボードを利用できます。')
  const refs = ['prototypeSettings/alerts','prototypeSettings/insuranceStates','prototypeSettings/dashboard'].map(path => db.doc(path))
  const before = await db.getAll(...refs)
  const insuranceReady=before[1].data(), dashboardReady=before[2].data()
  // Marker generation identifies the checked migration image. Recovery admission
  // separately fences the live generation; a verified restored image keeps its provenance.
  if (insuranceReady?.version !== 1 || dashboardReady?.version !== 1 || !Number.isSafeInteger(runtimeGeneration) || runtimeGeneration < 1 || !Number.isSafeInteger(dashboardReady.generation) || dashboardReady.generation < 1 || insuranceReady.generation !== dashboardReady.generation || typeof dashboardReady.operationId !== 'string' || !dashboardReady.operationId || insuranceReady.operationId !== dashboardReady.operationId) fail('failed-precondition','ダッシュボードの準備中です。開発側へ確認してください。')
  const settings = normalizeAlertSettings(before[0].data())
  const collection = db.collection('propertyWarranties')
  const active = collection.where('status','==','active')
  const queries = [
    active.where('startDate','>','').where('startDate','<=',basisDate).where('expiryDate','>=',basisDate),
    active.where('insuranceProjectionVersion','==',1).where(Filter.or(...[1,2,3].map(index => Filter.and(Filter.where(`insurancePendingStart${index}`,'<=',basisDate),Filter.where(`insurancePendingEnd${index}`,'>=',basisDate))))),
    collection.where('warrantyNoticePending','==',true).where('expiryDate','<=',warrantyNoticeCutoff(basisDate,settings.warrantyMonths)),
    active.where('billingPendingMonth','>','').where('billingPendingMonth','<=',basisMonth),
  ]
  const values = await Promise.all(queries.map(async query => {
    const count = (await query.count().get()).data().count
    if (!Number.isSafeInteger(count) || count < 0) fail('internal','件数を確認できませんでした。更新してください。')
    return count
  }))
  const [after, latestAccount] = await Promise.all([db.getAll(...refs),accountRef.get()])
  if (latestAccount.data()?.enabled !== true || latestAccount.data()?.role !== account.role || !roles.includes(latestAccount.data()?.role)) fail('permission-denied','アカウントの利用状態が変更されました。')
  if (before.some((snapshot,index) => stamp(snapshot) !== stamp(after[index]))) fail('aborted','集計中に設定が変更されました。更新してください。')
  return { version:1, counts:Object.fromEntries(['active','insurancePending','warrantyNoticePending','billingPending'].map((key,index) => [key,values[index]])),basisDate,basisMonth,startedAt,completedAt:new Date().toISOString(),warrantyMonths:settings.warrantyMonths,runtimeGeneration }
}
