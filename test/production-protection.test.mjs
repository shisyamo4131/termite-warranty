import test from 'node:test'
import assert from 'node:assert/strict'
import {productionProtectionProvider,protectionBucketSpec,protectionRequestAllowed,configureProductionProtection} from '../scripts/lib/production-protection.mjs'
const target={project:'fictional-prod',projectNumber:'123456',control:'recovery-control'}
const request={target,generation:1,operation:'fictional-protect',approval:'fictional-approval',revision:'a'.repeat(40)}
const ready={foundationReady:true,pitrEnabled:true,dailySchedules:1,privateBucket:true}
function providerFixture(){
  const writes=[],s={db:{name:'projects/fictional-prod/databases/(default)',type:'FIRESTORE_NATIVE',locationId:'asia-northeast1',pointInTimeRecoveryEnablement:'POINT_IN_TIME_RECOVERY_DISABLED'},schedules:[],bucket:null,policy:{bindings:[]}}
  const provider={describe:async()=>s.db,schedules:async()=>s.schedules,configure:async()=>{writes.push('configure');s.db.pointInTimeRecoveryEnablement='POINT_IN_TIME_RECOVERY_ENABLED';s.schedules=[{dailyRecurrence:{},retention:'2592000s'}]}}
  const api=async(url,method='GET',body)=>{if(method==='POST'){writes.push('bucket');s.bucket={...body,projectNumber:target.projectNumber};return s.bucket}if(url.endsWith('/iam'))return s.policy;if(!s.bucket)throw Object.assign(Error(),{status:404});return s.bucket}
  return {s,writes,provider,api,p:productionProtectionProvider({target,request:api,provider})}
}
test('foundation request policy allows exact private creation only; rejects IAM, object and foreign writes',()=>{
  const url='https://storage.googleapis.com/storage/v1/b?project=fictional-prod',body=protectionBucketSpec(target)
  assert.equal(protectionRequestAllowed(url,'POST',target,true,body),true)
  for(const [u,m,b] of [[url,'POST',{...body,name:'foreign'}],[url,'PATCH',body],[url+'&x=1','POST',body],[url.replace('fictional-prod','other'),'POST',body]])assert.equal(protectionRequestAllowed(u,m,target,true,b),false)
  assert.equal(protectionRequestAllowed(url,'POST',target,false,body),false)
  const root='https://storage.googleapis.com/storage/v1/b/'+body.name
  assert.equal(protectionRequestAllowed(root+'/iam','GET',target),true)
  for(const [u,m] of [[root+'/iam','PUT'],[root+'/o/private','GET'],[root+'?alt=media','GET'],[root+'/../foreign','GET']])assert.equal(protectionRequestAllowed(u,m,target,true),false)
})
test('foundation validates complete current configuration before additive writes and verifies readback',async()=>{
  const f=providerFixture();assert.equal((await f.p.inspect()).foundationReady,false);assert.equal(f.writes.length,0)
  assert.deepEqual(await f.p.configure(),ready);assert.deepEqual(f.writes,['bucket','configure'])
  for(const mutate of [s=>s.db.locationId='us-central1',s=>s.schedules.push({weeklyRecurrence:{},retention:'2592000s'}),s=>s.bucket.projectNumber='999',s=>s.bucket.softDeletePolicy.retentionDurationSeconds='604800',s=>s.policy.bindings=[{members:['allUsers']}],s=>s.bucket.lifecycle.rule.push({action:{type:'Delete'},condition:{age:1}})]){
    const g=providerFixture();await g.p.configure();mutate(g.s);g.writes.length=0;await assert.rejects(()=>g.p.configure());assert.equal(g.writes.length,0)
  }
})
function context(){
  const state={protocol:2,phase:'normal',generation:1,databaseId:'(default)',controlDatabaseId:target.control}
  const rows=new Map([['recovery/runtime',state]]),marker=structuredClone(state),writes=[],calls=[]
  const snap=key=>({exists:rows.has(key),data:()=>rows.get(key)})
  const control={doc:path=>({path}),collection:()=>({limit:()=>({query:true})}),runTransaction:async fn=>{
    const changes=[],tx={get:async ref=>ref.query?{size:0}:snap(ref.path),create:(ref,v)=>{assert.ok(!rows.has(ref.path));changes.push(['create',ref.path,v])},update:(ref,v)=>changes.push(['update',ref.path,v]),delete:ref=>changes.push(['delete',ref.path])}
    await fn(tx);for(const [kind,key,value] of changes){writes.push(key);if(kind==='delete')rows.delete(key);else rows.set(key,kind==='update'?{...rows.get(key),...value}:value)}
  }}
  const database=id=>{assert.ok([target.control,'(default)'].includes(id));return id===target.control?control:{doc:path=>{assert.equal(path,'_recovery/access');return {get:async()=>({data:()=>marker})}}}}
  const protection={inspect:async()=>ready,configure:async()=>{calls.push('configure');return ready}}
  return {database,protection,rows,marker,writes,calls}
}
test('normal-state foundation does not mutate runtime or business data and releases its own lock',async()=>{
  const c=context();assert.deepEqual(await configureProductionProtection(request,c),ready)
  assert.equal(c.rows.get('recovery/runtime').phase,'normal');assert.equal(c.rows.has('recovery/operatorLock'),false)
  assert.equal(c.rows.get('productionProtection/fictional-protect').status,'verified')
  assert.ok(c.writes.every(k=>k==='recovery/operatorLock'||k==='productionProtection/fictional-protect'))
  await assert.rejects(()=>configureProductionProtection(request,c));assert.equal(c.calls.length,1)
})
test('maintenance, epoch mismatch, foreign lock and in-flight Auth prevent provider writes',async()=>{
  for(const mutate of [c=>c.marker.phase='recovering',c=>c.rows.set('recovery/runtime',{...c.marker,generation:2}),c=>c.rows.set('recovery/operatorLock',{owner:'foreign'}),c=>c.rows.set('recovery/authExportLock',{owner:'exporting'})]){
    const c=context();mutate(c);await assert.rejects(()=>configureProductionProtection(request,c));assert.equal(c.calls.length,0);assert.equal(c.writes.length,0)
  }
})
test('unknown provider outcome retains journal and lock; explicit stopped-worker finalization never resends',async()=>{
  const c=context();c.protection.configure=async()=>{c.calls.push('unknown');throw Error('unknown')}
  await assert.rejects(()=>configureProductionProtection(request,c));assert.equal(c.rows.get('productionProtection/fictional-protect').status,'started')
  const resume={...request,resumeOwner:c.rows.get('recovery/operatorLock').owner,workerStopped:true}
  await assert.rejects(()=>configureProductionProtection({...resume,resumeOwner:'different'},c))
  await assert.rejects(()=>configureProductionProtection({...resume,revision:'b'.repeat(40)},c))
  c.protection.inspect=async()=>({...ready,foundationReady:false});await assert.rejects(()=>configureProductionProtection(resume,c))
  c.protection.inspect=async()=>ready;assert.deepEqual(await configureProductionProtection(resume,c),ready)
  assert.equal(c.calls.length,1);assert.equal(c.rows.has('recovery/operatorLock'),false)
})
