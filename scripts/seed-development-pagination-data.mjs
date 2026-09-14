import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { buildCaseListProjection } from '../src/domain/case-list-projection.mjs'
import { generateSearchTokens } from '../src/domain/search-tokens.mjs'

export const DEVELOPMENT_PROJECT_ID = 'termite-warranty-dev'
export const PAGINATION_SEED_COUNT = 25

const pad2 = (value) => String(value).padStart(2, '0')
const seedId = (kind, index) => `development-pagination-${kind}-${pad2(index)}`

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

export function buildDevelopmentPaginationSeed() {
  const branch = { id: 'development-pagination-branch', name: 'ページ確認支店', active: true }
  const warrantyService = {
    id: 'development-pagination-warranty',
    name: 'ページ確認5年保証',
    shortName: '確認5年',
    defaultPeriodYears: 5,
    notes: '開発環境のページング確認用架空データです。',
    active: true,
  }
  const constructionCompanies = []
  const homeowners = []
  const properties = []
  const cases = []

  for (let index = 1; index <= PAGINATION_SEED_COUNT; index += 1) {
    const suffix = pad2(index)
    const constructionCompanyId = seedId('company', index)
    const homeownerId = seedId('homeowner', index)
    const propertyId = seedId('property', index)
    const caseId = seedId('case', index)
    constructionCompanies.push({
      id: constructionCompanyId,
      ...withSearch(`ページ確認工務店${suffix}`, {
        address: { postalCode: '1000001', prefecture: '東京都', municipality: 'ページ確認市', streetTownAndNumber: `架空町${index}-${index}`, buildingName: null },
        telephone: `000-2000-${String(index).padStart(4, '0')}`,
        fax: null,
        contactPerson: `架空担当${suffix}`,
        contactDetails: null,
        notes: '開発環境のページング確認用架空データです。',
      }),
    })
    homeowners.push({
      id: homeownerId,
      ...withSearch(`ページ確認施主${suffix}`, {
        address: { postalCode: '1000001', prefecture: '東京都', municipality: 'ページ確認市', streetTownAndNumber: `架空住宅地${index}-${index}`, buildingName: null },
        telephone: `000-3000-${String(index).padStart(4, '0')}`,
        fax: null,
        notes: '開発環境のページング確認用架空データです。',
      }),
    })
    properties.push({
      id: propertyId,
      ...withSearch(`ページ確認物件${suffix}`, {
        homeownerId,
        constructionCompanyId,
        address: { postalCode: '1000001', prefecture: '東京都', municipality: 'ページ確認市', streetTownAndNumber: `架空住宅地${index}-${index}`, buildingName: null },
        notes: '開発環境のページング確認用架空データです。',
      }),
    })
    cases.push({
      id: caseId,
      propertyId,
      homeownerId,
      constructionCompanyId,
      responsibleBranchId: branch.id,
      warrantyServiceId: warrantyService.id,
      applicationDate: '2026-09-01',
      handoverDate: '2026-09-02',
      startDate: '2026-09-03',
      expiryDate: '2031-09-02',
      periodYears: 5,
      notificationStatus: 'not notified',
    })
  }
  return { branch, warrantyService, constructionCompanies, homeowners, properties, cases }
}

const assertExistingMaster = (snapshot, expected) => {
  if (!snapshot.exists) return
  const current = snapshot.data()
  for (const field of ['name', 'active', 'shortName', 'defaultPeriodYears']) {
    if (!(field in expected)) continue
    if (current[field] !== expected[field]) throw new Error(`Existing pagination seed differs at ${snapshot.ref.path}.${field}.`)
  }
  for (const field of ['homeownerId', 'constructionCompanyId']) {
    if (field in expected && current[field] !== expected[field]) throw new Error(`Existing pagination seed differs at ${snapshot.ref.path}.${field}.`)
  }
}

const masterEntries = (firestore, seed) => [
  [`branches/${seed.branch.id}`, seed.branch],
  [`warrantyServices/${seed.warrantyService.id}`, seed.warrantyService],
  ...seed.constructionCompanies.map(({ id, ...value }) => [`constructionCompanies/${id}`, value]),
  ...seed.homeowners.map(({ id, ...value }) => [`homeowners/${id}`, value]),
  ...seed.properties.map(({ id, ...value }) => [`properties/${id}`, value]),
].map(([documentPath, value]) => ({ ref: firestore.doc(documentPath), value }))

export async function seedDevelopmentPaginationData({ firestore, apply }) {
  const seed = buildDevelopmentPaginationSeed()
  const entries = masterEntries(firestore, seed)
  const snapshots = await firestore.getAll(...entries.map(({ ref }) => ref))
  snapshots.forEach((snapshot, index) => assertExistingMaster(snapshot, entries[index].value))
  const caseRefs = seed.cases.map(item => firestore.doc(`cases/${item.id}`))
  const caseSnapshots = await firestore.getAll(...caseRefs)
  caseSnapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) return
    const current = snapshot.data()
    const expected = seed.cases[index]
    for (const field of ['propertyId', 'homeownerId', 'constructionCompanyId', 'responsibleBranchId', 'warrantyServiceId']) {
      if (current[field] !== expected[field]) throw new Error(`Existing pagination seed differs at ${snapshot.ref.path}.${field}.`)
    }
  })
  const plan = {
    mastersToCreate: snapshots.filter(snapshot => !snapshot.exists).length,
    casesToCreate: caseSnapshots.filter(snapshot => !snapshot.exists).length,
    existingCases: caseSnapshots.filter(snapshot => snapshot.exists).length,
  }
  if (!apply) return plan

  const now = Timestamp.now()
  const masterBatch = firestore.batch()
  snapshots.forEach((snapshot, index) => {
    if (snapshot.exists) return
    const { ref, value } = entries[index]
    const metadata = ref.parent.id === 'branches' ? {} : { revision: 1, createdAt: now, updatedAt: now }
    masterBatch.create(ref, { ...value, ...metadata })
  })
  if (plan.mastersToCreate > 0) await masterBatch.commit()

  await firestore.runTransaction(async (transaction) => {
    const counterRef = firestore.doc('systemCounters/caseNumber')
    const [counter, ...currentCases] = await transaction.getAll(counterRef, ...caseRefs)
    const missing = seed.cases.filter((_, index) => !currentCases[index].exists)
    if (missing.length === 0) return
    const nextValue = counter.exists ? Number(counter.data()?.nextValue) : 1
    if (!Number.isInteger(nextValue) || nextValue < 1 || nextValue + missing.length - 1 > 999_999) {
      throw new Error('Development case-number counter cannot allocate the pagination seed range.')
    }
    const allocations = missing.map((item, offset) => ({ ...item, sequenceValue: nextValue + offset, caseNumber: String(nextValue + offset).padStart(6, '0') }))
    const reservationRefs = allocations.map(item => firestore.doc(`caseNumberReservations/${item.caseNumber}`))
    const reservations = await transaction.getAll(...reservationRefs)
    const conflict = reservations.find(snapshot => snapshot.exists)
    if (conflict) throw new Error(`Case-number reservation conflict at ${conflict.ref.path}.`)

    for (let index = 0; index < allocations.length; index += 1) {
      const item = allocations[index]
      const caseRef = firestore.doc(`cases/${item.id}`)
      const warrantyRef = caseRef.collection('appliedWarranties').doc('initial')
      const warranty = {
        warrantyServiceId: item.warrantyServiceId,
        periodYears: item.periodYears,
        startDate: item.startDate,
        expiryDate: item.expiryDate,
        notificationStatus: item.notificationStatus,
        status: 'active',
        statusReason: null,
        createdAt: now,
        updatedAt: now,
      }
      transaction.create(caseRef, {
        caseNumber: item.caseNumber,
        sequenceValue: item.sequenceValue,
        applicationDate: item.applicationDate,
        handoverDate: item.handoverDate,
        propertyId: item.propertyId,
        homeownerId: item.homeownerId,
        constructionCompanyId: item.constructionCompanyId,
        responsibleBranchId: item.responsibleBranchId,
        status: 'active',
        statusReason: null,
        registrationWarrantyId: 'initial',
        listProjection: buildCaseListProjection([{ id: 'initial', ...warranty }]),
        registeredAt: now,
        updatedAt: now,
      })
      transaction.create(warrantyRef, warranty)
      transaction.create(reservationRefs[index], { caseId: item.id })
    }
    transaction.set(counterRef, { nextValue: nextValue + allocations.length, lastCaseId: allocations.at(-1).id }, { merge: true })
  })
  return plan
}

async function main() {
  const apply = process.argv.includes('--apply')
  const confirmation = process.argv.find(argument => argument.startsWith('--confirm='))?.slice('--confirm='.length)
  if (apply && confirmation !== DEVELOPMENT_PROJECT_ID) {
    throw new Error(`Refusing to write. Pass --confirm=${DEVELOPMENT_PROJECT_ID} with --apply.`)
  }
  const firestore = getFirestore(initializeApp({ credential: applicationDefault(), projectId: DEVELOPMENT_PROJECT_ID }))
  const plan = await seedDevelopmentPaginationData({ firestore, apply })
  console.log(JSON.stringify({ projectId: DEVELOPMENT_PROJECT_ID, mode: apply ? 'apply' : 'dry-run', count: PAGINATION_SEED_COUNT, ...plan }))
}

const scriptPath = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) await main()
