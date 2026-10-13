import {createHash, randomUUID} from 'node:crypto'
import {FieldPath, Timestamp} from 'firebase-admin/firestore'
import {typed} from './default-recovery.mjs'
import {activeExtensions, normalizeExtensionApplication, warrantyTransactions} from '../../src/domain/property-warranty.mjs'
import {billingProjection} from '../../src/domain/billing-output.mjs'
import {assertInsuranceCapacity} from '../../src/domain/insurance-capacity.mjs'
import {fixedRuntimeState, sameFixedEpoch} from '../../src/domain/fixed-recovery.mjs'

const hash = value => createHash('sha256').update(JSON.stringify(typed(value))).digest('hex')
const key = (propertyId, eventId) => JSON.stringify([propertyId,eventId])
const kind = 'extension-application-migration'
const projection = row => ({...billingProjection(row),billingQueryMonths:row.status === 'active'
  ? [...new Set(warrantyTransactions(row).map(p=>p.billingDate.slice(0,7)).filter(m=>/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(m)))].sort() : []})

// No dates are inferred. Private identifiers and source references belong only in
// the operator's protected inventory/confirmation files, never in ordinary logs.
export function planExtensionApplications(documents, confirmations = []) {
  if(!Array.isArray(confirmations))throw Error('Confirmation array required')
  const supplied = new Map(), used = new Set(), rows = [], inventory = [], blocked = [], snapshot = []
  for(const entry of confirmations) {
    if(!entry || Object.keys(entry).sort().join(',') !== 'eventId,extensionApplicationDate,propertyId,sourceReference' ||
      ![entry.propertyId,entry.eventId].every(v=>typeof v==='string'&&v.length>0&&v.length<=1500&&!v.includes('/')) ||
      typeof entry.sourceReference!=='string'||!entry.sourceReference.trim()||entry.sourceReference.length>2000)throw Error('Confirmed date and source reference required')
    normalizeExtensionApplication(entry)
    const id=key(entry.propertyId,entry.eventId)
    if(supplied.has(id))throw Error('Duplicate confirmation')
    supplied.set(id,entry)
  }
  let effective=0,missing=0,undone=0
  for(const doc of [...documents].sort((a,b)=>a.id.localeCompare(b.id,'en'))) {
    const row=doc.data();snapshot.push({id:doc.id,hash:hash(row)})
    try {
      if(row.history!==undefined&&!Array.isArray(row.history))throw Error('invalid-history')
      const history=row.history??[], extensions=activeExtensions(row)
      if(history.some(e=>!e||typeof e!=='object'))throw Error('invalid-history')
      const all=history.filter(e=>e.kind==='extend'), ids=all.map(e=>e.requestId)
      if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw Error('ambiguous-event')
      if(history.some(e=>e.kind==='undoExtend'&&!ids.includes(e.targetRequestId)))throw Error('unmatched-undo')
      const periods=warrantyTransactions(row).slice(1)
      if(periods.length!==extensions.length||extensions.some(e=>periods.filter(p=>p.id===e.requestId).length!==1))throw Error('unmatched-period')
      effective+=extensions.length;undone+=all.length-extensions.length
      if(!extensions.length)continue
      if(!['active','cancelled'].includes(row.status)||!Number.isSafeInteger(row.revision)||row.revision<0||row.revision>=Number.MAX_SAFE_INTEGER)throw Error('invalid-state')
      const replacements=new Map()
      for(const event of extensions) {
        const id=key(doc.id,event.requestId)
        if(Object.hasOwn(event,'extensionApplicationDate')) {
          normalizeExtensionApplication({extensionApplicationDate:event.extensionApplicationDate})
          if(supplied.has(id))throw Error('existing-date-cannot-be-overwritten')
          continue
        }
        missing++
        const confirmed=supplied.get(id)
        inventory.push({propertyId:doc.id,eventId:event.requestId,extensionApplicationDate:null,sourceReference:null})
        if(!confirmed){blocked.push({propertyId:doc.id,code:'unconfirmed-date'});continue}
        used.add(id);replacements.set(event.requestId,confirmed.extensionApplicationDate)
      }
      const next={...row,history:history.map(e=>replacements.has(e.requestId)&&e.kind==='extend'?{...e,extensionApplicationDate:replacements.get(e.requestId)}:e)}
      const derived=projection(next)
      const changed=replacements.size>0||Object.entries(derived).some(([k,v])=>hash(row[k]??null)!==hash(v))
      if(changed) {
        const patch={history:next.history,...derived,revision:row.revision+1}, expected={...row,...patch}
        assertInsuranceCapacity(expected,{documentPath:'propertyWarranties/'+doc.id,today:'0001-01-01'})
        rows.push({id:doc.id,patch,originalHash:hash(row),expectedHash:hash(expected)})
      }
    } catch(error) {blocked.push({propertyId:doc.id,code:'invalid-or-unsupported-record'})}
  }
  if([...supplied.keys()].some(id=>!used.has(id)))throw Error('Unused, unsupported or already populated confirmation')
  const confirmationHash=hash([...supplied.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0))
  if(rows.length>100||Buffer.byteLength(JSON.stringify(typed(rows)))>7_000_000)blocked.push({code:'atomic-budget-exceeded'})
  return {scanned:documents.length,effective,missing,undone,changed:rows.length,blocked,inventory,rows,confirmationHash,
    planHash:hash({version:1,snapshot,confirmationHash,rows})}
}

export async function inspectExtensionApplications(db, confirmations=[]) {
  const page=await db.collection('propertyWarranties').orderBy(FieldPath.documentId()).limit(1001).get()
  if(page.size>1000)throw Error('Inventory exceeds reviewed 1000-document budget')
  return planExtensionApplications(page.docs,confirmations)
}

export async function migrateExtensionApplications(db,control,o) {
  if(db.projectId!==control.projectId||db.databaseId!=='(default)'||control.databaseId==='(default)'||
    !/^[\w-]{1,100}$/.test(o.operationId??'')||!/^[a-f0-9]{64}$/.test(o.planHash??'')||
    !Number.isSafeInteger(o.generation)||o.generation<1||o.writersDrained!==true)throw Error('Explicit migration identity and writer drain required')
  const assertState=(runtime,marker)=>{
    const a=fixedRuntimeState(runtime),b=fixedRuntimeState(marker)
    if(a.phase!=='recovering'||a.generation!==o.generation||a.controlDatabaseId!==control.databaseId||!sameFixedEpoch(a,b))throw Error('Matching recovering runtime required')
  }
  const owner=randomUUID(), lock=control.doc('recovery/operatorLock'), lease=control.doc('recoveryOperations/extension-application-'+o.operationId)
  const receipt=db.doc('_recovery/extensionApplicationMigration/receipts/'+o.operationId)
  // The empty inventory cannot validate supplied record identities; the initial
  // full plan validates those before lock acquisition (except committed replay).
  const done=(await receipt.get()).data()
  if(!done) {const plan=await inspectExtensionApplications(db,o.confirmations);if(plan.blocked.length||plan.planHash!==o.planHash)throw Error('Unconfirmed, unsupported or changed plan')}
  await control.runTransaction(async tx=>{
    const [held,runtime,operations]=await Promise.all([tx.get(lock),tx.get(control.doc('recovery/runtime')),tx.get(control.collection('recoveryOperations'))])
    assertState(runtime.data(),(await db.doc('_recovery/access').get()).data())
    const old=held.data()
    if(held.exists&&!(o.previousWorkerEnded===true&&o.resumeOwner===old.owner&&old.kind===kind&&old.operationId===o.operationId&&old.planHash===o.planHash&&old.generation===o.generation)||!held.exists&&o.resumeOwner)throw Error('Exact stopped owner required')
    if(operations.docs.some(d=>d.ref.path!==lease.path)||operations.docs.some(d=>d.data().owner!==old?.owner))throw Error('Outstanding operation prevents migration')
    const identity={kind,owner,operationId:o.operationId,planHash:o.planHash,generation:o.generation,startedAt:Timestamp.now()}
    tx.set(lock,identity);tx.set(lease,{...identity,protocol:2,mutation:true})
  })
  let complete=false
  try {
    await (o.beforeCommit??(async()=>{}))()
    const result=await db.runTransaction(async tx=>{
      const [marker,previous,page]=await Promise.all([tx.get(db.doc('_recovery/access')),tx.get(receipt),tx.get(db.collection('propertyWarranties').orderBy(FieldPath.documentId()).limit(1001))])
      const [runtime,held,leased]=await Promise.all([control.doc('recovery/runtime').get(),lock.get(),lease.get()])
      assertState(runtime.data(),marker.data())
      if(held.data()?.owner!==owner||leased.data()?.owner!==owner)throw Error('Migration owner changed')
      if(previous.exists) {
        const p=previous.data()
        if(p.planHash!==o.planHash||p.generation!==o.generation||p.confirmationsHash!==hash(o.confirmations??[]))throw Error('Receipt identity mismatch')
        if(p.rows.some(r=>{const d=page.docs.find(d=>d.id===r.id);return !d||hash(d.data())!==r.expectedHash}))throw Error('Committed records changed; manual inspection required')
        return {changed:p.rows.length,replayed:true}
      }
      if(page.size>1000)throw Error('Inventory budget exceeded')
      const plan=planExtensionApplications(page.docs,o.confirmations)
      if(plan.blocked.length||plan.planHash!==o.planHash)throw Error('Unconfirmed, unsupported or changed plan')
      for(const row of plan.rows)tx.update(db.doc('propertyWarranties/'+row.id),row.patch)
      tx.create(receipt,{version:1,operationId:o.operationId,planHash:o.planHash,generation:o.generation,confirmationsHash:hash(o.confirmations??[]),
        rows:plan.rows.map(({id,expectedHash})=>({id,expectedHash})),completedAt:Timestamp.now()})
      return {changed:plan.changed,replayed:false}
    })
    await (o.afterCommit??(async()=>{}))()
    complete=true
    return result
  } finally {
    // An uncertain commit keeps ownership visible. Only successful replay or
    // explicit stopped-worker release can remove it; never reopen maintenance.
    if(complete)await control.runTransaction(async tx=>{
      const [held,leased]=await Promise.all([tx.get(lock),tx.get(lease)])
      if(held.data()?.owner!==owner||leased.data()?.owner!==owner)throw Error('Release owner changed')
      tx.delete(lock);tx.delete(lease)
    })
  }
}

export async function stopExtensionApplicationMigration(control,{operationId,owner,previousWorkerEnded=false}) {
  if(control.databaseId==='(default)'||!previousWorkerEnded||!owner||!/^[\w-]{1,100}$/.test(operationId??''))throw Error('Exact stopped worker required')
  await control.runTransaction(async tx=>{
    const lock=control.doc('recovery/operatorLock'),lease=control.doc('recoveryOperations/extension-application-'+operationId)
    const [a,b]=await Promise.all([tx.get(lock),tx.get(lease)])
    if(a.data()?.kind!==kind||a.data()?.owner!==owner||a.data()?.operationId!==operationId||b.data()?.owner!==owner)throw Error('Release owner changed')
    tx.delete(lock);tx.delete(lease)
  })
  return {stopped:true,businessChanged:false}
}
