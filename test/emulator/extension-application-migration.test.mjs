import '../helpers/emulator-runtime.mjs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {initializeApp} from 'firebase-admin/app'
import {getFirestore} from 'firebase-admin/firestore'
import {planExtensionApplications,inspectExtensionApplications,migrateExtensionApplications,stopExtensionApplicationMigration} from '../../scripts/lib/extension-application-migration.mjs'
import {billingCsv,pendingBillingRows} from '../../src/domain/billing-output.mjs'
const app=initializeApp({projectId:'demo-termite-warranty-test'},'extension-migration-tests'),db=getFirestore(app),control=getFirestore(app,'extension-migration-control')
const state={protocol:2,phase:'recovering',generation:10,databaseId:'(default)',controlDatabaseId:'extension-migration-control'}
const ref=db.doc('propertyWarranties/fictional-extension'),confirmation={propertyId:ref.id,eventId:'extension-1',extensionApplicationDate:'2025-08-31',sourceReference:'fictional confirmed application'}
const row=()=>({status:'active',revision:3,years:20,maxYears:30,applicationDate:'2016-09-01',handoverDate:'2016-10-01',warrantyNumber:'FICTION-001',
  history:[{kind:'extend',requestId:'undone-extension',before:{years:10},date:'2025-01-01',reason:'preserve'},
    {kind:'undoExtend',requestId:'undo-1',targetRequestId:'undone-extension'},
    {kind:'extend',requestId:'extension-1',before:{years:10},date:'2025-09-01',reason:''}],
  billingItems:[{id:'initial',state:'billed'},{id:'extension-1',state:'pending'}],
  billingQueryVersion:1,billingPendingMonth:'2026-10',billingQueryMonths:['2016-09','2026-10'],insuranceQueryStart:'preserve',updatedAt:'preserve'})
async function fixture(){for(const store of [db,control])for(const root of await store.listCollections())await store.recursiveDelete(root);await control.doc('recovery/runtime').set(state);await db.doc('_recovery/access').set(state);await ref.set(row());const p=await inspectExtensionApplications(db,[confirmation]);return {generation:10,operationId:'fictional-migration',planHash:p.planHash,confirmations:[confirmation],writersDrained:true}}
test('extension inventory rejects missing, fabricated, duplicate, overwritten and unidentifiable dates',()=>{
  const docs=[{id:ref.id,data:row}]
  const p=planExtensionApplications(docs);assert.equal(p.missing,1);assert.equal(p.undone,1);assert.equal(p.blocked.length,1)
  assert.throws(()=>planExtensionApplications(docs,[{...confirmation,extensionApplicationDate:'2025-02-29'}]))
  assert.throws(()=>planExtensionApplications(docs,[{...confirmation,sourceReference:''}]))
  assert.throws(()=>planExtensionApplications(docs,[confirmation,confirmation]))
  assert.throws(()=>planExtensionApplications(docs,[{...confirmation,eventId:'undone-extension'}]))
  const existing=row();existing.history[2].extensionApplicationDate='2025-09-01'
  assert.throws(()=>planExtensionApplications([{id:ref.id,data:()=>existing}],[confirmation]))
  const unsupported=row();unsupported.history=[]
  assert.equal(planExtensionApplications([{id:ref.id,data:()=>unsupported}]).blocked.length,1)
})
test('confirmed extension migration changes only effective dates, revision and billing projection; replay is idempotent',async()=>{
  const o=await fixture(),old=(await ref.get()).data()
  assert.deepEqual(await migrateExtensionApplications(db,control,o),{changed:1,replayed:false})
  const actual=(await ref.get()).data(),expected=structuredClone(old)
  expected.history[2].extensionApplicationDate=confirmation.extensionApplicationDate;expected.revision=4;expected.billingPendingMonth='2025-08';expected.billingQueryMonths=['2016-09','2025-08']
  assert.deepEqual(actual,expected)
  assert.match(billingCsv(pendingBillingRows([actual],'2025-08')),/2025-08-31/)
  assert.deepEqual(await migrateExtensionApplications(db,control,o),{changed:1,replayed:true})
  assert.deepEqual((await ref.get()).data(),actual)
  assert.equal((await control.doc('recovery/operatorLock').get()).exists,false)
})
test('normal mode, undrained writers and outstanding operations block extension migration',async()=>{
  const o=await fixture();await assert.rejects(migrateExtensionApplications(db,control,{...o,writersDrained:false}),/drain/)
  await control.doc('recovery/runtime').update({phase:'normal'});await assert.rejects(migrateExtensionApplications(db,control,o),/recovering/)
  await control.doc('recovery/runtime').set(state);await control.doc('recoveryOperations/fictional-active').set({owner:'other'})
  await assert.rejects(migrateExtensionApplications(db,control,o),/Outstanding/);assert.deepEqual((await ref.get()).data(),row())
})
test('post-plan changes abort all writes and exact stopped owner is required to release',async()=>{
  const o=await fixture()
  await assert.rejects(migrateExtensionApplications(db,control,{...o,beforeCommit:async()=>ref.update({notes:'changed'})}),/changed plan/)
  assert.equal((await ref.get()).data().history[2].extensionApplicationDate,undefined)
  const held=(await control.doc('recovery/operatorLock').get()).data()
  await assert.rejects(stopExtensionApplicationMigration(control,{operationId:o.operationId,owner:'wrong',previousWorkerEnded:true}),/owner/)
  await stopExtensionApplicationMigration(control,{operationId:o.operationId,owner:held.owner,previousWorkerEnded:true})
  assert.equal((await control.doc('recovery/runtime').get()).data().phase,'recovering')
})
test('unknown commit result retains lock and exact resume verifies atomic receipt',async()=>{
  const o=await fixture();await assert.rejects(migrateExtensionApplications(db,control,{...o,afterCommit:async()=>{throw Error('lost result')}}),/lost result/)
  const held=(await control.doc('recovery/operatorLock').get()).data()
  await assert.rejects(migrateExtensionApplications(db,control,o),/owner/)
  await assert.rejects(migrateExtensionApplications(db,control,{...o,resumeOwner:held.owner,previousWorkerEnded:true,confirmations:[{...confirmation,sourceReference:'different'}]}),/Receipt/)
  const held2=(await control.doc('recovery/operatorLock').get()).data()
  assert.equal((await migrateExtensionApplications(db,control,{...o,resumeOwner:held2.owner,previousWorkerEnded:true})).replayed,true)
  assert.equal((await ref.get()).data().revision,4)
})
test('cancelled properties retain dates for restoration while billing remains excluded',async()=>{
  await fixture();await ref.update({status:'cancelled'})
  const p=await inspectExtensionApplications(db,[confirmation])
  await migrateExtensionApplications(db,control,{generation:10,operationId:'cancelled-operation',planHash:p.planHash,confirmations:[confirmation],writersDrained:true})
  const actual=(await ref.get()).data();assert.equal(actual.history[2].extensionApplicationDate,'2025-08-31');assert.equal(actual.billingPendingMonth,'');assert.deepEqual(actual.billingQueryMonths,[])
})
