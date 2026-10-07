import { createHash, randomUUID } from 'node:crypto'
import { FieldPath, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { propertyAddress } from '../../src/domain/property-warranty.mjs'
import { typed } from './default-recovery.mjs'
import { fixedRuntimeState, sameFixedEpoch } from '../../src/domain/fixed-recovery.mjs'

const oldKeys = ['prefecture','municipality','streetTownAndNumber']
const hash = data => createHash('sha256').update(JSON.stringify(typed(data))).digest('hex')
const ordered = rows => [...rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
const preimages = (saved,prior) => {
 const rows=ordered(saved.docs.map(row=>row.data()))
 if(saved.size!==prior.count||hash(rows)!==prior.planHash||saved.docs.some(row=>row.data().id!==row.id))throw Error('Private preimage integrity mismatch.')
 return rows
}
export function planPropertyAddresses(documents) {
  const rows = [], conflicts = []
  for (const document of documents) {
    const value = document.data(), legacy = oldKeys.some(key => Object.hasOwn(value,key))
    if (!legacy) continue
    const oldAddress = propertyAddress(Object.fromEntries(oldKeys.map(key => [key,value[key]])))
    if (Object.hasOwn(value,'address') && propertyAddress(value) !== oldAddress) {
      conflicts.push(document.id); continue
    }
    const fields = Object.fromEntries(['address',...oldKeys,'revision'].filter(key => Object.hasOwn(value,key)).map(key => [key,value[key]]))
    if (oldAddress.length > 2000 || !Number.isSafeInteger(value.revision ?? 0) || (value.revision ?? 0) < 0 || (value.revision ?? 0) > Number.MAX_SAFE_INTEGER-2) { conflicts.push(document.id);continue }
    const expected={...value,address:oldAddress,revision:(value.revision??0)+1}
    for(const key of oldKeys)delete expected[key]
    rows.push({ id:document.id, address:oldAddress, originalHash:hash(value), expectedHash:hash(expected), rollbackHash:hash({...value,revision:(value.revision??0)+2}), fields, revision:value.revision ?? 0 })
  }
  return { rows:ordered(rows), conflicts, hash:hash(ordered(rows)) }
}
export async function inspectPropertyAddresses(db) {
  const page = await db.collection('propertyWarranties').orderBy(FieldPath.documentId()).limit(301).get()
  if (page.size > 300) throw Error('Address migration exceeds the reviewed 300 document budget.')
  return { documents:page.docs.length, ...planPropertyAddresses(page.docs) }
}
// Verify the committed in-place migration without treating it as a DB restore.
// Originals are reconstructed in memory only, preserving absent vs empty fields.
export async function verifyCompletedPropertyAddresses(db,control,{operationId,generation,planHash}) {
 if(db.projectId!==control.projectId||db.databaseId!=='(default)'||control.databaseId==='(default)'||!/^[\w-]{1,100}$/.test(operationId??'')||!/^[a-f0-9]{64}$/.test(planHash??'')||!Number.isSafeInteger(generation)||generation<1)throw Error('Explicit address verification identity required.')
 const journal=control.doc('addressMigrations/'+operationId),prior=(await journal.get()).data(),done=(await db.doc('_recovery/addressMigration').get()).data()
 if(!prior||prior.status!=='complete'||prior.planHash!==planHash||prior.generation!==generation||!Number.isSafeInteger(prior.count)||prior.count<0||prior.count>300||done?.operationId!==operationId||done.planHash!==planHash||done.generation!==generation||done.count!==prior.count||done.rolledBack)throw Error('Complete, unchanged address migration evidence required.')
 const saved=await journal.collection('preimage').get(),rows=preimages(saved,prior),originals=new Map()
 for(const row of rows){
  if(typeof row.id!=='string'||!row.id||row.id.includes('/')||!row.fields||Object.keys(row.fields).some(key=>!['address',...oldKeys,'revision'].includes(key)))throw Error('Private preimage shape mismatch.')
  const current=(await db.doc('propertyWarranties/'+row.id).get()).data()
  if(!current||hash(current)!==row.expectedHash||oldKeys.some(key=>Object.hasOwn(current,key)))throw Error('Migrated business document changed.')
  const original={...current}
  for(const key of ['address',...oldKeys,'revision']){if(Object.hasOwn(row.fields,key))original[key]=row.fields[key];else delete original[key]}
  const rebuilt=planPropertyAddresses([{id:row.id,data:()=>original}])
  if(hash(original)!==row.originalHash||rebuilt.conflicts.length||rebuilt.rows.length!==1||hash(rebuilt.rows[0])!==hash(row))throw Error('Reconstructed private preimage mismatch.')
  originals.set('propertyWarranties/'+row.id,original)
 }
 const remaining=await inspectPropertyAddresses(db)
 if(remaining.rows.length||remaining.conflicts.length)throw Error('Unmigrated property address fields remain.')
 return {count:rows.length,originals,journalHash:hash(prior),checkpointHash:hash(done),createdAt:prior.createdAt}
}
// Apply only in drained maintenance. Private preimages survive an unknown commit outcome.
export async function applyPropertyAddresses(db, control, {operationId,generation,planHash,resumeOwner,previousWorkerEnded=false,afterCommit=async()=>{}}) {
  if (!/^[\w-]{1,100}$/.test(operationId ?? '') || !/^[a-f0-9]{64}$/.test(planHash ?? '')) throw Error('Explicit migration identity required.')
  if(db.projectId!==control.projectId || db.databaseId!=='(default)' || control.databaseId==='(default)')throw Error('Migration database identity mismatch.')
  const closed = (raw,marker) => {
    const state=fixedRuntimeState(raw), access=fixedRuntimeState(marker)
    if(!sameFixedEpoch(state,access)||state.controlDatabaseId!==control.databaseId||state.phase!=='recovering'||state.generation!==generation)throw Error('Drained fixed-default maintenance required.')
    return state
  }
  closed((await control.doc('recovery/runtime').get()).data(),(await db.doc('_recovery/access').get()).data())
  if((await control.collection('recoveryOperations').limit(1).get()).size)throw Error('Business operations must drain.')
  const lock=control.doc('recovery/operatorLock'), journal=control.doc('addressMigrations/'+operationId)
  const owner=randomUUID()
  const acquired=await control.runTransaction(async tx=>{
    const [held,current,leases]=await Promise.all([tx.get(lock),tx.get(control.doc('recovery/runtime')),tx.get(control.collection('recoveryOperations').limit(1))])
    closed(current.data(),(await db.doc('_recovery/access').get()).data())
    const value=held.data()
    if(leases.size || held.exists && !(previousWorkerEnded && resumeOwner && value.owner===resumeOwner && value.kind==='property-address-migration' && value.operationId===operationId && value.generation===generation && value.planHash===planHash))throw Error('Operator state changed; inspect exact prior owner and worker before resuming.')
    if(!held.exists && resumeOwner)throw Error('Resume owner does not exist.')
    tx.set(lock,{kind:'property-address-migration',operationId,generation,planHash,owner,startedAt:Timestamp.now()})
    return true
  })
  let complete=false,started=!!resumeOwner
  try {
    const prior=(await journal.get()).data(), success=(await db.doc('_recovery/addressMigration').get()).data()
    if (prior && (prior.planHash !== planHash || prior.generation !== generation)) throw Error('Migration identity reused.')
    if (success?.operationId === operationId) {
      if(success.rolledBack)throw Error('This migration was rolled back; inspect a fresh plan.')
      if (success.planHash !== planHash || success.generation !== generation) throw Error('Completed checkpoint mismatch.')
      if(!prior)throw Error('Completed migration preimage is missing.')
      const saved=await journal.collection('preimage').get()
      preimages(saved,prior)
      for(const row of saved.docs)if(hash((await db.doc('propertyWarranties/'+row.id).get()).data())!==row.data().expectedHash)throw Error('Migrated document changed; keep maintenance for inspection.')
      complete=true;await journal.set({status:'complete',completedAt:Timestamp.now()},{merge:true});return {count:success.count,replayed:true}
    }
    const plan=await inspectPropertyAddresses(db)
    if (plan.conflicts.length || plan.hash !== planHash) throw Error('Address plan changed or contains conflicts.')
    if (Buffer.byteLength(JSON.stringify(plan.rows)) > 700000) throw Error('Private preimage budget exceeded.')
    if (!prior) {
      const batch=control.batch()
      batch.create(journal,{status:'prepared',generation,planHash,count:plan.rows.length,createdAt:Timestamp.now()})
      for(const row of plan.rows)batch.create(journal.collection('preimage').doc(row.id),row)
      await batch.commit()
    } else {
      const saved=await journal.collection('preimage').get()
      preimages(saved,prior)
    }
    started=true
    await db.runTransaction(async tx=>{
      const [latest,done]=await Promise.all([tx.get(db.doc('_recovery/access')),tx.get(db.doc('_recovery/addressMigration'))])
      closed((await control.doc('recovery/runtime').get()).data(),latest.data())
      if((await lock.get()).data()?.owner!==owner)throw Error('Migration owner changed.')
      if(done.data()?.operationId===operationId)throw Error('Concurrent completed migration; inspect rather than resubmit.')
      const snapshots=[]
      for(const row of plan.rows)snapshots.push(await tx.get(db.doc('propertyWarranties/'+row.id)))
      if(snapshots.some((snapshot,i)=>!snapshot.exists||hash(snapshot.data())!==plan.rows[i].originalHash))throw Error('Business document changed.')
      for(const row of plan.rows)tx.update(db.doc('propertyWarranties/'+row.id),{address:row.address,prefecture:FieldValue.delete(),municipality:FieldValue.delete(),streetTownAndNumber:FieldValue.delete(),revision:row.revision+1})
      tx.set(db.doc('_recovery/addressMigration'),{operationId,generation,planHash,count:plan.rows.length,completedAt:Timestamp.now()})
    })
    await afterCommit()
    await journal.set({status:'complete',completedAt:Timestamp.now()},{merge:true})
    complete=true
    return {count:plan.rows.length,replayed:false}
  }finally {
    // Unknown post-submit outcome deliberately retains the inspected operation lock.
    if(acquired&&(complete||!started))await control.runTransaction(async tx=>{const held=(await tx.get(lock)).data();if(held?.operationId===operationId && held.owner===owner)tx.delete(lock)})
  }
}

// Bounded rollback before reopening, refusing any post-migration business change.
export async function rollbackPropertyAddresses(db,control,{operationId,generation,planHash,resumeOwner,previousWorkerEnded=false,afterCommit=async()=>{}}){
 if(db.projectId!==control.projectId||db.databaseId!=='(default)'||control.databaseId==='(default)'||!/^[\w-]{1,100}$/.test(operationId??''))throw Error('Explicit migration database identity required.')
 const closed=async()=>{
  const state=fixedRuntimeState((await control.doc('recovery/runtime').get()).data()),marker=fixedRuntimeState((await db.doc('_recovery/access').get()).data())
  if(!sameFixedEpoch(state,marker)||state.controlDatabaseId!==control.databaseId||state.phase!=='recovering'||state.generation!==generation||(await control.collection('recoveryOperations').limit(1).get()).size)throw Error('Drained fixed-default maintenance required.')
 }
 await closed()
 const journal=control.doc('addressMigrations/'+operationId),prior=(await journal.get()).data(),saved=await journal.collection('preimage').get()
 if(!prior||prior.generation!==generation||prior.planHash!==planHash||saved.size!==prior.count)throw Error('Matching complete private preimage required.')
 preimages(saved,prior)
 const lock=control.doc('recovery/operatorLock'),owner=randomUUID()
 await control.runTransaction(async tx=>{
  const held=(await tx.get(lock)).data();await closed()
  if(held&&!(resumeOwner&&previousWorkerEnded&&held.owner===resumeOwner&&held.operationId===operationId&&held.kind==='property-address-rollback'&&held.generation===generation&&held.planHash===planHash))throw Error('Operator state changed.')
  if(!held&&resumeOwner)throw Error('Resume owner does not exist.')
  tx.set(lock,{kind:'property-address-rollback',operationId,generation,planHash,owner,startedAt:Timestamp.now()})
 })
 let complete=false,started=!!resumeOwner
 try{
  const checkpoint=db.doc('_recovery/addressMigration'),done=(await checkpoint.get()).data()
  if(done?.operationId!==operationId||done.planHash!==planHash||done.generation!==generation)throw Error('Matching committed migration required.')
  if(done.rolledBack){
   for(const row of saved.docs)if(hash((await db.doc('propertyWarranties/'+row.id).get()).data())!==row.data().rollbackHash)throw Error('Rolled back business data changed.')
   await journal.set({status:'rolled-back',rolledBackAt:Timestamp.now()},{merge:true});complete=true;return {count:saved.size,replayed:true}
  }
  started=true
  await db.runTransaction(async tx=>{
   await closed()
   const marker=await tx.get(db.doc('_recovery/access')),receipt=await tx.get(checkpoint)
   if(marker.data()?.phase!=='recovering'||marker.data()?.generation!==generation||(await lock.get()).data()?.owner!==owner||receipt.data()?.rolledBack||receipt.data()?.operationId!==operationId)throw Error('Rollback state changed.')
   const rows=[];for(const row of saved.docs)rows.push(await tx.get(db.doc('propertyWarranties/'+row.id)))
   if(rows.some((row,i)=>!row.exists||hash(row.data())!==saved.docs[i].data().expectedHash))throw Error('Business data changed after migration; rollback refused.')
   const patches=saved.docs.map((row,i)=>{
    const p=row.data(),original={...rows[i].data()},fields={revision:p.revision+2}
    if(Object.hasOwn(p.fields,'revision'))original.revision=p.fields.revision;else delete original.revision
    for(const key of ['address',...oldKeys]){if(Object.hasOwn(p.fields,key))original[key]=p.fields[key];else delete original[key];fields[key]=Object.hasOwn(p.fields,key)?p.fields[key]:FieldValue.delete()}
    if(hash(original)!==p.originalHash||hash({...original,revision:p.revision+2})!==p.rollbackHash)throw Error('Reconstructed preimage mismatch.')
    return fields
   })
   for(let i=0;i<saved.docs.length;i++)tx.update(db.doc('propertyWarranties/'+saved.docs[i].id),patches[i])
   tx.update(checkpoint,{rolledBack:true,rolledBackAt:Timestamp.now()})
  })
  await afterCommit();await journal.set({status:'rolled-back',rolledBackAt:Timestamp.now()},{merge:true});complete=true;return {count:saved.size,replayed:false}
 }finally{if(complete||!started)await control.runTransaction(async tx=>{if((await tx.get(lock)).data()?.owner===owner)tx.delete(lock)})}
}
