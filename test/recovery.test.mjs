import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { runtimeState, assertRequest, assertTransition, PROPERTY_READ_ACTIONS } from '../src/domain/recovery.mjs'
import { fixedRuntimeState, assertFixedRequest, sameFixedEpoch } from '../src/domain/fixed-recovery.mjs'
import { recoveryOptions } from '../scripts/lib/recovery-options.mjs'
import { firestoreRecoveryProvider } from '../scripts/lib/firestore-recovery-provider.mjs'
import { backupHealth, assertPrivateAuthBucket } from '../src/domain/backup-health.mjs'
import { missingAuthPlan, authImportOptions, readPrivateAuthObject } from '../scripts/lib/auth-recovery.mjs'

test('fixed protocol requires explicit default marker and rejects historical runtime requests',()=>{
  const state={protocol:2,phase:'normal',generation:1,databaseId:'(default)',controlDatabaseId:'test-fixed-control'}
  assert.deepEqual(fixedRuntimeState(state),state)
  for(const change of [{protocol:undefined},{protocol:1},{databaseId:'test-restored'},{controlDatabaseId:'(default)'},{generation:0},{phase:'retired'}])assert.throws(()=>fixedRuntimeState({...state,...change}))
  assert.throws(()=>assertFixedRequest(state,1,undefined,true,true))
  assert.throws(()=>assertFixedRequest(state,0,2,false,true))
  assertFixedRequest(state,1,2,true,false)
  assert.equal(sameFixedEpoch(state,{...state,generation:2}),false)
  assert.throws(()=>assertFixedRequest({...state,phase:'recovering'},1,2,false,true))
  assertFixedRequest({...state,phase:'verification'},1,2,false,true)
  assert.throws(()=>assertFixedRequest({...state,phase:'verification'},1,2,true,true))
})
const state = { phase: 'normal', generation: 5, databaseId: '(default)', controlDatabaseId: 'test-control' }
const privateSnapshot={schemaVersion:1,hashConfigurationEvidence:'fictional/hash',users:[
  {uid:'existing',email:'existing@example.invalid',disabled:false,passwordHash:'ZmFrZQ==',passwordSalt:'c2FsdA==',providerData:[{providerId:'password'}]},
  {uid:'missing',email:'missing@example.invalid',disabled:false,passwordHash:'ZmFrZQ==',passwordSalt:'c2FsdA==',providerData:[{providerId:'password'}]},
]}
const currentProfiles=privateSnapshot.users.map((u,i)=>({uid:u.uid,email:u.email,enabled:i===0,role:'general_staff',collection:'staffAccounts'}))
const liveExisting=[{uid:'existing',email:'existing@example.invalid',disabled:false}]
test('private inspection reads recorded generation instead of a replacement and labels legacy references',async()=>{
  const ref={bucket:'termite-warranty-dev-recovery-auth',object:'fictional/hash.json',generation:'97'},calls=[]
  const request=async url=>{calls.push(url);if(url.includes('alt=media'))return new Response('old');return new Response(JSON.stringify({generation:url.includes('generation=97')?'97':'98',size:3}))}
  const saved=await readPrivateAuthObject(ref,request,{requirePinned:true})
  assert.equal(saved.bytes.toString(),'old');assert.equal(saved.pinned,true)
  assert.ok(calls.every(url=>url.includes('generation=97')))
  const legacy={bucket:ref.bucket,object:'fictional/auth.gz'}
  assert.equal((await readPrivateAuthObject(legacy,request)).pinned,false)
  await assert.rejects(readPrivateAuthObject(legacy,request,{requirePinned:true}))
  await assert.rejects(readPrivateAuthObject(ref,async()=>new Response(JSON.stringify({generation:'98',size:3})),{requirePinned:true}))
})
test('Auth CLI refuses live restore before reading credentials or private evidence',()=>{
  const result=spawnSync(process.execPath,['scripts/auth-recovery.mjs','restore','--project','termite-warranty-dev','--control','test-control','--revision','a'.repeat(40),'--apply'],{encoding:'utf8'})
  assert.equal(result.status,1)
  assert.equal(result.stdout,'')
  assert.equal(JSON.parse(result.stderr).status,'failed')
})
test('Auth repair restores only missing identities and uses current disable authority',()=>{
  const plan=missingAuthPlan(privateSnapshot,currentProfiles,liveExisting)
  assert.equal(plan.missing,1);assert.equal(plan.preserved,1)
  assert.equal(plan.records[0].uid,'missing');assert.equal(plan.records[0].disabled,true)
  assert.ok(Buffer.isBuffer(plan.records[0].passwordHash))
  const allMissing=missingAuthPlan(privateSnapshot,currentProfiles,[])
  assert.equal(allMissing.missing,2)
  const obsolete={...privateSnapshot,users:[...privateSnapshot.users,{uid:'deleted-historical'}]}
  assert.equal(missingAuthPlan(obsolete,currentProfiles,liveExisting).ignoredHistorical,1)
  assert.equal(missingAuthPlan(privateSnapshot,currentProfiles,[...liveExisting,{uid:'missing',email:'missing@example.invalid',disabled:true}]).missing,0)
})
test('Auth repair rejects duplicate, stale, mismatched and unsupported identities before import',()=>{
  for(const [snapshot,profiles,users] of [
    [{...privateSnapshot,users:[privateSnapshot.users[0],privateSnapshot.users[0]]},currentProfiles,liveExisting],
    [privateSnapshot,[...currentProfiles,currentProfiles[0]],liveExisting],
    [privateSnapshot,currentProfiles,[{...liveExisting[0],disabled:true}]],
    [privateSnapshot,currentProfiles,[{uid:'orphan',email:'orphan@example.invalid',disabled:false}]],
    [privateSnapshot,currentProfiles.map(p=>({...p,email:'same@example.invalid'})),liveExisting],
    [{...privateSnapshot,users:[]},currentProfiles,liveExisting],
    [{...privateSnapshot,users:privateSnapshot.users.map(u=>({...u,passwordHash:'invalid!'}))},currentProfiles,liveExisting],
    [{...privateSnapshot,users:privateSnapshot.users.map(u=>({...u,providerData:[{providerId:'google.com'}]}))},currentProfiles,liveExisting],
    [{...privateSnapshot,users:privateSnapshot.users.map(u=>({...u,customClaims:{admin:true}}))},currentProfiles,liveExisting],
    [privateSnapshot,currentProfiles.map(p=>({...p,role:'construction_company'})),liveExisting],
  ])assert.throws(()=>missingAuthPlan(snapshot,profiles,users))
  const config={schemaVersion:1,project:'fictional-project',hashConfig:{algorithm:'SCRYPT',signerKey:'ZmFrZQ==',saltSeparator:'',rounds:8,memoryCost:14}}
  assert.ok(Buffer.isBuffer(authImportOptions(config,'fictional-project').hash.key))
  for(const patch of [{algorithm:'STANDARD_SCRYPT'},{rounds:9},{memoryCost:15},{signerKey:'invalid!'}])assert.throws(()=>authImportOptions({...config,hashConfig:{...config.hashConfig,...patch}},'fictional-project'))
  assert.throws(()=>authImportOptions(config,'wrong-project'))
})
test('backup health rejects stale, unavailable, expired and future backups',()=>{
  const now=Date.parse('2026-10-06T00:00:00Z'), row={database:'business',state:'READY',snapshotTime:'2026-10-05T00:00:00Z',expireTime:'2026-11-01T00:00:00Z'}
  assert.equal(backupHealth([row],'business',now).status,'success')
  for(const patch of [{state:'CREATING'},{expireTime:'2026-10-01T00:00:00Z'},{database:'control'}])assert.equal(backupHealth([{...row,...patch}],'business',now).status,'missing')
  for(const snapshotTime of ['2026-10-01T00:00:00Z','2026-10-07T00:00:00Z'])assert.equal(backupHealth([{...row,snapshotTime}],'business',now).status,'failed')
  const metadata={iamConfiguration:{publicAccessPrevention:'enforced',uniformBucketLevelAccess:{enabled:true}},lifecycle:{rule:[{action:{type:'Delete'},condition:{age:30,matchesPrefix:['auth/']}}]}}
  assertPrivateAuthBucket(metadata,{bindings:[]})
  assert.throws(()=>assertPrivateAuthBucket(metadata,{bindings:[{members:['allUsers']}]}))
  assert.throws(()=>assertPrivateAuthBucket({...metadata,lifecycle:{}},{bindings:[]}))
})
test('stale requests cannot mutate a newly active restored generation', () => {
  assertRequest(state, 5, true, false)
  for (const generation of [undefined, 0, 4, 6]) assert.throws(()=>assertRequest(state, generation, true, true))
  assert.throws(()=>assertRequest({...state, phase:'verification'},5,true,true))
  assert.throws(()=>assertRequest({...state, phase:'verification'},5,false,false))
  assertRequest({...state,phase:'verification'},5,false,true)
  assert.throws(()=>assertRequest({...state,phase:'recovering'},5,false,true))
  assert.equal(PROPERTY_READ_ACTIONS.includes('report'),false)
  for (const command of ['notify','bill','undoBill','confirmUnbilled','saveAlertSettings','setAccountEnabled']) assert.equal(PROPERTY_READ_ACTIONS.includes(command), false)
})
test('runtime and recovery transitions require valid state, drained operations and approvals',()=>{
  assert.throws(()=>runtimeState({}))
  assert.throws(()=>runtimeState({...state,generation:NaN}))
  assertTransition(state,'recovering')
  for (const activeOperations of [1,NaN,-1]) assert.throws(()=>assertTransition({...state,phase:'recovering'},'verification',{activeOperations,approval:'external',verified:true}))
  assert.throws(()=>assertTransition({...state,phase:'verification'},'normal',{verified:true}))
  assertTransition({...state,phase:'verification'},'normal',{verified:true,approval:'external'})
})
const base=['--project','demo-termite-warranty','--emulator','--control','test-control','--revision','a'.repeat(40)]
test('CLI is a write-free plan by default and rejects mixed targets/unknown options',()=>{
  assert.equal(recoveryOptions(['initialize',...base]).apply,false)
  for (const tail of [['--typo'],['--project','other'],['--apply'],['--emulator']]) assert.throws(()=>recoveryOptions(['initialize',...base,...tail]))
  assert.throws(()=>recoveryOptions(['restore',...base,'--target','test-restore','--generation','1']))
  assert.throws(()=>recoveryOptions(['enter',...base,'--generation','0']))
})
test('managed restore refuses existing targets, incomplete backups and invalid PITR times',async()=>{
  const calls=[], source='projects/termite-warranty-dev/databases/(default)', backup='projects/termite-warranty-dev/locations/asia-northeast1/backups/one'
  const request=async(url,method,body)=>{calls.push({url,method,body});if(url.endsWith('/databases/test-restore')){const e=new Error();e.status=404;throw e}if(url.endsWith('/backups/one'))return{database:source,state:'READY',expireTime:'2030-01-01T00:00:00Z',snapshotTime:'2026-10-01T01:00:00Z'};if(method==='POST')return{name:'projects/termite-warranty-dev/databases/test-restore/operations/op'};return{earliestVersionTime:'2026-10-01T00:00:00Z'}}
  const provider=firestoreRecoveryProvider({projectId:'termite-warranty-dev',request,now:()=>Date.parse('2026-10-02T00:00:00Z')})
  await assert.rejects(provider.restore({source:'(default)',target:'(default)',backup}))
  await assert.rejects(provider.restore({source:'(default)',target:'test-restore',snapshotTime:'2026-10-01T01:00:01Z'}))
  const result=await provider.restore({source:'(default)',target:'test-restore',backup})
  assert.equal(result.recoveryPoint,'2026-10-01T01:00:00Z')
  assert.deepEqual(calls.at(-1).body,{databaseId:'test-restore',backup})
  await provider.restore({source:'(default)',target:'test-restore',snapshotTime:'2026-10-01T01:00:00Z'})
  assert.deepEqual(calls.at(-1).body.pitrSnapshot,{database:source,snapshotTime:'2026-10-01T01:00:00Z'})
  const pending=firestoreRecoveryProvider({projectId:'termite-warranty-dev',request:async()=>({done:false})})
  assert.deepEqual(await pending.operation('projects/termite-warranty-dev/databases/test-restore/operations/op','test-restore'),{done:false})
  const failed=firestoreRecoveryProvider({projectId:'termite-warranty-dev',request:async()=>({done:true,error:{code:13}})})
  await assert.rejects(failed.operation('projects/termite-warranty-dev/databases/test-restore/operations/op','test-restore'))
})
