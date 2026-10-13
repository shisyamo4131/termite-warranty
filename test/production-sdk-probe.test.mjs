import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {parse} from 'yaml'
import {sdkProbe,cliArgs} from '../scripts/production-sdk-probe.mjs'
import {target} from '../scripts/production-auth-probe.mjs'
const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:target.repository,GITHUB_REPOSITORY_ID:target.repositoryId,GITHUB_REPOSITORY_OWNER_ID:target.ownerId,GITHUB_SHA:'a'.repeat(40),ACTIONS_ID_TOKEN_REQUEST_URL:'https://runner.actions.githubusercontent.com/token',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'fake-token',GOOGLE_APPLICATION_CREDENTIALS:'fake-wif-file'}
const site={name:`projects/${target.project}/sites/${target.project}`,appId:'1:988295873733:web:bdb85668f28779d8f51cac',defaultUrl:`https://${target.project}.web.app`}
function fixture(){
  const calls=[]
  return {env,calls,credentials:async options=>{calls.push(['credentials',options]);return {credential:{getAccessToken:async()=>({access_token:'never-print-this-token'})}}},fetcher:async (url,options)=>{calls.push(['get',url,options]);return new Response(JSON.stringify(url.endsWith('/channels/live')?{name:`sites/${target.project}/channels/live`}:site))},run:async(file,args,options)=>{calls.push(['cli',file,args,options]);return {stdout:JSON.stringify({status:'success',result:{sites:[site]}})}}}
}
test('SDK and CLI read only fixed site and suppress credential/output bodies',async()=>{
  const f=fixture(),r=await sdkProbe(f)
  assert.equal(r.cloudResourceWrites,false);assert.equal(r.emptyLive,true)
  assert.equal(f.calls.length,4)
  for(const call of f.calls.filter(c=>c[0]==='get')){assert.equal(call[2].method,'GET');assert.equal(call[2].redirect,'error')}
  assert.deepEqual(f.calls.at(-1)[2],cliArgs)
  assert.deepEqual(cliArgs.slice(1),['hosting:sites:list','--project',target.project,'--json','--non-interactive'])
  assert.ok(!JSON.stringify(r).includes('never-print'))
})
test('foreign context and fallback credentials stop before authentication',async()=>{
  for(const change of [{GITHUB_REF:'refs/heads/dev'},{GITHUB_EVENT_NAME:'push'},{FIREBASE_TOKEN:'legacy-token'},{GOOGLE_APPLICATION_CREDENTIALS:''},{FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'}]){
    const f=fixture();await assert.rejects(()=>sdkProbe({...f,env:{...env,...change}}));assert.equal(f.calls.length,0)
  }
})
test('existing release, wrong CLI identity and raw errors all fail closed',async()=>{
  const f=fixture()
  await assert.rejects(()=>sdkProbe({...f,fetcher:async url=>new Response(JSON.stringify(url.endsWith('/channels/live')?{name:`sites/${target.project}/channels/live`,release:{}}:site))}),/sdk-empty-live/)
  await assert.rejects(()=>sdkProbe({...fixture(),run:async()=>({stdout:JSON.stringify({status:'success',result:{sites:[{...site,appId:'wrong'}]}})})}))
  await assert.rejects(()=>sdkProbe({...fixture(),run:async()=>{throw Error('secret-cli-body')}}),e=>!e.message.includes('secret-cli-body'))
})
test('workflow is manual read-only, has no artifact upload and cleans short-lived ADC',async()=>{
  const w=parse(await readFile(new URL('../.github/workflows/verify-production-sdk.yml',import.meta.url),'utf8'))
  assert.deepEqual(w.on,{workflow_dispatch:null});assert.equal(w.concurrency.group,'production-bootstrap')
  assert.equal(w.jobs.inspect.if,"github.ref == 'refs/heads/main'")
  assert.equal(w.jobs.inspect.environment,'production')
  const steps=w.jobs.inspect.steps
  assert.equal(steps.find(s=>s.uses==='google-github-actions/auth@v3').with.cleanup_credentials,true)
  for(const s of steps){if(s.uses)assert.ok(['actions/checkout@v7','actions/setup-node@v7','google-github-actions/auth@v3'].includes(s.uses));else assert.ok(['npx --yes npm@11.19.1 ci','node --test test/production-sdk-probe.test.mjs','node scripts/production-sdk-probe.mjs --execute-approved'].includes(s.run))}
})
