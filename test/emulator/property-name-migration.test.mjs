import '../helpers/emulator-runtime.mjs'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {initializeApp} from 'firebase-admin/app'
import {getFirestore} from 'firebase-admin/firestore'
import {inspectPropertyNames,migratePropertyNames} from '../../scripts/lib/property-name-migration.mjs'
const app=initializeApp({projectId:'demo-termite-warranty-test'},'name-migration-tests'),db=getFirestore(app),control=getFirestore(app,'name-migration-control')
const state={protocol:2,phase:'normal',generation:10,databaseId:'(default)',controlDatabaseId:'name-migration-control'}
const ref=db.doc('propertyWarranties/fictional-name-migration'),operationId='fictional-name-operation'
async function fixture(){for(const store of [db,control])for(const root of await store.listCollections())await store.recursiveDelete(root);await control.doc('recovery/runtime').set(state);await db.doc('_recovery/access').set(state);await ref.set({name:'架空物件',ownerName:'架空物件',ownerTelephone:'03-0000-0000',revision:3,history:[{before:{ownerName:'架空旧名'}}],warrantyNumber:'FICTION-001'});const p=await inspectPropertyNames(db);return {operationId,generation:10,planHash:p.hash}}
test('normal name migration is atomic, replay-safe and rollback preserves history',async()=>{
 const o=await fixture(),old=(await ref.get()).data();assert.equal((await migratePropertyNames(db,control,o)).count,1)
 const value=(await ref.get()).data();assert.equal(Object.hasOwn(value,'ownerName'),false);assert.deepEqual(value,{...Object.fromEntries(Object.entries(old).filter(([k])=>k!=='ownerName')),revision:4})
 assert.equal((await migratePropertyNames(db,control,o)).replayed,true)
 assert.equal((await migratePropertyNames(db,control,{...o,rollback:true})).count,1);assert.deepEqual((await ref.get()).data(),{...old,revision:5})
})
test('changed document, stopped runtime and unknown owner never migrate partially',async()=>{
 const o=await fixture();await ref.update({name:'架空訂正'})
 await assert.rejects(migratePropertyNames(db,control,o),/changed|conflicts/);assert.equal((await ref.get()).data().ownerName,'架空物件')
 await control.doc('recovery/runtime').update({phase:'recovering'});await assert.rejects(migratePropertyNames(db,control,o),/normal/)
})
test('unknown commit outcome is confirmed using checkpoint after a legitimate save',async()=>{
 const o=await fixture();await assert.rejects(migratePropertyNames(db,control,{...o,afterCommit:async()=>{throw Error('lost result')}}),/lost result/)
 const held=(await control.doc('recovery/operatorLock').get()).data();assert.ok(held.owner)
 await assert.rejects(migratePropertyNames(db,control,o),/owner/)
 await assert.rejects(migratePropertyNames(db,control,{...o,resumeOwner:'wrong-owner',previousWorkerEnded:true}),/owner/)
 await ref.update({name:'架空変更後',revision:5})
 const result=await migratePropertyNames(db,control,{...o,resumeOwner:held.owner,previousWorkerEnded:true});assert.equal(result.replayed,true);assert.equal((await ref.get()).data().name,'架空変更後');assert.equal((await control.doc('recovery/operatorLock').get()).exists,false)
 await assert.rejects(migratePropertyNames(db,control,{...o,rollback:true}),/changed/)
})

test('post-plan concurrent change refuses every document and tampered preimage refuses resumption',async()=>{
 await fixture()
 const other=db.doc('propertyWarranties/fictional-second');await other.set({name:'架空第二',ownerName:'架空第二',revision:1})
 const plan=await inspectPropertyNames(db),o={operationId,generation:10,planHash:plan.hash}
 const unchanged=(await ref.get()).data()
 await assert.rejects(migratePropertyNames(db,control,{...o,beforeCommit:async()=>other.update({notes:'同時変更'})}),/changed/)
 assert.deepEqual((await ref.get()).data(),unchanged)
 assert.equal((await other.get()).data().ownerName,'架空第二')
 assert.equal((await db.doc('_recovery/nameMigration').get()).exists,false)
 const held=(await control.doc('recovery/operatorLock').get()).data()
 await assert.rejects(migratePropertyNames(db,control,{...o,resumeOwner:held.owner,previousWorkerEnded:true}),/changed/)
 assert.deepEqual((await ref.get()).data(),unchanged)
 const fresh=await fixture()
 await assert.rejects(migratePropertyNames(db,control,{...fresh,afterCommit:async()=>{throw Error('lost result')}}),/lost result/)
 const locked=(await control.doc('recovery/operatorLock').get()).data(),journal=control.doc('nameMigrations/'+operationId),v=(await journal.get()).data()
 v.rows[0].fields.ownerName='改変';await journal.update({rows:v.rows})
 await assert.rejects(migratePropertyNames(db,control,{...fresh,resumeOwner:locked.owner,previousWorkerEnded:true}),/preimage/)
 assert.equal(Object.hasOwn((await ref.get()).data(),'ownerName'),false)
 const retained=(await control.doc('recovery/operatorLock').get()).data();assert.ok(retained);assert.notEqual(retained.owner,locked.owner);assert.equal(retained.operationId,operationId)
})
