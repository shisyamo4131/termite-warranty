import '../helpers/emulator-runtime.mjs'
import { test,after } from 'node:test'
import assert from 'node:assert/strict'
import {initializeApp,deleteApp} from 'firebase-admin/app'
import {getFirestore} from 'firebase-admin/firestore'
import {inspectPropertyAddresses,applyPropertyAddresses,rollbackPropertyAddresses} from '../../scripts/lib/property-address-migration.mjs'
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:38080')throw Error('Fictional emulator required')
const app=initializeApp({projectId:'demo-termite-warranty-test'},'address-migration-test'),db=getFirestore(app),control=getFirestore(app,'test-address-control')
after(()=>deleteApp(app))
async function fixture(){
 for(const store of [db,control])for(const root of await store.listCollections())await store.recursiveDelete(root)
 const state={protocol:2,phase:'recovering',generation:9,databaseId:'(default)',controlDatabaseId:control.databaseId}
 await db.doc('_recovery/access').set(state);await control.doc('recovery/runtime').set(state)
 await db.doc('propertyWarranties/fictional-address').set({prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'1-1',postalCode:'1000001',buildingName:'架空棟',warrantyNumber:'QA-26-001',revision:4,history:[{kind:'register'}]})
 const plan=await inspectPropertyAddresses(db)
 return {operationId:'address-fixture',generation:9,planHash:plan.hash}
}
test('migration rejects wrong control, stale plan and undrained work without business changes',async()=>{
 const input=await fixture(),before=(await db.doc('propertyWarranties/fictional-address').get()).data()
 const wrong=getFirestore(app,'test-address-wrong')
 await wrong.doc('recovery/runtime').set((await control.doc('recovery/runtime').get()).data())
 await assert.rejects(applyPropertyAddresses(db,wrong,input),/maintenance/)
 await control.doc('recoveryOperations/running').set({generation:9})
 await assert.rejects(applyPropertyAddresses(db,control,input),/drain/)
 await control.doc('recoveryOperations/running').delete()
 await db.doc('propertyWarranties/fictional-address').update({name:'架空変更'})
 await assert.rejects(applyPropertyAddresses(db,control,input),/plan changed/)
 assert.equal((await control.doc('recovery/operatorLock').get()).exists,false)
 assert.deepEqual((await db.doc('propertyWarranties/fictional-address').get()).data(),{...before,name:'架空変更'})
})
test('migration reconciles a lost postcommit response only with exact stopped-worker identity',async()=>{
 const input=await fixture()
 await assert.rejects(applyPropertyAddresses(db,control,{...input,afterCommit:async()=>{throw Error('simulated response loss')}}),/response loss/)
 const migrated=(await db.doc('propertyWarranties/fictional-address').get()).data(),held=(await control.doc('recovery/operatorLock').get()).data()
 assert.equal(migrated.address,'東京都架空市1-1');assert.equal(migrated.revision,5);assert.equal(Object.hasOwn(migrated,'prefecture'),false)
 assert.equal(migrated.postalCode,'1000001');assert.equal(migrated.warrantyNumber,'QA-26-001')
 await assert.rejects(applyPropertyAddresses(db,control,input),/Operator/)
 await assert.rejects(applyPropertyAddresses(db,control,{...input,resumeOwner:'wrong',previousWorkerEnded:true}),/Operator/)
 assert.equal((await applyPropertyAddresses(db,control,{...input,resumeOwner:held.owner,previousWorkerEnded:true})).replayed,true)
 assert.deepEqual((await db.doc('propertyWarranties/fictional-address').get()).data(),migrated)
 assert.equal((await control.doc('recovery/operatorLock').get()).exists,false)
 assert.equal((await control.doc('addressMigrations/address-fixture').get()).data().status,'complete')
 assert.equal((await applyPropertyAddresses(db,control,input)).replayed,true)
})
test('migration keeps stopped state if committed data changes before uncertain-result recovery',async()=>{
 const input=await fixture()
 await assert.rejects(applyPropertyAddresses(db,control,{...input,afterCommit:async()=>{throw Error('lost')}}))
 const owner=(await control.doc('recovery/operatorLock').get()).data().owner
 await db.doc('propertyWarranties/fictional-address').update({address:'別の架空住所'})
 await assert.rejects(applyPropertyAddresses(db,control,{...input,resumeOwner:owner,previousWorkerEnded:true}),/document changed/)
 assert.equal((await db.doc('_recovery/access').get()).data().phase,'recovering')
})
test('rollback restores only address fields, preserves other values, advances revision and reconciles lost response',async()=>{
 const input=await fixture(),before=(await db.doc('propertyWarranties/fictional-address').get()).data()
 await applyPropertyAddresses(db,control,input)
 await assert.rejects(rollbackPropertyAddresses(db,control,{...input,afterCommit:async()=>{throw Error('lost rollback response')}}),/lost/)
 const owner=(await control.doc('recovery/operatorLock').get()).data().owner
 assert.deepEqual((await db.doc('propertyWarranties/fictional-address').get()).data(),{...before,revision:6})
 assert.equal((await rollbackPropertyAddresses(db,control,{...input,resumeOwner:owner,previousWorkerEnded:true})).replayed,true)
 await assert.rejects(applyPropertyAddresses(db,control,input),/rolled back/)
 const next=await fixture();await applyPropertyAddresses(db,control,next)
 await db.doc('propertyWarranties/fictional-address').update({name:'変更された架空物件'})
 await assert.rejects(rollbackPropertyAddresses(db,control,next),/data changed/)
 assert.equal((await db.doc('propertyWarranties/fictional-address').get()).data().address,'東京都架空市1-1')
})
test('tampered or missing private preimages cannot replay or rollback any business value',async()=>{
 for(const mutation of ['fields','hash','missing']){
  const input=await fixture();await applyPropertyAddresses(db,control,input)
  const ref=control.doc('addressMigrations/address-fixture/preimage/fictional-address'),value=(await ref.get()).data(),before=(await db.doc('propertyWarranties/fictional-address').get()).data()
  if(mutation==='missing')await ref.delete()
  else if(mutation==='fields')await ref.update({'fields.prefecture':'改変された架空県'})
  else await ref.update({expectedHash:'0'.repeat(64)})
  await assert.rejects(rollbackPropertyAddresses(db,control,input),/preimage/)
  await assert.rejects(applyPropertyAddresses(db,control,input),/preimage/)
  assert.deepEqual((await db.doc('propertyWarranties/fictional-address').get()).data(),before)
  assert.equal((await db.doc('_recovery/access').get()).data().phase,'recovering')
  await ref.set(value)
 }
})
test('legacy documents without a revision can migrate and rollback without inventing original fields',async()=>{
 const input=await fixture();await db.doc('propertyWarranties/fictional-address').update({revision:(await import('firebase-admin/firestore')).FieldValue.delete()})
 const before=(await db.doc('propertyWarranties/fictional-address').get()).data(),plan=await inspectPropertyAddresses(db)
 input.planHash=plan.hash
 await applyPropertyAddresses(db,control,input);await rollbackPropertyAddresses(db,control,input)
 assert.deepEqual((await db.doc('propertyWarranties/fictional-address').get()).data(),{...before,revision:2})
})
