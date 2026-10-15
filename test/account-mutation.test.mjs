import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mutateAccount } from '../functions/account-mutation.js'
import { createStaffAccountOperation, updateStaffAccountOperation, setStaffAccountEnabledOperation } from '../functions/staff-account-management.js'
import { setConstructionCompanyAccountEnabledOperation } from '../functions/company-portal.js'
import { propertyPrototypeOperation } from '../functions/property-warranty.js'
import { inspectAccountMutation, recoverAccountMutation } from '../functions/account-mutation-recovery.js'
import { randomUUID } from 'node:crypto'

function creationFixture() {
  const data = new Map([['staffAccounts/admin', { enabled: true, role: 'house_solution_administrator' }]])
  const users = new Map(), calls = []
  const snapshot = path => ({ exists: data.has(path), data: () => data.has(path) ? { ...data.get(path) } : undefined })
  const db = { data, hook: null, doc: path => ({ path, get: async () => snapshot(path) }) }
  let tail = Promise.resolve()
  db.runTransaction = async fn => {
    const previous = tail; let release; tail = new Promise(resolve => { release = resolve }); await previous
    const writes = []
    const tx = {
      get: async ref => snapshot(ref.path),
      create: (ref, value) => writes.push({ kind: 'create', path: ref.path, value }),
      update: (ref, value) => writes.push({ kind: 'update', path: ref.path, value }),
      delete: ref => writes.push({ kind: 'delete', path: ref.path }),
    }
    try {
      const result = await fn(tx)
      const stage = writes.some(w => w.value?.status === 'completed') ? 'complete' : writes.some(w => w.path.startsWith('staffAccounts/') && w.kind === 'create') ? 'profile' : writes.some(w => w.path.startsWith('accountCreationOperations/') && w.kind === 'create') ? 'acquire' : 'other'
      await db.hook?.({ phase: 'before', stage })
      for (const w of writes) {
        if (w.kind === 'create') assert.equal(data.has(w.path), false)
        if (w.kind === 'update') assert.equal(data.has(w.path), true)
      }
      for (const w of writes) {
        if (w.kind === 'delete') data.delete(w.path)
        else data.set(w.path, { ...(w.kind === 'update' ? data.get(w.path) : {}), ...w.value })
      }
      await db.hook?.({ phase: 'after', stage })
      return result
    } finally { release() }
  }
  const auth = {
    users, calls, hook: null,
    async createUser(value) {
      calls.push(['create', value.uid]); await auth.hook?.('create-before', value.uid)
      if ([...users.values()].some(u => u.email === value.email)) throw Object.assign(new Error('duplicate'), { code: 'auth/email-already-exists' })
      if (users.has(value.uid)) throw Object.assign(new Error('uid collision'), { code: 'auth/uid-already-exists' })
      users.set(value.uid, { ...value }); await auth.hook?.('create-after', value.uid)
      return { ...value }
    },
    async getUser(uid) { if (!users.has(uid)) throw Object.assign(new Error('missing'), { code: 'auth/user-not-found' }); return { ...users.get(uid) } },
    async updateUser(uid, value) { calls.push(['update', uid, value]); await auth.hook?.('update-before', uid, value); if (!users.has(uid)) throw Error('missing'); users.set(uid, { ...users.get(uid), ...value }); await auth.hook?.('update-after', uid, value); return { ...users.get(uid) } },
    async revokeRefreshTokens(uid) { calls.push(['revoke', uid]); await auth.hook?.('revoke', uid) },
    async deleteUser() { assert.fail('Creation must never delete Auth') },
  }
  const input = { requestId: randomUUID(), email: 'new@example.invalid', displayName: 'New' }
  const create = (payload = input) => createStaffAccountOperation(auth, db, payload, 'admin')
  const operation = () => [...data].find(([path]) => path.startsWith('accountCreationOperations/'))?.[1]
  return { db, auth, input, create, operation }
}

test('creation uses disabled Auth/profile until final commit, and durable replay survives later profile edits', async () => {
  const f = creationFixture()
  f.db.hook = ({ phase, stage }) => {
    if (phase === 'after' && stage === 'profile') {
      const op = f.operation(); assert.equal(f.auth.users.get(op.uid).disabled, true)
      assert.equal(f.db.data.get(op.targetPath).enabled, false)
    }
  }
  const created = await f.create()
  assert.equal(created.enabled, true)
  assert.equal(f.auth.users.get(created.uid).disabled, false)
  assert.equal(f.db.data.has(`accountMutationLocks/${created.uid}`), false)
  f.db.data.get(`staffAccounts/${created.uid}`).displayName = 'Later edit'
  const replay = await f.create()
  assert.equal(replay.uid, created.uid); assert.equal(replay.replayed, true)
  assert.equal(f.auth.calls.filter(([kind]) => kind === 'create').length, 1)
  await assert.rejects(f.create({ ...f.input, displayName: 'Other' }), { code: 'failed-precondition' })
})

test('lost creation/profile/final responses retain closed evidence or recognize committed completion', async () => {
  for (const stage of ['acquire', 'profile', 'complete']) {
    for (const phase of ['before', 'after']) {
      const f = creationFixture(); let once = true
      f.db.hook = event => { if (once && event.stage === stage && event.phase === phase) { once = false; throw Error('lost response') } }
      if (stage === 'complete' && phase === 'after') {
        const created = await f.create(); assert.equal(f.auth.users.get(created.uid).disabled, false)
      } else {
        await assert.rejects(f.create())
        if (stage === 'acquire') assert.equal(f.auth.calls.length, 0)
        else {
          const op = f.operation()
          assert.equal(f.db.data.get(`accountMutationLocks/${op.uid}`).status, 'recovery_required')
          assert.notEqual(f.db.data.get(op.targetPath)?.enabled, true)
          assert.equal(f.auth.users.get(op.uid).disabled, true)
        }
      }
    }
  }
})

test('Auth create acknowledgement loss is recoverable to disabled with the preallocated UID', async () => {
  const f = creationFixture(); let once = true
  f.auth.hook = phase => { if (phase === 'create-after' && once) { once = false; throw Error('lost Auth reply') } }
  await assert.rejects(f.create(), { code: 'failed-precondition' })
  const op = f.operation()
  assert.equal(f.auth.users.get(op.uid).disabled, true)
  await assert.rejects(recoverAccountMutation(f.auth, f.db, { uid: op.uid, expectedOperationId: op.operationId, workerStopped: false }))
  await recoverAccountMutation(f.auth, f.db, { uid: op.uid, expectedOperationId: op.operationId, workerStopped: true })
  assert.equal(f.db.data.get(op.targetPath).enabled, false)
  assert.equal(f.db.data.get(op.targetPath).creationPending, false)
  assert.equal(f.operation().status, 'recovered_disabled')
  assert.equal(f.db.data.has(`accountMutationLocks/${op.uid}`), false)
})

test('missing Auth is inspectable and recovery never implicitly creates it', async () => {
  const f = creationFixture(); f.auth.hook = phase => { if (phase === 'create-before') throw Error('offline') }
  await assert.rejects(f.create())
  const op = f.operation(), inspection = await inspectAccountMutation(f.auth, f.db, op.uid)
  assert.equal(inspection.authExists, false)
  await assert.rejects(recoverAccountMutation(f.auth, f.db, { uid: op.uid, expectedOperationId: op.operationId, workerStopped: true }))
  assert.equal(f.auth.calls.filter(([kind]) => kind === 'create').length, 1)
  assert.equal(f.db.data.has(`accountMutationLocks/${op.uid}`), true)
})

test('same email conflict never mutates another UID, rejected input can use a fresh request', async () => {
  const f = creationFixture(); f.auth.users.set('existing', { email: f.input.email, displayName: 'Existing', disabled: false })
  await assert.rejects(f.create(), { code: 'already-exists' })
  assert.deepEqual(f.auth.users.get('existing'), { email: f.input.email, displayName: 'Existing', disabled: false })
  assert.equal(f.auth.calls.length, 1)
  assert.equal(f.operation().status, 'rejected')
  const created = await f.create({ ...f.input, requestId: randomUUID(), email: 'corrected@example.invalid' })
  assert.equal(created.enabled, true)
})

test('live actor disable before final transaction prevents exposure and retains recovery evidence', async () => {
  const f = creationFixture()
  f.auth.hook = (phase, uid, value) => { if (phase === 'update-after' && value.disabled === false) f.db.data.get('staffAccounts/admin').enabled = false }
  await assert.rejects(f.create(), { code: 'failed-precondition' })
  const op = f.operation()
  assert.equal(f.db.data.get(op.targetPath).enabled, false)
  assert.equal(f.auth.users.get(op.uid).disabled, true)
})

test('failed creation compensation retains lock; creation recovery ownership prevents overlap', async () => {
  const f = creationFixture(); let once = true
  f.db.hook = e => { if (once && e.stage === 'complete' && e.phase === 'before') { once = false; throw Error('failed commit') } }
  f.auth.hook = (phase, uid, value) => { if (phase === 'update-before' && value.disabled === true) throw Error('disable failed') }
  await assert.rejects(f.create())
  const op = f.operation(); assert.equal(f.db.data.get(op.targetPath).enabled, false)
  const options = { uid: op.uid, expectedOperationId: op.operationId, workerStopped: true }
  await assert.rejects(recoverAccountMutation(f.auth, f.db, options))
  const owner = f.db.data.get(`accountMutationLocks/${op.uid}`).recoveryOwner
  f.auth.hook = null
  await assert.rejects(recoverAccountMutation(f.auth, f.db, options))
  await recoverAccountMutation(f.auth, f.db, { ...options, expectedRecoveryOwner: owner, recoveryWorkerStopped: true })
  assert.equal(f.auth.users.get(op.uid).disabled, true)
})

test('simultaneous same-request retry never starts a second Auth worker', async () => {
  const f = creationFixture(), entered = deferred(), resume = deferred()
  f.auth.hook = async phase => { if (phase === 'create-before') { entered.resolve(); await resume.promise } }
  const first = f.create(); await entered.promise
  await assert.rejects(f.create(), { code: 'failed-precondition' })
  resume.resolve(); const created = await first
  assert.equal(f.auth.calls.filter(([kind]) => kind === 'create').length, 1)
  assert.equal((await f.create()).uid, created.uid)
})

test('definitive Auth input rejection releases only its lock and permits corrected input', async () => {
  for (const code of ['auth/invalid-email', 'auth/invalid-display-name']) {
    const f = creationFixture()
    f.auth.hook = phase => { if (phase === 'create-before') throw Object.assign(new Error('invalid input'), { code }) }
    await assert.rejects(f.create(), { code: 'invalid-argument' })
    const op = f.operation()
    assert.equal(op.status, 'rejected')
    assert.equal(f.db.data.has(`accountMutationLocks/${op.uid}`), false)
    assert.equal(f.auth.users.size, 0)
    f.auth.hook = null
    assert.equal((await f.create({ ...f.input, requestId: randomUUID() })).enabled, true)
  }
})

test('creation requires request identity and enforces actor role again before profile preparation', async () => {
  const f = creationFixture()
  await assert.rejects(f.create({ ...f.input, requestId: undefined }), { code: 'invalid-argument' })
  assert.equal(f.auth.calls.length, 0)
  f.auth.hook = phase => { if (phase === 'create-after') f.db.data.get('staffAccounts/admin').role = 'general_staff' }
  await assert.rejects(f.create(), { code: 'failed-precondition' })
  const op = f.operation()
  assert.equal(f.db.data.has(op.targetPath), false)
  assert.equal(f.auth.users.get(op.uid).disabled, true)
})

test('creation UID lock rejects ordinary enable and profile changes until creation completes', async () => {
  const f = creationFixture(), entered = deferred(), resume = deferred()
  f.auth.hook = async (phase, uid, value) => { if (phase === 'update-before' && value.disabled === false) { entered.resolve(); await resume.promise } }
  const pending = f.create(); await entered.promise
  const uid = f.operation().uid
  await assert.rejects(setStaffAccountEnabledOperation(f.auth, f.db, { uid, enabled: true }, 'admin'), { code: 'aborted' })
  await assert.rejects(updateStaffAccountOperation(f.auth, f.db, { uid, email: 'other@example.invalid', displayName: 'Other' }, 'admin'), { code: 'aborted' })
  resume.resolve(); await pending
})

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

test('disabled profile is rejected before lock or Auth access and becomes editable only after enabling',async()=>{
  const {db,auth}=fixture()
  db.data.get('staffAccounts/u').enabled=false
  auth.users.get('u').disabled=true
  const before={...db.data.get('staffAccounts/u')}
  let authReads=0
  const get=auth.getUser;auth.getUser=async uid=>{authReads++;return get(uid)}
  await assert.rejects(profile(auth,db),{code:'failed-precondition'})
  assert.equal(authReads,0)
  assert.equal(db.data.has('accountMutationLocks/u'),false)
  assert.deepEqual(db.data.get('staffAccounts/u'),before)
  await setStaffAccountEnabledOperation(auth,db,{uid:'u',enabled:true},'admin')
  await profile(auth,db)
  assert.equal(db.data.get('staffAccounts/u').displayName,'After')
})

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
  await setStaffAccountEnabledOperation(auth, db, { uid: 'u', enabled: true }, 'admin')
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
