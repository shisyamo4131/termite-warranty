import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runtimeState, assertRequest, assertTransition, PROPERTY_READ_ACTIONS } from '../src/domain/recovery.mjs'
import { recoveryOptions } from '../scripts/lib/recovery-options.mjs'
import { firestoreRecoveryProvider } from '../scripts/lib/firestore-recovery-provider.mjs'
import { backupHealth, assertPrivateAuthBucket } from '../src/domain/backup-health.mjs'
const state = { phase: 'normal', generation: 5, databaseId: '(default)', controlDatabaseId: 'test-control' }
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
