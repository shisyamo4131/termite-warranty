import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mutateAccount } from '../functions/account-mutation.js'
import { updateStaffAccountOperation, setStaffAccountEnabledOperation } from '../functions/staff-account-management.js'
import { setConstructionCompanyAccountEnabledOperation } from '../functions/company-portal.js'
import { propertyPrototypeOperation } from '../functions/property-warranty.js'
import { inspectAccountMutation, recoverAccountMutation } from '../functions/account-mutation-recovery.js'

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
function fixture() {
  const data = new Map([
    ['staffAccounts/admin', { enabled: true, role: 'house_solution_administrator' }],
    ['staffAccounts/u', { enabled: true, role: 'general_staff', email: 'before@example.invalid', displayName: 'Before' }],
    ['staffAccounts/v', { enabled: true, role: 'general_staff', email: 'v@example.invalid', displayName: 'V' }],
    ['constructionCompanyAccounts/c', { enabled: true, role: 'construction_company' }],
  ])
  const users = new Map(['u', 'v', 'c'].map(uid => [uid, { email: `${uid === 'u' ? 'before' : uid}@example.invalid`, displayName: uid === 'u' ? 'Before' : uid, disabled: false }]))
  const snapshot = ref => ({ exists: data.has(ref.path), data: () => data.get(ref.path) ? { ...data.get(ref.path) } : undefined })
  const db = { data, hook: null, doc: path => ({ path, get: async () => snapshot({ path }) }) }
  let tail = Promise.resolve()
  db.runTransaction = async fn => {
    const previous = tail; const gate = deferred(); tail = gate.promise
    await previous
    const writes = []
    const tx = {
      get: async ref => snapshot(ref),
      create: (ref, value) => writes.push(() => { assert.equal(data.has(ref.path), false); data.set(ref.path, { ...value }) }),
      update: (ref, value) => writes.push(() => { assert.equal(data.has(ref.path), true); data.set(ref.path, { ...data.get(ref.path), ...value }) }),
      delete: ref => writes.push(() => data.delete(ref.path)),
    }
    try {
      const result = await fn(tx)
      const isFinal = writes.length === 2 && writes.some(w => String(w).includes('data.delete'))
      if (db.hook) await db.hook({ phase: 'before', isFinal })
      writes.forEach(write => write())
      if (db.hook) await db.hook({ phase: 'after', isFinal })
      return result
    } finally { gate.resolve() }
  }
  const auth = { hook: null, getUser: async uid => ({ ...users.get(uid) }), updateUser: async (uid, patch) => { if (auth.hook) await auth.hook(uid, patch); users.set(uid, { ...users.get(uid), ...patch }); return users.get(uid) }, revokeRefreshTokens: async () => {}, users }
  return { db, auth }
}
const profile = (auth, db, uid = 'u', name = 'After') => updateStaffAccountOperation(auth, db, { uid, email: `${name.toLowerCase()}@example.invalid`, displayName: name }, 'admin')

test('same UID profile/state overlap is rejected while a different UID progresses', async () => {
  const { db, auth } = fixture(), entered = deferred(), resume = deferred()
  auth.hook = async uid => { if (uid === 'u') { entered.resolve(); await resume.promise } }
  const first = profile(auth, db)
  await entered.promise
  await assert.rejects(profile(auth, db, 'u', 'Other'), { code: 'aborted' })
  await assert.rejects(setStaffAccountEnabledOperation(auth, db, { uid: 'u', enabled: false }, 'admin'), { code: 'aborted' })
  await profile(auth, db, 'v', 'Independent')
  resume.resolve(); await first
  assert.equal(auth.users.get('u').email, db.data.get('staffAccounts/u').email)
  assert.equal(db.data.has('accountMutationLocks/u'), false)
})
test('company account enable paths share the same UID lock and stop immediately', async () => {
  const { db, auth } = fixture(), entered = deferred(), resume = deferred()
  auth.hook = async () => { entered.resolve(); await resume.promise }
  const first = setConstructionCompanyAccountEnabledOperation(auth, db, { uid: 'c', enabled: false }, 'admin')
  await entered.promise
  assert.equal(db.data.get('constructionCompanyAccounts/c').enabled, false)
  await assert.rejects(propertyPrototypeOperation(auth, db, { action: 'setAccountEnabled', uid: 'c', enabled: true }, 'admin'), { code: 'aborted' })
  resume.resolve(); await first
  assert.equal(auth.users.get('c').disabled, true)
})
test('transaction failure compensates profile but a lost successful commit response does not undo it', async () => {
  for (const phase of ['before', 'after']) {
    const { db, auth } = fixture(); let once = true
    db.hook = event => { if (event.isFinal && event.phase === phase && once) { once = false; throw new Error('transport failure') } }
    if (phase === 'before') await assert.rejects(profile(auth, db), { code: 'internal' })
    else await profile(auth, db)
    assert.equal(auth.users.get('u').email, db.data.get('staffAccounts/u').email)
    assert.equal(auth.users.get('u').email, `${phase === 'before' ? 'before' : 'after'}@example.invalid`)
    assert.equal(db.data.has('accountMutationLocks/u'), false)
  }
})
test('failed enable returns to disabled and unknown Auth/revoke outcomes retain recovery locks', async () => {
  const { db, auth } = fixture(); let once = true
  db.hook = e => { if (e.isFinal && e.phase === 'before' && once) { once = false; throw new Error('uncommitted') } }
  await assert.rejects(setStaffAccountEnabledOperation(auth, db, { uid: 'u', enabled: true }, 'admin'), { code: 'internal' })
  assert.equal(db.data.get('staffAccounts/u').enabled, false)
  assert.equal(auth.users.get('u').disabled, true)
  assert.equal(db.data.has('accountMutationLocks/u'), false)
  auth.hook = async () => { throw new Error('unknown network outcome') }
  await assert.rejects(profile(auth, db), { code: 'failed-precondition' })
  assert.equal(db.data.get('accountMutationLocks/u').status, 'recovery_required')
  await assert.rejects(profile(auth, db), { code: 'aborted' })
})
test('compensation failure and revoke failure retain locks without re-enabling', async () => {
  const { db, auth } = fixture(); let mutations = 0
  db.hook = e => { if (e.isFinal && e.phase === 'before') throw new Error('save failed') }
  auth.hook = async () => { if (++mutations > 1) throw new Error('compensation failed') }
  await assert.rejects(profile(auth, db), { code: 'failed-precondition' })
  assert.equal(db.data.get('accountMutationLocks/u').status, 'recovery_required')
  const next = fixture(); next.auth.revokeRefreshTokens = async () => { throw new Error('revoke failed') }
  await assert.rejects(setStaffAccountEnabledOperation(next.auth, next.db, { uid: 'u', enabled: false }, 'admin'), { code: 'failed-precondition' })
  assert.equal(next.db.data.get('staffAccounts/u').enabled, false)
  assert.equal(next.auth.users.get('u').disabled, true)
  assert.equal(next.db.data.get('accountMutationLocks/u').status, 'recovery_required')
})
test('current actor and target role are checked inside acquisition, without Auth mutation', async () => {
  const { db, auth } = fixture(); db.data.get('staffAccounts/admin').enabled = false
  auth.hook = () => assert.fail('Auth must not be mutated')
  await assert.rejects(profile(auth, db), { code: 'permission-denied' })
  assert.equal(db.data.has('accountMutationLocks/u'), false)
  db.data.get('staffAccounts/admin').enabled = true
  db.data.get('staffAccounts/u').role = 'house_solution_administrator'
  await assert.rejects(profile(auth, db), { code: 'not-found' })
})

test('definitive duplicate-email rejection releases a verified consistent lock and permits correction', async () => {
  const { db, auth } = fixture()
  auth.hook = () => { throw Object.assign(new Error('Duplicate synthetic email'), { code: 'auth/email-already-exists' }) }
  await assert.rejects(profile(auth, db), { code: 'already-exists' })
  assert.equal(db.data.has('accountMutationLocks/u'), false)
  auth.hook = null; await profile(auth, db)
  assert.equal(auth.users.get('u').email, 'after@example.invalid')
})
test('compensation cannot unlock a previously inconsistent profile', async () => {
  const { db, auth } = fixture()
  db.data.get('staffAccounts/u').email = 'different@example.invalid'
  db.hook = e => { if (e.isFinal && e.phase === 'before') throw new Error('Uncommitted') }
  await assert.rejects(profile(auth, db), { code: 'failed-precondition' })
  assert.equal(db.data.get('accountMutationLocks/u').status, 'recovery_required')
})
test('lost acquisition response never begins Auth mutation and an old lock is never stolen', async () => {
  const { db, auth } = fixture(); let once = true
  auth.hook = () => assert.fail('No Auth mutation after uncertain acquisition')
  db.hook = e => { if (e.phase === 'after' && once) { once = false; throw new Error('Lost acquisition response') } }
  await assert.rejects(profile(auth, db), { code: 'internal' })
  const operationId = db.data.get('accountMutationLocks/u').operationId
  db.data.get('accountMutationLocks/u').createdAt = 0
  await assert.rejects(profile(auth, db), { code: 'aborted' })
  assert.equal(db.data.get('accountMutationLocks/u').operationId, operationId)
})
test('recovery inspection is read-only; apply requires expected operation and worker shutdown', async () => {
  const { db, auth } = fixture()
  db.data.set('accountMutationLocks/u', { operationId: 'expected', targetPath: 'staffAccounts/u', kind: 'profile', status: 'recovery_required' })
  auth.users.get('u').email = 'interrupted@example.invalid'
  assert.equal((await inspectAccountMutation(auth, db, 'u')).profileMatches, false)
  assert.equal(auth.users.get('u').email, 'interrupted@example.invalid')
  await assert.rejects(recoverAccountMutation(auth, db, { uid: 'u', expectedOperationId: 'expected', workerStopped: false }), /quiescence/)
  await assert.rejects(recoverAccountMutation(auth, db, { uid: 'u', expectedOperationId: 'wrong', workerStopped: true }), /differs/)
  await recoverAccountMutation(auth, db, { uid: 'u', expectedOperationId: 'expected', workerStopped: true })
  assert.equal(auth.users.get('u').email, 'before@example.invalid')
  assert.equal(db.data.has('accountMutationLocks/u'), false)
  db.data.set('accountMutationLocks/u', { operationId: 'disable', targetPath: 'staffAccounts/u', kind: 'enabled', status: 'recovery_required' })
  db.data.get('staffAccounts/u').enabled = false
  auth.revokeRefreshTokens = () => { throw new Error('Revoke failure') }
  await assert.rejects(recoverAccountMutation(auth, db, { uid: 'u', expectedOperationId: 'disable', workerStopped: true }), /Revoke failure/)
  assert.equal(db.data.has('accountMutationLocks/u'), true)
  assert.equal(auth.users.get('u').disabled, true)
})

test('recovery claims exclusive ownership before Auth, prevents overlap and requires quiescence to replace abandoned recovery', async () => {
  const { db, auth } = fixture(), entered = deferred(), resume = deferred()
  db.data.set('accountMutationLocks/u', { operationId: 'expected', targetPath: 'staffAccounts/u', kind: 'profile', status: 'recovery_required' })
  let updates = 0
  auth.hook = async () => { updates++; entered.resolve(); await resume.promise }
  const first = recoverAccountMutation(auth, db, { uid: 'u', expectedOperationId: 'expected', workerStopped: true })
  await entered.promise
  await assert.rejects(recoverAccountMutation(auth, db, { uid: 'u', expectedOperationId: 'expected', workerStopped: true }), /Another recovery/)
  assert.equal(updates, 1)
  resume.resolve(); await first
  auth.hook = null; await profile(auth, db)
  assert.equal(auth.users.get('u').email, db.data.get('staffAccounts/u').email)
  db.data.set('accountMutationLocks/u', { operationId: 'abandoned', targetPath: 'staffAccounts/u', kind: 'profile', status: 'recovery_running', recoveryOwner: 'old-recovery' })
  await assert.rejects(recoverAccountMutation(auth, db, { uid: 'u', expectedOperationId: 'abandoned', workerStopped: true, expectedRecoveryOwner: 'old-recovery' }), /Another recovery/)
  await recoverAccountMutation(auth, db, { uid: 'u', expectedOperationId: 'abandoned', workerStopped: true, expectedRecoveryOwner: 'old-recovery', recoveryWorkerStopped: true })
  assert.equal(db.data.has('accountMutationLocks/u'), false)
})
