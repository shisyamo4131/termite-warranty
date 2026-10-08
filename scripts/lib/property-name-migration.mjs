import {createHash,randomUUID} from 'node:crypto'
import {FieldPath,FieldValue,Timestamp} from 'firebase-admin/firestore'
import {typed} from './default-recovery.mjs'
import {fixedRuntimeState,sameFixedEpoch} from '../../src/domain/fixed-recovery.mjs'

const hash=value=>createHash('sha256').update(JSON.stringify(typed(value))).digest('hex')
const ordered=rows=>[...rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
export function planPropertyNames(documents){
 const rows=[],conflicts=[]
 for(const doc of documents){
  const v=doc.data()
  if(!Object.hasOwn(v,'ownerName'))continue
  if(typeof v.name!=='string'||!v.name.trim()||typeof v.ownerName!=='string'||v.ownerName.trim()&&v.name.trim()!==v.ownerName.trim()||!Number.isSafeInteger(v.revision??0)||(v.revision??0)<0||(v.revision??0)>Number.MAX_SAFE_INTEGER-2){conflicts.push(doc.id);continue}
  const revision=v.revision??0,expected={...v,revision:revision+1};delete expected.ownerName
  rows.push({id:doc.id,revision,fields:Object.fromEntries(['name','ownerName','revision'].filter(k=>Object.hasOwn(v,k)).map(k=>[k,v[k]])),originalHash:hash(v),expectedHash:hash(expected),rollbackHash:hash({...v,revision:revision+2})})
 }
 const sorted=ordered(rows)
 return {rows:sorted,conflicts,hash:hash(sorted)}
}
export async function inspectPropertyNames(db){const page=await db.collection('propertyWarranties').orderBy(FieldPath.documentId()).limit(301).get();if(page.size>300)throw Error('Name migration exceeds 300 document budget.');return {documents:page.size,...planPropertyNames(page.docs)}}
function identity(db,control,o){if(db.projectId!==control.projectId||db.databaseId!=='(default)'||control.databaseId==='(default)'||!/^[\w-]{1,100}$/.test(o.operationId??'')||!/^[a-f0-9]{64}$/.test(o.planHash??'')||!Number.isSafeInteger(o.generation)||o.generation<1)throw Error('Explicit name migration identity required.')}
function savedRows(journal,planHash){if(!journal||journal.planHash!==planHash||!Array.isArray(journal.rows)||journal.rows.length!==journal.count||hash(journal.rows)!==planHash)throw Error('Private name preimage mismatch.');return journal.rows}
// Normal operation stays open. A control lock fences developer maintenance;
// business revision checks fence concurrent saves without blocking unrelated reads.
export async function migratePropertyNames(db,control,o){
 identity(db,control,o)
 const rollback=o.rollback===true,kind=rollback?'property-name-rollback':'property-name-migration',lock=control.doc('recovery/operatorLock'),journal=control.doc('nameMigrations/'+o.operationId),checkpoint=db.doc('_recovery/nameMigration'),owner=randomUUID()
 const assertNormal=(state,marker)=>{const a=fixedRuntimeState(state),b=fixedRuntimeState(marker);if(a.phase!=='normal'||a.generation!==o.generation||a.controlDatabaseId!==control.databaseId||!sameFixedEpoch(a,b))throw Error('Matching normal runtime required.');return a}
 await control.runTransaction(async tx=>{
  const [held,state]=await Promise.all([tx.get(lock),tx.get(control.doc('recovery/runtime'))]);assertNormal(state.data(),(await db.doc('_recovery/access').get()).data())
  const old=held.data();if(held.exists&&!(o.previousWorkerEnded===true&&o.resumeOwner&&old.owner===o.resumeOwner&&old.kind===kind&&old.operationId===o.operationId&&old.planHash===o.planHash&&old.generation===o.generation)||!held.exists&&o.resumeOwner)throw Error('Inspect exact prior owner and worker before resuming.')
  tx.set(lock,{kind,owner,operationId:o.operationId,planHash:o.planHash,generation:o.generation,startedAt:Timestamp.now()})
 })
 let submitted=false,complete=false
 try{
  let prior=(await journal.get()).data();const done=(await checkpoint.get()).data()
  if(prior&&(prior.generation!==o.generation||prior.planHash!==o.planHash))throw Error('Name migration identity reused.')
  if(done?.operationId===o.operationId){
   if(done.planHash!==o.planHash||done.generation!==o.generation)throw Error('Name checkpoint mismatch.')
   const rows=savedRows(prior,o.planHash)
   if(!!done.rolledBack===rollback){
    // Atomic checkpoint proves the earlier complete operation. Later legitimate
    // saves may change other values; never apply the migration a second time.
    for(const row of rows){const current=(await db.doc('propertyWarranties/'+row.id).get()).data();if(!current||!Number.isSafeInteger(current.revision)||current.revision<row.revision+(rollback?2:1)||!rollback&&Object.hasOwn(current,'ownerName'))throw Error('Completed operation requires manual inspection.')}
    await journal.set({status:rollback?'rolled-back':'complete'},{merge:true});complete=true;return {count:rows.length,replayed:true}
   }
   if(done.rolledBack)throw Error('Migration was rolled back; prepare a new operation.')
  }
  let rows
  if(rollback){rows=savedRows(prior,o.planHash);if(!done||done.operationId!==o.operationId||done.rolledBack)throw Error('Committed name migration required for rollback.')}
  else{
   const plan=await inspectPropertyNames(db);if(plan.conflicts.length||plan.hash!==o.planHash)throw Error('Name plan changed or contains conflicts.');rows=plan.rows
   if(Buffer.byteLength(JSON.stringify(rows))>700000)throw Error('Private name preimage budget exceeded.')
   if(!prior){await journal.create({status:'prepared',generation:o.generation,planHash:o.planHash,count:rows.length,rows,createdAt:Timestamp.now()});prior=(await journal.get()).data()}
   savedRows(prior,o.planHash)
  }
  await (o.beforeCommit??(async()=>{}))()
  submitted=true
  await db.runTransaction(async tx=>{
   const [marker,currentCheckpoint]=await Promise.all([tx.get(db.doc('_recovery/access')),tx.get(checkpoint)])
   assertNormal((await control.doc('recovery/runtime').get()).data(),marker.data())
   if((await lock.get()).data()?.owner!==owner)throw Error('Name migration owner changed.')
   if(currentCheckpoint.data()?.operationId===o.operationId&&!rollback)throw Error('Concurrent completion; inspect rather than resubmit.')
   const snapshots=await Promise.all(rows.map(row=>tx.get(db.doc('propertyWarranties/'+row.id))))
   if(snapshots.some((s,i)=>!s.exists||hash(s.data())!==(rollback?rows[i].expectedHash:rows[i].originalHash)))throw Error('Business document changed; no partial migration.')
   for(const row of rows){const patch={revision:row.revision+(rollback?2:1),ownerName:rollback?row.fields.ownerName:FieldValue.delete()};tx.update(db.doc('propertyWarranties/'+row.id),patch)}
   tx.set(checkpoint,{operationId:o.operationId,planHash:o.planHash,generation:o.generation,count:rows.length,rolledBack:rollback,completedAt:Timestamp.now()})
  })
  await (o.afterCommit??(async()=>{}))()
  await journal.set({status:rollback?'rolled-back':'complete',completedAt:Timestamp.now()},{merge:true})
  complete=true;return {count:rows.length,replayed:false}
 }finally{
  // Unknown commit outcome keeps the exact owner visible for status/recovery.
  if(complete||!submitted&&!o.resumeOwner)await control.runTransaction(async tx=>{const held=(await tx.get(lock)).data();if(held?.owner===owner)tx.delete(lock)})
 }
}
