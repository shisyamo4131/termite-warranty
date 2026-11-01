import test from 'node:test'
import assert from 'node:assert/strict'
import {productionProtectionProvider,protectionBucketSpec,protectionRequestAllowed,configureProductionProtection} from '../scripts/lib/production-protection.mjs'
import {authProtectionRequestAllowed,preserveProductionAuthConfiguration} from '../scripts/lib/production-auth-protection.mjs'
import {backupJobRequestAllowed,backupJobName,runProductionBackupJob} from '../scripts/lib/production-backup-job.mjs'
const target={project:'fictional-prod',projectNumber:'123456',control:'recovery-control'}
const request={target,generation:1,operation:'fictional-protect',approval:'fictional-approval',revision:'a'.repeat(40)}
const ready={foundationReady:true,pitrEnabled:true,dailySchedules:1,privateBucket:true}
test('backup job admission limits transport to one exact job and no configuration updates',()=>{
  const root=`https://cloudscheduler.googleapis.com/v1/${backupJobName(target)}`
  assert.equal(backupJobRequestAllowed(root,'GET',target),true)
  assert.equal(backupJobRequestAllowed(root+':run','POST',target,{}),true)
  for(const [url,method,body] of [[root,'PATCH',{}],[root+':run?x=1','POST',{}],[root.replace('fictional-prod','foreign')+':run','POST',{}],[root+':run','POST',{schedule:'other'}]])assert.equal(!!backupJobRequestAllowed(url,method,target,body),false)
})
function jobContext(){
  const c=context(),env={RECOVERY_BACKUP_AUTOMATION:'true',RECOVERY_AUTH_BACKUP_BUCKET:protectionBucketSpec(target).name,RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE:'recovery/hashConfigurationEvidence',RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE:'verified-notification'}
  const service={uri:'https://fictional.example.invalid',template:{serviceAccount:'prod-backup@fictional-prod.iam.gserviceaccount.com',containers:[{env:Object.entries(env).map(([name,value])=>({name,value}))}]}}
  const job={name:backupJobName(target),state:'ENABLED',httpTarget:{uri:service.uri,httpMethod:'POST',oidcToken:{serviceAccountEmail:'fictional@example.invalid'}}}
  c.request=async(url,method='GET')=>{if(method==='POST'){c.calls.push('run');if(c.unknown)throw Error('timeout');return job}return url.includes('run.googleapis.com')?service:job}
  return Object.assign(c,{service,job})
}
test('backup submission is journaled once, checks runtime configuration and does not claim completed backup',async()=>{
  const o={...request,command:'backup-job-run'},c=jobContext()
  assert.deepEqual(await runProductionBackupJob(o,c),{jobSubmitted:true})
  assert.deepEqual(c.calls,['run']);assert.equal(c.rows.has('recovery/operatorLock'),false)
  await assert.rejects(()=>runProductionBackupJob(o,c));assert.equal(c.calls.length,1)
  for(const mutate of [x=>x.job.state='PAUSED',x=>x.job.httpTarget.uri='https://foreign.invalid',x=>x.service.template.containers[0].env[0].value='false',x=>x.service.template.serviceAccount='foreign',x=>x.marker.phase='recovering']){
    const f=jobContext();mutate(f);await assert.rejects(()=>runProductionBackupJob(o,f));assert.equal(f.calls.length,0)
  }
  const f=jobContext();f.unknown=true;await assert.rejects(()=>runProductionBackupJob(o,f));assert.equal(f.rows.has('recovery/operatorLock'),true)
  await assert.rejects(()=>runProductionBackupJob(o,f));assert.equal(f.calls.length,1)
})
test('backup target permits only the root slash difference and rejects changed destinations before writes',async()=>{
  const o={...request,command:'backup-job-run'}
  for(const slash of [false,true]){
    const c=jobContext();if(slash)c.service.uri+='/';else c.job.httpTarget.uri+='/'
    assert.deepEqual(await runProductionBackupJob(o,c),{jobSubmitted:true});assert.deepEqual(c.calls,['run'])
  }
  for(const suffix of ['//','/other','/?x=1','/#part','/../','?x=1','#part']){
    const c=jobContext();c.job.httpTarget.uri+=suffix
    await assert.rejects(()=>runProductionBackupJob(o,c));assert.equal(c.calls.length,0);assert.equal(c.writes.length,0)
  }
  for(const uri of ['http://fictional.example.invalid/','https://fictional.example.invalid.evil/','https://user@fictional.example.invalid/','https://fictional.example.invalid:443/']){
    const c=jobContext();c.job.httpTarget.uri=uri
    await assert.rejects(()=>runProductionBackupJob(o,c));assert.equal(c.calls.length,0);assert.equal(c.writes.length,0)
  }
})
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
  const control={doc:path=>({path,get:async()=>snap(path),create:async value=>{assert.ok(!rows.has(path));rows.set(path,value);writes.push(path)}}),collection:()=>({limit:()=>({query:true})}),runTransaction:async fn=>{
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

const config={schemaVersion:1,project:target.project,hashConfig:{algorithm:'SCRYPT',signerKey:Buffer.from('fictional-key').toString('base64'),saltSeparator:'',rounds:8,memoryCost:14}}
function authContext(){
  const c=context(),object=`hash-configuration/${request.operation}.json`,bucket=protectionBucketSpec(target).name
  let stored
  c.request=async(url,method='GET',body)=>{
    if(url.startsWith('https://identitytoolkit.googleapis.com/'))return {name:`projects/${target.project}/config`,signIn:{hashConfig:config.hashConfig}}
    assert.equal(method,'POST');c.calls.push('upload');assert.equal(stored,undefined);stored=JSON.stringify(body)
    return {bucket,name:object,generation:'1'}
  }
  c.requestRaw=async url=>url.includes('alt=media')?{ok:true,arrayBuffer:async()=>Buffer.from(stored)}:{ok:true,json:async()=>({generation:'1',size:String(Buffer.byteLength(stored))})}
  return c
}
test('Auth configuration request scope rejects other objects, overwrite, IAM and Auth changes',()=>{
  const root=`https://storage.googleapis.com/upload/storage/v1/b/${protectionBucketSpec(target).name}/o`,url=root+`?uploadType=media&name=${encodeURIComponent('hash-configuration/'+request.operation+'.json')}&ifGenerationMatch=0`
  assert.equal(authProtectionRequestAllowed(url,'POST',target,request.operation,config),true)
  for(const other of [url.replace('ifGenerationMatch=0','ifGenerationMatch=1'),url.replace('hash-configuration','auth'),url+'&x=1'])assert.equal(authProtectionRequestAllowed(other,'POST',target,request.operation,config),false)
  assert.equal(authProtectionRequestAllowed(url,'DELETE',target,request.operation),false)
  assert.equal(authProtectionRequestAllowed(url,'POST',target,request.operation,{...config,extra:'no'}),false)
})
test('Auth configuration preserves a generation-pinned private copy and leaves business/Auth untouched',async()=>{
  const c=authContext(),o={...request,command:'auth-protection-configure'}
  assert.deepEqual(await preserveProductionAuthConfiguration(o,c),{hashConfigurationVerified:true})
  assert.equal(c.rows.get('recovery/hashConfigurationEvidence').generation,'1')
  assert.deepEqual(c.calls,['upload']);assert.equal(c.rows.has('recovery/operatorLock'),false)
  assert.ok(c.writes.every(k=>['recovery/hashConfigurationEvidence','recovery/operatorLock',`productionProtection/${o.operation}`].includes(k)))
  await assert.rejects(()=>preserveProductionAuthConfiguration(o,c));assert.deepEqual(c.calls,['upload'])
})
test('Auth malformed source, foreign evidence and in-flight export prevent upload; unknown outcome retains lock',async()=>{
  for(const mutate of [c=>c.request=async()=>({name:'foreign'}),c=>c.rows.set('recovery/hashConfigurationEvidence',{object:'foreign'}),c=>c.rows.set('recovery/authExportLock',{owner:'busy'})]){
    const c=authContext();mutate(c);await assert.rejects(()=>preserveProductionAuthConfiguration({...request,command:'auth-protection-configure'},c));assert.equal(c.calls.length,0)
  }
  const c=authContext(),original=c.request;c.request=async(...args)=>{if(args[1]==='POST')throw Error('unknown');return original(...args)}
  await assert.rejects(()=>preserveProductionAuthConfiguration({...request,command:'auth-protection-configure'},c));assert.equal(c.rows.get('recovery/operatorLock').kind,'production-auth-protection')
})
