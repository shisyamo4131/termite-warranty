import {createHash, randomUUID} from 'node:crypto'
import {FieldPath, Timestamp} from 'firebase-admin/firestore'
import {materializeInsuranceState, insuranceProjection, validateInsuranceState} from '../../src/domain/insurance-state.mjs'
import {assertInsuranceCapacity} from '../../src/domain/insurance-capacity.mjs'
import {monthlyQueryProjection} from '../../src/domain/monthly-query.mjs'
import {fixedRuntimeState, sameFixedEpoch} from '../../src/domain/fixed-recovery.mjs'
import {typed} from './default-recovery.mjs'

const digest=value=>createHash('sha256').update(JSON.stringify(typed(value))).digest('hex')
const jstDate=at=>new Date(new Date(at).getTime()+9*3600000).toISOString().slice(0,10)
export function prepareDashboardRow(row,{at,documentPath}) {
  const next=materializeInsuranceState(row,{at,sourceFingerprint:digest(row)})
  Object.assign(next,monthlyQueryProjection(next),insuranceProjection(next))
  if(row.insuranceStateVersion!==1) {
    if(!Number.isSafeInteger(row.revision??0)||(row.revision??0)<0||(row.revision??0)>=Number.MAX_SAFE_INTEGER)throw Error('Invalid revision')
    next.revision=(row.revision??0)+1
  }
  const errors=validateInsuranceState(next,{today:jstDate(at)})
  if(errors.length)throw Error('Insurance state requires review: '+errors.join(', '))
  assertInsuranceCapacity(next,{documentPath,today:jstDate(at)})
  return {next,changed:digest(row)!==digest(next)}
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
export async function inspectDashboardMigration(db,{at=new Date().toISOString()}={}) {
  const result={scanned:0,changed:0,blocked:0}
  await eachProperty(db,async doc=>{
    result.scanned++
    try {if(prepareDashboardRow(doc.data(),{at,documentPath:doc.ref.path}).changed)result.changed++}
    catch {result.blocked++} // Never emit names, records, reasons or private IDs into a public run log.
  })
  return result
}

// A terminated worker can relinquish only its exact control records, even after
// an emergency generation change. Never reopen readiness or rewrite business data.
export async function stopDashboardMigration(control,{operationId,owner,previousWorkerEnded=false}={}) {
  if(control.databaseId==='(default)'||!previousWorkerEnded||!owner||!/^[\w-]{1,100}$/.test(operationId??''))throw Error('Exact stopped-worker identity required')
  return control.runTransaction(async tx=>{
    const lock=control.doc('recovery/operatorLock'),lease=control.doc('recoveryOperations/dashboard-'+operationId),journal=control.doc('dashboardMigrations/'+operationId)
    const [held,operation]=await Promise.all([tx.get(lock),tx.get(lease)])
    if(held.data()?.kind!=='dashboard-migration'||held.data()?.owner!==owner||held.data()?.operationId!==operationId||operation.data()?.owner!==owner||operation.data()?.generation!==held.data()?.generation)throw Error('Migration owner changed')
    tx.set(journal,{status:'stopped',stoppedAt:Timestamp.now()},{merge:true})
    tx.delete(lock);tx.delete(lease)
    return {stopped:true,readinessChanged:false}
  })
}

// Developer-operated, idempotent migration; no old-state rollback and no business-history synthesis.
export async function migrateDashboard(db,control,{generation,operationId,at=new Date().toISOString(),resumeOwner,previousWorkerEnded=false,beforePublish=async()=>{}}={}) {
  if(db.projectId!==control.projectId||db.databaseId!=='(default)'||control.databaseId==='(default)'||!Number.isSafeInteger(generation)||generation<1||!/^[\w-]{1,100}$/.test(operationId??''))throw Error('Explicit matching migration identity required')
  const owner=randomUUID(), lock=control.doc('recovery/operatorLock'), lease=control.doc('recoveryOperations/dashboard-'+operationId)
  const journal=control.doc('dashboardMigrations/'+operationId), insuranceReady=db.doc('prototypeSettings/insuranceStates'), dashboardReady=db.doc('prototypeSettings/dashboard')
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
    if(held.exists&&!(previousWorkerEnded&&resumeOwner===old.owner&&old.kind==='dashboard-migration'&&old.operationId===operationId&&old.generation===generation)||!held.exists&&resumeOwner)throw Error('Inspect prior worker before resuming migration')
    tx.set(lock,{kind:'dashboard-migration',owner,operationId,generation,startedAt:Timestamp.now()})
    tx.set(lease,{protocol:2,generation,mutation:true,operationId,owner,startedAt:Timestamp.now()})
    tx.set(journal,{version:1,generation,operationId,owner,status:'running',startedAt:Timestamp.now()},{merge:true})
  })
  let complete=false
  const guard=async tx=>{
    const marker=await tx.get(db.doc('_recovery/access'))
    const [state,held]=await Promise.all([control.doc('recovery/runtime').get(),lock.get()])
    assertNormal(state.data(),marker.data())
    if(held.data()?.owner!==owner)throw Error('Migration owner changed')
  }
  try {
    // Never leave an old ready flag visible during a repair or interrupted migration.
    await db.runTransaction(async tx=>{
      await guard(tx)
      const value={version:0,generation,operationId,updatedAt:Timestamp.now()}
      tx.set(insuranceReady,value);tx.set(dashboardReady,value)
    })
    let scanned=0,changed=0
    await eachProperty(db,async doc=>{
      scanned++
      await db.runTransaction(async tx=>{
        await guard(tx)
        const current=await tx.get(doc.ref)
        if(!current.exists)return
        const prepared=prepareDashboardRow(current.data(),{at,documentPath:doc.ref.path})
        if(prepared.changed)tx.set(doc.ref,prepared.next)
        return prepared.changed
      }).then(didChange=>{if(didChange)changed++})
    })
    const verified=await inspectDashboardMigration(db,{at})
    if(verified.changed||verified.blocked)throw Error('Migration verification failed; readiness remains closed')
    await beforePublish()
    await db.runTransaction(async tx=>{
      await guard(tx)
      const [i,d]=await Promise.all([tx.get(insuranceReady),tx.get(dashboardReady)])
      if([i,d].some(s=>s.data()?.operationId!==operationId||s.data()?.generation!==generation||s.data()?.version!==0))throw Error('Readiness operation changed')
      const ready={version:1,generation,operationId,verifiedDocuments:verified.scanned,updatedAt:Timestamp.now()}
      tx.set(insuranceReady,ready);tx.set(dashboardReady,ready)
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
