import { createHash, randomUUID } from 'node:crypto'
import { FieldPath } from 'firebase-admin/firestore'
import { ACCESS_PATH, ACTIVATION_PATH, RUNTIME_PATH, RecoveryError, databaseId, runtimeState, assertTransition } from '../../src/domain/recovery.mjs'

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const knownCollections = new Set(['staffAccounts','constructionCompanyAccounts','constructionCompanyAccountBindings','accountMutationLocks','constructionCompanies','companyBranches','branches','homeowners','properties','warrantyServices','propertyWarranties','warrantyGroups','warrantyCounters','propertyOperationReceipts','prototypeSettings','cases','caseNumberReservations','systemCounters','constructionCompanyCaseWorkItems','notificationOutbox','_recovery'])
const canonical = value => {
  if (value?.toDate) return { timestamp: value.toDate().toISOString() }
  if (Buffer.isBuffer(value)) return { bytes: value.toString('base64') }
  if (value?.path && value?.firestore) return { reference: value.path }
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}
export async function scanDatabase(db, { maximumDocuments = 100_000, project = (_path, fields) => fields } = {}) {
  const hashes = new Map(), counts = {}, roots = await db.listCollections()
  let visited = 0
  async function visit(collection) {
    let cursor
    do {
      let query = collection.orderBy(FieldPath.documentId()).limit(200)
      if (cursor) query = query.startAfter(cursor)
      const page = await query.get()
      for (const row of page.docs) {
        if (++visited > maximumDocuments) throw new RecoveryError('Verification document budget exceeded.')
        if (!row.ref.path.startsWith('_recovery/')) {
          const fields = project(row.ref.path, row.data())
          if (fields !== undefined) hashes.set(row.ref.path, digest(canonical(fields)))
          counts[collection.id] = (counts[collection.id] ?? 0) + 1
        }
        for (const child of await row.ref.listCollections()) await visit(child)
      }
      cursor = page.size === 200 ? page.docs.at(-1) : null
    } while (cursor)
    // Missing parent documents with subcollections require separate handling.
    // listDocuments includes them; refuse them rather than silently omit data.
    for (const reference of await collection.listDocuments()) {
      if (!hashes.has(reference.path) && !reference.path.startsWith('_recovery/') && !(await reference.get()).exists) {
        if ((await reference.listCollections()).length) throw new RecoveryError('Orphan subcollections require manual verification.')
      }
    }
  }
  for (const root of roots) {
    if (!knownCollections.has(root.id)) throw new RecoveryError('An unknown business collection requires schema verification.')
    await visit(root)
  }
  const entries = [...hashes.entries()].sort(([a], [b]) => a.localeCompare(b))
  return { hash: digest(entries), count: hashes.size, counts }
}
// Exclude only fields this command is permitted to reconcile. All other
// business paths/fields must remain identical across a partial retry.
const reconciliationProjection = (highWater,bindings=false) => (path, fields) => {
  if (/^(staffAccounts|constructionCompanyAccounts)\/[^/]+$/.test(path)) return undefined
  if(bindings&&/^constructionCompanyAccountBindings\/[^/]+$/.test(path))return undefined
  if (/^warrantyCounters\/[^/]+$/.test(path) && Object.hasOwn(highWater, path.split('/')[1])) {
    const { lastValue, updatedAt, ...unchanged } = fields
    return Object.keys(unchanged).length ? unchanged : undefined
  }
  return fields
}
export async function authorizationDigest(db, auth, { details = false } = {}) {
  const records = [], profiles = []
  for (const name of ['staffAccounts', 'constructionCompanyAccounts']) {
    let cursor
    do {
      let query = db.collection(name).orderBy(FieldPath.documentId()).limit(200)
      if (cursor) query = query.startAfter(cursor)
      const page = await query.get()
      for (const row of page.docs) {
        const value = row.data()
        const user = await auth.getUser(row.id)
        if (!['developer_superuser','house_solution_administrator','general_staff','construction_company'].includes(value.role)
          || typeof value.enabled !== 'boolean' || typeof value.email !== 'string' || !value.email.includes('@') || user.disabled !== !value.enabled || user.email?.toLowerCase() !== value.email.toLowerCase()) throw new RecoveryError('Account/Auth reconciliation is required.')
        records.push([name, row.id, value.role, value.enabled, value.email?.toLowerCase(), value.constructionCompanyId ?? '', value.scope ?? '', value.branchId ?? ''])
        profiles.push({ collection: name, uid: row.id, fields: value })
      }
      cursor = page.size === 200 ? page.docs.at(-1) : null
    } while (cursor)
  }
  // Unknown/unprofiled Auth users block recovery acceptance as well.
  const users = []
  let token
  do { const page = await auth.listUsers(1000, token); for (const user of page.users) users.push([user.uid, user.email?.toLowerCase() ?? '', user.disabled, user.providerData.map(p => [p.providerId, p.uid]).sort()]); token = page.pageToken } while (token)
  const profiled = new Set(records.map(row => row[1]))
  if (users.some(row => !profiled.has(row[0])) || records.length !== users.length) throw new RecoveryError('Unprofiled or duplicate accounts require reconciliation.')
  const hash=digest({ records: records.sort(), users: users.sort() })
  return details ? { hash, profiles } : hash
}
export async function numberingHighWater(db) {
  const counters={}
  for(const row of (await db.collection('warrantyCounters').get()).docs){const value=row.data().lastValue;if(!Number.isSafeInteger(value)||value<0)throw new RecoveryError('Current numbering authority requires manual investigation.');counters[row.id]=value}
  return counters
}
export async function inspectBusinessIntegrity(db, highWater = {}) {
  const counters = {}, numbers = new Set()
  for (const row of (await db.collection('warrantyCounters').get()).docs) {
    const value = row.data().lastValue
    if (!Number.isSafeInteger(value) || value < 0 || value < (highWater[row.id] ?? 0)) throw new RecoveryError('Numbering high-water marks require reconciliation; issued numbers must not be reused.')
    counters[row.id] = value
  }
  if (Object.keys(highWater).some(key => !(key in counters))) throw new RecoveryError('A numbering high-water mark is missing.')
  // Verification-only reads; ordinary UI lists remain bounded.
  const companies = new Set((await db.collection('constructionCompanies').get()).docs.map(row => row.id))
  const groups = new Set((await db.collection('warrantyGroups').get()).docs.map(row => row.id))
  const branches = new Map((await db.collection('companyBranches').get()).docs.map(row => [row.id,row.data().constructionCompanyId]))
  for (const row of (await db.collection('staffAccounts').get()).docs) {
    if (!['developer_superuser','house_solution_administrator','general_staff'].includes(row.data().role)) throw new RecoveryError('Restored staff account role requires reconciliation.')
  }
  const accounts = new Map((await db.collection('constructionCompanyAccounts').get()).docs.map(row => [row.id, row.data()]))
  const bindings = new Map((await db.collection('constructionCompanyAccountBindings').get()).docs.map(row => [row.id,row.data().uid]))
  for (const [uid, value] of accounts) {
    const legacy = value.scope === undefined
    if (value.role !== 'construction_company' || !companies.has(value.constructionCompanyId)
      || !legacy && !['company','branch'].includes(value.scope)
      || value.scope === 'branch' && (!value.branchId || branches.get(value.branchId) !== value.constructionCompanyId)
      || value.scope !== 'branch' && !!value.branchId
      || legacy && bindings.get(value.constructionCompanyId) !== uid) throw new RecoveryError('Restored account scope, affiliation or binding requires manual reconciliation.')
  }
  for (const [company, uid] of bindings) {
    const account = accounts.get(uid)
    if (!companies.has(company) || !account || account.constructionCompanyId !== company || account.scope !== undefined) throw new RecoveryError('Restored legacy account binding requires manual reconciliation.')
  }
  let cursor
  do {
    let query = db.collection('propertyWarranties').orderBy(FieldPath.documentId()).limit(200)
    if (cursor) query=query.startAfter(cursor)
    const page = await query.get()
    for (const row of page.docs) {
      const value = row.data()
      if (!['draft','active','cancelled'].includes(value.status) || !companies.has(value.constructionCompanyId)
        || value.branchId && branches.get(value.branchId) !== value.constructionCompanyId || value.warrantyNumber && !groups.has(value.groupId)) throw new RecoveryError('Restored property references or lifecycle require verification.')
      if (value.warrantyNumber) { if (numbers.has(value.warrantyNumber)) throw new RecoveryError('Duplicate warranty numbers.'); numbers.add(value.warrantyNumber) }
    }
    cursor=page.size===200 ? page.docs.at(-1) : null
  } while(cursor)
  // Older case numbering is a separate contract; never infer it from warranty counters.
  if ((await db.collection('cases').limit(1).get()).size || (await db.collection('systemCounters').limit(1).get()).size) throw new RecoveryError('Legacy case numbering requires explicit verification before recovery.')
  return counters
}
export function recoveryController({ database, auth, controlId, revision, now = () => new Date() }) {
  databaseId(controlId)
  if (controlId === '(default)') throw new RecoveryError('Control and business databases must be separate.')
  if (!revision || !/^[a-f0-9]{40}$/.test(revision)) throw new RecoveryError('An inspected implementation revision is required.')
  const control = database(controlId), runtime = control.doc(RUNTIME_PATH)
  const getState = async () => runtimeState((await runtime.get()).data())
  const stateAt = async generation => { const value = await getState(); if (value.generation !== generation || value.controlDatabaseId !== controlId) throw new RecoveryError('Stale or mismatched recovery state.'); return value }
  const operations = async () => (await control.collection('recoveryOperations').limit(1).get()).size
  const marker = async (id, state) => {const raw=(await runtime.get()).data();return database(id).doc(ACCESS_PATH).set({ databaseId:id,phase:state.phase,generation:state.generation,...(id==='(default)'&&raw?.protocol===2?{protocol:2,controlDatabaseId:controlId}:{})})}
  const rejectFixedTransition=async()=>{if((await runtime.get()).data()?.protocol===2)throw new RecoveryError('Fixed default recovery requires its dedicated transition operator.')}
  async function exclusive(generation, id, task) {
    if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) throw new RecoveryError('An operation ID is required.')
    const lock = control.doc('recovery/operatorLock')
    await control.runTransaction(async tx => {
      const current = runtimeState((await tx.get(runtime)).data())
      const prior = await tx.get(lock)
      if (current.generation !== generation || prior.exists) throw new RecoveryError('Stale state or an unfinished operator command exists. Inspect the private operation journal before recovery.')
      tx.create(lock, { operationId: id, generation, startedAt: now() })
    })
    let effectStarted=false
    const effect=async intent=>{effectStarted=true;await lock.set({intent},{merge:true})}
    try { const result = await task(effect); await lock.delete(); return result }
    catch (error) { if(effectStarted)await lock.set({ failed: true }, { merge: true });else await lock.delete();throw error }
  }
  return {
    async status() { const lock=(await control.doc('recovery/operatorLock').get()).data();return { runtime: await getState(), activeOperations: await operations(), operatorBlocked: !!lock, interruptedOperation: lock ? {operationId:lock.operationId,recoveryOwner:lock.recoveryOwner??null,failed:lock.failed===true,kind:lock.intent?.kind??'admission'} : null } },
    async initialize() {
      if ((await runtime.get()).exists || (await database('(default)').doc(ACTIVATION_PATH).get()).exists) throw new RecoveryError('Recovery is already initialized or initialization is incomplete.')
      const state = { phase: 'normal', generation: 1, databaseId: '(default)', controlDatabaseId: controlId }
      // Anchor first: any partial initialization stops Functions instead of falling back.
      await database('(default)').doc(ACTIVATION_PATH).create({ controlDatabaseId: controlId })
      await marker('(default)', state)
      await runtime.create(state)
      return state
    },
    async enter(generation, id) { await rejectFixedTransition(); return exclusive(generation, id, async effect => {
      const state = await stateAt(generation)
      assertTransition(state, 'recovering')
      const next = { ...state, phase: 'recovering', generation: generation + 1 }
      await effect({kind:'enter',prior:state,next})
      await runtime.set(next)
      await marker(state.databaseId, next)
      return { ...next, activeOperations: await operations() }
    }) },
    async baseline(generation, id) { return exclusive(generation, id, async effect => {
      const state = await stateAt(generation)
      if (state.phase !== 'recovering' || await operations()) throw new RecoveryError('Stop business access and drain operations first.')
      const authorization = await authorizationDigest(database(state.databaseId), auth, { details: true })
      if(authorization.profiles.length>1000)throw new RecoveryError('Authorization baseline exceeds this implementation budget; paginated baseline storage is required.')
      if(Buffer.byteLength(JSON.stringify(canonical(authorization.profiles)))>750_000)throw new RecoveryError('Authorization baseline exceeds the private document size budget.')
      const snapshot = await scanDatabase(database(state.databaseId))
      const highWater = await numberingHighWater(database(state.databaseId))
      const bindingRows=(await database(state.databaseId).collection('constructionCompanyAccountBindings').limit(1001).get()).docs
      const bindings=bindingRows.map(row=>({id:row.id,fields:row.data()}))
      if(bindings.length>1000||Buffer.byteLength(JSON.stringify(canonical({bindings,profiles:authorization.profiles,highWater,snapshot})))>750_000)throw new RecoveryError('Combined authority baseline exceeds the private budget.')
      await effect({kind:'baseline',databaseId:state.databaseId})
      await control.doc(`recoveryBaselines/${id}`).create({ databaseId: state.databaseId, generation, authorizationHash: authorization.hash, profiles: authorization.profiles, bindings, snapshot, highWater, revision, createdAt: now() })
      return { baselineId: id, count: snapshot.count }
    }) },
    async quarantine(generation, id, target) { return exclusive(generation, id, async effect => {
      const state = await stateAt(generation)
      databaseId(target)
      if (state.phase !== 'recovering' || await operations() || [controlId, state.databaseId, '(default)'].includes(target)) throw new RecoveryError('A separate target and drained maintenance are required.')
      await effect({kind:'quarantine',target})
      await marker(target, { phase: 'recovering', generation })
      await control.doc(`recoveryTargets/${target}`).set({ status: 'quarantined', generation, operationId: id, revision }, { merge: true })
      return { databaseId: target, status: 'quarantined' }
    }) },
    async reconcile(generation,id,{target,baselineId,snapshotHash}) { return exclusive(generation,id,async effect=>{
      const state=await stateAt(generation), baseline=(await control.doc(`recoveryBaselines/${baselineId}`).get()).data()
      const binding=(await control.doc(`recoveryTargets/${target}`).get()).data(), access=(await database(target).doc(ACCESS_PATH).get()).data()
      if(state.phase!=='recovering'||await operations()||!baseline||baseline.generation!==generation||baseline.revision!==revision
        || binding?.generation!==generation||binding.status!=='quarantined'||!binding.restoreDone||!binding.restoreOperation||!binding.recoveryPoint
        || access?.databaseId!==target||access.phase!=='recovering'||access.generation!==generation||[controlId,state.databaseId,'(default)'].includes(target))throw new RecoveryError('Quarantined, completed restoration and a current baseline are required.')
      if(await authorizationDigest(database(state.databaseId),auth)!==baseline.authorizationHash)throw new RecoveryError('Authorization baseline has changed.')
      const liveBindings=async()=> (await database(state.databaseId).collection('constructionCompanyAccountBindings').orderBy(FieldPath.documentId()).get()).docs.map(row=>({id:row.id,fields:row.data()}))
      const bindingHash=rows=>digest(canonical([...rows].sort((a,b)=>a.id.localeCompare(b.id))))
      const hasBindings=Array.isArray(baseline.bindings)
      if((await runtime.get()).data()?.protocol===2&&!hasBindings)throw new RecoveryError('Fixed recovery requires a current binding baseline.')
      if(hasBindings&&bindingHash(await liveBindings())!==bindingHash(baseline.bindings))throw new RecoveryError('Current account bindings changed after baseline.')
      const receipt=control.doc(`recoveryReconciliations/${id}`)
      const prior=(await receipt.get()).data(),original=prior?.original ?? await scanDatabase(database(target))
      if(original.hash!==snapshotHash||prior&&(prior.target!==target||prior.baselineId!==baselineId||prior.generation!==generation||prior.revision!==revision||prior.restoreOperation!==binding.restoreOperation||prior.recoveryPoint!==binding.recoveryPoint))throw new RecoveryError('Original restored snapshot does not match the inspected hash and reconciliation journal.')
      if (prior?.status === 'complete') {
        if ((await scanDatabase(database(target))).hash !== prior.snapshot.hash) throw new RecoveryError('Completed reconciliation is immutable; target data has changed.')
        await effect({kind:'reconcile',target,reconciliationId:id})
        await control.doc(`recoveryTargets/${target}`).update({reconciliationId:id})
        return { reconciliationId:id, accountChanges:prior.accountChanges, counterChanges:prior.counterChanges, count:prior.snapshot.count }
      }
      const invariant=(await scanDatabase(database(target),{project:reconciliationProjection(baseline.highWater,hasBindings)})).hash
      if(prior && (prior.status!=='applying'||prior.invariant!==invariant))throw new RecoveryError('Non-reconciliation business data changed during the interrupted command.')
      await effect({kind:'reconcile',target,reconciliationId:id})
      if(!prior)await receipt.create({target,baselineId,generation,revision,restoreOperation:binding.restoreOperation,recoveryPoint:binding.recoveryPoint,original,invariant,status:'applying',startedAt:now()})
      let accountChanges=0,counterChanges=0
      // Current account authority is preserved; business records are restored.
      const profiles=new Map(baseline.profiles.map(profile=>[`${profile.collection}/${profile.uid}`,profile.fields]))
      for(const name of ['staffAccounts','constructionCompanyAccounts']) {
        for(const row of (await database(target).collection(name).get()).docs)if(!profiles.has(row.ref.path)){await row.ref.delete();accountChanges++}
      }
      for(const [path,fields] of profiles){const ref=database(target).doc(path),current=await ref.get();if(!current.exists||digest(canonical(current.data()))!==digest(canonical(fields))){await ref.set(fields);accountChanges++}}
      if(hasBindings){
        const expected=new Map(baseline.bindings.map(row=>[row.id,row.fields]))
        for(const row of (await database(target).collection('constructionCompanyAccountBindings').get()).docs)if(!expected.has(row.id)){await row.ref.delete();accountChanges++}
        for(const [key,fields] of expected){const ref=database(target).doc(`constructionCompanyAccountBindings/${key}`),current=await ref.get();if(!current.exists||digest(canonical(current.data()))!==digest(canonical(fields))){await ref.set(fields);accountChanges++}}
      }
      for(const [key,highWater] of Object.entries(baseline.highWater)){const ref=database(target).doc(`warrantyCounters/${key}`), current=(await ref.get()).data();if((current?.lastValue??-1)<highWater){await ref.set({lastValue:highWater,updatedAt:now()},{merge:true});counterChanges++}}
      const snapshot=await scanDatabase(database(target))
      if((await scanDatabase(database(target),{project:reconciliationProjection(baseline.highWater,hasBindings)})).hash!==invariant)throw new RecoveryError('Non-reconciliation business data changed while applying the command.')
      if(hasBindings&&bindingHash(await liveBindings())!==bindingHash(baseline.bindings))throw new RecoveryError('Current account bindings changed during reconciliation.')
      await receipt.update({status:'complete',snapshot,accountChanges,counterChanges,completedAt:now()})
      await control.doc(`recoveryTargets/${target}`).update({reconciliationId:id})
      return {reconciliationId:id,accountChanges,counterChanges,count:snapshot.count}
    }) },
    async verify(generation, id, { target, baselineId, restoreOperation, recoveryPoint, snapshotHash, approval }) { return exclusive(generation, id, async effect => {
      const state = await stateAt(generation), baseline = (await control.doc(`recoveryBaselines/${baselineId}`).get()).data()
      const targetMarker = (await database(target).doc(ACCESS_PATH).get()).data()
      databaseId(target)
      if ([controlId, state.databaseId, '(default)'].includes(target)) throw new RecoveryError('A separate restore target is required.')
      const binding=(await control.doc(`recoveryTargets/${target}`).get()).data()
      const reconciliation=binding?.reconciliationId ? (await control.doc(`recoveryReconciliations/${binding.reconciliationId}`).get()).data() : null
      if (state.phase !== 'recovering' || await operations() || !baseline || baseline.generation !== generation || baseline.revision !== revision
        || targetMarker?.phase !== 'recovering' || targetMarker?.databaseId !== target || targetMarker?.generation !== generation
        || !restoreOperation || !recoveryPoint || !approval || binding.approval!==approval || !/^[a-f0-9]{64}$/.test(snapshotHash ?? '')
        || reconciliation?.status!=='complete'||reconciliation.target!==target||reconciliation.baselineId!==baselineId||reconciliation.generation!==generation
        || reconciliation.revision!==revision||reconciliation.original.hash!==snapshotHash||reconciliation.restoreOperation!==restoreOperation||reconciliation.recoveryPoint!==recoveryPoint) throw new RecoveryError('Quarantine, controlled reconciliation and original recovery-point evidence are required.')
      const authorizationHash = await authorizationDigest(database(target), auth)
      if (authorizationHash !== baseline.authorizationHash) throw new RecoveryError('Restored roles/scopes differ from the current authorization baseline. Reconcile before verification.')
      // Also detect external Auth changes after the baseline.
      if (await authorizationDigest(database(state.databaseId), auth) !== baseline.authorizationHash) throw new RecoveryError('The current authorization baseline has changed.')
      const snapshot = await scanDatabase(database(target))
      await inspectBusinessIntegrity(database(target), baseline.highWater)
      if (snapshot.hash !== reconciliation.snapshot.hash || (snapshot.counts.accountMutationLocks ?? 0) > 0) throw new RecoveryError('Reconciled snapshot mismatch or account operations require manual investigation.')
      const fixed=(await runtime.get()).data()?.protocol===2
      const {documentImage,imageHash}=fixed?await import('./default-recovery.mjs'):{}
      const typedHash=fixed?imageHash(await documentImage(database(target))):null
      await effect({kind:'verify',target})
      await control.doc(`recoveryVerifications/${id}`).create({ ...(fixed?{typedHash}:{}),target, generation, baselineId, authorizationHash, revision, restoreOperation, recoveryPoint, approval, snapshot, verifiedAt: now() })
      return { verificationId: id, count: snapshot.count }
    }) },
    async cutover(generation, id, verificationId) { await rejectFixedTransition(); return exclusive(generation, id, async effect => {
      const state = await stateAt(generation), receipt = (await control.doc(`recoveryVerifications/${verificationId}`).get()).data()
      if (!receipt || receipt.generation !== generation || receipt.revision !== revision) throw new RecoveryError('Fresh verification is required.')
      assertTransition(state, 'verification', { activeOperations: await operations(), approval: receipt.approval, verified: true })
      if ((await scanDatabase(database(receipt.target))).hash !== receipt.snapshot.hash || await authorizationDigest(database(receipt.target), auth) !== receipt.authorizationHash) throw new RecoveryError('Verification has been invalidated by data/Auth changes.')
      const next = { ...state, databaseId: receipt.target, phase: 'verification', generation: generation + 1 }
      await effect({kind:'cutover',prior:state,next,verificationId})
      await marker(state.databaseId, { phase: 'retired', generation: next.generation })
      await marker(next.databaseId, next)
      await runtime.set(next)
      await control.doc('recovery/currentVerification').set({ verificationId, generation: next.generation })
      return next
    }) },
    async reopen(generation, id, approval) { await rejectFixedTransition(); return exclusive(generation, id, async effect => {
      const state = await stateAt(generation), binding = (await control.doc('recovery/currentVerification').get()).data()
      const receipt = binding ? (await control.doc(`recoveryVerifications/${binding.verificationId}`).get()).data() : null
      if (!receipt || binding.generation !== generation || receipt.target !== state.databaseId || receipt.revision !== revision || !approval || approval === receipt.approval) throw new RecoveryError('Separate HS reopening approval and current verification are required.')
      assertTransition(state, 'normal', { activeOperations: await operations(), approval, verified: true })
      if ((await scanDatabase(database(state.databaseId))).hash !== receipt.snapshot.hash || await authorizationDigest(database(state.databaseId), auth) !== receipt.authorizationHash) throw new RecoveryError('Reverification is required after data/Auth changes.')
      const next = { ...state, phase: 'normal', generation: generation + 1 }
      await effect({kind:'reopen',prior:state,next,verificationId:binding.verificationId,approval})
      await marker(next.databaseId, next)
      await runtime.set(next)
      await control.collection('recoveryAudit').doc(id).create({ generation: next.generation, approval, verifiedBy: binding.verificationId, completedAt: now() })
      return next
    }) },
    async resumeOperator(generation, expectedOperation, workerStopped, {expectedRecoveryOwner,recoveryWorkerStopped=false}={}) {
      if(workerStopped!==true)throw new RecoveryError('The previous operator must be stopped before recovery.')
      const state=await stateAt(generation), lock=control.doc('recovery/operatorLock'), recoveryOwner=randomUUID()
      if(await operations())throw new RecoveryError('Drained mutations are required.')
      const held=await control.runTransaction(async tx=>{
        const [snapshot,current]=await Promise.all([tx.get(lock),tx.get(runtime)]),value=snapshot.data()
        if(current.data()?.generation!==generation||!value||value.operationId!==expectedOperation
          || value.recoveryOwner&&(value.recoveryOwner!==expectedRecoveryOwner||recoveryWorkerStopped!==true))throw new RecoveryError('Inspected ownership, stopped operator and stopped recovery owner are required.')
        if(value.intent?.kind?.startsWith('default-'))throw new RecoveryError('Default recovery requires its dedicated operator resume.');
        if(value.intent?.kind==='auth-repair')throw new RecoveryError('Auth repair requires private manual reconciliation; generic operator resume cannot release its lock.')
        tx.update(lock,{recoveryOwner})
        return value
      })
      const intent=held.intent
      if(['enter','cutover','reopen'].includes(intent?.kind)) {
        if(JSON.stringify(state)!==JSON.stringify(runtimeState(intent.prior))&&JSON.stringify(state)!==JSON.stringify(runtimeState(intent.next)))throw new RecoveryError('Runtime no longer matches the interrupted transition.')
        if(intent.kind==='enter'){await runtime.set(intent.next);await marker(intent.next.databaseId,intent.next)}
        else {
          const receipt=(await control.doc(`recoveryVerifications/${intent.verificationId}`).get()).data()
          if(!receipt||receipt.revision!==revision||receipt.target!==intent.next.databaseId)throw new RecoveryError('Transition verification is unavailable.')
          const alreadyReopened=intent.kind==='reopen'&&state.phase==='normal'&&state.generation===intent.next.generation
          if(!alreadyReopened&&((await scanDatabase(database(receipt.target))).hash!==receipt.snapshot.hash||await authorizationDigest(database(receipt.target),auth)!==receipt.authorizationHash))throw new RecoveryError('Interrupted transition evidence was invalidated.')
          if(intent.kind==='cutover'){
            await marker(intent.prior.databaseId,{phase:'retired',generation:intent.next.generation})
            await marker(intent.next.databaseId,intent.next);await runtime.set(intent.next)
            await control.doc('recovery/currentVerification').set({verificationId:intent.verificationId,generation:intent.next.generation})
          }else{
            if(!intent.approval||intent.approval===receipt.approval)throw new RecoveryError('Separate reopening approval is unavailable.')
            if(!alreadyReopened){await marker(intent.next.databaseId,intent.next);await runtime.set(intent.next)}
            await control.collection('recoveryAudit').doc(expectedOperation).set({generation:intent.next.generation,approval:intent.approval,verifiedBy:intent.verificationId,completedAt:now()})
          }
        }
      }else{
        if(state.phase!=='recovering')throw new RecoveryError('Only closed maintenance metadata can be recovered without a transition plan.')
        await marker(state.databaseId,state)
        if(intent?.target){if([state.databaseId,controlId,'(default)'].includes(intent.target))throw new RecoveryError('Invalid interrupted target.');await marker(intent.target,state)}
      }
      await control.runTransaction(async tx=>{const current=await tx.get(lock);if(current.data()?.operationId!==expectedOperation||current.data()?.recoveryOwner!==recoveryOwner)throw new RecoveryError('Operator ownership changed.');tx.delete(lock)})
      return {runtime:await getState(),resumedOperation:expectedOperation,receiptAccepted:false}
    },
  }
}
