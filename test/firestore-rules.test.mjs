import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { LOCAL_RUNTIME, localRuntimeHost } from './helpers/emulator-runtime.mjs'
import { fixtureRuntime } from './helpers/fixed-runtime.mjs'

const projectId = 'demo-termite-warranty-test'
if (process.env.FIRESTORE_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.firestorePort)) {
  throw new Error(`Firestore Rules tests require the dedicated local emulator at ${localRuntimeHost(LOCAL_RUNTIME.firestorePort)}.`)
}

let testEnvironment

const contextFor = (uid) => testEnvironment.authenticatedContext(uid).firestore()

test('fixed marker fails closed and stale partial updates cannot inherit a current epoch or nonce', async () => {
  await seedStaff('epoch-user')
  const db=contextFor('epoch-user'),ref=doc(db,'properties/epoch-row')
  const metadata={runtimeProtocol:2,runtimeGeneration:1,runtimeNonce:crypto.randomUUID()}
  await assertSucceeds(setDoc(ref,{name:'fictional',...metadata}))
  await assertFails(updateDoc(ref,{name:'old writer omitted metadata'}))
  await assertFails(updateDoc(ref,{name:'replayed nonce',...metadata}))
  await seedDocument('_recovery/access',{...fixtureRuntime,generation:2})
  await assertFails(updateDoc(ref,{name:'old epoch',...metadata,runtimeNonce:crypto.randomUUID()}))
  await assertSucceeds(updateDoc(ref,{name:'current',...metadata,runtimeGeneration:2,runtimeNonce:crypto.randomUUID()}))
  await testEnvironment.withSecurityRulesDisabled(context=>deleteDoc(doc(context.firestore(),'_recovery/access')))
  await assertFails(getDoc(ref))
  await assertFails(updateDoc(ref,{...metadata,runtimeGeneration:2,runtimeNonce:crypto.randomUUID()}))
  await seedDocument('_recovery/access',{...fixtureRuntime,protocol:1})
  await assertFails(getDoc(ref))
  await assertSucceeds(getDoc(doc(testEnvironment.unauthenticatedContext().firestore(),'_recovery/access')))
  await seedDocument('_recovery/privateCheckpoint',{secret:'fictional'})
  await assertFails(getDoc(doc(db,'_recovery/privateCheckpoint')))
})

test('recovery phases fence business writes, retired targets and administrator verification reads', async () => {
  await seedDocument('staffAccounts/recovery-admin',{enabled:true,role:'house_solution_administrator'})
  await seedStaff('recovery-staff')
  await seedDocument('propertyWarranties/recovery-row',{name:'架空復旧物件'})
  const admin=contextFor('recovery-admin'), staff=contextFor('recovery-staff')
  for(const phase of ['recovering','verification','retired']) {
    await seedDocument('_recovery/access',{...fixtureRuntime,phase,generation:2})
    await assertFails(updateDoc(doc(admin,'propertyWarranties/recovery-row'),{name:'禁止された修正'}))
    await assertFails(getDoc(doc(staff,'propertyWarranties/recovery-row')))
    if(phase==='verification') await assertSucceeds(getDoc(doc(admin,'propertyWarranties/recovery-row')))
    else await assertFails(getDoc(doc(admin,'propertyWarranties/recovery-row')))
  }
  await seedDocument('_recovery/access',{databaseId:'source-database',phase:'normal',generation:1})
  await assertFails(getDoc(doc(admin,'propertyWarranties/recovery-row')))
  await assertFails(getDoc(doc(admin,'staffAccounts/recovery-admin')))
  await assertFails(setDoc(doc(admin,'_recovery/access'),{databaseId:'(default)',phase:'normal',generation:3}))
  await seedDocument('_recovery/access',{...fixtureRuntime,generation:3})
  await assertSucceeds(updateDoc(doc(staff,'propertyWarranties/recovery-row'),{name:'架空修正',runtimeProtocol:2,runtimeGeneration:3,runtimeNonce:crypto.randomUUID()}))
})

test('account mutation journals remain private to Admin even for enabled staff and account owners', async () => {
  await seedStaff('lock-admin')
  await seedDocument('constructionCompanyAccounts/lock-company', { enabled: true, constructionCompanyId: 'c' })
  await seedDocument('accountMutationLocks/lock-company', { operationId: 'synthetic-operation', status: 'running' })
  for (const db of [contextFor('lock-admin'), contextFor('lock-company'), testEnvironment.unauthenticatedContext().firestore()]) {
    const ref = doc(db, 'accountMutationLocks/lock-company')
    await assertFails(getDoc(ref))
    await assertFails(setDoc(ref, { operationId: 'replacement' }))
    await assertFails(deleteDoc(ref))
  }
})

test('property warranty Rules enforce company and branch read scope, with trusted company writes', async () => {
  await seedDocument('constructionCompanyAccounts/prototype-head', {constructionCompanyId:'co-a',scope:'company',branchId:'',enabled:true})
  await seedDocument('constructionCompanyAccounts/prototype-branch', {constructionCompanyId:'co-a',scope:'branch',branchId:'branch-a',enabled:true})
  await seedDocument('propertyWarranties/prototype-a', {constructionCompanyId:'co-a',branchId:'branch-a'})
  await seedDocument('propertyWarranties/prototype-b', {constructionCompanyId:'co-a',branchId:'branch-b'})
  await seedDocument('propertyWarranties/prototype-other', {constructionCompanyId:'co-b',branchId:'branch-a'})
  const head=contextFor('prototype-head'), branch=contextFor('prototype-branch')
  await assertSucceeds(getDoc(doc(head,'propertyWarranties/prototype-b')))
  await assertFails(getDoc(doc(head,'propertyWarranties/prototype-other')))
  await assertSucceeds(getDoc(doc(branch,'propertyWarranties/prototype-a')))
  await assertFails(getDoc(doc(branch,'propertyWarranties/prototype-b')))
  await assertFails(updateDoc(doc(branch,'propertyWarranties/prototype-a'),{branchId:'branch-b'}))
  await assertFails(getDoc(doc(branch,'warrantyCounters/HSC')))
})

async function seedDocument(path, data) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data)
  })
}

async function seedStaff(uid, enabled = true) {
  await seedDocument(`staffAccounts/${uid}`, {
    email: `${uid}@example.invalid`,
    displayName: `Synthetic ${uid}`,
    role: 'general_staff',
    enabled,
  })
}

async function seedCompanyAccount(uid, constructionCompanyId, enabled = true) {
  await seedDocument(`constructionCompanyAccounts/${uid}`, {
    constructionCompanyId,
    companyName: `Synthetic ${constructionCompanyId}`,
    email: `${uid}@example.invalid`,
    role: 'construction_company',
    enabled,
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  })
}

before(async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: LOCAL_RUNTIME.host,
      port: LOCAL_RUNTIME.firestorePort,
      rules,
    },
  })
})

beforeEach(async () => {
  await testEnvironment.clearFirestore()
  await seedDocument('_recovery/access',fixtureRuntime)
})

after(async () => {
  await testEnvironment?.cleanup()
})

describe('staff authentication and enabled-account boundary', () => {
  test('unauthenticated, Authentication-only, and disabled accounts cannot access business data', async () => {
    await seedStaff('disabled-user', false)
    const contexts = [
      testEnvironment.unauthenticatedContext().firestore(),
      contextFor('auth-only'),
      contextFor('disabled-user'),
    ]

    for (const db of contexts) {
      await assertFails(getDoc(doc(db, 'properties', 'property-1')))
      await assertFails(setDoc(doc(db, 'properties', 'property-1'), { any: 'shape' }))
    }
  })

  test('enabled staff can create, read and update declared business data with fresh epoch metadata; direct deletes denied', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')
    const paths = [
      'branches/branch-1',
      'constructionCompanies/company-1',
      'homeowners/homeowner-1',
      'properties/property-1',
      'warrantyServices/service-1',
      'cases/case-1',
      'cases/case-1/appliedWarranties/warranty-1',
    ]

    for (const path of paths) {
      const reference = doc(db, path)
      await assertSucceeds(setDoc(reference, { deliberatelyUnsupportedShape: true, runtimeProtocol:2,runtimeGeneration:1,runtimeNonce:crypto.randomUUID() }))
      await assertSucceeds(getDoc(reference))
      await assertSucceeds(updateDoc(reference, { changedOutsideApplicationFlow: true, runtimeProtocol:2,runtimeGeneration:1,runtimeNonce:crypto.randomUUID() }))
      await assertFails(deleteDoc(reference))
    }
  })

  test('enabled staff can read only their own staff record and cannot write account records', async () => {
    await seedStaff('enabled-user')
    await seedStaff('other-user')
    const db = contextFor('enabled-user')

    await assertSucceeds(getDoc(doc(db, 'staffAccounts', 'enabled-user')))
    await assertFails(getDoc(doc(db, 'staffAccounts', 'other-user')))
    await assertFails(updateDoc(doc(db, 'staffAccounts', 'enabled-user'), { displayName: 'Changed' }))
    await assertFails(setDoc(doc(db, 'staffAccounts', 'new-user'), { enabled: true }))
  })

  test('enabled staff can run the applied-warranty collection-group query', async () => {
    await seedStaff('enabled-user')
    await seedDocument('cases/case-1/appliedWarranties/warranty-1', {
      warrantyServiceId: 'service-1',
      status: 'active',
    })
    const db = contextFor('enabled-user')

    const result = await assertSucceeds(getDocs(query(
      collectionGroup(db, 'appliedWarranties'),
      where('warrantyServiceId', '==', 'service-1'),
    )))
    assert.equal(result.size, 1)
  })
})

describe('construction-company and server-owned boundaries', () => {
  test('legacy work items and server-only receipts deny every client identity', async () => {
    await seedStaff('closure-staff')
    await seedStaff('closure-disabled-staff', false)
    for (const [uid, scope, branchId, enabled] of [
      ['closure-company', 'company', null, true],
      ['closure-branch-a', 'branch', 'branch-a', true],
      ['closure-branch-b', 'branch', 'branch-b', true],
      ['closure-disabled', 'branch', 'branch-a', false],
      ['closure-unscoped', undefined, undefined, true],
    ]) {
      await seedCompanyAccount(uid, 'company-1', enabled)
      if (scope) await testEnvironment.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'constructionCompanyAccounts', uid), { scope, branchId }))
    }
    await seedCompanyAccount('closure-other-company', 'company-2')
    const ids = ['closure-staff', 'closure-disabled-staff', 'closure-company', 'closure-branch-a', 'closure-branch-b', 'closure-disabled', 'closure-unscoped', 'closure-other-company', 'closure-missing']
    const databases = [...ids.map(contextFor), testEnvironment.unauthenticatedContext().firestore()]
    for (const name of ['constructionCompanyCaseWorkItems', 'accountCreationOperations', 'masterOperationReceipts']) {
      await seedDocument(`${name}/closed-row`, { constructionCompanyId: 'company-1', branchId: 'branch-a', status: 'submitted' })
      for (const db of databases) {
        const ref = doc(db, name, 'closed-row')
        await assertFails(getDoc(ref))
        await assertFails(getDocs(query(collection(db, name), where('constructionCompanyId', '==', 'company-1'), where('branchId', '==', 'branch-a'))))
        await assertFails(setDoc(doc(db, name, 'new-row'), { constructionCompanyId: 'company-1', branchId: 'branch-a', runtimeProtocol: 2, runtimeGeneration: 1, runtimeNonce: crypto.randomUUID() }))
        await assertFails(updateDoc(ref, { status: 'withdrawn', runtimeProtocol: 2, runtimeGeneration: 1, runtimeNonce: crypto.randomUUID() }))
        await assertFails(deleteDoc(ref))
      }
    }
  })

  test('a company account can read its own profile but no legacy work items', async () => {
    await seedCompanyAccount('company-user', 'company-1')
    await seedCompanyAccount('other-company-user', 'company-2')
    await seedDocument('constructionCompanyCaseWorkItems/case-1', { constructionCompanyId: 'company-1' })
    await seedDocument('constructionCompanyCaseWorkItems/case-2', { constructionCompanyId: 'company-2' })
    const db = contextFor('company-user')

    await assertSucceeds(getDoc(doc(db, 'constructionCompanyAccounts', 'company-user')))
    await assertFails(getDoc(doc(db, 'constructionCompanyAccounts', 'other-company-user')))
    await assertFails(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1')))
    await assertFails(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-2')))
    await assertFails(getDoc(doc(db, 'cases', 'case-1')))
    await assertFails(getDoc(doc(db, 'constructionCompanies', 'company-1')))
  })

  test('disabled company accounts lose access and company writes remain Callable-only', async () => {
    await seedCompanyAccount('company-user', 'company-1', false)
    await seedDocument('constructionCompanyCaseWorkItems/case-1', { constructionCompanyId: 'company-1' })
    const db = contextFor('company-user')

    await assertFails(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1')))
    await assertFails(updateDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1'), { status: 'submitted' }))
    await assertFails(updateDoc(doc(db, 'constructionCompanyAccounts', 'company-user'), { enabled: true }))
  })

  test('enabled staff retain account reads but legacy review access and server-owned writes remain denied', async () => {
    await seedStaff('enabled-user')
    await seedCompanyAccount('company-user', 'company-1')
    await seedDocument('constructionCompanyAccountBindings/company-1', { uid: 'company-user' })
    await seedDocument('constructionCompanyCaseWorkItems/case-1', { constructionCompanyId: 'company-1' })
    await seedDocument('systemCounters/caseNumber', { nextValue: 2, lastCaseId: 'case-1' })
    await seedDocument('caseNumberReservations/000001', { caseId: 'case-1' })
    const db = contextFor('enabled-user')

    await assertSucceeds(getDoc(doc(db, 'constructionCompanyAccounts', 'company-user')))
    await assertFails(getDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1')))
    await assertSucceeds(getDoc(doc(db, 'systemCounters', 'caseNumber')))
    await assertSucceeds(getDoc(doc(db, 'caseNumberReservations', '000001')))
    await assertFails(getDoc(doc(db, 'constructionCompanyAccountBindings', 'company-1')))
    await assertFails(updateDoc(doc(db, 'constructionCompanyCaseWorkItems', 'case-1'), { status: 'approved' }))
    await assertFails(setDoc(doc(db, 'notificationOutbox', 'notification-1'), { status: 'queued' }))
    await assertFails(updateDoc(doc(db, 'systemCounters', 'caseNumber'), { nextValue: 3 }))
    await assertFails(updateDoc(doc(db, 'caseNumberReservations', '000001'), { caseId: 'case-2' }))
  })

  test('unknown collections remain denied', async () => {
    await seedStaff('enabled-user')
    const db = contextFor('enabled-user')

    await assertFails(getDoc(doc(db, 'unknownCollection', 'unknown')))
    await assertFails(setDoc(doc(db, 'unknownCollection', 'unknown'), { value: true }))
  })
})
