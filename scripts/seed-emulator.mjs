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
const masterSeeds = [
  [firestore.doc('constructionCompanies/demo-builder'), withSearch('デモ工務店', {
    address: {
      postalCode: '1000001', prefecture: '東京都', municipality: '千代田区',
      streetTownAndNumber: '千代田1-1', buildingName: null,
    },
    telephone: null,
    fax: null,
    contactPerson: null,
    contactDetails: null,
    email: null,
    notes: null,
  })],
  [firestore.doc('homeowners/demo-homeowner'), withSearch('デモ施主')],
  [firestore.doc('properties/demo-property'), withSearch('デモ住宅', {
    homeownerId: 'demo-homeowner',
    constructionCompanyId: 'demo-builder',
    address: {
      postalCode: '1000001',
      prefecture: '東京都',
      municipality: '千代田区',
      streetTownAndNumber: '千代田1-1',
      buildingName: null,
    },
  })],
  [firestore.doc('warrantyServices/demo-warranty'), {
    name: 'デモ白蟻保証', defaultPeriodYears: 5, active: true,
  }],
]
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
