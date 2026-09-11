import { FieldValue } from 'firebase-admin/firestore'
import {
  MASTER_TYPES,
  parseCreateMasterRequest,
  parseSetMasterActiveRequest,
  parseUpdateMasterRequest,
} from './domain/master-data.mjs'

const COLLECTION_BY_TYPE = Object.freeze({
  [MASTER_TYPES.CONSTRUCTION_COMPANY]: 'constructionCompanies',
  [MASTER_TYPES.HOMEOWNER]: 'homeowners',
  [MASTER_TYPES.WARRANTY_SERVICE]: 'warrantyServices',
  [MASTER_TYPES.PROPERTY]: 'properties',
})

export class MasterOperationError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'MasterOperationError'
    this.code = code
  }
}

const fail = (code, message) => {
  throw new MasterOperationError(code, message)
}

const assertEnabledStaff = async (transaction, firestore, actorUid) => {
  if (typeof actorUid !== 'string' || actorUid.length === 0) fail('permission-denied', '利用可能なスタッフアカウントを確認できません。')
  const snapshot = await transaction.get(firestore.doc(`staffAccounts/${actorUid}`))
  if (!snapshot.exists || snapshot.data()?.enabled !== true) {
    fail('permission-denied', '利用可能なスタッフアカウントを確認できません。')
  }
}

const assertCurrentRevision = (snapshot) => {
  if (!snapshot.exists) fail('not-found', '対象のマスターが見つかりません。')
  const revision = snapshot.data()?.revision
  if (!Number.isSafeInteger(revision) || revision < 1 || revision >= Number.MAX_SAFE_INTEGER) {
    fail('failed-precondition', '対象のマスターのrevisionが不正です。')
  }
  return revision
}

const assertPropertyReferences = async (transaction, firestore, fields, requireActive) => {
  const [homeowner, company] = await Promise.all([
    transaction.get(firestore.doc(`homeowners/${fields.homeownerId}`)),
    transaction.get(firestore.doc(`constructionCompanies/${fields.constructionCompanyId}`)),
  ])
  if (!homeowner.exists || (requireActive && homeowner.data()?.active !== true)) {
    fail('failed-precondition', requireActive ? '有効な施主を選択してください。' : '施主が見つかりません。')
  }
  if (!company.exists || (requireActive && company.data()?.active !== true)) {
    fail('failed-precondition', requireActive ? '有効な工務店を選択してください。' : '工務店が見つかりません。')
  }
}

const requireActorUid = (actorUid) => {
  if (typeof actorUid !== 'string' || actorUid.length === 0) {
    fail('permission-denied', '利用可能なスタッフアカウントを確認できません。')
  }
  return actorUid
}

export async function createMasterTransaction(firestore, rawInput, actorUid) {
  requireActorUid(actorUid)
  const input = parseCreateMasterRequest(rawInput)
  const ref = firestore.collection(COLLECTION_BY_TYPE[input.masterType]).doc()
  await firestore.runTransaction(async (transaction) => {
    await assertEnabledStaff(transaction, firestore, actorUid)
    if (input.masterType === MASTER_TYPES.PROPERTY) {
      await assertPropertyReferences(transaction, firestore, input.fields, true)
    }
    transaction.create(ref, {
      ...input.fields,
      active: true,
      revision: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  return { id: ref.id, revision: 1 }
}

export async function updateMasterTransaction(firestore, rawInput, actorUid) {
  requireActorUid(actorUid)
  const input = parseUpdateMasterRequest(rawInput)
  const ref = firestore.doc(`${COLLECTION_BY_TYPE[input.masterType]}/${input.id}`)
  return firestore.runTransaction(async (transaction) => {
    const [staffSnapshot, masterSnapshot] = await Promise.all([
      transaction.get(firestore.doc(`staffAccounts/${actorUid}`)),
      transaction.get(ref),
    ])
    if (!staffSnapshot.exists || staffSnapshot.data()?.enabled !== true) {
      fail('permission-denied', '利用可能なスタッフアカウントを確認できません。')
    }
    const currentRevision = assertCurrentRevision(masterSnapshot)
    const current = masterSnapshot.data()
    if (input.masterType === MASTER_TYPES.PROPERTY) {
      await assertPropertyReferences(transaction, firestore, input.fields, current.active === true)
    }

    const revision = currentRevision + 1
    transaction.update(ref, {
      ...input.fields,
      revision,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { id: input.id, revision }
  })
}

export async function setMasterActiveTransaction(firestore, rawInput, actorUid) {
  requireActorUid(actorUid)
  const input = parseSetMasterActiveRequest(rawInput)
  const ref = firestore.doc(`${COLLECTION_BY_TYPE[input.masterType]}/${input.id}`)
  return firestore.runTransaction(async (transaction) => {
    const [staffSnapshot, masterSnapshot] = await Promise.all([
      transaction.get(firestore.doc(`staffAccounts/${actorUid}`)),
      transaction.get(ref),
    ])
    if (!staffSnapshot.exists || staffSnapshot.data()?.enabled !== true) {
      fail('permission-denied', '利用可能なスタッフアカウントを確認できません。')
    }
    const currentRevision = assertCurrentRevision(masterSnapshot)
    if (input.masterType === MASTER_TYPES.PROPERTY && input.active) {
      await assertPropertyReferences(transaction, firestore, masterSnapshot.data(), true)
    }
    const revision = currentRevision + 1
    transaction.update(ref, {
      active: input.active,
      revision,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { id: input.id, revision }
  })
}
