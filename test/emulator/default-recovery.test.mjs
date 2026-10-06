import { test,after } from 'node:test'
import assert from 'node:assert/strict'
import { initializeApp,deleteApp } from 'firebase-admin/app'
import { getFirestore,Timestamp,GeoPoint } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { defaultRecovery,documentImage,imageHash } from '../../scripts/lib/default-recovery.mjs'
import { authorizationDigest,scanDatabase,recoveryController } from '../../scripts/lib/recovery-controller.mjs'
import { LOCAL_RUNTIME,localRuntimeHost } from '../../src/config/local-emulator.mjs'
if(process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort)||process.env.FIREBASE_AUTH_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.authPort))throw Error('Dedicated fictional emulator required')
const app=initializeApp({projectId:'demo-termite-warranty'},'default-sync-test'),auth=getAuth(app),database=id=>id==='(default)'?getFirestore(app):getFirestore(app,id)
const target=database('(default)'),source=database('test-sync-source'),control=database('test-sync-control'),revision='b'.repeat(40)
const api=defaultRecovery({database,auth,controlId:'test-sync-control',revision})
after(async()=>deleteApp(app))
async function clean(){for(const db of [target,source,control])for(const root of await db.listCollections())await db.recursiveDelete(root);let token;do{const p=await auth.listUsers(1000,token);for(const u of p.users)await auth.deleteUser(u.uid);token=p.pageToken}while(token)}
async function evidence(gen,id){
 const authority=await authorizationDigest(target,auth)
 await control.doc(`recoveryBaselines/${id}`).set({generation:gen,revision,authorizationHash:authority,highWater:{year:9}})
 await source.doc('_recovery/access').set({phase:'recovering',generation:gen,databaseId:source.databaseId})
 await control.doc(`recoveryVerifications/${id}`).set({generation:gen,revision,target:source.databaseId,baselineId:id,authorizationHash:authority,approval:'external/recovery',typedHash:imageHash(await documentImage(source)),snapshot:await scanDatabase(source)})
 return {source:source.databaseId,baselineId:id,verificationId:id,approval:'external/recovery'}
}
test('incident chain uses real fixed entry and B controller receipts through complete C/D',async()=>{
 await clean();await auth.createUser({uid:'incident-admin',email:'incident@example.invalid',password:'Fictional-only-123'})
 const profile={email:'incident@example.invalid',role:'house_solution_administrator',enabled:true}
 await auth.createUser({uid:'incident-company-current',email:'current-company@example.invalid',password:'Fictional-only-123'})
 const companyProfile={email:'current-company@example.invalid',role:'construction_company',enabled:true,constructionCompanyId:'incident-company'}
 await target.doc('constructionCompanies/incident-company').set({name:'fictional company'})
 await target.doc('constructionCompanyAccounts/incident-company-current').set(companyProfile)
 await target.doc('constructionCompanyAccountBindings/incident-company').set({uid:'incident-company-current'})
 await target.doc('staffAccounts/incident-admin').set(profile)
 await target.doc('warrantyCounters/year').set({lastValue:9})
 await target.doc('properties/after-point').set({label:'fictional lost update'})
 await api.initialize()
 // Fixture initialization is closed; put the fictional app in normal state before the incident.
 const normal={protocol:2,phase:'normal',generation:1,databaseId:'(default)',controlDatabaseId:'test-sync-control'}
 await control.doc('recovery/runtime').set(normal);await target.doc('_recovery/access').set(normal)
 const b=recoveryController({database,auth,controlId:'test-sync-control',revision})
 await assert.rejects(b.enter(1,'legacy-entry-refused'))
 assert.equal((await api.enter(1,'incident-enter')).phase,'recovering')
 await control.doc('recoveryOperations/fictional-running').set({generation:1})
 await assert.rejects(b.baseline(2,'incident-baseline'))
 await control.doc('recoveryOperations/fictional-running').delete()
 await b.baseline(2,'incident-baseline')
 // Managed restore APIs do not exist in emulator: only the completed restore journal
 // and restored historical data are fictional. Baseline/quarantine/reconcile/verify are real.
 await source.doc('staffAccounts/incident-admin').set({...profile,role:'general_staff'})
 await source.doc('constructionCompanyAccounts/incident-company-old').set({...companyProfile,email:'old-company@example.invalid'})
 await source.doc('constructionCompanyAccountBindings/incident-company').set({uid:'incident-company-old'})
 await source.doc('warrantyCounters/year').set({lastValue:3})
 await source.doc('properties/restored').set({label:'fictional historical property'})
 const restoreOperation='fictional-restore-operation',recoveryPoint='2026-10-06T00:00:00Z',approval='external/incident-point'
 await control.doc(`recoveryTargets/${source.databaseId}`).set({restoreDone:true,restoreOperation,recoveryPoint,approval,generation:2,revision})
 await b.quarantine(2,'incident-quarantine',source.databaseId)
 const snapshotHash=(await scanDatabase(source)).hash
 await b.reconcile(2,'incident-reconcile',{target:source.databaseId,baselineId:'incident-baseline',snapshotHash})
 assert.equal((await source.doc('constructionCompanyAccountBindings/incident-company').get()).data().uid,'incident-company-current')
 // Do not recreate a missing company from current authority or widen permissions.
 await assert.rejects(b.verify(2,'incident-verify',{target:source.databaseId,baselineId:'incident-baseline',snapshotHash,restoreOperation,recoveryPoint,approval}))
 assert.equal((await control.doc('recovery/runtime').get()).data().phase,'recovering')
 assert.equal((await target.doc('properties/after-point').get()).exists,true)
 // Fixture contains the restored company after the negative check; rebuild B evidence.
 await source.doc('constructionCompanies/incident-company').set({name:'fictional company'})
 await control.doc(`recoveryTargets/${source.databaseId}`).update({reconciliationId:'incident-reconcile-with-company'})
 const nextHash=(await scanDatabase(source)).hash
 await b.reconcile(2,'incident-reconcile-with-company',{target:source.databaseId,baselineId:'incident-baseline',snapshotHash:nextHash})
 await b.verify(2,'incident-verify',{target:source.databaseId,baselineId:'incident-baseline',snapshotHash:nextHash,restoreOperation,recoveryPoint,approval})
 const proof=(await control.doc('recoveryVerifications/incident-verify').get()).data()
 assert.equal(proof.typedHash,imageHash(await documentImage(source)))
 const plan=await api.plan(2,'incident-plan',{source:source.databaseId,baselineId:'incident-baseline',verificationId:'incident-verify',approval})
 assert.equal(plan.deletes,1)
 await assert.rejects(api.publish('incident-plan','external/reopen',{reopen:true}))
 await api.apply('incident-plan')
 assert.equal((await target.doc('properties/after-point').get()).exists,false)
 assert.equal((await target.doc('properties/restored').get()).exists,true)
 assert.deepEqual((await target.doc('staffAccounts/incident-admin').get()).data(),profile)
 assert.equal((await target.doc('warrantyCounters/year').get()).data().lastValue,9)
 assert.equal((await api.publish('incident-plan',approval)).phase,'verification')
 await assert.rejects(api.publish('incident-plan',approval,{reopen:true}))
 assert.equal((await api.publish('incident-plan','external/hs-separate-reopen',{reopen:true})).phase,'normal')
 assert.equal((await target.doc('_recovery/access').get()).data().databaseId,'(default)')
})
test('full default synchronization preserves current roles, counters and typed references; resumes response loss and permits two recoveries',async()=>{
 await clean();await auth.createUser({uid:'sync-admin',email:'sync@example.invalid',password:'Fictional-only-123'})
 const profile={email:'sync@example.invalid',role:'house_solution_administrator',enabled:true}
 await target.doc('staffAccounts/sync-admin').set(profile)
 await source.doc('staffAccounts/sync-admin').set({...profile,role:'general_staff'})
 await target.doc('warrantyCounters/year').set({lastValue:9})
 await source.doc('warrantyCounters/year').set({lastValue:9})
 await target.doc('properties/obsolete').set({old:true});await target.doc('properties/obsolete/history/child').set({old:true})
 await target.doc('properties/kept').set({v:0,obsoleteField:true})
 const expected={v:1,stamp:new Timestamp(42,123000),bytes:Buffer.from([0,255]),point:new GeoPoint(35,139),link:source.doc('properties/kept')}
 await source.doc('properties/kept').set(expected);await source.doc('properties/kept/history/current').set({v:2})
 await api.initialize()
 const plan=await api.plan(1,'sync-plan-first',await evidence(1,'baseline-first'))
 assert.equal(plan.deletes,2);assert.equal(plan.changes,2)
 assert.equal((await control.collection('defaultRecoveryPlans/sync-plan-first/preimage').get()).size,5)
 let lost=false
 const fault=defaultRecovery({database,auth,controlId:'test-sync-control',revision,afterCommit:async()=>{if(!lost){lost=true;throw Error('fictional lost response')}}})
 await assert.rejects(fault.apply('sync-plan-first'),/interrupted/)
 assert.equal((await target.doc('_recovery/access').get()).data().phase,'recovering')
 const held=(await control.doc('recovery/operatorLock').get()).data()
 await assert.rejects(recoveryController({database,auth,controlId:'test-sync-control',revision}).resumeOperator(1,'sync-plan-first',true),/dedicated/)
 await assert.rejects(api.apply('sync-plan-first',{resume:true,workerStopped:true,expectedOwner:'wrong-owner'}))
 assert.equal((await api.apply('sync-plan-first',{resume:true,workerStopped:true,expectedOwner:held.owner})).status,'verified')
 assert.equal((await target.doc('properties/obsolete').get()).exists,false)
 assert.equal((await target.doc('properties/obsolete/history/child').get()).exists,false)
 const row=(await target.doc('properties/kept').get()).data()
 assert.equal(row.obsoleteField,undefined);assert.equal(row.link.firestore.databaseId,'(default)');assert.equal(row.stamp.nanoseconds,123000);assert.deepEqual(row.bytes,expected.bytes)
 assert.equal((await target.doc('staffAccounts/sync-admin').get()).data().role,profile.role)
 assert.equal((await target.doc('warrantyCounters/year').get()).data().lastValue,9)
 await assert.rejects(api.publish('sync-plan-first','external/recovery',{reopen:true}))
 assert.equal((await api.publish('sync-plan-first','external/recovery')).phase,'verification')
 await assert.rejects(api.publish('sync-plan-first','external/recovery',{reopen:true}))
 assert.equal((await api.publish('sync-plan-first','external/reopen',{reopen:true})).phase,'normal')
 assert.equal((await api.enter(3,'enter-second')).generation,4)
 await assert.rejects(api.publish('sync-plan-first','external/recovery'))
 const second=await api.plan(4,'sync-plan-second',await evidence(4,'baseline-second'))
 assert.equal(second.changes,0);assert.equal(second.deletes,0)
 const version=(await target.doc('properties/kept').get()).updateTime
 await api.apply('sync-plan-second')
 assert.equal((await target.doc('properties/kept').get()).updateTime.isEqual(version),true)
 await api.publish('sync-plan-second','external/recovery');await api.publish('sync-plan-second','external/reopen-second',{reopen:true})
 assert.equal((await api.emergencyClose(6,'emergency-third')).generation,7)
 assert.ok((await documentImage(target)).size>0) // private orphan checkpoint paths are deliberately excluded
})
test('orphan business parents, unknown collections and target conflicts keep maintenance closed',async()=>{
 await clean();await api.initialize()
 await source.doc('properties/missing/history/child').set({v:1})
 await assert.rejects(documentImage(source))
 await source.recursiveDelete(source.collection('properties'))
 await source.doc('unknownRecords/record').set({v:1});await assert.rejects(documentImage(source));await source.recursiveDelete(source.collection('unknownRecords'))
 await target.doc('warrantyCounters/year').set({lastValue:9});await source.doc('warrantyCounters/year').set({lastValue:9})
 await target.doc('properties/change').set({v:1});await source.doc('properties/change').set({v:2})
 await api.plan(1,'conflict-plan',await evidence(1,'baseline-conflict'))
 await target.doc('properties/change').set({v:3})
 await assert.rejects(api.apply('conflict-plan'))
 assert.equal((await target.doc('properties/change').get()).data().v,3)
 assert.equal((await api.status()).runtime.phase,'recovering')
 assert.equal((await api.status()).operatorBlocked,true)
})

test('publication response loss uses atomic completion evidence; incomplete seal is retained and safely abandoned',async()=>{
 await clean();await api.initialize();await api.initialize()
 await target.doc('warrantyCounters/year').set({lastValue:9});await source.doc('warrantyCounters/year').set({lastValue:9})
 await target.doc('properties/record').set({v:0});await source.doc('properties/record').set({v:1})
 const args=await evidence(1,'baseline-sealing')
 const sealing=defaultRecovery({database,auth,controlId:'test-sync-control',revision,afterSealItem:async()=>{throw Error('fixture seal interruption')}})
 await assert.rejects(sealing.plan(1,'incomplete-plan',args))
 let held=(await control.doc('recovery/operatorLock').get()).data()
 assert.equal((await api.recoverOperator('incomplete-plan',{workerStopped:true,expectedOwner:held.owner})).status,'aborted-before-application')
 assert.equal((await target.doc('properties/record').get()).data().v,0)
 await api.plan(1,'publication-plan',args);await api.apply('publication-plan')
 const publish=defaultRecovery({database,auth,controlId:'test-sync-control',revision,afterPublish:async()=>{throw Error('fixture publication response loss')}})
 await assert.rejects(publish.publish('publication-plan','external/recovery'))
 assert.equal((await target.doc('_recovery/access').get()).data().phase,'verification')
 held=(await control.doc('recovery/operatorLock').get()).data()
 assert.equal((await api.recoverOperator('publication-plan',{workerStopped:true,expectedOwner:held.owner})).phase,'verification')
 await assert.rejects(publish.publish('publication-plan','external/reopen',{reopen:true}))
 // After the normal marker commits, permitted business writes can already occur.
 await target.doc('properties/record').update({v:2})
 held=(await control.doc('recovery/operatorLock').get()).data()
 assert.equal((await api.recoverOperator('publication-plan',{workerStopped:true,expectedOwner:held.owner})).phase,'normal')
 assert.equal((await target.doc('properties/record').get()).data().v,2)
 await api.emergencyClose(3,'emergency-close')
 await assert.rejects(api.reconcileEmergency(4,'emergency-reconcile'))
 assert.equal((await api.reconcileEmergency(4,'emergency-reconcile',{workerStopped:true})).phase,'recovering')
})

test('B typed evidence rejects a sub-millisecond change hidden by the historical hash',async()=>{
 await clean();await api.initialize();await target.doc('warrantyCounters/year').set({lastValue:9});await source.doc('warrantyCounters/year').set({lastValue:9})
 await source.doc('properties/stamp').set({stamp:new Timestamp(42,1000)})
 const args=await evidence(1,'baseline-typed'),old=(await scanDatabase(source)).hash
 await source.doc('properties/stamp').set({stamp:new Timestamp(42,2000)})
 assert.equal((await scanDatabase(source)).hash,old)
 await assert.rejects(api.plan(1,'stale-typed-plan',args))
 assert.equal((await control.doc('recovery/operatorLock').get()).exists,false)
})

test('source changed between B comparison and the sealed-image read is refused',async()=>{
 await clean();await api.initialize();await target.doc('warrantyCounters/year').set({lastValue:9});await source.doc('warrantyCounters/year').set({lastValue:9})
 await source.doc('properties/race').set({stamp:new Timestamp(42,1000)})
 const args=await evidence(1,'baseline-source-race')
 let changed=false
 const raceAuth={getUser:auth.getUser.bind(auth),listUsers:async(...args)=>{if(!changed){changed=true;await source.doc('properties/race').update({stamp:new Timestamp(42,2000)})}return auth.listUsers(...args)}}
 const raced=defaultRecovery({database,auth:raceAuth,controlId:'test-sync-control',revision})
 await assert.rejects(raced.plan(1,'source-race-plan',args))
 assert.equal((await control.doc('defaultRecoveryPlans/source-race-plan').get()).exists,false)
})

test('legacy named Dev-shaped runtime migrates latest image to default without restoring historical authority',async()=>{
 await clean()
 await auth.createUser({uid:'migration-admin',email:'migration@example.invalid',password:'Fictional-only-123'})
 const profile={email:'migration@example.invalid',role:'house_solution_administrator',enabled:true}
 await source.doc('staffAccounts/migration-admin').set(profile)
 await target.doc('staffAccounts/migration-admin').set({...profile,role:'general_staff'})
 await source.doc('warrantyCounters/year').set({lastValue:9});await target.doc('warrantyCounters/year').set({lastValue:4})
 await source.doc('properties/latest').set({v:2});await target.doc('properties/latest').set({v:1})
 const legacy={phase:'normal',generation:4,databaseId:source.databaseId,controlDatabaseId:control.databaseId}
 await control.doc('recovery/runtime').set(legacy);await source.doc('_recovery/access').set(legacy);await target.doc('_recovery/access').set({phase:'retired',generation:3,databaseId:'(default)'})
 const old=recoveryController({database,auth,controlId:control.databaseId,revision})
 await old.enter(4,'legacy-stop-migration');await old.baseline(5,'baseline-migration')
 const plan=await api.plan(5,'migration-plan',{source:source.databaseId,baselineId:'baseline-migration',approval:'external/latest-migration',migration:true})
 assert.equal(plan.changes,3);assert.equal(plan.deletes,0)
 let lost=false
 const partial=defaultRecovery({database,auth,controlId:control.databaseId,revision,afterCommit:async()=>{if(!lost){lost=true;throw Error('fictional migration response loss')}}})
 await assert.rejects(partial.apply('migration-plan'))
 const held=(await control.doc('recovery/operatorLock').get()).data()
 await api.apply('migration-plan',{resume:true,workerStopped:true,expectedOwner:held.owner})
 assert.equal((await target.doc('properties/latest').get()).data().v,2)
 assert.deepEqual((await target.doc('staffAccounts/migration-admin').get()).data(),profile)
 assert.equal((await target.doc('warrantyCounters/year').get()).data().lastValue,9)
 assert.equal((await control.doc('recovery/runtime').get()).data().databaseId,'(default)')
 await assert.rejects(old.enter(5,'old-enter-denied'))
 const retiring=defaultRecovery({database,auth,controlId:control.databaseId,revision,afterTransition:async stage=>{if(stage==='publish-source-retired')throw Error('fictional source-retirement response loss')}})
 await assert.rejects(retiring.publish('migration-plan','external/latest-migration'))
 assert.equal((await target.doc('_recovery/access').get()).data().phase,'recovering')
 const publication=(await control.doc('recovery/operatorLock').get()).data()
 await api.recoverOperator('migration-plan',{workerStopped:true,expectedOwner:publication.owner})
 assert.equal((await source.doc('_recovery/access').get()).data().phase,'retired')
 await api.publish('migration-plan','external/latest-reopen',{reopen:true})
 assert.equal((await target.doc('_recovery/access').get()).data().phase,'normal')
 assert.equal((await source.doc('properties/latest').get()).data().v,2) // source retained, never deleted
})

test('maintenance closure recovers either cross-database response-loss boundary without reopening',async()=>{
 for(const stage of ['enter-control-prepared','enter-marker-closed']){
  await clean();await api.initialize()
  const normal={protocol:2,phase:'normal',generation:3,databaseId:'(default)',controlDatabaseId:control.databaseId}
  await control.doc('recovery/runtime').set(normal);await target.doc('_recovery/access').set(normal)
  const fault=defaultRecovery({database,auth,controlId:control.databaseId,revision,afterTransition:async seen=>{if(seen===stage)throw Error('fictional uncertain closure')}})
  await assert.rejects(fault.enter(3,'uncertain-enter'))
  const held=(await control.doc('recovery/operatorLock').get()).data()
  assert.equal((await control.doc('recovery/runtime').get()).data().phase,'recovering')
  assert.equal((await api.recoverOperator('uncertain-enter',{workerStopped:true,expectedOwner:held.owner})).phase,'recovering')
  assert.equal((await api.status()).marker.generation,4)
  assert.equal((await api.status()).operatorBlocked,false)
 }
})

test('migration interrupted between database markers resumes only its sealed prior/next states',async()=>{
 for(const stage of ['migration-marker-closed','migration-control-prepared']){
  await clean()
  await source.doc('warrantyCounters/year').set({lastValue:9});await target.doc('warrantyCounters/year').set({lastValue:4})
  await source.doc('properties/current').set({v:2});await target.doc('properties/current').set({v:1})
  const legacy={phase:'recovering',generation:5,databaseId:source.databaseId,controlDatabaseId:control.databaseId}
  await control.doc('recovery/runtime').set(legacy);await source.doc('_recovery/access').set(legacy)
  await target.doc('_recovery/access').set({phase:'retired',generation:3,databaseId:'(default)'})
  const old=recoveryController({database,auth,controlId:control.databaseId,revision});await old.baseline(5,'boundary-baseline')
  for(const unexpected of [{phase:'normal',generation:3},{phase:'retired',generation:99},{phase:'retired',generation:3,controlDatabaseId:'other-control'},{phase:'retired',generation:3,protocol:99}]){
   await target.doc('_recovery/access').set({databaseId:'(default)',...unexpected})
   await assert.rejects(api.plan(5,'boundary-invalid',{source:source.databaseId,baselineId:'boundary-baseline',approval:'external/latest',migration:true}))
   assert.equal((await control.doc('recovery/operatorLock').get()).exists,false)
   assert.equal((await control.doc('defaultRecoveryPlans/boundary-invalid').get()).exists,false)
   assert.equal((await target.doc('_recovery/access').get()).data().generation,unexpected.generation)
  }
  await target.doc('_recovery/access').set({phase:'retired',generation:3,databaseId:'(default)'})
  await api.plan(5,'boundary-migration',{source:source.databaseId,baselineId:'boundary-baseline',approval:'external/latest',migration:true})
  const fault=defaultRecovery({database,auth,controlId:control.databaseId,revision,afterTransition:async seen=>{if(seen===stage)throw Error('fictional uncertain migration')}})
  await assert.rejects(fault.apply('boundary-migration'))
  assert.equal((await target.doc('properties/current').get()).data().v,1)
  let held=(await control.doc('recovery/operatorLock').get()).data()
  // An unexpected marker cannot be silently overwritten by a retry.
  const marker=(await target.doc('_recovery/access').get()).data()
  await target.doc('_recovery/access').update({generation:99})
  await assert.rejects(api.apply('boundary-migration',{resume:true,workerStopped:true,expectedOwner:held.owner}))
  assert.equal((await target.doc('_recovery/access').get()).data().generation,99)
  await target.doc('_recovery/access').set(marker)
  const runtime=(await control.doc('recovery/runtime').get()).data()
  await control.doc('recovery/runtime').update({generation:99})
  held=(await control.doc('recovery/operatorLock').get()).data()
  await assert.rejects(api.apply('boundary-migration',{resume:true,workerStopped:true,expectedOwner:held.owner}))
  assert.equal((await control.doc('recovery/runtime').get()).data().generation,99)
  await control.doc('recovery/runtime').set(runtime)
  held=(await control.doc('recovery/operatorLock').get()).data()
  await api.apply('boundary-migration',{resume:true,workerStopped:true,expectedOwner:held.owner})
  assert.equal((await target.doc('properties/current').get()).data().v,2)
  assert.equal((await target.doc('warrantyCounters/year').get()).data().lastValue,9)
  assert.equal((await api.status()).marker.phase,'recovering')
 }
})

test('a live publication cannot bypass absent or partial deployment proof',async()=>{
 let reads=0
 const liveDatabase=()=>({projectId:'termite-warranty-dev',doc:()=>({get:()=>{reads++;throw Error('No live read permitted in fixture')}})})
 const blocked=defaultRecovery({database:liveDatabase,controlId:'test-sync-control',revision})
 await assert.rejects(blocked.publish('fictional-plan','external/recovery'))
 assert.equal(reads,0)
 const partial=defaultRecovery({database:liveDatabase,controlId:'test-sync-control',revision,verifyDeployment:async()=>false})
 await assert.rejects(partial.publish('fictional-plan','external/recovery'))
 assert.equal(reads,0)
})

test('live proof admission gates uncommitted publication recovery but not committed receipt cleanup',async()=>{
 await clean();await api.initialize()
 await target.doc('warrantyCounters/year').set({lastValue:9});await source.doc('warrantyCounters/year').set({lastValue:9})
 await source.doc('properties/proof').set({v:1})
 await api.plan(1,'live-proof-plan',await evidence(1,'live-proof-baseline'));await api.apply('live-proof-plan')
 // Methods stay bound to the dedicated fictional SDK. Only the admission
 // project identity is simulated; this fixture cannot contact a live database.
 const liveTarget=new Proxy(target,{get(object,key){if(key==='projectId')return 'termite-warranty-dev';const value=Reflect.get(object,key,object);return typeof value==='function'?value.bind(object):value}})
 const simulated=id=>id==='(default)'?liveTarget:database(id)
 const early=defaultRecovery({database,auth,controlId:control.databaseId,revision,afterTransition:async stage=>{if(stage==='publish-control-prepared')throw Error('fixture interruption')}})
 await assert.rejects(early.publish('live-proof-plan','external/recovery'))
 let held=(await control.doc('recovery/operatorLock').get()).data(),proofCalls=0
 const denied=defaultRecovery({database:simulated,auth,controlId:control.databaseId,revision,verifyDeployment:async()=>{proofCalls++;return false}})
 await assert.rejects(denied.recoverOperator('live-proof-plan',{workerStopped:true,expectedOwner:held.owner}))
 assert.equal(proofCalls,1);assert.equal((await api.status()).marker.phase,'recovering')
 held=(await control.doc('recovery/operatorLock').get()).data()
 const proven=defaultRecovery({database:simulated,auth,controlId:control.databaseId,revision,verifyDeployment:async()=>{proofCalls++;return true}})
 await proven.recoverOperator('live-proof-plan',{workerStopped:true,expectedOwner:held.owner});assert.equal(proofCalls,2)
 const late=defaultRecovery({database:simulated,auth,controlId:control.databaseId,revision,verifyDeployment:async()=>true,afterPublish:async()=>{throw Error('fixture committed response loss')}})
 await assert.rejects(late.publish('live-proof-plan','external/reopen',{reopen:true}))
 await target.doc('properties/proof').update({v:2})
 held=(await control.doc('recovery/operatorLock').get()).data();proofCalls=0
 assert.equal((await denied.recoverOperator('live-proof-plan',{workerStopped:true,expectedOwner:held.owner})).phase,'normal')
 assert.equal(proofCalls,0);assert.equal((await target.doc('properties/proof').get()).data().v,2)
})

test('publication before-marker failure retains closed access and resumes after fresh integrity validation',async()=>{
 await clean();await api.initialize()
 await target.doc('warrantyCounters/year').set({lastValue:9});await source.doc('warrantyCounters/year').set({lastValue:9})
 await source.doc('properties/current').set({v:1})
 await api.plan(1,'before-publish-plan',await evidence(1,'before-publish-baseline'));await api.apply('before-publish-plan')
 const fault=defaultRecovery({database,auth,controlId:control.databaseId,revision,afterTransition:async stage=>{if(stage==='publish-control-prepared')throw Error('fictional deploy/worker interruption')}})
 await assert.rejects(fault.publish('before-publish-plan','external/recovery'))
 assert.equal((await api.status()).marker.phase,'recovering')
 const held=(await control.doc('recovery/operatorLock').get()).data()
 assert.equal((await api.recoverOperator('before-publish-plan',{workerStopped:true,expectedOwner:held.owner})).phase,'verification')
 assert.equal((await api.status()).marker.phase,'verification')
})
