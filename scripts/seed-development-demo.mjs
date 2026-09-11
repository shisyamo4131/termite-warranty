import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { generateSearchTokens } from '../src/domain/search-tokens.mjs'

const projectId = 'termite-warranty-dev'
if (process.env.TERMITE_WARRANTY_DEMO_SEED_CONFIRM !== 'termite-warranty-dev') {
  throw new Error('Set TERMITE_WARRANTY_DEMO_SEED_CONFIRM=termite-warranty-dev to seed the development project.')
}

const firestore = getFirestore(initializeApp({ credential: applicationDefault(), projectId }))
const now = Timestamp.now()
const withSearch = (name, fields = {}) => {
  const tokens = generateSearchTokens(name)
  return { ...fields, name, active: true, nameSearch: { normalized: tokens.normalized, one: Object.fromEntries(tokens.oneCharacter.map((token) => [token, true])), two: Object.fromEntries(tokens.twoCharacter.map((token) => [token, true])) } }
}
const data = {
  constructionCompanies: [
    ['development-demo-aoba', '青葉住宅建設株式会社', '東京都', '千代田区', '青葉町1-8'],
    ['development-demo-umibe', '海風工務店株式会社', '神奈川県', '横浜市西区', 'みなと町2-14'],
    ['development-demo-hokushin', '北辰ハウス株式会社', '埼玉県', 'さいたま市大宮区', '桜木町3-6'],
  ],
  homeowners: [
    ['development-demo-morikawa', '森川 太郎', '東京都', '千代田区', '青葉町4-12'],
    ['development-demo-sakurai', '桜井 美咲', '神奈川県', '横浜市西区', '潮見台2-7'],
    ['development-demo-tachibana', '橘 恒一', '埼玉県', 'さいたま市大宮区', '若葉町1-19'],
    ['development-demo-fujimoto', '藤本 直子', '千葉県', '船橋市', '海神町5-3'],
  ],
  properties: [
    ['development-demo-aozora', '青空の家', 'development-demo-morikawa', 'development-demo-aoba', '東京都', '千代田区', '青葉町4-12'],
    ['development-demo-shiokaze', '潮風の家', 'development-demo-sakurai', 'development-demo-umibe', '神奈川県', '横浜市西区', '潮見台2-7'],
    ['development-demo-komorebi', '木もれ日の家', 'development-demo-tachibana', 'development-demo-hokushin', '埼玉県', 'さいたま市大宮区', '若葉町1-19'],
    ['development-demo-harunoniwa', '春の庭の家', 'development-demo-fujimoto', 'development-demo-aoba', '千葉県', '船橋市', '海神町5-3'],
  ],
  warrantyServices: [
    ['development-demo-standard', '住まい安心5年保証', 5],
    ['development-demo-long', '住まい長期10年保証', 10],
  ],
}

const writes = []
for (const [id, name, prefecture, municipality, streetTownAndNumber] of data.constructionCompanies) writes.push([`constructionCompanies/${id}`, withSearch(name, { address: { postalCode: '1000001', prefecture, municipality, streetTownAndNumber, buildingName: null }, telephone: '000-0000-0000', fax: null, contactPerson: '架空 担当', contactDetails: null, email: null, notes: '開発環境の架空データです。' })])
for (const [id, name, prefecture, municipality, streetTownAndNumber] of data.homeowners) writes.push([`homeowners/${id}`, withSearch(name, { address: { postalCode: '1000001', prefecture, municipality, streetTownAndNumber, buildingName: null }, telephone: '000-1000-0000', fax: null, notes: '開発環境の架空データです。' })])
for (const [id, name, homeownerId, constructionCompanyId, prefecture, municipality, streetTownAndNumber] of data.properties) writes.push([`properties/${id}`, withSearch(name, { homeownerId, constructionCompanyId, address: { postalCode: '1000001', prefecture, municipality, streetTownAndNumber, buildingName: null } })])
for (const [id, name, defaultPeriodYears] of data.warrantyServices) writes.push([`warrantyServices/${id}`, { name, defaultPeriodYears, active: true }])
writes.push(['branches/development-demo-east', { name: '東関東支店', active: true }])

const batch = firestore.batch()
for (const [path, value] of writes) {
  const ref = firestore.doc(path)
  if (!(await ref.get()).exists) batch.create(ref, { ...value, revision: 1, createdAt: now, updatedAt: now })
}
await batch.commit()

const cases = [
  ['development-demo-case-900001', '900001', 'development-demo-aozora', 'development-demo-morikawa', 'development-demo-aoba', 'development-demo-standard', 5, '2021-10-11', '2026-10-10', 'not notified'],
  ['development-demo-case-900002', '900002', 'development-demo-shiokaze', 'development-demo-sakurai', 'development-demo-umibe', 'development-demo-standard', 5, '2021-10-06', '2026-10-05', 'notified'],
  ['development-demo-case-900003', '900003', 'development-demo-komorebi', 'development-demo-tachibana', 'development-demo-hokushin', 'development-demo-long', 10, '2026-04-01', '2036-03-31', 'not required'],
  ['development-demo-case-900004', '900004', 'development-demo-harunoniwa', 'development-demo-fujimoto', 'development-demo-aoba', 'development-demo-standard', 5, '2026-08-01', '2031-07-31', 'not notified'],
]
await firestore.runTransaction(async (transaction) => {
  const counterRef = firestore.doc('systemCounters/caseNumber')
  const counter = await transaction.get(counterRef)
  for (const [id, caseNumber, propertyId, homeownerId, constructionCompanyId, warrantyServiceId, periodYears, startDate, expiryDate, notificationStatus] of cases) {
    const ref = firestore.doc(`cases/${id}`); const reservation = firestore.doc(`caseNumberReservations/${caseNumber}`)
    const [existing, reserved] = await transaction.getAll(ref, reservation)
    if (reserved.exists && reserved.data().caseId !== id) throw new Error(`Reservation conflict: ${caseNumber}`)
    if (!existing.exists) {
      transaction.create(ref, { caseNumber, sequenceValue: Number(caseNumber), applicationDate: '2026-09-01', handoverDate: '2026-09-03', propertyId, homeownerId, constructionCompanyId, responsibleBranchId: 'development-demo-east', status: 'active', statusReason: null, registrationWarrantyId: 'initial', registeredAt: now, updatedAt: now })
      transaction.create(ref.collection('appliedWarranties').doc('initial'), { warrantyServiceId, periodYears, startDate, expiryDate, notificationStatus, status: 'active', statusReason: null, createdAt: now, updatedAt: now })
    }
    if (!reserved.exists) transaction.create(reservation, { caseId: id })
  }
  const nextValue = Number(counter.data()?.nextValue)
  if (!Number.isInteger(nextValue) || nextValue < 900005) transaction.set(counterRef, { nextValue: 900005, lastCaseId: counter.data()?.lastCaseId ?? null }, { merge: true })
})
console.log('Development demo data is available: 3 companies, 4 homeowners, 4 properties, 2 services, 1 branch, and 4 cases.')
