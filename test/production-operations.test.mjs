import test from 'node:test'
import assert from 'node:assert/strict'
import {productionOperation,productionOperationPlan,dispatchProductionOperation} from '../scripts/lib/production-operations.mjs'
import {administratorInput} from '../scripts/lib/production-bootstrap-data.mjs'
import {firestoreRecoveryProvider} from '../scripts/lib/firestore-recovery-provider.mjs'
import {assertPrivateAuthBucket} from '../src/domain/backup-health.mjs'
import {readPrivateAuthObject} from '../scripts/lib/auth-recovery.mjs'
import {inspectHistoricalTarget,executeHistoricalIntake} from '../scripts/lib/historical-intake-execution.mjs'
import {mkdtemp,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
const target={project:'fictional-prod',projectNumber:'123456',site:'fictional-site',appId:'1:123456:web:aaaa',control:'recovery-control',serviceAccount:'deploy@fictional-prod.iam.gserviceaccount.com',audience:'//iam.googleapis.com/projects/123456/locations/global/workloadIdentityPools/fictional/providers/github',repositoryId:'123',ownerId:'456'}
const base={target,operatorIdentity:{audience:target.audience,serviceAccount:'operator@fictional-prod.iam.gserviceaccount.com'},revision:'a'.repeat(40)},write={...base,generation:1,operation:'fictional-operation',approval:'fictional-approval'}
test('Prod operator rejects ambient/foreign targets, malformed commands and unbound execution evidence',()=>{
  assert.equal(productionOperationPlan(productionOperation({...base,command:'observe'})).executionAuthorized,false)
  for(const value of [{...base,command:'unknown'},{...base,command:'observe',apply:true},{...write,command:'enter',approval:undefined},{...write,command:'enter',generation:0},{...write,command:'restore',targetDatabase:target.control,backup:'x'},{...write,command:'restore',targetDatabase:'restore-01',backup:'x',snapshotTime:'x'},{...write,command:'resume'},{...base,command:'auth-inspect',bucket:'termite-warranty-dev-recovery-auth'}])assert.throws(()=>productionOperation(value))
  assert.throws(()=>productionOperation({...base,target:{...target,project:'termite-warranty-dev'},command:'observe'}))
  assert.throws(()=>productionOperation({...base,operatorIdentity:{audience:target.audience,serviceAccount:target.serviceAccount},command:'observe'}))
})
test('initial administrator input permits only exact reviewed existing identity and bounded admin roles',()=>{
  const input={uid:'fictional-admin',email:'fictional@example.invalid',role:'developer_superuser',displayName:'架空管理者'}
  assert.deepEqual(administratorInput(input),input)
  for(const patch of [{role:'general_staff'},{password:'secret'},{uid:'bad/id'},{email:' Upper@example.invalid'},{displayName:''}])assert.throws(()=>administratorInput({...input,...patch}))
})
test('Prod provider binds configured project and refuses control/default restore or cross-project evidence',async()=>{
  assert.throws(()=>firestoreRecoveryProvider({projectId:target.project,request:()=>{throw Error('network')}}))
  assert.throws(()=>firestoreRecoveryProvider({projectId:'other-project',productionTarget:target,request:()=>{}}))
  const calls=[],provider=firestoreRecoveryProvider({projectId:target.project,productionTarget:target,request:async(url,method,body)=>{calls.push({url,method,body});if(url.endsWith('/databases/new-target')){const e=Error();e.status=404;throw e}return {name:`projects/${target.project}/databases/(default)`,locationId:'asia-northeast1',pointInTimeRecoveryEnablement:'POINT_IN_TIME_RECOVERY_ENABLED',backupSchedules:[{dailyRecurrence:{},retention:'2592000s'}]}}})
  assert.deepEqual(await provider.configure('(default)'),{configured:true})
  assert.ok(calls.every(c=>c.method==='GET'))
  for(const args of [{source:'(default)',target:'(default)'},{source:'(default)',target:target.control},{source:target.control,target:'new-target'}])await assert.rejects(()=>provider.restore(args))
  await assert.rejects(()=>provider.restore({source:'(default)',target:'new-target',backup:'projects/foreign/locations/asia-northeast1/backups/a'}))
  assert.ok(calls.every(c=>c.method==='GET'))
})
test('Prod intake cannot widen the destructive Dev reset path or reach foreign stores',async()=>{
  const db={projectId:target.project,databaseId:'(default)'},control={projectId:target.project,databaseId:target.control}
  await assert.rejects(()=>inspectHistoricalTarget(db,control,{}))
  await assert.rejects(()=>inspectHistoricalTarget({...db,projectId:'foreign'},control,{},target))
  await assert.rejects(()=>executeHistoricalIntake(db,control,{},null,{productionTarget:target}))
})
test('private Auth reads require exact bucket, pinned evidence and project-bound private retention policy',async()=>{
  const bucket='fictional-prod-auth',bytes=Buffer.from('fictional'),urls=[]
  const result=await readPrivateAuthObject({bucket,object:'hash/private.json',generation:'1'},async url=>{urls.push(url);return url.includes('alt=media')?new Response(bytes):new Response(JSON.stringify({generation:'1',size:String(bytes.length)}))},{expectedBucket:bucket,requirePinned:true})
  assert.deepEqual(result.bytes,bytes);assert.equal(urls.length,2)
  await assert.rejects(()=>readPrivateAuthObject({bucket:'foreign',object:'x'},()=>{throw Error('must not read')},{expectedBucket:bucket}))
  await assert.rejects(()=>readPrivateAuthObject({bucket,object:'x'},()=>{throw Error('must not read')},{expectedBucket:bucket,requirePinned:true}))
  const metadata={projectNumber:target.projectNumber,iamConfiguration:{publicAccessPrevention:'enforced',uniformBucketLevelAccess:{enabled:true}},lifecycle:{rule:[{action:{type:'Delete'},condition:{age:30,matchesPrefix:['auth/']}}]}}
  assert.doesNotThrow(()=>assertPrivateAuthBucket(metadata,{bindings:[]},target.projectNumber))
  assert.throws(()=>assertPrivateAuthBucket(metadata,{bindings:[]},'999'))
  assert.throws(()=>assertPrivateAuthBucket(metadata,{bindings:[{members:['allUsers']}]},target.projectNumber))
})
test('operation dispatch performs Rules verification before entering maintenance',async()=>{
  const o=productionOperation({...write,command:'enter'}),calls=[]
  await dispatchProductionOperation(o,{database:()=>({}),assertRules:async()=>calls.push('rules'),fixed:{enter:async(g,id)=>{calls.push('enter');assert.equal(g,1);assert.equal(id,o.operation)}}})
  assert.deepEqual(calls,['rules','enter'])
  await assert.rejects(()=>dispatchProductionOperation(o,{database:()=>({}),assertRules:async()=>{throw Error('blocked')},fixed:{enter:async()=>assert.fail('must not enter')}}))
})
test('CLI plan stays offline with unusable credentials and refuses write/read mode mismatch',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'prod-ops-'));t.after(()=>rm(dir,{recursive:true,force:true}))
  const path=join(dir,'fictional.json');await writeFile(path,JSON.stringify({...base,command:'initialize',operation:'fictional-init',approval:'fictional-approval'}))
  const run=mode=>spawnSync(process.execPath,['scripts/production-operations.mjs',mode,path],{encoding:'utf8',env:{...process.env,GOOGLE_APPLICATION_CREDENTIALS:join(dir,'missing.json')}})
  const plan=run('plan');assert.equal(plan.status,0,plan.stderr);assert.equal(JSON.parse(plan.stdout).cloudWrites,false)
  assert.equal(run('inspect').status,1);assert.equal(run('execute').status,1)
})
test('restore submission with unknown outcome retains journal and exclusion; only matched status can release it',async()=>{
  const state={protocol:2,phase:'recovering',generation:1,databaseId:'(default)',controlDatabaseId:target.control},rows=new Map([[target.control+'/recovery/runtime',state],['(default)/_recovery/access',state]])
  const stores=new Map(),snapshot=key=>({exists:rows.has(key),data:()=>rows.get(key)})
  const database=id=>{
    if(!stores.has(id))stores.set(id,{doc:path=>{
      const key=id+'/'+path
      return {key,get:async()=>snapshot(key),create:async v=>{if(rows.has(key))throw Error('exists');rows.set(key,v)},update:async v=>rows.set(key,{...rows.get(key),...v})}
    },collection:()=>({limit:()=>({get:async()=>({size:0})})}),runTransaction:async fn=>fn({get:async ref=>snapshot(ref.key),create:(ref,v)=>{if(rows.has(ref.key))throw Error('exists');rows.set(ref.key,v)},update:(ref,v)=>rows.set(ref.key,{...rows.get(ref.key),...v}),delete:ref=>rows.delete(ref.key)})})
    return stores.get(id)
  }
  const o=productionOperation({...write,command:'restore',targetDatabase:'restore-01',backup:`projects/${target.project}/locations/asia-northeast1/backups/one`}),c={database,assertRules:async()=>{},provider:{restore:async()=>{throw Error('unknown response')}}}
  await assert.rejects(()=>dispatchProductionOperation(o,c))
  assert.equal(rows.get(target.control+'/recoveryTargets/restore-01').status,'submitting')
  await assert.rejects(()=>dispatchProductionOperation(o,{...c,provider:{restore:async()=>assert.fail('must not resubmit')}}))
  const status=productionOperation({...write,command:'restore-status',targetDatabase:'restore-01',restoreOperation:`projects/${target.project}/databases/restore-01/operations/one`,workerStopped:true})
  assert.equal((await dispatchProductionOperation(status,{...c,provider:{operation:async()=>({done:true}),recoveryPoint:async()=> '2026-10-13T00:00:00Z'}})).restoreDone,true)
  assert.equal(rows.has(target.control+'/recovery/operatorLock'),false)
})
