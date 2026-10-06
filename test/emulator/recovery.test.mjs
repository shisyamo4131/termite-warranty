import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { recoveryController, scanDatabase, authorizationDigest, inspectBusinessIntegrity } from '../../scripts/lib/recovery-controller.mjs'
import { ACCESS_PATH, ACTIVATION_PATH, RUNTIME_PATH } from '../../src/domain/recovery.mjs'
import { LOCAL_RUNTIME, localRuntimeHost } from '../../src/config/local-emulator.mjs'
import { withRecovery, recoveryRuntimeOperation, recoveryStatusOperation } from '../../functions/recovery-runtime.js'
import { exportPrivateAuthSnapshot, recordFirestoreBackupObservation } from '../../functions/recovery-backups.js'
if(process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort) || process.env.FIREBASE_AUTH_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.authPort))throw Error('Dedicated emulators required')
const app=initializeApp({projectId:'demo-termite-warranty'})
const database=id=>id==='(default)' ? getFirestore(app) : getFirestore(app,id)
const source=database('(default)'),control=database('test-control'),target=database('test-restored'),auth=getAuth(app),revision='a'.repeat(40)
after(async()=>{delete process.env.RECOVERY_CONTROL_DATABASE;await source.doc(ACTIVATION_PATH).delete();await source.doc(ACCESS_PATH).delete();await deleteApp(app)})
test('isolated recovery fences stale calls, drains leases, checks accounts and retires the source',async()=>{
  // This is the final isolated emulator suite. All records are fictional.
  for(const root of await source.listCollections())await source.recursiveDelete(root)
  for(const db of [control,target])for(const root of await db.listCollections())await db.recursiveDelete(root)
  let pageToken
  do {const page=await auth.listUsers(1000,pageToken);for(const user of page.users)await auth.deleteUser(user.uid);pageToken=page.pageToken}while(pageToken)
  await auth.createUser({uid:'recovery-admin',email:'recovery-admin@example.invalid',password:'Fictional-only-123'})
  await source.doc('staffAccounts/recovery-admin').set({email:'recovery-admin@example.invalid',role:'house_solution_administrator',enabled:true})
  assert.equal((await recoveryRuntimeOperation()).generation,0)
  const controller=recoveryController({database,auth,controlId:'test-control',revision})
  await controller.initialize()
  await assert.rejects(recoveryRuntimeOperation(),e=>e.code==='failed-precondition') // anchor now prevents empty-config fallback
  process.env.RECOVERY_CONTROL_DATABASE='wrong-control'
  await assert.rejects(recoveryRuntimeOperation(),e=>e.code==='failed-precondition')
  process.env.RECOVERY_CONTROL_DATABASE='test-control'
  assert.equal((await recoveryRuntimeOperation()).generation,1)
  await withRecovery({auth:{uid:'recovery-admin'},data:{runtimeGeneration:1}},true,async db=>{assert.equal(db.databaseId,'(default)');assert.equal((await control.collection('recoveryOperations').get()).size,1)})
  assert.equal((await control.collection('recoveryOperations').get()).size,0)
  await withRecovery({auth:{uid:'recovery-admin'},data:{runtimeGeneration:1}},false,async()=>assert.equal((await control.collection('recoveryOperations').get()).size,0))
  let release,started
  const admitted=new Promise(resolve=>{started=resolve})
  const running=withRecovery({auth:{uid:'recovery-admin'},data:{runtimeGeneration:1}},true,async()=>{started();await new Promise(resolve=>{release=resolve})})
  await admitted
  let releaseRead,readStarted
  const readAdmitted=new Promise(resolve=>{readStarted=resolve})
  const oldRead=withRecovery({auth:{uid:'recovery-admin'},data:{runtimeGeneration:1}},false,async()=>{readStarted();await new Promise(resolve=>{releaseRead=resolve});return 'old data'})
  await readAdmitted
  const entered=await controller.enter(1,'enter-operation')
  assert.equal(entered.phase,'recovering');assert.equal(entered.activeOperations,1)
  await assert.rejects(withRecovery({auth:{uid:'recovery-admin'},data:{runtimeGeneration:1}},true,()=>assert.fail('old mutation ran')))
  releaseRead();await assert.rejects(oldRead)
  release();await running
  // Business corruption in the source must not prevent a valid recovery baseline.
  await source.doc('propertyWarranties/damaged-source').set({status:'active',constructionCompanyId:'deleted-company',warrantyNumber:'DAMAGED',groupId:'deleted-group'})
  await source.doc('warrantyCounters/current-year').set({lastValue:9})
  await controller.baseline(2,'baseline-operation')
  await target.doc('staffAccounts/recovery-admin').set({...((await source.doc('staffAccounts/recovery-admin').get()).data()),role:'general_staff'})
  await target.doc('warrantyCounters/current-year').set({lastValue:3})
  // A restored source marker is not valid for the new target.
  await target.doc(ACCESS_PATH).set((await source.doc(ACCESS_PATH).get()).data())
  await controller.quarantine(2,'quarantine-operation','test-restored')
  const pointHash=(await scanDatabase(target)).hash
  const approval='external/pre-restore',recoveryPoint='2026-10-06T00:00:00Z',restoreOperation='emulator/isolated-fixture'
  await control.doc('recoveryTargets/test-restored').update({restoreDone:true,restoreOperation,recoveryPoint,approval})
  let accountFailure=true
  const partialDatabase=id=>new Proxy(database(id),{get(db,key){if(key!=='doc'){const value=Reflect.get(db,key);return typeof value==='function'?value.bind(db):value}return path=>new Proxy(db.doc(path),{get(ref,method){if(method==='set')return async(...args)=>{const result=await ref.set(...args);if(accountFailure&&id==='test-restored'&&path==='staffAccounts/recovery-admin'){accountFailure=false;throw Error('injected account response loss')}return result};const value=Reflect.get(ref,method);return typeof value==='function'?value.bind(ref):value}})}})
  const partialController=recoveryController({database:partialDatabase,auth,controlId:'test-control',revision})
  await assert.rejects(partialController.reconcile(2,'reconcile-operation',{target:'test-restored',baselineId:'baseline-operation',snapshotHash:pointHash}))
  await controller.resumeOperator(2,'reconcile-operation',true)
  await target.doc('warrantyCounters/current-year').update({unexpectedBusinessField:true})
  await assert.rejects(controller.reconcile(2,'reconcile-operation',{target:'test-restored',baselineId:'baseline-operation',snapshotHash:pointHash}))
  await target.doc('warrantyCounters/current-year').update({unexpectedBusinessField:FieldValue.delete()})
  const reconciled=await controller.reconcile(2,'reconcile-operation',{target:'test-restored',baselineId:'baseline-operation',snapshotHash:pointHash})
  assert.equal(reconciled.accountChanges,0);assert.equal(reconciled.counterChanges,1) // resumed account write was already applied
  assert.notEqual((await scanDatabase(target)).hash,pointHash)
  const sealed=(await control.doc('recoveryReconciliations/reconcile-operation').get()).data().snapshot.hash
  await target.doc('properties/unrelated-business-record').set({name:'fictional change'})
  await assert.rejects(controller.reconcile(2,'reconcile-operation',{target:'test-restored',baselineId:'baseline-operation',snapshotHash:pointHash}))
  assert.equal((await control.doc('recoveryReconciliations/reconcile-operation').get()).data().snapshot.hash,sealed)
  await target.doc('properties/unrelated-business-record').delete()
  await controller.reconcile(2,'reconcile-operation',{target:'test-restored',baselineId:'baseline-operation',snapshotHash:pointHash})
  await assert.rejects(controller.verify(2,'invalid-verify-operation',{target:'test-restored',baselineId:'baseline-operation',snapshotHash:'0'.repeat(64),approval,recoveryPoint,restoreOperation}))
  assert.equal((await controller.status()).operatorBlocked,false) // pre-effect rejection is retryable
  await controller.verify(2,'verify-operation',{target:'test-restored',baselineId:'baseline-operation',snapshotHash:pointHash,approval,recoveryPoint,restoreOperation})
  let injected='target-marker'
  const faultDatabase=id=>new Proxy(database(id),{get(db,key){if(key!=='doc'){const value=Reflect.get(db,key);return typeof value==='function'?value.bind(db):value}return path=>new Proxy(db.doc(path),{get(ref,method){if(method==='set')return async(...args)=>{if(injected==='target-marker'&&id==='test-restored'&&path===ACCESS_PATH){injected=null;throw Error('injected marker failure')}const result=await ref.set(...args);if(injected==='runtime-response'&&id==='test-control'&&path===RUNTIME_PATH){injected=null;throw Error('injected lost response')}return result};const value=Reflect.get(ref,method);return typeof value==='function'?value.bind(ref):value}})}})
  const faultController=recoveryController({database:faultDatabase,auth,controlId:'test-control',revision})
  await assert.rejects(faultController.cutover(2,'cutover-operation','verify-operation'))
  await assert.rejects(recoveryRuntimeOperation()) // partial cutover stays closed
  await assert.rejects(controller.resumeOperator(2,'cutover-operation',false))
  await controller.resumeOperator(2,'cutover-operation',true)
  assert.equal((await source.doc(ACCESS_PATH).get()).data().phase,'retired')
  assert.equal((await control.doc(RUNTIME_PATH).get()).data().phase,'verification')
  await withRecovery({auth:{uid:'recovery-admin'},data:{runtimeGeneration:3}},false,async db=>assert.equal(db.databaseId,'test-restored'))
  await assert.rejects(withRecovery({auth:{uid:'recovery-admin'},data:{runtimeGeneration:3}},true,()=>assert.fail('verification write ran')))
  injected='runtime-response'
  await assert.rejects(faultController.reopen(3,'reopen-operation','external/reopening'))
  assert.equal((await controller.status()).runtime.generation,4)
  await controller.resumeOperator(4,'reopen-operation',true)
  await assert.rejects(withRecovery({auth:{uid:'recovery-admin'},data:{runtimeGeneration:1}},true,()=>assert.fail('stale old-screen request ran')))
  await withRecovery({auth:{uid:'recovery-admin'},data:{runtimeGeneration:4}},true,async db=>assert.equal(db.databaseId,'test-restored'))
  process.env.RECOVERY_BACKUP_AUTOMATION='true';process.env.RECOVERY_AUTH_BACKUP_BUCKET='fictional-private-bucket';process.env.RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE='fictional/hash-config'
  let invalidate=true,stored=0
  const metadata={iamConfiguration:{publicAccessPrevention:'enforced',uniformBucketLevelAccess:{enabled:true}},lifecycle:{rule:[{action:{type:'Delete'},condition:{age:30,matchesPrefix:['auth/']}}]}}
  const storage={bucket:()=>({getMetadata:async()=>[metadata],iam:{getPolicy:async()=>[{bindings:[]}]},file:()=>({save:async()=>{stored++;if(invalidate)await control.doc('recovery/authBackupEpoch').set({epoch:1})}})})}
  const fakeAuth={listUsers:async()=>({users:[{providerData:[{providerId:'password'}],passwordHash:'fictional-hash',passwordSalt:'fictional-salt',toJSON:()=>({uid:'fictional-export-only'})}]})}
  await assert.rejects(exportPrivateAuthSnapshot(control,{force:true,auth:fakeAuth,storage}))
  assert.equal((await control.doc('recovery/lastAuthBackup').get()).exists,false)
  invalidate=false
  assert.equal((await exportPrivateAuthSnapshot(control,{force:true,auth:fakeAuth,storage})).status,'success')
  assert.equal(stored,2)
  await recordFirestoreBackupObservation(control,{status:'success',backupTime:'2026-10-01T00:00:00Z'})
  await assert.rejects(exportPrivateAuthSnapshot(control,{force:true,auth:{listUsers:async()=>{throw Error('injected Auth permission failure')}},storage}))
  await control.doc('recovery/backupHealth').set({monitoring:'failed'},{merge:true})
  const status=await recoveryStatusOperation({auth:{uid:'recovery-admin'}})
  assert.equal(status.lastFirestoreSuccess,'2026-10-01T00:00:00Z')
  assert.ok(status.lastAuthSuccess)
  assert.equal(JSON.stringify(status).includes('fictional-private-bucket'),false)
  await assert.rejects(recoveryStatusOperation({auth:{uid:'unknown-user'}}),error=>error.code==='permission-denied')
  for(const key of ['RECOVERY_BACKUP_AUTOMATION','RECOVERY_AUTH_BACKUP_BUCKET','RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE'])delete process.env[key]
  const baselineHash=await authorizationDigest(target,auth)
  await target.doc('staffAccounts/recovery-admin').update({role:'developer_superuser'})
  assert.notEqual(await authorizationDigest(target,auth),baselineHash) // Auth identity alone cannot see this
  const account=target.doc('constructionCompanyAccounts/fictional-affiliation')
  await target.doc('constructionCompanies/fictional-company').set({name:'fictional'})
  await target.doc('companyBranches/fictional-branch').set({constructionCompanyId:'another-company'})
  for(const fields of [
    {role:'general_staff',constructionCompanyId:'fictional-company',scope:'company'},
    {role:'construction_company',constructionCompanyId:'missing-company',scope:'company'},
    {role:'construction_company',constructionCompanyId:'fictional-company',scope:'branch',branchId:'missing-branch'},
    {role:'construction_company',constructionCompanyId:'fictional-company',scope:'branch',branchId:'fictional-branch'},
    {role:'construction_company',constructionCompanyId:'fictional-company',scope:'unknown'},
    {role:'construction_company',constructionCompanyId:'fictional-company'},
  ]){await account.set(fields);await assert.rejects(inspectBusinessIntegrity(target))}
  await target.doc('companyBranches/fictional-branch').update({constructionCompanyId:'fictional-company'})
  await account.set({role:'construction_company',constructionCompanyId:'fictional-company',scope:'branch',branchId:'fictional-branch'})
  await inspectBusinessIntegrity(target)
  await account.set({role:'construction_company',constructionCompanyId:'fictional-company'})
  await target.doc('constructionCompanyAccountBindings/fictional-company').set({uid:'fictional-affiliation'})
  await inspectBusinessIntegrity(target)
  await target.doc('constructionCompanyAccountBindings/fictional-company').update({uid:'missing-user'})
  await assert.rejects(inspectBusinessIntegrity(target))
})
