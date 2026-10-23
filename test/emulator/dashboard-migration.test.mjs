import {inspectInsuranceNoticeMigration,migrateInsuranceNotices,stopInsuranceNoticeMigration} from '../../scripts/lib/insurance-notice-migration.mjs'
import {insuranceNoticeProjection} from '../../src/domain/insurance-notice-query.mjs'
import assert from 'node:assert/strict'
import {after,test} from 'node:test'
import {initializeApp,deleteApp} from 'firebase-admin/app'
import {getFirestore,Timestamp} from 'firebase-admin/firestore'
import {inspectDashboardMigration,migrateDashboard,stopDashboardMigration} from '../../scripts/lib/dashboard-migration.mjs'
import {coveragePeriods,initialInsurance} from '../../src/domain/property-warranty.mjs'
import {insuranceProjectionMatches,validateInsuranceState} from '../../src/domain/insurance-state.mjs'
import {propertyPrototypeOperation} from '../../functions/property-warranty.js'
import {LOCAL_RUNTIME,localRuntimeHost} from '../helpers/emulator-runtime.mjs'

if(process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort))throw Error('Dedicated fictional emulator required')
const app=initializeApp({projectId:'demo-termite-warranty-test'},'dashboard-migration-tests')
const db=getFirestore(app),control=getFirestore(app,'test-dashboard-migration-control')
const state={protocol:2,phase:'normal',generation:11,databaseId:'(default)',controlDatabaseId:'test-dashboard-migration-control'}
const at='2026-10-10T03:00:00.000Z',operationId='fictional-dashboard-migration'
const options={generation:11,operationId,at}
const ref=db.doc('propertyWarranties/fictional-dashboard-property')
after(()=>deleteApp(app))
async function fixture() {
  assert.equal(db.projectId,'demo-termite-warranty-test')
  // This file belongs to the reviewed serial shared worker; all records are fictional.
  for(const store of [db,control])for(const collection of await store.listCollections())await store.recursiveDelete(collection)
  await control.doc('recovery/runtime').set(state)
  await db.doc('_recovery/access').set(state)
  await db.doc('staffAccounts/migration-hs').set({enabled:true,role:'house_solution_administrator'})
  const periods=coveragePeriods('2026-10-01',10)
  const row={name:'架空引継ぎ物件',status:'active',revision:3,applicationDate:'2026-10-01',handoverDate:'2026-10-01',startDate:'2026-10-01',expiryDate:'2036-09-30',years:10,maxYears:20,periods,warrantyNotified:false,history:[{kind:'register',requestId:'fictional-registration',date:'2026-10-01'}],insuranceEvents:[],insuranceHistoryIncomplete:false,billingItems:[{id:'initial',...periods[0],state:'pending'}],createdAt:Timestamp.fromMillis(1000),updatedAt:Timestamp.fromMillis(2000),...initialInsurance('2026-10-01')}
  await ref.set(row)
  return row
}
async function readiness() {
  return Promise.all(['insuranceStates','dashboard'].map(async name=>(await db.doc('prototypeSettings/'+name).get()).data()))
}

test('dashboard migration preserves business history and freshness, increments revision only once and publishes verified readiness',async()=>{
  const old=await fixture()
  assert.deepEqual(await inspectDashboardMigration(db,{at}),{scanned:1,changed:1,blocked:0})
  assert.deepEqual((await ref.get()).data(),old)
  assert.deepEqual(await migrateDashboard(db,control,options),{scanned:1,changed:1,verified:1,applied:true})
  const saved=(await ref.get()).data()
  assert.equal(saved.revision,4)
  for(const field of ['history','insuranceEvents','billingItems','createdAt','updatedAt','name','handoverDate','startDate','expiryDate'])assert.deepEqual(saved[field],old[field],field)
  assert.deepEqual(saved.insurancePeriods.map(period=>period.state),['pending','pending'])
  assert.deepEqual(validateInsuranceState(saved,{today:'2026-10-10'}),[])
  assert.equal(insuranceProjectionMatches(saved),true)
  assert.equal(saved.insuranceMigration.previousRevision,3)
  assert.ok(saved.insuranceMigration.sourceFingerprint)
  for(const ready of await readiness())assert.deepEqual({version:ready.version,generation:ready.generation,operationId:ready.operationId,verifiedDocuments:ready.verifiedDocuments},{version:1,generation:11,operationId,verifiedDocuments:1})
  assert.equal((await control.doc('recovery/operatorLock').get()).exists,false)
  assert.equal((await control.doc('recoveryOperations/dashboard-'+operationId).get()).exists,false)
  assert.deepEqual(await migrateDashboard(db,control,options),{scanned:1,changed:0,verified:1,applied:true})
  assert.deepEqual((await ref.get()).data(),saved)
})

test('interrupted publication retains converted data and closed readiness; only exact terminated owner can resume',async()=>{
  await fixture()
  await assert.rejects(migrateDashboard(db,control,{...options,beforePublish:async()=>{throw Error('Fictional publication interruption')}}),/publication interruption/)
  const converted=(await ref.get()).data(),held=(await control.doc('recovery/operatorLock').get()).data()
  assert.equal(converted.revision,4)
  for(const ready of await readiness())assert.equal(ready.version,0)
  assert.ok(held.owner)
  assert.equal((await control.doc('recoveryOperations/dashboard-'+operationId).get()).exists,true)
  await assert.rejects(migrateDashboard(db,control,options),/prior worker/)
  await assert.rejects(migrateDashboard(db,control,{...options,resumeOwner:'wrong-owner',previousWorkerEnded:true}),/prior worker/)
  assert.deepEqual((await ref.get()).data(),converted)
  assert.deepEqual(await migrateDashboard(db,control,{...options,resumeOwner:held.owner,previousWorkerEnded:true}),{scanned:1,changed:0,verified:1,applied:true})
  assert.deepEqual((await ref.get()).data(),converted)
  for(const ready of await readiness())assert.equal(ready.version,1)
  assert.equal((await control.doc('recovery/operatorLock').get()).exists,false)
})

test('recovery generation change prevents publication and resumption; exact stopped owner releases only migration control records',async()=>{
  await fixture()
  await assert.rejects(migrateDashboard(db,control,{...options,beforePublish:async()=>{
    await control.doc('recovery/runtime').update({generation:12})
    await db.doc('_recovery/access').update({generation:12})
  }}),/generation changed/)
  const held=(await control.doc('recovery/operatorLock').get()).data(),converted=(await ref.get()).data(),closed=await readiness()
  for(const ready of closed)assert.equal(ready.version,0)
  await assert.rejects(migrateDashboard(db,control,{...options,resumeOwner:held.owner,previousWorkerEnded:true}),/generation changed/)
  await assert.rejects(migrateDashboard(db,control,{...options,generation:12,resumeOwner:held.owner,previousWorkerEnded:true}),/identity reused/)
  await assert.rejects(stopDashboardMigration(control,{operationId,owner:'wrong-owner',previousWorkerEnded:true}),/owner changed/)
  await assert.rejects(stopDashboardMigration(control,{operationId,owner:held.owner}),/stopped-worker/)
  assert.deepEqual(await stopDashboardMigration(control,{operationId,owner:held.owner,previousWorkerEnded:true}),{stopped:true,readinessChanged:false})
  assert.deepEqual(await readiness(),closed)
  assert.deepEqual((await ref.get()).data(),converted)
  assert.equal((await control.doc('recovery/operatorLock').get()).exists,false)
  assert.equal((await control.doc('recoveryOperations/dashboard-'+operationId).get()).exists,false)
  assert.equal((await control.doc('dashboardMigrations/'+operationId).get()).data().status,'stopped')
  assert.equal((await db.doc('_recovery/access').get()).data().generation,12)
})

test('normal business save between conversion and publication survives readiness and migration replay',async()=>{
  const old=await fixture()
  let businessSaved
  const result=await migrateDashboard(db,control,{...options,beforePublish:async()=>{
    const converted=(await ref.get()).data()
    assert.equal(converted.revision,4)
    await propertyPrototypeOperation({},db,{action:'notify',operationProtocol:2,id:ref.id,revision:converted.revision,requestId:'fictional-notify-before-publication',notified:true},'migration-hs')
    businessSaved=(await ref.get()).data()
    assert.equal(businessSaved.revision,5)
    assert.equal(businessSaved.warrantyNotified,true)
    assert.equal(businessSaved.warrantyNoticePending,false)
    assert.deepEqual(businessSaved.history,old.history)
    assert.deepEqual(businessSaved.insurancePeriods,converted.insurancePeriods)
  }})
  assert.deepEqual(result,{scanned:1,changed:1,verified:1,applied:true})
  assert.deepEqual((await ref.get()).data(),businessSaved)
  assert.equal((await migrateDashboard(db,control,options)).changed,0)
  assert.deepEqual((await ref.get()).data(),businessSaved)
  for(const ready of await readiness())assert.equal(ready.version,1)
})

test('conversion rereads latest business save after its enumeration snapshot instead of overwriting it',async()=>{
  const old=await fixture()
  let transactionNumber=0,businessSaved
  const concurrent=new Proxy(db,{get(target,key){
    if(key==='runTransaction')return async callback=>{
      // First transaction closes readiness; second processes the already enumerated property.
      if(++transactionNumber===2) {
        await propertyPrototypeOperation({},db,{action:'notify',operationProtocol:2,id:ref.id,revision:3,requestId:'fictional-notify-after-enumeration',notified:true},'migration-hs')
        businessSaved=(await ref.get()).data()
      }
      return target.runTransaction(callback)
    }
    const value=target[key];return typeof value==='function'?value.bind(target):value
  }})
  assert.deepEqual(await migrateDashboard(concurrent,control,options),{scanned:1,changed:0,verified:1,applied:true})
  assert.equal(businessSaved.revision,4)
  assert.equal(businessSaved.warrantyNotified,true)
  assert.equal(businessSaved.warrantyNoticePending,false)
  assert.deepEqual(businessSaved.history,old.history)
  assert.deepEqual((await ref.get()).data(),businessSaved)
  assert.equal((await migrateDashboard(db,control,options)).changed,0)
  assert.deepEqual((await ref.get()).data(),businessSaved)
})


test('notice-only migration preserves every business value and replays without rewriting documents',async()=>{
  const old=await fixture()
  assert.deepEqual(await inspectInsuranceNoticeMigration(db),{scanned:1,changed:1,blocked:0})
  assert.deepEqual((await ref.get()).data(),old)
  assert.deepEqual(await migrateInsuranceNotices(db,control,options),{scanned:1,changed:1,verified:1,applied:true})
  const saved=await ref.get(),{insuranceNoticeQueryVersion,insuranceNoticeQueryExpiry,...business}=saved.data()
  assert.deepEqual(business,old);assert.equal(insuranceNoticeQueryVersion,1);assert.equal(insuranceNoticeQueryExpiry,'2031-09-30')
  assert.equal((await db.doc('prototypeSettings/insuranceStates').get()).exists,false)
  assert.equal((await db.doc('prototypeSettings/insuranceNoticeQueries').get()).data().version,1)
  assert.equal((await migrateInsuranceNotices(db,control,options)).changed,0)
  assert.ok((await ref.get()).updateTime.isEqual(saved.updateTime))
})

test('notice migration refuses overlapping owners and resumes only after prior worker ends',async()=>{
  await fixture()
  await assert.rejects(migrateInsuranceNotices(db,control,{...options,beforePublish:async()=>{throw Error('interrupted')}}),/interrupted/)
  const held=(await control.doc('recovery/operatorLock').get()).data()
  assert.equal((await db.doc('prototypeSettings/insuranceNoticeQueries').get()).data().version,0)
  await assert.rejects(migrateInsuranceNotices(db,control,options),/prior worker/)
  await assert.rejects(stopInsuranceNoticeMigration(control,{operationId,owner:held.owner}),/stopped-worker/)
  assert.equal((await migrateInsuranceNotices(db,control,{...options,resumeOwner:held.owner,previousWorkerEnded:true})).changed,0)
  assert.equal((await control.doc('recoveryOperations/insurance-notice-'+operationId).get()).exists,false)
})

test('notice publication refuses changed readiness owner and recovery generation',async()=>{
  for(const change of ['ready','generation']){
    await fixture()
    await assert.rejects(migrateInsuranceNotices(db,control,{...options,beforePublish:async()=>{
      if(change==='ready')await db.doc('prototypeSettings/insuranceNoticeQueries').update({owner:'different'})
      else {await control.doc('recovery/runtime').update({generation:12});await db.doc('_recovery/access').update({generation:12})}
    }}),/changed/)
    assert.equal((await db.doc('prototypeSettings/insuranceNoticeQueries').get()).data().version,0)
    const held=(await control.doc('recovery/operatorLock').get()).data()
    await stopInsuranceNoticeMigration(control,{operationId,owner:held.owner,previousWorkerEnded:true})
    assert.equal((await db.doc('prototypeSettings/insuranceNoticeQueries').get()).data().version,0)
  }
})

test('notice migration rereads updates and deletions and admits projected new records before publication',async()=>{
  for(const change of ['update','delete']){
    await fixture();let count=0
    const concurrent=new Proxy(db,{get(target,key){
      if(key==='runTransaction')return async callback=>{
        if(++count===2){if(change==='delete')await ref.delete();else await ref.update({insuranceExpiryDate:'2032-02-29',revision:9})}
        return target.runTransaction(callback)
      }
      const value=target[key];return typeof value==='function'?value.bind(target):value
    }})
    await migrateInsuranceNotices(concurrent,control,{...options,beforePublish:async()=>{
      const draft={status:'draft',revision:1};await db.doc('propertyWarranties/new-draft').set({...draft,...insuranceNoticeProjection(draft)})
    }})
    const current=await ref.get()
    if(change==='delete')assert.equal(current.exists,false)
    else {assert.equal(current.data().revision,9);assert.equal(current.data().insuranceNoticeQueryExpiry,'2032-02-29')}
    assert.deepEqual(await inspectInsuranceNoticeMigration(db),{scanned:change==='delete'?1:2,changed:0,blocked:0})
  }
})

test('invalid notice source blocks publication without inventing replacement business dates',async()=>{
  await fixture();await ref.update({insuranceExpiryDate:'2026-02-30'})
  const old=(await ref.get()).data()
  assert.deepEqual(await inspectInsuranceNoticeMigration(db),{scanned:1,changed:0,blocked:1})
  await assert.rejects(migrateInsuranceNotices(db,control,options))
  assert.deepEqual((await ref.get()).data(),old)
  assert.equal((await db.doc('prototypeSettings/insuranceNoticeQueries').get()).data().version,0)
})
