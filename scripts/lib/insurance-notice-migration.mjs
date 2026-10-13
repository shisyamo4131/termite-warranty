import {randomUUID} from 'node:crypto'
import {FieldPath, Timestamp} from 'firebase-admin/firestore'
import {assertInsuranceCapacity} from '../../src/domain/insurance-capacity.mjs'
import {insuranceNoticeProjection,insuranceNoticeProjectionMatches} from '../../src/domain/insurance-notice-query.mjs'
import {fixedRuntimeState, sameFixedEpoch} from '../../src/domain/fixed-recovery.mjs'

export function prepareInsuranceNoticeRow(row,{documentPath,at=new Date().toISOString()}) {
  const projection=insuranceNoticeProjection(row)
  const next={...row,...projection}
  assertInsuranceCapacity(next,{documentPath,today:new Date(new Date(at).getTime()+9*3600000).toISOString().slice(0,10)})
  return {next,projection,changed:!insuranceNoticeProjectionMatches(row)}
}
async function eachProperty(db,visit) {
  let cursor
  do {
    let q=db.collection('propertyWarranties').orderBy(FieldPath.documentId()).limit(100)
    if(cursor)q=q.startAfter(cursor)
    const page=await q.get()
    for(const doc of page.docs)await visit(doc)
    cursor=page.size===100?page.docs.at(-1):null
  }while(cursor)
}
export async function inspectInsuranceNoticeMigration(db,{at=new Date().toISOString()}={}) {
  const result={scanned:0,changed:0,blocked:0}
  await eachProperty(db,async doc=>{
    result.scanned++
    try {if(prepareInsuranceNoticeRow(doc.data(),{at,documentPath:doc.ref.path}).changed)result.changed++}
    catch {result.blocked++} // Never emit names, records, reasons or private IDs into a public run log.
  })
  return result
}

// A terminated worker can relinquish only its exact control records, even after
// an emergency generation change. Never reopen readiness or rewrite business data.
export async function stopInsuranceNoticeMigration(control,{operationId,owner,previousWorkerEnded=false}={}) {
  if(control.databaseId==='(default)'||!previousWorkerEnded||!owner||!/^[\w-]{1,100}$/.test(operationId??''))throw Error('Exact stopped-worker identity required')
  return control.runTransaction(async tx=>{
    const lock=control.doc('recovery/operatorLock'),lease=control.doc('recoveryOperations/insurance-notice-'+operationId),journal=control.doc('insuranceNoticeMigrations/'+operationId)
    const [held,operation]=await Promise.all([tx.get(lock),tx.get(lease)])
    if(held.data()?.kind!=='insurance-notice-migration'||held.data()?.owner!==owner||held.data()?.operationId!==operationId||operation.data()?.owner!==owner||operation.data()?.generation!==held.data()?.generation)throw Error('Migration owner changed')
    tx.set(journal,{status:'stopped',stoppedAt:Timestamp.now()},{merge:true})
    tx.delete(lock);tx.delete(lease)
    return {stopped:true,readinessChanged:false}
  })
}

// Developer-operated, idempotent migration; no old-state rollback and no business-history synthesis.
export async function migrateInsuranceNotices(db,control,{generation,operationId,at=new Date().toISOString(),resumeOwner,previousWorkerEnded=false,beforePublish=async()=>{}}={}) {
  if(db.projectId!==control.projectId||db.databaseId!=='(default)'||control.databaseId==='(default)'||!Number.isSafeInteger(generation)||generation<1||!/^[\w-]{1,100}$/.test(operationId??''))throw Error('Explicit matching migration identity required')
  const owner=randomUUID(), lock=control.doc('recovery/operatorLock'), lease=control.doc('recoveryOperations/insurance-notice-'+operationId)
  const journal=control.doc('insuranceNoticeMigrations/'+operationId), readyRef=db.doc('prototypeSettings/insuranceNoticeQueries')
  const assertNormal=(runtime,marker)=>{
    const a=fixedRuntimeState(runtime),b=fixedRuntimeState(marker)
    if(a.phase!=='normal'||a.generation!==generation||a.controlDatabaseId!==control.databaseId||!sameFixedEpoch(a,b))throw Error('Migration recovery generation changed')
    return a
  }
  await control.runTransaction(async tx=>{
    const [held,state,prior]=await Promise.all([tx.get(lock),tx.get(control.doc('recovery/runtime')),tx.get(journal)])
    assertNormal(state.data(),(await db.doc('_recovery/access').get()).data())
    if(prior.exists&&(prior.data().generation!==generation||prior.data().version!==1))throw Error('Migration identity reused')
    const old=held.data()
    if(held.exists&&!(previousWorkerEnded&&resumeOwner===old.owner&&old.kind==='insurance-notice-migration'&&old.operationId===operationId&&old.generation===generation)||!held.exists&&resumeOwner)throw Error('Inspect prior worker before resuming migration')
    tx.set(lock,{kind:'insurance-notice-migration',owner,operationId,generation,startedAt:Timestamp.now()})
    tx.set(lease,{protocol:2,generation,mutation:true,operationId,owner,startedAt:Timestamp.now()})
    tx.set(journal,{version:1,generation,operationId,owner,status:'running',startedAt:Timestamp.now()},{merge:true})
  })
  let complete=false
  const guard=async (tx,checkReady=true)=>{
    const marker=await tx.get(db.doc('_recovery/access'))
    const [state,held]=await Promise.all([control.doc('recovery/runtime').get(),lock.get()])
    assertNormal(state.data(),marker.data())
    if(held.data()?.owner!==owner || held.data()?.operationId!==operationId || held.data()?.generation!==generation)throw Error('Migration owner changed')
    if(checkReady){const ready=(await tx.get(readyRef)).data();if(ready?.version!==0||ready.generation!==generation||ready.operationId!==operationId||ready.owner!==owner)throw Error('Readiness owner changed')}
  }
  try {
    // Never leave an old ready flag visible during a repair or interrupted migration.
    await db.runTransaction(async tx=>{
      await guard(tx,false)
      tx.set(readyRef,{version:0,generation,operationId,owner,updatedAt:Timestamp.now()})
    })
    let scanned=0,changed=0
    await eachProperty(db,async doc=>{
      scanned++
      await db.runTransaction(async tx=>{
        await guard(tx)
        const current=await tx.get(doc.ref)
        if(!current.exists)return
        const prepared=prepareInsuranceNoticeRow(current.data(),{at,documentPath:doc.ref.path})
        if(prepared.changed)tx.update(doc.ref,prepared.projection)
        return prepared.changed
      }).then(didChange=>{if(didChange)changed++})
    })
    const verified=await inspectInsuranceNoticeMigration(db,{at})
    if(verified.changed||verified.blocked)throw Error('Migration verification failed; readiness remains closed')
    await beforePublish()
    await db.runTransaction(async tx=>{
      await guard(tx)
      tx.set(readyRef,{version:1,generation,operationId,owner,verifiedDocuments:verified.scanned,updatedAt:Timestamp.now()})
    })
    await journal.set({status:'complete',scanned,changed,verified:verified.scanned,completedAt:Timestamp.now()},{merge:true})
    complete=true
    return {scanned,changed,verified:verified.scanned,applied:true}
  } finally {
    // Failure leaves exact owner/lease visible. Resume requires proof that the prior worker ended.
    if(complete)await control.runTransaction(async tx=>{
      const held=await tx.get(lock)
      if(held.data()?.owner!==owner)throw Error('Migration lock ownership changed')
      tx.delete(lock);tx.delete(lease)
    })
  }
}
