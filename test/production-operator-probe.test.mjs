import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {parse} from 'yaml'
import {operatorProbe,operatorTarget as t} from '../scripts/production-operator-probe.mjs'
const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:'shisyamo4131/termite-warranty',GITHUB_REPOSITORY_ID:'1363463339',GITHUB_REPOSITORY_OWNER_ID:'72244713',GITHUB_SHA:'a'.repeat(40),GITHUB_WORKFLOW_REF:t.workflowRef,ACTIONS_ID_TOKEN_REQUEST_URL:'https://runner.actions.githubusercontent.com/token',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'fictional-token',GOOGLE_APPLICATION_CREDENTIALS:'fictional-file'}
function fixture(){
  const calls=[]
  return {calls,env,credentials:async options=>{calls.push(['credentials',options]);return {authClient:{},credential:{getAccessToken:async()=>({access_token:'SECRET'})}}},fetcher:async(url,options)=>{
    calls.push(['get',url,options]);const id=url.split('/databases/')[1]
    return new Response(JSON.stringify(id?{name:`projects/${t.project}/databases/${id}`,type:'FIRESTORE_NATIVE',locationId:'asia-northeast1'}:{projectId:t.project,projectNumber:t.number}))
  },createDatabase:options=>{calls.push(['sdk',options]);return {doc:path=>({get:async()=>{calls.push(['doc',options.databaseId,path]);return {exists:false,data(){throw Error('Body must not be read')}}}}),collection:path=>({limit:count=>({get:async()=>{calls.push(['query',options.databaseId,path,count]);return {size:0}}})}),terminate:async()=>{calls.push(['close',options.databaseId])}}}}
}
test('operator reads only fixed metadata and bounded SDK state, including empty uninitialized databases',async()=>{
  const f=fixture(),r=await operatorProbe(f)
  assert.deepEqual(r,{result:'pass',sdkRead:true,businessMarkerExists:false,runtimeExists:false,operatorBlocked:false,activeOperationExists:false,initializationVerified:false,cloudResourceWrites:false})
  assert.equal(f.calls[0][1].serviceAccount,t.serviceAccount);assert.equal(f.calls[0][1].audience,t.audience)
  assert.deepEqual(f.calls.filter(c=>c[0]==='doc').map(c=>c.slice(1)),[['(default)','_recovery/access'],['recovery-control','recovery/runtime'],['recovery-control','recovery/operatorLock']])
  assert.deepEqual(f.calls.find(c=>c[0]==='query').slice(1),['recovery-control','recoveryOperations',1])
  assert.equal(f.calls.filter(c=>c[0]==='get').length,3)
  for(const c of f.calls.filter(c=>c[0]==='get')){assert.equal(c[2].method,'GET');assert.equal(c[2].redirect,'error')}
  assert.equal(f.calls.filter(c=>c[0]==='close').length,2);assert.ok(!JSON.stringify(r).includes('SECRET'))
})
test('foreign invocation, workflow and fallback credentials stop before authentication',async()=>{
  for(const patch of [{GITHUB_REF:'refs/heads/dev'},{GITHUB_REPOSITORY_ID:'1'},{GITHUB_REPOSITORY_OWNER_ID:'2'},{GITHUB_REPOSITORY:'other/repo'},{GITHUB_EVENT_NAME:'push'},{GITHUB_WORKFLOW_REF:t.workflowRef.replace('operator','sdk')},{GOOGLE_APPLICATION_CREDENTIALS:''},{FIREBASE_TOKEN:'legacy'},{FIRESTORE_EMULATOR_HOST:'localhost:8080'},{FUNCTIONS_EMULATOR:'true'},{TERMITE_TEST_RUN:'1'}]){
    const f=fixture();await assert.rejects(()=>operatorProbe({...f,env:{...env,...patch}}),/context/);assert.equal(f.calls.length,0)
  }
})
test('HTTP failures, identity mismatch and oversized responses refuse before SDK access',async()=>{
  for(const response of [()=>new Response('SECRET',{status:403}),()=>new Response('{}'),()=>new Response('x'.repeat(1048577))]){
    const f=fixture();await assert.rejects(()=>operatorProbe({...f,fetcher:async()=>response()}),e=>/project-metadata/.test(e.message)&&!e.message.includes('SECRET'));assert.ok(!f.calls.some(c=>c[0]==='sdk'))
  }
  const f=fixture();await assert.rejects(()=>operatorProbe({...f,fetcher:async(url,opts)=>url.includes('/databases/')?new Response(JSON.stringify({name:'foreign',type:'FIRESTORE_NATIVE',locationId:'asia-northeast1'})):f.fetcher(url,opts)}),/business-metadata/)
})
test('SDK permission failures are sanitized and all constructed clients are closed',async()=>{
  const f=fixture();await assert.rejects(()=>operatorProbe({...f,createDatabase:opts=>{const c=f.createDatabase(opts);c.doc=()=>({get:async()=>{throw Object.assign(Error('SECRET DOCUMENT'),{code:7})}});return c}}),e=>e.message.includes('business-marker')&&e.message.includes('grpc=7')&&!e.message.includes('SECRET'))
  assert.equal(f.calls.filter(c=>c[0]==='close').length,2)
})
test('present state is reported without declaring initialization and cleanup errors stay private',async()=>{
  const f=fixture(),r=await operatorProbe({...f,createDatabase:opts=>{const c=f.createDatabase(opts);c.doc=()=>({get:async()=>({exists:true})});c.collection=()=>({limit:()=>({get:async()=>({size:1})})});return c}})
  assert.equal(r.businessMarkerExists,true);assert.equal(r.runtimeExists,true);assert.equal(r.activeOperationExists,true);assert.equal(r.initializationVerified,false)
  const g=fixture();await assert.rejects(()=>operatorProbe({...g,createDatabase:opts=>({...g.createDatabase(opts),terminate(){throw Error('SECRET CLEANUP')}})}),e=>e.message.includes('cleanup')&&!e.message.includes('SECRET'))
})
test('workflow only dispatches main in isolated environment with exact read-only commands',async()=>{
  const w=parse(await readFile(new URL('../.github/workflows/verify-production-operator.yml',import.meta.url),'utf8'))
  assert.deepEqual(w.on,{workflow_dispatch:null});assert.equal(w.jobs.inspect.if,"github.ref == 'refs/heads/main'");assert.equal(w.jobs.inspect.environment,'production-operations');assert.equal(w.concurrency['cancel-in-progress'],false)
  const steps=w.jobs.inspect.steps;assert.equal(steps[0].with['persist-credentials'],false)
  const auth=steps.find(s=>s.uses==='google-github-actions/auth@v3').with
  assert.equal(auth.cleanup_credentials,true);assert.equal(auth.service_account,t.serviceAccount);assert.equal('//iam.googleapis.com/'+auth.workload_identity_provider,t.audience)
  assert.deepEqual(steps.filter(s=>s.run).map(s=>s.run),['npx --yes npm@11.19.1 ci','node --test test/production-operator-probe.test.mjs','node scripts/production-operator-probe.mjs --execute-approved'])
  assert.deepEqual(steps.filter(s=>s.uses).map(s=>s.uses),['actions/checkout@v7','actions/setup-node@v7','google-github-actions/auth@v3'])
})
