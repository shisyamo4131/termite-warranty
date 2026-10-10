import test,{after} from 'node:test'
import assert from 'node:assert/strict'
import {initializeApp,deleteApp} from 'firebase-admin/app'
import {getFirestore} from 'firebase-admin/firestore'
import {getAuth} from 'firebase-admin/auth'
import {historicalFixture} from '../helpers/historical-intake.mjs'
import {prepareHistoricalIntake} from '../../scripts/lib/historical-intake-plan.mjs'
import {executeHistoricalIntake,inspectHistoricalTarget,verifyCompletedHistoricalIntake} from '../../scripts/lib/historical-intake-execution.mjs'
import {defaultRecovery} from '../../scripts/lib/default-recovery.mjs'
import {LOCAL_RUNTIME,localRuntimeHost} from '../../src/config/local-emulator.mjs'
if(process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort)||process.env.FIREBASE_AUTH_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.authPort))throw Error('Fictional emulator required')
const app=initializeApp({projectId:'demo-termite-warranty'},'historical-intake-tests'),db=getFirestore(app),control=getFirestore(app,'test-historical-control'),auth=getAuth(app)
after(()=>deleteApp(app))
const state={protocol:2,generation:21,phase:'recovering',databaseId:'(default)',controlDatabaseId:'test-historical-control'}
const today='2026-10-10',input=historicalFixture(),planHash=prepareHistoricalIntake(input,{today}).planDigest
async function fixture(){
  for(const store of [db,control])for(const col of await store.listCollections())await store.recursiveDelete(col)
  let page;do{page=await auth.listUsers(1000);if(page.users.length)await auth.deleteUsers(page.users.map(u=>u.uid))}while(page.users.length)
  await auth.createUser({uid:'intake-developer',email:'intake@example.test',password:'fictional-password'})
  await db.doc('staffAccounts/intake-developer').set({enabled:true,role:'developer_superuser',email:'intake@example.test'})
  await db.doc('_recovery/access').set(state);await control.doc('recovery/runtime').set(state)
  await db.doc('warrantyGroups/old-fixture').set({name:'架空旧グループ'})
  await db.doc('propertyWarranties/old-fixture').set({name:'架空旧物件'})
  const inventory=await inspectHistoricalTarget(db,control,auth)
  return {today,planHash,inventoryHash:inventory.inventoryHash,generation:21,operationId:'fictional-intake-01',actorUid:'intake-developer'}
}
test('442 records: reset, import, idempotent rerun, reimport and guarded read-only/normal publication',async()=>{
  const options=await fixture(),before=await inspectHistoricalTarget(db,control,auth)
  const result=await executeHistoricalIntake(db,control,auth,input,options)
  assert.equal(result.properties,442);assert.equal(result.maintenanceRetained,true)
  assert.equal((await db.collection('propertyWarranties').orderBy('updatedAt','desc').limit(20).get()).size,20)
  assert.equal((await db.doc('propertyWarranties/old-fixture').get()).exists,false)
  assert.equal((await inspectHistoricalTarget(db,control,auth)).authorizationHash,before.authorizationHash)
  assert.deepEqual(await executeHistoricalIntake(db,control,auth,input,options),result)
  const current=await inspectHistoricalTarget(db,control,auth),second={...options,operationId:'fictional-intake-02',inventoryHash:current.inventoryHash}
  await executeHistoricalIntake(db,control,auth,input,second)
  assert.equal((await db.collection('propertyWarranties').get()).size,442)
  const api=defaultRecovery({database:id=>id==='(default)'?db:control,auth,controlId:control.databaseId,revision:'a'.repeat(40)})
  await api.planIntake(21,'fictional-publication',{intakeOperationId:second.operationId,intakePlanHash:planHash,approval:'fictional/intake'})
  assert.equal((await api.publish('fictional-publication','fictional/intake')).phase,'verification')
  assert.equal((await api.publish('fictional-publication','fictional/hs-reopen',{reopen:true})).phase,'normal')
})
test('unknown write result retains owner; wrong owner, changed input and concurrent execution are refused; exact resume succeeds',async()=>{
  const options=await fixture();let interrupted=false
  await assert.rejects(executeHistoricalIntake(db,control,auth,input,{...options,afterCommit:async kind=>{if(kind==='write'&&!interrupted){interrupted=true;throw Error('unknown result')}}}))
  const owner=(await control.doc('recovery/operatorLock').get()).data().owner
  await assert.rejects(executeHistoricalIntake(db,control,auth,input,options))
  await assert.rejects(executeHistoricalIntake(db,control,auth,input,{...options,resumeOwner:'wrong',previousWorkerEnded:true}))
  const changed=structuredClone(input);changed.rows[0].fields.name='changed'
  await assert.rejects(executeHistoricalIntake(db,control,auth,changed,{...options,resumeOwner:owner,previousWorkerEnded:true}))
  await executeHistoricalIntake(db,control,auth,input,{...options,resumeOwner:owner,previousWorkerEnded:true})
  await verifyCompletedHistoricalIntake(db,control,auth,{operationId:options.operationId,generation:21,planHash})
  const first=(await db.collection('propertyWarranties').limit(1).get()).docs[0];await first.ref.update({name:'tampered'})
  await assert.rejects(verifyCompletedHistoricalIntake(db,control,auth,{operationId:options.operationId,generation:21,planHash}))
})
test('normal mode, unknown roots, orphan subcollections and company accounts stop preparation',async()=>{
  const options=await fixture()
  await control.doc('recovery/runtime').update({phase:'normal'})
  await assert.rejects(executeHistoricalIntake(db,control,auth,input,options))
  await db.doc('unknownBusiness/example').set({fictional:true});await assert.rejects(inspectHistoricalTarget(db,control,auth));await db.doc('unknownBusiness/example').delete()
  await db.doc('properties/missing/children/example').set({fictional:true});await assert.rejects(inspectHistoricalTarget(db,control,auth));await db.recursiveDelete(db.doc('properties/missing'))
  await db.doc('constructionCompanyAccounts/future-portal').set({enabled:false});await assert.rejects(inspectHistoricalTarget(db,control,auth))
})
test('unplanned data at a future destination is retained rather than overwritten on write resume',async()=>{
  const options=await fixture()
  await assert.rejects(executeHistoricalIntake(db,control,auth,input,{...options,afterCommit:async kind=>{if(kind==='write')throw Error('stopped')}}))
  const destination=prepareHistoricalIntake(input,{today}).documents.filter(row=>row.path.startsWith('propertyWarranties/')).at(-1).path
  await db.doc(destination).create({mustRetain:true})
  const owner=(await control.doc('recovery/operatorLock').get()).data().owner
  await assert.rejects(executeHistoricalIntake(db,control,auth,input,{...options,resumeOwner:owner,previousWorkerEnded:true}))
  assert.equal((await db.doc(destination).get()).data().mustRetain,true)
})
test('lock/journal unknown responses resume without resetting identity or losing accounts',async()=>{
  for(const boundary of ['lock','journal']) {
    const options=await fixture();let once=false
    await assert.rejects(executeHistoricalIntake(db,control,auth,input,{...options,afterCommit:async kind=>{if(kind===boundary&&!once){once=true;throw Error('response lost')}}}))
    const owner=(await control.doc('recovery/operatorLock').get()).data().owner
    await executeHistoricalIntake(db,control,auth,input,{...options,resumeOwner:owner,previousWorkerEnded:true})
    const first=(await db.collection('propertyWarranties').limit(1).get()).docs[0].data()
    assert.equal(typeof first.history[0].at,'string');assert.ok(Number.isFinite(new Date(first.history[0].at).getTime()))
  }
})
test('new or changed known business data after interrupted deletion is preserved and blocks resume',async()=>{
  for(const change of ['added','changed']) {
    const options=await fixture()
    // More than one deletion chunk; last row remains when the first chunk stops.
    const batch=db.batch();for(let n=0;n<110;n++)batch.set(db.doc('properties/fake-'+String(n).padStart(3,'0')),{fictional:n});await batch.commit()
    options.inventoryHash=(await inspectHistoricalTarget(db,control,auth)).inventoryHash
    await assert.rejects(executeHistoricalIntake(db,control,auth,input,{...options,afterCommit:async kind=>{if(kind==='delete')throw Error('stopped')}}))
    const path=change==='added'?'properties/new-unplanned':'properties/fake-109';await db.doc(path).set({mustRetain:true})
    const owner=(await control.doc('recovery/operatorLock').get()).data().owner
    await assert.rejects(executeHistoricalIntake(db,control,auth,input,{...options,resumeOwner:owner,previousWorkerEnded:true}))
    assert.equal((await db.doc(path).get()).data().mustRetain,true)
  }
})
