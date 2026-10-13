import test from 'node:test'
import assert from 'node:assert/strict'
import {deflateRawSync} from 'node:zlib'
import {crc32,readSourceZip,hostingHash,hostingConfig,releaseProof,hostingReleaseProof} from '../scripts/lib/default-recovery-release-proof.mjs'
import {proofFailure,proofDiagnostic,proofFetch} from '../scripts/lib/default-recovery-diagnostics.mjs'

function zip(files) {
  const locals=[],central=[];let offset=0
  for(const [name,data] of files){const n=Buffer.from(name),bytes=Buffer.from(data),packed=deflateRawSync(bytes),crc=crc32(bytes),local=Buffer.alloc(30),entry=Buffer.alloc(46)
    local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(n.length,26)
    entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(8,10);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(packed.length,20);entry.writeUInt32LE(bytes.length,24);entry.writeUInt16LE(n.length,28);entry.writeUInt32LE(offset,42)
    locals.push(local,n,packed);central.push(entry,n);offset+=30+n.length+packed.length
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.size??files.length,8);end.writeUInt16LE(files.size??files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16)
  return Buffer.concat([...locals,directory,end])
}
function fixture() {
  const project='fictional-dev',projectNumber='123',control='recovery-control',site='fictional-site',region='asia-northeast1'
  const sourceFiles=new Map(['package.json','index.js','recovery-runtime.js','domain/fixed-recovery.mjs'].map(p=>[p,Buffer.from(p)]))
  const archive=zip(sourceFiles),inputs={functionNames:['one','two'],sourceFiles,region,hostingFiles:new Map([['/index.html',hostingHash(Buffer.from('page'))]]),servingConfig:{}}
  const functions=inputs.functionNames.map(name=>({name:`projects/${project}/locations/${region}/functions/${name}`,state:'ACTIVE',environment:'GEN_2',buildConfig:{entryPoint:name,runtime:'nodejs22',sourceProvenance:{resolvedStorageSource:{bucket:`gcf-v2-sources-${projectNumber}-${region}`,object:'source.zip',generation:'1'}}},serviceConfig:{environmentVariables:{RECOVERY_CONTROL_DATABASE:control},allTrafficOnLatestRevision:true,service:`projects/${project}/locations/${region}/services/${name}`,revision:`${name}-0001`}}))
  const channel={name:`sites/${site}/channels/live`,release:{name:'release-1',type:'DEPLOY',version:{name:`sites/${site}/versions/version1`}}}
  const env=[{name:'RECOVERY_CONTROL_DATABASE',value:control}],values=new Map([
    [`https://firebase.googleapis.com/v1beta1/projects/${project}`,{projectId:project,projectNumber}],
    [`https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/-/functions`,{functions}],
    [`https://firebasehosting.googleapis.com/v1beta1/projects/${project}/sites/${site}`,{name:`projects/${project}/sites/${site}`}],
    [`https://firebasehosting.googleapis.com/v1beta1/sites/${site}/channels/live`,channel],
    [`https://firebasehosting.googleapis.com/v1beta1/sites/${site}/versions/version1`,{name:channel.release.version.name,status:'FINALIZED',config:{},fileCount:'1'}],
    [`https://firebasehosting.googleapis.com/v1beta1/sites/${site}/versions/version1/files`,{files:[{path:'/index.html',status:'ACTIVE',hash:inputs.hostingFiles.get('/index.html')}]}],
  ])
  for(const f of functions){const name=f.serviceConfig.service,revision=`${name}/revisions/${f.serviceConfig.revision}`;values.set(`https://run.googleapis.com/v2/${name}`,{name,generation:'2',observedGeneration:'2',terminalCondition:{state:'CONDITION_SUCCEEDED'},latestReadyRevision:revision,latestCreatedRevision:revision,traffic:[{revision,percent:100}],trafficStatuses:[{revision,percent:100}],template:{containers:[{env}]}});values.set(`https://run.googleapis.com/v2/${revision}`,{name:revision,conditions:[{type:'Ready',state:'CONDITION_SUCCEEDED'}],containers:[{env}]})}
  return {project,control,site,inputs,functions,values,archive,request:async url=>{if(!values.has(url))throw Error('private canary');return structuredClone(values.get(url))},readArchive:async()=>archive}
}
test('native ZIP verifies compressed bytes and rejects malformed/private paths',()=>{
  const bytes=zip(new Map([['index.js',Buffer.from('hello')]]));assert.equal(readSourceZip(bytes).get('index.js').toString(),'hello')
  for(const names of [[['../secret','x']],[['/secret','x']],[['a','x'],['A','y']],[['a\\b','x']]])assert.throws(()=>readSourceZip(zip(names)))
  const corrupt=Buffer.from(bytes);corrupt.writeUInt32LE(0,14);assert.throws(()=>readSourceZip(corrupt))
  const encrypted=Buffer.from(bytes);encrypted.writeUInt16LE(1,6);assert.throws(()=>readSourceZip(encrypted))
  assert.throws(()=>readSourceZip(bytes.subarray(0,-1)))
})
test('gzip hash/config canonical conversion matches reviewed deployment contract',()=>{
  assert.equal(hostingHash(Buffer.from('x')).length,64)
  assert.deepEqual(hostingConfig({public:'x',headers:[{source:'**',headers:[{key:'A',value:'B'}]}],rewrites:[{source:'**',destination:'/index.html'}]}),{headers:[{glob:'**',headers:{A:'B'}}],rewrites:[{glob:'**',path:'/index.html'}]})
  assert.throws(()=>hostingConfig({rewrites:[{source:'**',function:'f'}]}))
})
test('complete provider proof checks all functions and live Hosting independently',async()=>{
  const f=fixture(),checks=await releaseProof(f);assert.deepEqual(checks.map(c=>c.status),['pass','pass']);assert.equal(checks[0].summary.functions,2)
})
test('production environment must agree on Functions and both Cloud Run definitions',async()=>{
  for(const mode of ['valid','function','service','revision']){
    const f=fixture(),expected={TERMITE_DEPLOYMENT_ENVIRONMENT:'production',TERMITE_PRODUCTION_PROJECT:f.project}
    f.inputs.expectedEnvironment=expected
    for(const fn of f.functions){
      Object.assign(fn.serviceConfig.environmentVariables,expected)
      const service=f.values.get('https://run.googleapis.com/v2/'+fn.serviceConfig.service)
      const rev=f.values.get('https://run.googleapis.com/v2/'+fn.serviceConfig.service+'/revisions/'+fn.serviceConfig.revision)
      for(const container of [service.template.containers[0],rev.containers[0]])container.env=[...container.env.map(e=>({...e})),...Object.entries(expected).map(([name,value])=>({name,value}))]
    }
    if(mode==='function')f.functions[0].serviceConfig.environmentVariables.TERMITE_PRODUCTION_PROJECT='foreign'
    if(mode==='service')f.values.get('https://run.googleapis.com/v2/'+f.functions[0].serviceConfig.service).template.containers[0].env.find(e=>e.name==='TERMITE_PRODUCTION_PROJECT').value='foreign'
    if(mode==='revision')f.values.get('https://run.googleapis.com/v2/'+f.functions[0].serviceConfig.service+'/revisions/'+f.functions[0].serviceConfig.revision).containers[0].env.push({name:'TERMITE_PRODUCTION_PROJECT',value:f.project})
    assert.equal((await releaseProof(f))[0].status,mode==='valid'?'pass':'blocked')
  }
})
test('partial Functions, wrong provenance/control and unstable Cloud Run stay blocked',async()=>{
  for(const alter of [f=>f.functions.pop(),f=>f.functions[0].buildConfig.sourceProvenance.resolvedStorageSource.generation='',f=>f.functions[0].serviceConfig.environmentVariables.RECOVERY_CONTROL_DATABASE='wrong',f=>f.functions[0].state='DEPLOYING',f=>{const run=f.values.get('https://run.googleapis.com/v2/'+f.functions[0].serviceConfig.service);run.observedGeneration='1'},f=>{const run=f.values.get('https://run.googleapis.com/v2/'+f.functions[0].serviceConfig.service);run.trafficStatuses[0].percent=99},f=>{f.readArchive=async()=>zip(new Map([...f.inputs.sourceFiles,['extra.js',Buffer.from('x')]]))}]){const f=fixture();alter(f);const result=await releaseProof(f);assert.deepEqual(result.map(c=>c.status),['blocked','pass']);assert.ok(!JSON.stringify(result).includes('private canary'))}
})
test('partial Hosting, wrong hash/config/site and mixed release remain blocked',async()=>{
  for(const alter of [f=>f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/versions/version1/files`).files.pop(),f=>f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/versions/version1/files`).files[0].hash='wrong',f=>f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/versions/version1`).config={cleanUrls:true},f=>f.values.get(`https://firebasehosting.googleapis.com/v1beta1/projects/${f.project}/sites/${f.site}`).name='projects/other/sites/x',f=>{const request=f.request;let count=0;f.request=async u=>{const value=await request(u);if(u.endsWith('/channels/live')&&++count===2)value.release.name='changed';return value}}]){const f=fixture();alter(f);assert.deepEqual((await releaseProof(f)).map(c=>c.status),['pass','blocked'])}
  const f=fixture();f.functions.pop();f.site=undefined;assert.deepEqual((await releaseProof(f)).map(c=>c.status),['blocked','blocked'])
})
import {bindProviderInitialization} from '../scripts/lib/default-recovery-provider-init.mjs'
function providerFixture(){const project='termite-warranty-dev',site=project,projectNumber='123456',priorVersion=`sites/${site}/versions/prior1`,current=`sites/${site}/versions/current1`,config={projectId:project,appId:`1:${projectNumber}:web:aaaa`,apiKey:'fictional-public-key',authDomain:project+'.firebaseapp.com',storageBucket:project+'.appspot.com',messagingSenderId:projectNumber},pub={...config,databaseURL:`https://${project}.firebaseio.com`},provider=[{path:'/__/firebase/init.js',status:'ACTIVE',hash:'a'.repeat(64)},{path:'/__/firebase/init.json',status:'ACTIVE',hash:'b'.repeat(64)}],app={path:'/index.html',status:'ACTIVE',hash:hostingHash(Buffer.from('fictional'))},channel={name:`sites/${site}/channels/live`,release:{name:'release1',type:'DEPLOY',releaseTime:'2026-10-06T01:00:00Z',version:{name:current}}},values=new Map([[`https://firebasehosting.googleapis.com/v1beta1/projects/${project}/sites/${site}`,{name:`projects/${project}/sites/${site}`,appId:config.appId}],[`https://firebase.googleapis.com/v1beta1/projects/${project}/webApps/${config.appId}/config`,config],[`https://firebasehosting.googleapis.com/v1beta1/${priorVersion}`,{name:priorVersion,status:'FINALIZED'}],[`https://firebasehosting.googleapis.com/v1beta1/${priorVersion}/files`,{files:[app,...provider]}],[`https://firebasehosting.googleapis.com/v1beta1/sites/${site}/channels/live`,channel],[`https://firebasehosting.googleapis.com/v1beta1/${current}`,{name:current,status:'FINALIZED',fileCount:'3',config:{}}],[`https://firebasehosting.googleapis.com/v1beta1/${current}/files`,{files:[app,...provider]}]]);values.set('https://firebasehosting.googleapis.com/v1beta1/sites/'+site+'/channels/live/releases',{releases:[{name:'sites/'+site+'/releases/prior-release',type:'DEPLOY',releaseTime:'2026-10-05T01:00:00Z',version:{name:priorVersion}}]});return {project,site,projectNumber,priorVersion,config,pub,provider,current,values,inputs:{hostingFiles:new Map([[app.path,app.hash]]),servingConfig:{}},request:async url=>structuredClone(values.get(url)??(()=>{throw Error('Unknown fixture URL')})()),readPublic:async()=>JSON.stringify(pub)}}
test('all application and both provider hashes still require exact full Hosting proof',async()=>{const f=providerFixture(),inputs=await bindProviderInitialization(f);assert.equal(f.inputs.hostingFiles.size,1);assert.equal(inputs.hostingFiles.size,3);assert.deepEqual(await hostingReleaseProof({...f,inputs}),{files:3});for(const mode of ['changed-provider','unknown-extra','missing-app']){const row=providerFixture(),bound=await bindProviderInitialization(row),files=row.values.get(`https://firebasehosting.googleapis.com/v1beta1/${row.current}/files`).files;if(mode==='changed-provider')files[1].hash='c'.repeat(64);if(mode==='unknown-extra')files.push({path:'/extra.js',hash:'d'.repeat(64),status:'ACTIVE'});if(mode==='missing-app')files.shift();await assert.rejects(()=>hostingReleaseProof({...row,inputs:bound}))}})
test('wrong project/app/public config or missing prior provider never augments the expected artifact',async()=>{for(const mode of ['project','apiKey','extra-config','foreign-db','foreign-app','missing-prior','bad-prior-status','reserved-local']){const f=providerFixture();if(mode==='project')f.pub.projectId='foreign';if(mode==='apiKey')f.pub.apiKey='other';if(mode==='extra-config')f.pub.unexpected=true;if(mode==='foreign-db')f.pub.databaseURL='https://foreign.firebaseio.com';if(mode==='foreign-app')f.config.appId='1:654321:web:bbbb';if(mode==='missing-prior')f.values.get(`https://firebasehosting.googleapis.com/v1beta1/${f.priorVersion}/files`).files.pop();if(mode==='bad-prior-status')f.values.get(`https://firebasehosting.googleapis.com/v1beta1/${f.priorVersion}`).status='CREATED';if(mode==='reserved-local')f.inputs.hostingFiles.set('/__/other.js','x');await assert.rejects(()=>bindProviderInitialization(f));assert.ok(f.inputs.hostingFiles.size<=2)}})
test('mutable management configuration and duplicate prior entries fail closed',async()=>{for(const mode of ['changed-config','duplicate']){const f=providerFixture();if(mode==='duplicate')f.values.get(`https://firebasehosting.googleapis.com/v1beta1/${f.priorVersion}/files`).files.push(f.provider[0]);else{const request=f.request;let reads=0;f.request=async u=>{const r=await request(u);if(u.includes('/webApps/')&&++reads===2)r.apiKey='changed';return r}}await assert.rejects(()=>bindProviderInitialization(f))}})
test('provider without an RTDB uses an empty database URL',async()=>{const f=providerFixture();f.pub.databaseURL='';assert.equal((await bindProviderInitialization(f)).hostingFiles.size,3)})
test('provider baseline cannot be the current release and release changes invalidate proof',async()=>{
 const same=providerFixture();same.priorVersion=same.current;await assert.rejects(()=>bindProviderInitialization(same))
 const f=providerFixture(),request=f.request;let reads=0
 f.request=async url=>{const value=await request(url);if(url.endsWith('/channels/live')&&++reads===2)value.release.version.name=`sites/${f.site}/versions/changed`;return value}
 await assert.rejects(()=>bindProviderInitialization(f))
 const changed=providerFixture(),inputs=await bindProviderInitialization(changed)
 changed.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${changed.site}/channels/live`).release.version.name=`sites/${changed.site}/versions/other`
 await assert.rejects(()=>hostingReleaseProof({...changed,inputs}))
})
test('formal release verifier invokes provider binding and still verifies every app file',async()=>{
 const f=fixture(),p=providerFixture(),providerVersion=`sites/${f.site}/versions/prior1`
 f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/channels/live`).release.releaseTime='2026-10-06T01:00:00Z'
 f.values.set(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/channels/live/releases`,{releases:[{name:`sites/${f.site}/releases/prior-release`,type:'DEPLOY',releaseTime:'2026-10-05T01:00:00Z',version:{name:providerVersion}}]})
 const config={...p.config,projectId:f.project,appId:'1:123:web:aaaa',messagingSenderId:'123',authDomain:f.project+'.firebaseapp.com',storageBucket:f.project+'.appspot.com'}
 const description=f.values.get(`https://firebasehosting.googleapis.com/v1beta1/projects/${f.project}/sites/${f.site}`);description.appId=config.appId
 f.values.set(`https://firebase.googleapis.com/v1beta1/projects/${f.project}/webApps/${config.appId}/config`,config)
 f.values.set(`https://firebasehosting.googleapis.com/v1beta1/${providerVersion}`,{name:providerVersion,status:'FINALIZED'})
 f.values.set(`https://firebasehosting.googleapis.com/v1beta1/${providerVersion}/files`,{files:p.provider})
 const version=f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/versions/version1`);version.fileCount='3'
 const files=f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/versions/version1/files`).files;files.push(...p.provider)
 const readPublic=async()=>JSON.stringify({...config,databaseURL:''})
 assert.deepEqual((await releaseProof({...f,providerVersion,readPublic})).map(c=>c.status),['pass','pass'])
 files[0].hash='c'.repeat(64)
 assert.deepEqual((await releaseProof({...f,providerVersion,readPublic})).map(c=>c.status),['pass','blocked'])
})
test('unpublished, foreign and future provider baselines never enable publication',async()=>{
 for(const mode of ['unpublished','future','foreign','rollback','missing-live-time','history-loop']){
  const f=providerFixture(),url=`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/channels/live/releases`,history=f.values.get(url)
  if(mode==='unpublished')history.releases=[]
  if(mode==='future')history.releases[0].releaseTime='2026-10-07T01:00:00Z'
  if(mode==='foreign')history.releases[0].name='sites/foreign/releases/one'
  if(mode==='rollback')history.releases[0].type='ROLLBACK'
  if(mode==='missing-live-time')delete f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/channels/live`).release.releaseTime
  if(mode==='history-loop'){history.releases=[];history.nextPageToken='loop';f.values.set(url+'?pageToken=loop',history)}
  await assert.rejects(()=>bindProviderInitialization(f))
 }
})

test('provider stability ignores object key order but preserves every field, type and array order',async()=>{
 const reverse=value=>Array.isArray(value)?value.map(reverse):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverse(v)])):value
 const f=providerFixture();f.config.extra={nested:{one:1,two:2},array:[1,2]}
 const original=f.request;let count=0
 f.request=async url=>{const value=await original(url);return url.endsWith('/config')&&++count===2?reverse(value):value}
 assert.equal((await bindProviderInitialization(f)).hostingFiles.size,3)
 for(const change of [c=>{c.apiKey='other'},c=>{c.messagingSenderId=123456},c=>{delete c.extra},c=>{c.newField=true},c=>{c.extra.array.reverse()},c=>{c.extra.nested.one=2}]) {
  const g=providerFixture();g.config.extra={nested:{one:1,two:2},array:[1,2]}
  const read=g.request;let reads=0
  g.request=async url=>{const value=await read(url);if(url.endsWith('/config')&&++reads===2)change(value);return value}
  await assert.rejects(()=>bindProviderInitialization(g),error=>{
   assert.deepEqual(proofDiagnostic(error),{stage:'provider-stability',reasonCode:'configuration-mismatch'});return true
  })
 }
})

test('release diagnostics separate hash, configuration, live changes and unknown errors without leaking values',async()=>{
 const f=fixture();f.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${f.site}/versions/version1/files`).files[0].hash='secret-hash-canary'
 assert.deepEqual((await releaseProof(f))[1].diagnostic,{stage:'hosting-files',reasonCode:'hash-mismatch'})
 const g=fixture();g.values.get(`https://firebasehosting.googleapis.com/v1beta1/sites/${g.site}/versions/version1`).config={secret:'configuration-canary'}
 assert.deepEqual((await releaseProof(g))[1].diagnostic,{stage:'hosting-version',reasonCode:'configuration-mismatch'})
 const h=fixture(),request=h.request;let reads=0
 h.request=async url=>{const value=await request(url);if(url.endsWith('/channels/live')&&++reads===2)value.release.name='secret-live-canary';return value}
 assert.deepEqual((await releaseProof(h))[1].diagnostic,{stage:'hosting-stability',reasonCode:'snapshot-changed'})
 const unknown=fixture();unknown.request=async()=>{throw Object.assign(Error('token-canary'),{stage:'secret-stage',reasonCode:'secret-reason',status:403,cause:'private-body'})}
 const result=await releaseProof(unknown)
 assert.ok(result.every(row=>row.status==='blocked'&&row.diagnostic.reasonCode==='unknown'))
 assert.ok(!/canary|private-body|secret-stage|secret-reason/.test(JSON.stringify(result)))
})

test('read transport diagnostics preserve numeric HTTP status only and never auto-retry',async()=>{
 for(const status of [401,403,429,503]) {
  let calls=0
  await assert.rejects(()=>proofFetch(async()=>{calls++;return {ok:false,status,text:()=>{throw Error('body must not be read')}}},'https://secret.invalid/token',{},'api-read'),error=>{
   assert.deepEqual(proofDiagnostic(error),{stage:'api-read',reasonCode:'http-error',httpStatus:status});return true
  })
  assert.equal(calls,1)
 }
 await assert.rejects(()=>proofFetch(async()=>{throw Error('private token and URL')},'secret',{},'public-config-read'),error=>{
  assert.deepEqual(proofDiagnostic(error),{stage:'public-config-read',reasonCode:'transport-error'});assert.ok(!String(error).includes('private'));return true
 })
 const response={ok:true};assert.equal(await proofFetch(async()=>response,'unused',{},'api-read'),response)
 assert.deepEqual(proofDiagnostic(proofFailure('secret-stage','secret-reason','secret-status')),{stage:'release-proof',reasonCode:'unknown'})
})
