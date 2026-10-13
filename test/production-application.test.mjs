import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {parse,stringify} from 'yaml'
import {hostedTarget,validateHostedOptions} from '../functions/deployment-target.js'
import {assertApprovedPrototypeRuntime,resolveProjectId} from '../functions/local-runtime.js'
import {runtimeIdentity,productionFunctionIdentity} from '../functions/production-identities.js'
import {hostingHash} from '../scripts/lib/default-recovery-release-proof.mjs'
import {writeProductionBundle,verifyProductionBundle,recoveryParameters,stageProductionBundle} from '../scripts/lib/production-release-bundle.mjs'
import {productionReadAllowed,inspectProductionRelease} from '../scripts/lib/production-release-inspection.mjs'
import {validateProductionWorkflow} from '../scripts/production-workflow-contract.mjs'
import {proofDiagnostic} from '../scripts/lib/default-recovery-diagnostics.mjs'
const target={project:'fictional-prod',projectNumber:'123456',site:'fictional-site',appId:'1:123456:web:aaaa',control:'recovery-control',serviceAccount:'deploy@fictional-prod.iam.gserviceaccount.com',audience:'//iam.googleapis.com/projects/123456/locations/global/workloadIdentityPools/fictional/providers/github',repositoryId:'123',ownerId:'456'}
const revision='a'.repeat(40),parameters={RECOVERY_BACKUP_AUTOMATION:'false',RECOVERY_AUTH_BACKUP_BUCKET:'',RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE:'',RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE:''}

test('Prod runtime identities separate backup and diagnostic authority without changing Dev',async()=>{
  const env={GCLOUD_PROJECT:target.project,TERMITE_DEPLOYMENT_ENVIRONMENT:'production',TERMITE_PRODUCTION_PROJECT:target.project}
  for(const role of ['business','backup','diagnostics'])assert.deepEqual(runtimeIdentity(role,env),{serviceAccount:`prod-${role}@${target.project}.iam.gserviceaccount.com`})
  assert.deepEqual(runtimeIdentity('backup',{}),{})
  assert.equal(productionFunctionIdentity('recoveryBackupMonitor',target.project),runtimeIdentity('backup',env).serviceAccount)
  assert.equal(productionFunctionIdentity('reportAuthDiagnostics',target.project),runtimeIdentity('diagnostics',env).serviceAccount)
  assert.equal(productionFunctionIdentity('propertyPrototype',target.project),runtimeIdentity('business',env).serviceAccount)
  for(const patch of [{TERMITE_PRODUCTION_PROJECT:undefined},{GCLOUD_PROJECT:'termite-warranty-dev'},{FUNCTIONS_EMULATOR:'true'},{FIRESTORE_EMULATOR_HOST:'localhost:1'}])assert.throws(()=>runtimeIdentity('backup',{...env,...patch}))
  assert.throws(()=>runtimeIdentity('unknown',env))
  const index=await readFile(new URL('../functions/index.js',import.meta.url),'utf8'),backup=await readFile(new URL('../functions/recovery-backups.js',import.meta.url),'utf8')
  assert.match(index,/nativeOnCall\(\{ \.\.\.options, \.\.\.runtimeIdentity\('business'\)/)
  assert.match(index,/reportAuthDiagnostics = nativeOnCall\(.*runtimeIdentity\('diagnostics'\)/)
  assert.match(backup,/onSchedule\(.*runtimeIdentity\('backup'\)/)
})
test('browser builds bind exact production project/app while preserving default Dev and rejecting unknown configurations',()=>{
  assert.equal(hostedTarget().project,'termite-warranty-dev')
  const prod=hostedTarget({environment:'production',project:target.project,appId:target.appId})
  assert.equal(validateHostedOptions(prod,{projectId:target.project,appId:target.appId,messagingSenderId:target.projectNumber}).projectId,target.project)
  for(const options of [{projectId:'termite-warranty-dev'},{projectId:target.project,appId:'1:123456:web:bbbb',messagingSenderId:target.projectNumber},{projectId:target.project,appId:target.appId,messagingSenderId:'999'}])assert.throws(()=>validateHostedOptions(prod,options))
  for(const options of [{environment:'unknown'},{environment:'production'},{environment:'production',project:'termite-warranty-dev',appId:target.appId},{environment:'development',project:target.project},{environment:'production',project:'demo-fake',appId:target.appId}])assert.throws(()=>hostedTarget(options))
})
test('Functions production detection requires explicit configuration, agreement of provider IDs and no emulator flags',()=>{
  const env={GCLOUD_PROJECT:target.project,FIREBASE_CONFIG:JSON.stringify({projectId:target.project}),TERMITE_DEPLOYMENT_ENVIRONMENT:'production',TERMITE_PRODUCTION_PROJECT:target.project}
  assert.doesNotThrow(()=>assertApprovedPrototypeRuntime(env))
  for(const patch of [{TERMITE_PRODUCTION_PROJECT:undefined},{TERMITE_DEPLOYMENT_ENVIRONMENT:undefined},{GCLOUD_PROJECT:'termite-warranty-dev'},{GOOGLE_CLOUD_PROJECT:'foreign'},{FIREBASE_CONFIG:'{'},{FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:39099'},{FUNCTIONS_EMULATOR:'true'}])assert.throws(()=>assertApprovedPrototypeRuntime({...env,...patch}))
  assert.equal(resolveProjectId({GCLOUD_PROJECT:'one',GOOGLE_CLOUD_PROJECT:'two'}),undefined)
  assert.throws(()=>assertApprovedPrototypeRuntime({GCLOUD_PROJECT:'termite-warranty-dev',FIREBASE_AUTH_EMULATOR_HOST:'localhost:1'}))
})
function fixture(directory){
  const html=Buffer.from('<html>fictional production application</html>')
  return {directory,target,revision,parameters,inputs:{sourceFiles:new Map([['index.js',Buffer.from('export const one=1')],['package.json',Buffer.from('{}')]]),functionNames:['one'],region:'asia-northeast1',hostingFiles:new Map([['/index.html',hostingHash(html)]]),hostingConfig:{public:'.output/public'},servingConfig:{}},hostingFiles:new Map([['index.html',html]]),rules:{default:'default rules',control:'control rules'},indexes:{indexes:[],fieldOverrides:[]}}
}
test('verified bundle preserves both DB configurations, Functions environment and exact bytes without rebuild',async t=>{
  const root=await mkdtemp(join(tmpdir(),'prod-bundle-'));t.after(()=>rm(root,{recursive:true,force:true}))
  const f=fixture(join(root,'release')),result=await writeProductionBundle(f),bundle=await verifyProductionBundle({...f,digest:result.digest})
  assert.equal(bundle.inputs.expectedEnvironment.TERMITE_PRODUCTION_PROJECT,target.project)
  assert.equal(bundle.inputs.expectedRuntimeIdentities.one,`prod-business@${target.project}.iam.gserviceaccount.com`)
  const config=JSON.parse(bundle.files.get('firebase.json'));assert.equal(config.firestore.length,2);assert.equal(config.firestore[1].database,target.control);assert.equal(config.functions.predeploy,undefined)
  assert.equal(bundle.inputs.hostingFiles.get('/index.html'),f.inputs.hostingFiles.get('/index.html'))
  const copy=join(root,'deploy')
  await stageProductionBundle({...f,digest:result.digest},copy)
  await writeFile(join(copy,'firebase-debug.log'),'CLI work file')
  await verifyProductionBundle({...f,digest:result.digest})
  await assert.rejects(()=>verifyProductionBundle({...f,directory:copy,digest:result.digest}))
  await assert.rejects(()=>writeProductionBundle(f))
  for(const patch of [{revision:'b'.repeat(40)},{digest:'b'.repeat(64)},{target:{...target,site:'foreign'}}])await assert.rejects(()=>verifyProductionBundle({...f,digest:result.digest,...patch}))
  await writeFile(join(f.directory,'public/index.html'),'tampered')
  await assert.rejects(()=>verifyProductionBundle({...f,digest:result.digest}))
})
test('bundle refuses credentials, traversal, stale Hosting and implicit backup parameter reset',async t=>{
  const root=await mkdtemp(join(tmpdir(),'prod-bundle-reject-'));t.after(()=>rm(root,{recursive:true,force:true}))
  for(const mode of ['credentials','path','hash','params']){
    const f=fixture(join(root,mode))
    if(mode==='credentials')f.inputs.sourceFiles.set('gha-creds-test.json',Buffer.from('fictional'))
    if(mode==='path')f.hostingFiles.set('../escape',Buffer.from('fictional'))
    if(mode==='hash')f.inputs.hostingFiles.set('/index.html','b'.repeat(64))
    if(mode==='params')f.parameters=undefined
    await assert.rejects(()=>writeProductionBundle(f))
  }
  assert.throws(()=>recoveryParameters({...parameters,RECOVERY_BACKUP_AUTOMATION:'true'}))
  assert.throws(()=>recoveryParameters({...parameters,RECOVERY_AUTH_BACKUP_BUCKET:'bucket\nINJECT=true'}))
})
test('production inspection scopes API reads and rejects missing baseline or wrong project before evidence collection',async()=>{
  assert.equal(productionReadAllowed(`https://firestore.googleapis.com/v1/projects/${target.project}/databases/(default)/collectionGroups/-/indexes?pageToken=x`,target),true)
  for(const url of ['https://evil.invalid/','https://firestore.googleapis.com/v1/projects/foreign/databases/(default)','https://storage.googleapis.com/storage/v1/b/gcf-v2-sources-999-asia-northeast1/o/source?generation=1','https://firebase.googleapis.com/v1beta1/projects/fictional-prod#secret'])assert.equal(productionReadAllowed(url,target),false)
  await assert.rejects(()=>inspectProductionRelease({target}),/baseline/)
  await assert.rejects(()=>inspectProductionRelease({target},{providerVersion:`sites/${target.site}/versions/prior`,credentials:{credential:{getAccessToken:async()=>({access_token:'fictional'})}},fetcher:async()=>new Response(JSON.stringify({projectId:target.project,projectNumber:'999'}))}),/identity/)
})
test('production read failures preserve safe HTTP diagnostics without response bodies or retries',async()=>{
  let calls=0
  const options={providerVersion:`sites/${target.site}/versions/prior`,credentials:{credential:{getAccessToken:async()=>({access_token:'fictional'})}},fetcher:async()=>{calls++;return new Response('private response',{status:403})},predeploy:true}
  await assert.rejects(()=>inspectProductionRelease({target},options),error=>{
    assert.deepEqual(proofDiagnostic(error),{stage:'api-read',reasonCode:'http-error',httpStatus:403})
    assert.ok(!error.message.includes('private response'));return true
  })
  assert.equal(calls,1)
})

test('predeploy refuses missing or foreign foundation before any deployment and accepts existing exact targets',async()=>{
  const providerVersion=`sites/${target.site}/versions/prior`,credentials={credential:{getAccessToken:async()=>({access_token:'fictional'})}}
  for(const mode of ['valid','missing','location','site','baseline']){
    const fetcher=async(url,options)=>{
      assert.equal(options.method,'GET');assert.equal(options.redirect,'error')
      let value
      if(url.includes('/databases/')){
        if(mode==='missing')return new Response('{}',{status:404})
        value={name:new URL(url).pathname.slice(4),locationId:mode==='location'?'foreign':'asia-northeast1',type:'FIRESTORE_NATIVE'}
      }else if(url.endsWith(providerVersion))value={name:providerVersion,status:mode==='baseline'?'CREATED':'FINALIZED'}
      else if(url.includes('/sites/'))value={name:`projects/${target.projectNumber}/sites/${target.site}`,appId:mode==='site'?'foreign':target.appId}
      else value={projectId:target.project,projectNumber:target.projectNumber}
      return new Response(JSON.stringify(value))
    }
    const check=()=>inspectProductionRelease({target},{providerVersion,credentials,fetcher,predeploy:true})
    if(mode==='valid')assert.equal((await check()).ready,true);else await assert.rejects(check)
  }
})
test('production workflow contract rejects gate bypass, artifact substitution, credentials in verification and automatic cancellation',async()=>{
  const text=await readFile(new URL('../.github/workflows/deploy-production.yml',import.meta.url),'utf8'),policy=JSON.parse(await readFile(new URL('../governance/verification-policy.json',import.meta.url),'utf8'))
  assert.equal(validateProductionWorkflow(text,policy),true)
  for(const mutate of [w=>{w.jobs.verify.steps=w.jobs.verify.steps.filter(s=>s.run!=='npm test')},w=>{w.jobs.verify.steps.find(s=>s.run==='npm test')['continue-on-error']=true},w=>{w.jobs.deploy.needs=undefined},w=>{w.jobs.deploy.env.PRODUCTION_RELEASE_DIGEST='untrusted'},w=>{w.concurrency['cancel-in-progress']=true},w=>{w.jobs.verify.steps.push({uses:'google-github-actions/auth@v3'})},w=>{w.jobs.deploy.steps.push({run:'npm run build'})},w=>{w.jobs.deploy.steps=w.jobs.deploy.steps.filter(s=>s.run!=='node scripts/check-production-release.mjs local .production-release')}]){const w=parse(text);mutate(w);assert.throws(()=>validateProductionWorkflow(stringify(w),policy))}
})
