import { createHash, randomUUID } from 'node:crypto'
import { Firestore, FieldPath, Timestamp, GeoPoint } from 'firebase-admin/firestore'
import { RecoveryError, ACCESS_PATH, RUNTIME_PATH, databaseId } from '../../src/domain/recovery.mjs'
import { fixedRuntimeState, sameFixedEpoch } from '../../src/domain/fixed-recovery.mjs'
import { authorizationDigest, inspectBusinessIntegrity, scanDatabase } from './recovery-controller.mjs'

const roots = new Set(['staffAccounts','constructionCompanyAccounts','constructionCompanyAccountBindings','accountMutationLocks','constructionCompanies','companyBranches','branches','homeowners','properties','warrantyServices','propertyWarranties','warrantyGroups','warrantyCounters','propertyOperationReceipts','prototypeSettings','cases','caseNumberReservations','systemCounters','constructionCompanyCaseWorkItems','notificationOutbox','_recovery'])
const protectedRoots = new Set(['staffAccounts','constructionCompanyAccounts','constructionCompanyAccountBindings','caseNumberReservations'])
const deny = () => { throw new RecoveryError('Default recovery requires inspected private evidence, drained maintenance and unchanged authority.') }
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function typed(value) {
  if (value === null) return ['null']
  if (value instanceof Timestamp) return ['timestamp',value.seconds,value.nanoseconds]
  if (value instanceof GeoPoint) return ['point',value.latitude,value.longitude]
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return ['bytes',Buffer.from(value).toString('base64')]
  if (value?.firestore && typeof value.path === 'string') return ['reference',value.firestore.projectId,value.firestore.databaseId,value.path]
  if (Array.isArray(value)) return ['array',value.map(typed)]
  if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) deny()
  if (typeof value === 'number') return ['number',Number.isNaN(value)?'NaN':value===Infinity?'Infinity':value===-Infinity?'-Infinity':Object.is(value,-0)?'-0':value]
  if (['string','boolean'].includes(typeof value)) return [typeof value,value]
  if (value && Object.getPrototypeOf(value) === Object.prototype) return ['map',Object.keys(value).sort().map(k=>[k,typed(value[k])])]
  deny()
}
const referenceStores=new Map()
function reference(project,databaseId,path){const key=`${project}/${databaseId}`;if(!referenceStores.has(key))referenceStores.set(key,new Firestore({projectId:project,databaseId}));return referenceStores.get(key).doc(path)}
export function decodeTyped(wire){
 const [kind,...v]=wire
 if(kind==='null')return null
 if(kind==='map')return Object.fromEntries(v[0].map(([k,w])=>[k,decodeTyped(w)]))
 if(kind==='array')return v[0].map(decodeTyped)
 if(kind==='timestamp')return new Timestamp(v[0],v[1])
 if(kind==='point')return new GeoPoint(v[0],v[1])
 if(kind==='bytes')return Buffer.from(v[0],'base64')
 if(kind==='reference')return reference(...v)
 if(kind==='number')return v[0]==='NaN'?NaN:v[0]==='Infinity'?Infinity:v[0]==='-Infinity'?-Infinity:v[0]==='-0'?-0:v[0]
 if(['string','boolean'].includes(kind))return v[0]
 deny()
}
// The installed SDK decodes references relative to the reading database.
// Compare qualified raw protobuf references before using any decoded payload.
function fieldsOf(row){
 function exact(value,proto){
   if(proto?.referenceValue){const m=/^projects\/([^/]+)\/databases\/([^/]+)\/documents\/(.+)$/.exec(proto.referenceValue);if(!m)deny();return reference(m[1],m[2],m[3])}
   if(proto?.integerValue!==undefined&&!Number.isSafeInteger(Number(proto.integerValue)))deny()
   // Integer-valued doubles cannot be faithfully round-tripped by this SDK; refuse rather than convert.
   if(proto?.doubleValue!==undefined&&Number.isInteger(Number(proto.doubleValue))&&!Object.is(Number(proto.doubleValue),-0))deny()
   if(proto?.mapValue)return Object.fromEntries(Object.entries(proto.mapValue.fields??{}).map(([k,p])=>[k,exact(value[k],p)]))
   if(proto?.arrayValue)return (proto.arrayValue.values??[]).map((p,i)=>exact(value[i],p))
   typed(value);return value
 }
 if(!row._fieldsProto)deny()
 const data=row.data();return Object.fromEntries(Object.entries(row._fieldsProto).map(([k,p])=>[k,exact(data[k],p)]))
}
function retarget(value,source,target) {
  if (value?.firestore && typeof value.path === 'string') {
    if(value.firestore.projectId!==target.projectId || ![source.databaseId,target.databaseId].includes(value.firestore.databaseId))deny()
    return target.doc(value.path)
  }
  if(Array.isArray(value))return value.map(v=>retarget(v,source,target))
  if(value && Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,retarget(v,source,target)]))
  typed(value);return value
}
export async function documentImage(db) {
  const rows=new Map()
  async function visit(collection) {
    let cursor
    const seen=new Set()
    do {
      let q=collection.orderBy(FieldPath.documentId()).limit(200);if(cursor)q=q.startAfter(cursor)
      const page=await q.get()
      for(const row of page.docs) {
        seen.add(row.ref.path)
        if(!row.ref.path.startsWith('_recovery/')) {
          if(rows.size>=100_000)deny()
          const fields=fieldsOf(row);typed(fields)
          rows.set(row.ref.path,{fields,hash:digest(typed(fields)),version:row.updateTime})
        }
        for(const child of await row.ref.listCollections())await visit(child)
      }
      cursor=page.size===200?page.docs.at(-1):null
    }while(cursor)
    for(const ref of await collection.listDocuments())if(!seen.has(ref.path)&&(await ref.listCollections()).length)deny()
  }
  for(const collection of await db.listCollections()){if(!roots.has(collection.id))deny();if(collection.id!=='_recovery')await visit(collection)}
  return rows
}
export function imageHash(rows) {return digest([...rows].map(([p,r])=>[p,r.hash]).sort(([a],[b])=>a.localeCompare(b)))}
export function difference(expected,current) {
  const changes=[]
  for(const [path,row] of current)if(!expected.has(path))changes.push({path,kind:'delete',before:row.hash,version:row.version,prior:row.fields})
  for(const [path,row] of expected)if(current.get(path)?.hash!==row.hash)changes.push({path,kind:'set',before:current.get(path)?.hash??null,version:current.get(path)?.version??null,prior:current.get(path)?.fields??null,after:row.hash,fields:row.fields})
  return changes.sort((a,b)=>a.kind!==b.kind?(a.kind==='delete'?-1:1):a.kind==='delete'?b.path.split('/').length-a.path.split('/').length||a.path.localeCompare(b.path):a.path.split('/').length-b.path.split('/').length||a.path.localeCompare(b.path))
}

export function defaultRecovery({database,auth,controlId,revision,afterCommit=async()=>{},afterSealItem=async()=>{},afterPublish=async()=>{}}) {
  databaseId(controlId)
  if(controlId==='(default)'||!/^[a-f0-9]{40}$/.test(revision))deny()
  const target=database('(default)'),control=database(controlId),runtime=control.doc(RUNTIME_PATH),marker=target.doc(ACCESS_PATH),lock=control.doc('recovery/operatorLock'),guard=target.doc('_recovery/apply')
  const planRef=id=>control.doc(`defaultRecoveryPlans/${id}`)
  const ids=(id,approval)=>{if(!/^[\w-]{8,80}$/.test(id)||approval&&!/^[\w./:-]{4,160}$/.test(approval))deny()}
  async function stopped(generation,{migration=false}={}) {
    const raw=(await runtime.get()).data()
    if(raw?.phase!=='recovering'||raw.generation!==generation||raw.controlDatabaseId!==controlId||(await control.collection('recoveryOperations').limit(1).get()).size||(await control.doc('recovery/authExportLock').get()).exists)deny()
    if(!migration){const state=fixedRuntimeState(raw),access=fixedRuntimeState((await marker.get()).data());if(!sameFixedEpoch(state,access))deny()}
    return raw
  }
  async function acquire(id,generation,kind='default-apply') {
    await control.runTransaction(async tx=>{const [s,l]=await Promise.all([tx.get(runtime),tx.get(lock)]);if(s.data()?.generation!==generation||s.data()?.phase!=='recovering'||l.exists)deny();tx.create(lock,{operationId:id,generation,intent:{kind},owner:randomUUID(),startedAt:new Date()})})
    return (await lock.get()).data().owner
  }
  async function release(owner) {await control.runTransaction(async tx=>{const held=(await tx.get(lock)).data();if(held?.owner!==owner)deny();tx.delete(lock)})}
  async function failed(owner) {await control.runTransaction(async tx=>{if((await tx.get(lock)).data()?.owner===owner)tx.update(lock,{failed:true})})}
  async function validatePlan(plan) {
    if(plan?.revision!==revision||plan.controlId!==controlId||plan.target!=='(default)')deny()
    await stopped(plan.generation)
    if(imageHash(await documentImage(database(plan.source)))!==plan.sourceHash||await authorizationDigest(database(plan.authoritySource),auth)!==plan.authorizationHash)deny()
  }
  return {
    async initialize() {
      const state={protocol:2,phase:'recovering',generation:1,databaseId:'(default)',controlDatabaseId:controlId}
      const [r,m]=await Promise.all([runtime.get(),marker.get()])
      if(r.exists||m.exists){if(r.exists&&!sameFixedEpoch(fixedRuntimeState(r.data()),state)||m.exists&&!sameFixedEpoch(fixedRuntimeState(m.data()),state))deny()}
      if(!m.exists)await marker.create(state);if(!r.exists)await runtime.create(state);return state
    },
    async status(){const held=(await lock.get()).data();return {interruptedOperation:held?{operationId:held.operationId,owner:held.owner,kind:held.intent?.kind,failed:held.failed===true}:null,runtime:(await runtime.get()).data()??null,marker:(await marker.get()).data()??null,activeOperations:(await control.collection('recoveryOperations').get()).size,operatorBlocked:(await lock.get()).exists}},
    async enter(generation,id) {
      ids(id)
      const state=fixedRuntimeState((await runtime.get()).data());if(state.generation!==generation||!['normal','verification'].includes(state.phase))deny()
      const next={...state,phase:'recovering',generation:generation+1}
      const owner=randomUUID()
      await control.runTransaction(async tx=>{const [s,l]=await Promise.all([tx.get(runtime),tx.get(lock)]);if(!sameFixedEpoch(fixedRuntimeState(s.data()),state)||l.exists)deny();tx.create(lock,{operationId:id,intent:{kind:'default-enter',prior:state,next},generation,owner});tx.set(runtime,next)})
      await target.runTransaction(async tx=>{const m=fixedRuntimeState((await tx.get(marker)).data());if(!sameFixedEpoch(m,state))deny();tx.set(marker,next)})
      await release(owner);return {...next,activeOperations:(await control.collection('recoveryOperations').get()).size}
    },
    async emergencyClose(generation,id) {
      ids(id)
      await target.runTransaction(async tx=>{const access=fixedRuntimeState((await tx.get(marker)).data());if(access.generation!==generation)deny();tx.set(marker,{...access,phase:'recovering',generation:generation+1});tx.set(target.doc(`_recovery/emergency/receipts/${id}`),{generation:generation+1,closedAt:new Date()})})
      return {phase:'recovering',generation:generation+1,controlReconciliationRequired:true}
    },
    async reconcileEmergency(generation,id,{workerStopped=false}={}) {
      ids(id);if(!workerStopped)deny()
      const access=fixedRuntimeState((await marker.get()).data())
      if(access.phase!=='recovering'||access.generation!==generation||access.controlDatabaseId!==controlId)deny()
      if((await control.collection('recoveryOperations').limit(1).get()).size||(await control.doc('recovery/authExportLock').get()).exists)deny()
      await control.runTransaction(async tx=>{const [r,l]=await Promise.all([tx.get(runtime),tx.get(lock)]);if(l.exists||r.exists&&(r.data().controlDatabaseId!==controlId||r.data().generation>generation))deny();tx.set(runtime,access);tx.create(control.doc(`recoveryEmergencyReconciliations/${id}`),{generation,revision,workerStopped:true,completedAt:new Date()})})
      return access
    },
    async plan(generation,id,{source,baselineId,verificationId,approval,migration=false}) {
      ids(id,approval);databaseId(source);ids(baselineId);if(!migration)ids(verificationId);if(!approval||!source||[controlId,'(default)'].includes(source))deny()
      const state=await stopped(generation,{migration}),baseline=(await control.doc(`recoveryBaselines/${baselineId}`).get()).data()
      const sourceDb=database(source),sourceMarker=(await sourceDb.doc(ACCESS_PATH).get()).data()
      if(!baseline||baseline.generation!==generation||baseline.revision!==revision||sourceMarker?.phase!=='recovering'||sourceMarker.generation!==generation||sourceMarker.databaseId!==source)deny()
      let verifiedTypedHash
      const authoritySource=migration?state.databaseId:'(default)'
      if(migration&&source!==state.databaseId)deny()
      if(!migration){const verified=(await control.doc(`recoveryVerifications/${verificationId}`).get()).data();verifiedTypedHash=verified?.typedHash;if(!verified||verified.target!==source||verified.generation!==generation||verified.revision!==revision||verified.baselineId!==baselineId||verified.authorizationHash!==baseline.authorizationHash||verified.approval!==approval||imageHash(await documentImage(sourceDb))!==verified.typedHash||(await scanDatabase(sourceDb)).hash!==verified.snapshot?.hash)deny()}
      if(await authorizationDigest(database(authoritySource),auth)!==baseline.authorizationHash)deny()
      const original=await documentImage(sourceDb),current=await documentImage(target),authority=await documentImage(database(authoritySource))
      if(!migration&&imageHash(original)!==verifiedTypedHash)deny()
      if((original.size&&[...original.keys()].some(p=>p.startsWith('accountMutationLocks/')))||[...authority.keys()].some(p=>p.startsWith('accountMutationLocks/')))deny()
      const expected=new Map([...original].map(([p,r])=>{const fields=retarget(r.fields,sourceDb,target);return[p,{fields,hash:digest(typed(fields))}]}))
      for(const p of [...expected.keys()])if(protectedRoots.has(p.split('/')[0]))expected.delete(p)
      for(const [p,r] of authority)if(protectedRoots.has(p.split('/')[0])){const fields=retarget(r.fields,database(authoritySource),target);expected.set(p,{fields,hash:digest(typed(fields))})}
      for(const [p,r] of authority)if(p.startsWith('warrantyCounters/')){const prior=expected.get(p)?.fields??{},fields={...prior,lastValue:Math.max(prior.lastValue??0,r.fields.lastValue)};expected.set(p,{fields,hash:digest(typed(fields))})}
      await inspectBusinessIntegrity(sourceDb,baseline.highWater)
      const changes=difference(expected,current),owner=await acquire(id,generation,'default-seal')
      try {
        const ref=planRef(id);if((await ref.get()).exists)deny()
        const value={status:'sealing',source,target:'(default)',controlId,generation,revision,approval,migration,authoritySource,authorizationHash:baseline.authorizationHash,highWater:baseline.highWater,sourceHash:imageHash(original),beforeHash:imageHash(current),expectedHash:imageHash(expected),count:expected.size,total:changes.length,owner,createdAt:new Date()}
        await ref.create(value)
        for(const [path,row] of current){if(Buffer.byteLength(JSON.stringify(typed(row.fields)))>700_000)deny();await ref.collection('preimage').doc(Buffer.from(path).toString('base64url')).create({path,wire:JSON.stringify(typed(row.fields)),hash:row.hash,version:row.version})}
        for(let i=0;i<changes.length;i++){const row=changes[i];if(Buffer.byteLength(JSON.stringify([typed(row.fields??null),typed(row.prior??null)]))>700_000)deny();await ref.collection('items').doc(String(i).padStart(6,'0')).create({...row,fields:row.fields?JSON.stringify(typed(row.fields)):null,prior:JSON.stringify(typed(row.prior))});await afterSealItem(i)}
        await ref.update({status:'sealed',manifestHash:digest(changes.map(c=>[c.path,c.kind,c.before,c.after??null]))})
        await release(owner);return {planId:id,changes:changes.filter(c=>c.kind==='set').length,deletes:changes.filter(c=>c.kind==='delete').length,count:expected.size}
      }catch{await failed(owner);throw new RecoveryError('Plan sealing interrupted; keep maintenance and inspect private plan.')}
    },
    async apply(id,{resume=false,workerStopped=false,expectedOwner}={}) {
      ids(id)
      const ref=planRef(id),plan=(await ref.get()).data();if(!plan||!['sealed','applying','verified'].includes(plan.status)||plan.revision!==revision)deny()
      let owner
      if(resume){if(!workerStopped||!expectedOwner)deny();owner=randomUUID();await control.runTransaction(async tx=>{const l=(await tx.get(lock)).data();if(l?.operationId!==id||l.owner!==expectedOwner||l.intent?.kind!=='default-apply')deny();tx.update(lock,{owner,failed:false})})}
      else owner=await acquire(id,plan.generation)
      try {
        await stopped(plan.generation,{migration:plan.migration})
        if(plan.status==='sealed'&&imageHash(await documentImage(target))!==plan.beforeHash)deny()
        if(plan.migration){await marker.set({protocol:2,phase:'recovering',generation:plan.generation,databaseId:'(default)',controlDatabaseId:controlId});await runtime.set({protocol:2,phase:'recovering',generation:plan.generation,databaseId:'(default)',controlDatabaseId:controlId})}
        await validatePlan(plan)
        await target.runTransaction(async tx=>{const [m,g]=await Promise.all([tx.get(marker),tx.get(guard)]);if(fixedRuntimeState(m.data()).phase!=='recovering'||m.data().generation!==plan.generation||g.exists&&g.data().planId!==id&&g.data().generation>=plan.generation)deny();tx.set(guard,{planId:id,owner,generation:plan.generation})})
        await ref.update({status:'applying',owner})
        const items=await ref.collection('items').orderBy(FieldPath.documentId()).get()
        if(items.size!==plan.total||digest(items.docs.map(d=>{const c=d.data();return[c.path,c.kind,c.before,c.after??null]}))!==plan.manifestHash)deny()
        for(const item of items.docs) {
          const c=item.data(),record=target.doc(c.path),checkpoint=target.doc(`_recovery/apply/plans/${id}/batches/${item.id}`)
          await target.runTransaction(async tx=>{
            const [m,g,done,row]=await Promise.all([tx.get(marker),tx.get(guard),tx.get(checkpoint),tx.get(record)])
            if(m.data()?.phase!=='recovering'||m.data()?.generation!==plan.generation||g.data()?.owner!==owner||g.data()?.planId!==id)deny()
            const hash=row.exists?digest(typed(fieldsOf(row))):null,after=c.kind==='set'?c.after:null
            if(done.exists){if(done.data().planId!==id||hash!==after)deny();return}
            if(hash!==c.before||row.exists&&c.version&&!row.updateTime.isEqual(c.version))deny()
            if(c.kind==='set'){const fields=decodeTyped(JSON.parse(c.fields));if(digest(typed(fields))!==c.after)deny();tx.set(record,fields)}else tx.delete(record)
            tx.create(checkpoint,{planId:id,after,completedAt:new Date()})
          })
          await afterCommit(item.id)
        }
        if(imageHash(await documentImage(target))!==plan.expectedHash)deny()
        if(await authorizationDigest(target,auth)!==plan.authorizationHash)deny()
        await inspectBusinessIntegrity(target,plan.highWater)
        await validatePlan(plan)
        await ref.update({status:'verified',verifiedAt:new Date()});await release(owner)
        return {status:'verified',planId:id,count:plan.count}
      }catch{await failed(owner);throw new RecoveryError('Default application interrupted; retain maintenance, private plan and operator lock.')}
    },
    async publish(id,approval,{reopen=false}={}) {
      ids(id,approval);const ref=planRef(id),plan=(await ref.get()).data()
      if(!plan||plan.status!=='verified'||plan.revision!==revision||!approval||(await lock.get()).exists||(await control.collection('recoveryOperations').limit(1).get()).size)deny()
      const state=fixedRuntimeState((await runtime.get()).data()),access=fixedRuntimeState((await marker.get()).data())
      if(!reopen&&plan.generation!==state.generation||reopen&&(plan.publishedPhase!=='verification'||plan.publishedGeneration!==state.generation))deny()
      if(reopen){const receipt=(await target.doc('_recovery/publication').get()).data();if(receipt?.planId!==id||receipt.generation!==state.generation||receipt.phase!=='verification'||receipt.expectedHash!==plan.expectedHash)deny()}
      if(!sameFixedEpoch(state,access)||state.phase!==(reopen?'verification':'recovering')||reopen&&approval===plan.approval||!reopen&&approval!==plan.approval)deny()
      if(imageHash(await documentImage(target))!==plan.expectedHash||await authorizationDigest(target,auth)!==plan.authorizationHash)deny()
      await inspectBusinessIntegrity(target,plan.highWater)
      const next={...state,phase:reopen?'normal':'verification',generation:state.generation+1}
      const owner=randomUUID()
      await control.runTransaction(async tx=>{const [s,l]=await Promise.all([tx.get(runtime),tx.get(lock)]);if(!sameFixedEpoch(fixedRuntimeState(s.data()),state)||l.exists)deny();tx.create(lock,{operationId:id,generation:state.generation,intent:{kind:'default-publish',prior:state,next,approval},owner});tx.set(runtime,next)})
      try {
        if(plan.migration)await database(plan.source).doc(ACCESS_PATH).set({databaseId:plan.source,phase:'retired',generation:next.generation})
        await target.runTransaction(async tx=>{const m=fixedRuntimeState((await tx.get(marker)).data());if(!sameFixedEpoch(m,state))deny();tx.set(marker,next);tx.set(target.doc('_recovery/publication'),{planId:id,approval,phase:next.phase,generation:next.generation,revision,expectedHash:plan.expectedHash,completedAt:new Date()})})
        await afterPublish(next.phase);await ref.update({publishedPhase:next.phase,publishedGeneration:next.generation});await release(owner);return next
      }catch{await failed(owner);throw new RecoveryError('Publication response is uncertain; inspect paired state and checkpoint before resuming.')}
    },
    async recoverOperator(id,{workerStopped,expectedOwner}={}) {
      ids(id);if(!workerStopped||!expectedOwner)deny()
      const owner=randomUUID(),held=await control.runTransaction(async tx=>{const held=(await tx.get(lock)).data();if(held?.operationId!==id||held.owner!==expectedOwner||!['default-enter','default-publish','default-seal'].includes(held.intent?.kind))deny();tx.update(lock,{owner});return held})
      try {
        if(held.intent.kind==='default-seal') {
          const ref=planRef(id),plan=(await ref.get()).data()
          if(!plan||!['sealing','sealed'].includes(plan.status)||plan.revision!==revision)deny()
          await stopped(plan.generation,{migration:plan.migration})
          if(imageHash(await documentImage(target))!==plan.beforeHash)deny()
          if(plan.status==='sealing')await ref.update({status:'aborted-before-application',abortedAt:new Date()})
          await release(owner);return {status:plan.status==='sealed'?'sealed':'aborted-before-application',planId:id}
        }
        const {prior,next,approval}=held.intent,raw=fixedRuntimeState((await runtime.get()).data()),access=fixedRuntimeState((await marker.get()).data())
        if(!sameFixedEpoch(raw,next)||!sameFixedEpoch(access,prior)&&!sameFixedEpoch(access,next))deny()
        if(held.intent.kind==='default-publish') {
          const ref=planRef(id),plan=(await ref.get()).data();if(plan?.status!=='verified'||plan.revision!==revision||!approval)deny()
          if(sameFixedEpoch(access,prior)) {
            if(imageHash(await documentImage(target))!==plan.expectedHash||await authorizationDigest(target,auth)!==plan.authorizationHash)deny()
            await inspectBusinessIntegrity(target,plan.highWater)
            if(plan.migration)await database(plan.source).doc(ACCESS_PATH).set({databaseId:plan.source,phase:'retired',generation:next.generation})
            await target.runTransaction(async tx=>{if(!sameFixedEpoch(fixedRuntimeState((await tx.get(marker)).data()),prior))deny();tx.set(marker,next);tx.set(target.doc('_recovery/publication'),{planId:id,approval,phase:next.phase,generation:next.generation,revision,expectedHash:plan.expectedHash,completedAt:new Date()})})
          }else {const receipt=(await target.doc('_recovery/publication').get()).data();if(receipt?.planId!==id||receipt.generation!==next.generation||receipt.approval!==approval||receipt.revision!==revision||receipt.expectedHash!==plan.expectedHash)deny()}
          await ref.update({publishedPhase:next.phase,publishedGeneration:next.generation})
        }else if(sameFixedEpoch(access,prior))await target.runTransaction(async tx=>{if(!sameFixedEpoch(fixedRuntimeState((await tx.get(marker)).data()),prior))deny();tx.set(marker,next)})
        await release(owner);return next
      }catch(error){await failed(owner);throw error}
    }
  }
}
