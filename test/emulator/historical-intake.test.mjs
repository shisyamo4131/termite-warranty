import {mock} from 'node:test'
import test,{after} from 'node:test'
import assert from 'node:assert/strict'
import {initializeApp,deleteApp} from 'firebase-admin/app'
import {getFirestore,Timestamp} from 'firebase-admin/firestore'
import {getAuth} from 'firebase-admin/auth'
import {historicalFixture} from '../helpers/historical-intake.mjs'
import {prepareHistoricalIntake} from '../../scripts/lib/historical-intake-plan.mjs'
import {executeHistoricalIntake,inspectHistoricalTarget,verifyCompletedHistoricalIntake} from '../../scripts/lib/historical-intake-execution.mjs'
import {defaultRecovery} from '../../scripts/lib/default-recovery.mjs'
import {LOCAL_RUNTIME,localRuntimeHost} from '../helpers/emulator-runtime.mjs'
import {documentImage} from '../../scripts/lib/default-recovery.mjs'
import {captureIntakeSettings} from '../../scripts/lib/historical-intake-settings.mjs'
import {initializeProductionData,bindProductionAdministrator} from '../../scripts/lib/production-bootstrap-data.mjs'
if(process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort)||process.env.FIREBASE_AUTH_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.authPort))throw Error('Fictional emulator required')
const app=initializeApp({projectId:'demo-termite-warranty-test'},'historical-intake-tests'),db=getFirestore(app),control=getFirestore(app,'test-historical-control'),auth=getAuth(app)
after(()=>{mock.restoreAll();return deleteApp(app)})
mock.method(Timestamp,'now',()=>Timestamp.fromDate(new Date('2026-10-10T01:00:00.000Z')))
const state={protocol:2,generation:21,phase:'recovering',databaseId:'(default)',controlDatabaseId:'test-historical-control'}
const today='2026-10-10',input=historicalFixture(),planHash=prepareHistoricalIntake(input,{today}).planDigest
test('empty Prod bootstrap semantics: partial initial state resumes closed, existing business refuses and admin binding retains Auth',async()=>{
  for(const store of [db,control])for(const col of await store.listCollections())await store.recursiveDelete(col)
  const database=id=>id==='(default)'?db:control,controlId=control.databaseId,factory=defaultRecovery({database,auth,controlId,revision:'a'.repeat(40)})
  const initial={protocol:2,phase:'recovering',generation:1,databaseId:'(default)',controlDatabaseId:controlId}
  await db.doc('_recovery/access').create(initial)
  assert.equal((await initializeProductionData({database,controlId,factory})).initialized,true)
  assert.equal((await initializeProductionData({database,controlId,factory})).generation,1)
  const user=await auth.createUser({email:'bootstrap-fictional@example.invalid',password:'fictional-password'})
  const args={database,auth,controlId,generation:1,operation:'fictional-admin-bind',approval:'fictional-approval',input:{uid:user.uid,email:user.email,role:'developer_superuser',displayName:'架空管理者'}}
  let reads=0
  await assert.rejects(()=>bindProductionAdministrator({...args,auth:{getUser:async uid=>{if(++reads===2)throw Error('unknown response');return auth.getUser(uid)}}}))
  const owner=(await control.doc('recovery/operatorLock').get()).data().owner
  await assert.rejects(()=>bindProductionAdministrator({...args,resumeOwner:'wrong-owner',workerStopped:true}))
  assert.equal((await bindProductionAdministrator({...args,resumeOwner:owner,workerStopped:true})).authCreated,false)
  assert.equal((await db.doc('staffAccounts/'+user.uid).get()).data().role,'developer_superuser')
  assert.equal((await auth.getUser(user.uid)).email,user.email)
  assert.equal((await control.doc('recovery/runtime').get()).data().phase,'recovering')
  await assert.rejects(()=>initializeProductionData({database,controlId,factory}))
  await auth.deleteUser(user.uid)
})
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
test('Prod initial-only intake refuses populated business before locking and resumes exact first import without deletion',async()=>{
  const options=await fixture()
  await assert.rejects(()=>executeHistoricalIntake(db,control,auth,input,{...options,initialOnly:true}))
  assert.equal((await control.doc('recovery/operatorLock').get()).exists,false)
  assert.equal((await db.doc('propertyWarranties/old-fixture').get()).exists,true)
  await db.doc('warrantyGroups/old-fixture').delete();await db.doc('propertyWarranties/old-fixture').delete()
  options.inventoryHash=(await inspectHistoricalTarget(db,control,auth)).inventoryHash
  await assert.rejects(()=>executeHistoricalIntake(db,control,auth,input,{...options,initialOnly:true,afterCommit:async kind=>{if(kind==='journal')throw Error('interrupted')}}))
  const owner=(await control.doc('recovery/operatorLock').get()).data().owner
  await executeHistoricalIntake(db,control,auth,input,{...options,initialOnly:true,resumeOwner:owner,previousWorkerEnded:true})
  const receipt=(await db.doc('_recovery/historicalIntake').get()).data()
  assert.equal(receipt.initialOnly,true);assert.equal(receipt.deleted,0);assert.equal(receipt.status,'complete')
  await verifyCompletedHistoricalIntake(db,control,auth,{operationId:options.operationId,generation:options.generation,planHash})
  await assert.rejects(()=>executeHistoricalIntake(db,control,auth,input,{...options,operationId:'different-operation',initialOnly:true}))
  assert.equal((await db.collection('propertyWarranties').get()).size,442)
})
test('442 records: reset, import, idempotent rerun, reimport and guarded read-only/normal publication',async()=>{
  const options=await fixture(),before=await inspectHistoricalTarget(db,control,auth)
  const result=await executeHistoricalIntake(db,control,auth,input,options)
  assert.equal(result.properties,442);assert.equal(result.maintenanceRetained,true)
  assert.equal((await db.doc('prototypeSettings/insuranceReportQueries').get()).data().version,1)
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
test('reimport preserves company settings and group recipients exactly, including resumed deletion',async()=>{
  const options=await fixture(),profile={companyName:'架空会社',updatedAt:new Timestamp(1000,987000),updatedBy:'intake-developer'},billingRecipient={name:'架空請求先',department:'会計',contactPerson:'架空担当',postalCode:'1234567',address1:'架空住所',address2:'架空棟',telephone:'03-1234-5678',email:'billing@example.test'}
  const group=prepareHistoricalIntake(input,{today}).documents.find(r=>r.path==='warrantyGroups/HSC').data
  await db.doc('prototypeSettings/companyProfile').set(profile);await db.doc('warrantyGroups/HSC').set({...group,billingRecipient})
  const preservedInput={...input,preservedBusinessSettings:captureIntakeSettings(await documentImage(db))}
  options.planHash=prepareHistoricalIntake(preservedInput,{today}).planDigest
  options.inventoryHash=(await inspectHistoricalTarget(db,control,auth)).inventoryHash
  await assert.rejects(executeHistoricalIntake(db,control,auth,preservedInput,{...options,afterCommit:async kind=>{if(kind==='delete')throw Error('unknown result')}}))
  const owner=(await control.doc('recovery/operatorLock').get()).data().owner
  await executeHistoricalIntake(db,control,auth,preservedInput,{...options,resumeOwner:owner,previousWorkerEnded:true})
  assert.deepEqual((await db.doc('prototypeSettings/companyProfile').get()).data(),profile)
  assert.deepEqual((await db.doc('warrantyGroups/HSC').get()).data().billingRecipient,billingRecipient)
  await verifyCompletedHistoricalIntake(db,control,auth,{operationId:options.operationId,generation:options.generation,planHash:options.planHash})
  assert.equal((await db.doc('warrantyCounters/HSC_2026').get()).data().lastValue,99)
})
test('old input without settings preservation refuses before deleting existing business settings',async()=>{
  const options=await fixture();await db.doc('prototypeSettings/companyProfile').set({companyName:'保持する架空会社'})
  options.inventoryHash=(await inspectHistoricalTarget(db,control,auth)).inventoryHash
  await assert.rejects(executeHistoricalIntake(db,control,auth,input,options))
  assert.equal((await db.doc('prototypeSettings/companyProfile').get()).data().companyName,'保持する架空会社')
  assert.equal((await db.doc('propertyWarranties/old-fixture').get()).exists,true)
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

 test('intake refuses stale dates and writes expired-period waiver with actual operator audit',async()=>{
   const options=await fixture(),changed=structuredClone(input)
   changed.rows[0].fields.handoverDate='2018-07-08'
   const stale='2026-10-09'
   await assert.rejects(executeHistoricalIntake(db,control,auth,changed,{...options,today:stale,planHash:prepareHistoricalIntake(changed,{today:stale}).planDigest}))
   assert.equal((await db.doc('propertyWarranties/old-fixture').get()).exists,true)
   const retry=await fixture(),plan=prepareHistoricalIntake(changed,{today})
   await executeHistoricalIntake(db,control,auth,changed,{...retry,planHash:plan.planDigest})
   const path=plan.documents.find(doc=>doc.path.startsWith('propertyWarranties/')).path
   const row=(await db.doc(path).get()).data(),receipt=(await db.doc('_recovery/historicalIntake').get()).data()
   assert.deepEqual(row.insurancePeriods.map(period=>period.state),['waived','pending'])
   assert.equal(row.insuranceWaiverEvents[0].actorUid,'intake-developer')
   assert.equal(row.insuranceWaiverEvents[0].at,receipt.startedAt.toDate().toISOString())
 })
