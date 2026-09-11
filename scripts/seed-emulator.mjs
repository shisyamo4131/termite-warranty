import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { generateSearchTokens } from '../src/domain/search-tokens.mjs'

const projectId = 'demo-termite-warranty'
const email = 'demo.admin@example.invalid'
const password = 'Demo-only-password-123'

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8180'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9199'

if (!projectId.startsWith('demo-')) {
  throw new Error('Seed is restricted to a Firebase demo project ID.')
}
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Start the local Firestore and Auth emulators before seeding.')
}
if (
  !process.env.FIRESTORE_EMULATOR_HOST.startsWith('127.0.0.1:') ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST.startsWith('127.0.0.1:')
) {
  throw new Error('Seed targets must use the 127.0.0.1 loopback interface.')
}

const app = initializeApp({ projectId })
const auth = getAuth(app)
const firestore = getFirestore(app)

let user
try {
  user = await auth.getUserByEmail(email)
  await auth.updateUser(user.uid, { password, displayName: 'デモ管理者', disabled: false })
} catch (error) {
  if (error.code !== 'auth/user-not-found') throw error
  user = await auth.createUser({ email, password, displayName: 'デモ管理者' })
}

const withSearch = (name, fields = {}) => {
  const tokens = generateSearchTokens(name)
  return {
    ...fields,
    name,
    active: true,
    nameSearch: {
      normalized: tokens.normalized,
      one: Object.fromEntries(tokens.oneCharacter.map((token) => [token, true])),
      two: Object.fromEntries(tokens.twoCharacter.map((token) => [token, true])),
    },
  }
}

const batch = firestore.batch()
const counterRef = firestore.doc('systemCounters/caseNumber')
const counterSnapshot = await counterRef.get()
const now = Timestamp.now()
const pad2 = (value) => String(value).padStart(2, '0')
const seedId = (base, index) => index === 1 ? base : `${base}-${pad2(index)}`
const addressSeeds = [
  ['1000001', '東京都', '千代田区'],
  ['0600001', '北海道', '札幌市中央区'],
  ['9800001', '宮城県', '仙台市青葉区'],
  ['2200001', '神奈川県', '横浜市西区'],
  ['4600001', '愛知県', '名古屋市中区'],
  ['5300001', '大阪府', '大阪市北区'],
  ['6500001', '兵庫県', '神戸市中央区'],
  ['7300001', '広島県', '広島市中区'],
  ['8100001', '福岡県', '福岡市中央区'],
  ['9000001', '沖縄県', '那覇市'],
]

const constructionCompanySeeds = Array.from({ length: 10 }, (_, offset) => {
  const index = offset + 1
  const [postalCode, prefecture, municipality] = addressSeeds[offset]
  return [firestore.doc(`constructionCompanies/${seedId('demo-builder', index)}`), withSearch(`デモ工務店${pad2(index)}`, {
    address: {
      postalCode,
      prefecture,
      municipality,
      streetTownAndNumber: `デモ町${index}-${index}`,
      buildingName: index % 2 === 0 ? `デモビル${index}階` : null,
    },
    telephone: `000-0000-${String(index).padStart(4, '0')}`,
    fax: `000-0001-${String(index).padStart(4, '0')}`,
    contactPerson: `デモ担当者${pad2(index)}`,
    contactDetails: '平日 9:00～17:00（デモ）',
    email: `builder-${pad2(index)}@example.invalid`,
    notes: `デモ表示用の工務店${pad2(index)}です。`,
  })]
})

const homeownerSeeds = Array.from({ length: 20 }, (_, offset) => {
  const index = offset + 1
  return [
    firestore.doc(`homeowners/${seedId('demo-homeowner', index)}`),
    withSearch(`デモ施主${pad2(index)}`),
  ]
})

const propertySeeds = Array.from({ length: 30 }, (_, offset) => {
  const index = offset + 1
  const companyIndex = (offset % constructionCompanySeeds.length) + 1
  const homeownerIndex = (offset % homeownerSeeds.length) + 1
  const [postalCode, prefecture, municipality] = addressSeeds[offset % addressSeeds.length]
  return [firestore.doc(`properties/${seedId('demo-property', index)}`), withSearch(`デモ物件${pad2(index)}`, {
    homeownerId: seedId('demo-homeowner', homeownerIndex),
    constructionCompanyId: seedId('demo-builder', companyIndex),
    address: {
      postalCode,
      prefecture,
      municipality,
      streetTownAndNumber: `デモ住宅地${Math.floor(offset / 10) + 1}-${index}`,
      buildingName: index % 3 === 0 ? `デモレジデンス${pad2(index)}` : null,
    },
  })]
})

const warrantyPeriods = [5, 10, 15, 20, 30]
const warrantyServiceSeeds = warrantyPeriods.map((defaultPeriodYears, offset) => {
  const index = offset + 1
  return [firestore.doc(`warrantyServices/${seedId('demo-warranty', index)}`), {
    name: `デモ保証サービス${pad2(index)}（${defaultPeriodYears}年）`,
    defaultPeriodYears,
    active: true,
  }]
})

const masterSeeds = [
  ...constructionCompanySeeds,
  ...homeownerSeeds,
  ...propertySeeds,
  ...warrantyServiceSeeds,
]

const expectedSeedCounts = {
  constructionCompanies: 10,
  homeowners: 20,
  properties: 30,
  warrantyServices: 5,
}
for (const [collectionName, expectedCount] of Object.entries(expectedSeedCounts)) {
  const ids = masterSeeds
    .filter(([ref]) => ref.parent.id === collectionName)
    .map(([ref]) => ref.id)
  if (ids.length !== expectedCount || new Set(ids).size !== expectedCount) {
    throw new Error(`Invalid ${collectionName} demo seed definition.`)
  }
}
const seededHomeownerIds = new Set(homeownerSeeds.map(([ref]) => ref.id))
const seededCompanyIds = new Set(constructionCompanySeeds.map(([ref]) => ref.id))
for (const [, property] of propertySeeds) {
  if (!seededHomeownerIds.has(property.homeownerId) || !seededCompanyIds.has(property.constructionCompanyId)) {
    throw new Error('A demo property references a missing demo homeowner or construction company.')
  }
}
const masterSnapshots = await firestore.getAll(...masterSeeds.map(([ref]) => ref))
batch.set(firestore.doc(`staffAccounts/${user.uid}`), {
  email,
  displayName: 'デモ管理者',
  role: 'house_solution_administrator',
  enabled: true,
})
batch.set(firestore.doc('branches/demo-branch'), { name: 'デモ支店', active: true })
masterSeeds.forEach(([ref, data], index) => {
  const existing = masterSnapshots[index]
  if (existing.exists) {
    const current = existing.data()
    const missingSeedFields = Object.fromEntries(
      Object.entries(data).filter(([key]) => current[key] === undefined),
    )
    batch.set(ref, {
      ...missingSeedFields,
      revision: Number.isInteger(current.revision) && current.revision > 0 ? current.revision : 1,
      createdAt: current.createdAt ?? now,
      updatedAt: current.updatedAt ?? now,
    }, { merge: true })
  } else {
    batch.set(ref, { ...data, revision: 1, createdAt: now, updatedAt: now })
  }
})
if (!counterSnapshot.exists) {
  batch.set(counterRef, { nextValue: 1, lastCaseId: null })
}
await batch.commit()

console.log(`Seeded local emulator account: ${email} (${user.uid})`)
console.log(`Synthetic password: ${password}`)
console.log('Seeded demo masters: 10 construction companies, 20 homeowners, 30 properties, 5 warranty services')
