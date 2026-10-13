import test from 'node:test'
import assert from 'node:assert/strict'
import {productionDeploymentPlan} from '../scripts/lib/production-deployment-plan.mjs'
import {maintenanceInputs,verifyBootstrapHosting} from '../scripts/lib/production-bootstrap-hosting.mjs'
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {checkBootstrapArtifact} from '../scripts/check-production-bootstrap-artifact.mjs'
import {prepareBootstrap} from '../scripts/prepare-production-bootstrap.mjs'
import {bootstrapReadAllowed,inspectBootstrap} from '../scripts/inspect-production-bootstrap.mjs'
import {parse} from 'yaml'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'

const target={project:'fictional-prod',projectNumber:'123456',site:'fictional-site',appId:'1:123456:web:aaaa',control:'recovery-control',serviceAccount:'deploy@fictional-prod.iam.gserviceaccount.com',audience:'//iam.googleapis.com/projects/123456/locations/global/workloadIdentityPools/fictional/providers/github',repositoryId:'123',ownerId:'456'}
const context={event:'push',ref:'refs/heads/main',revision:'a'.repeat(40),artifactRevision:'a'.repeat(40),environment:'production',repositoryId:'123',ownerId:'456',verified:true}

test('local bootstrap artifact has no application/credentials and refuses existing output',async()=>{
  const root=await mkdtemp(join(tmpdir(),'production-bootstrap-')),out=join(root,'new')
  try {
    assert.equal((await prepareBootstrap(out)).cloudWrites,false)
    const config=JSON.parse(await readFile(join(out,'firebase.json'),'utf8'))
    assert.deepEqual(Object.keys(config),['hosting'])
    assert.ok(config.hosting.ignore.includes('**/gha-creds-*.json'))
    assert.equal(JSON.parse(await readFile(join(out,'expected.json'),'utf8')).applicationReleaseVerified,false)
    const before=await readFile(join(out,'public/index.html'),'utf8')
    await assert.rejects(()=>prepareBootstrap(out))
    assert.equal(await readFile(join(out,'public/index.html'),'utf8'),before)
  }finally{await rm(root,{recursive:true,force:true})}
})

test('deployment plan rejects absent targets, foreign refs/owners and stale artifacts before any execution',()=>{
  const plan=productionDeploymentPlan(target,context)
  assert.equal(plan.liveMutationAvailable,false);assert.equal(plan.cancelInProgress,false)
  for(const patch of [{event:'pull_request'},{ref:'refs/heads/dev'},{repositoryId:'999'},{ownerId:'999'},{environment:'development'},{verified:false},{artifactRevision:'b'.repeat(40)}])assert.throws(()=>productionDeploymentPlan(target,{...context,...patch}))
  for(const patch of [{project:'termite-warranty-dev'},{project:'demo-fictional'},{projectNumber:'9'},{appId:'1:9:web:bbbb'},{serviceAccount:'x@foreign.iam.gserviceaccount.com'},{control:'(default)'},{site:''},{extra:'unknown'}])assert.throws(()=>productionDeploymentPlan({...target,...patch},context))
  assert.throws(()=>productionDeploymentPlan({},context))
})
test('CI guard writes only validated target outputs and exits nonzero before auth for another branch',async()=>{
  const root=await mkdtemp(join(tmpdir(),'production-ci-')),output=join(root,'output'),run=promisify(execFile)
  const env={...process.env,PRODUCTION_TARGET_JSON:JSON.stringify(target),GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY_ID:'123',GITHUB_REPOSITORY_OWNER_ID:'456',GITHUB_SHA:'a'.repeat(40),PRODUCTION_ARTIFACT_REVISION:'a'.repeat(40),PRODUCTION_BOOTSTRAP_REVISION:'a'.repeat(40),PRODUCTION_ENVIRONMENT:'production',PRODUCTION_VERIFY_RESULT:'success',GITHUB_OUTPUT:output}
  try {
    const result=await run(process.execPath,['scripts/check-production-deployment.mjs'],{env})
    assert.equal(JSON.parse(result.stdout).liveMutationAvailable,false)
    const before=await readFile(output,'utf8');assert.match(before,/project=fictional-prod/)
    await assert.rejects(()=>run(process.execPath,['scripts/check-production-deployment.mjs'],{env:{...env,GITHUB_REF:'refs/heads/dev'}}),e=>e.code===1)
    for(const revision of ['', 'b'.repeat(40)])await assert.rejects(()=>run(process.execPath,['scripts/check-production-deployment.mjs'],{env:{...env,PRODUCTION_BOOTSTRAP_REVISION:revision}}),e=>e.code===1)
    assert.equal(await readFile(output,'utf8'),before)
  }finally{await rm(root,{recursive:true,force:true})}
})

function bootstrapFixture(){
  const {project,projectNumber,site,appId}=target,base='https://firebasehosting.googleapis.com/v1beta1/',version=`sites/${site}/versions/first`,channel={name:`sites/${site}/channels/live`,release:{name:`sites/${site}/releases/first`,type:'DEPLOY',releaseTime:'2026-10-13T00:00:00Z',version:{name:version}}}
  const firebase={projectId:project,appId,messagingSenderId:projectNumber,apiKey:'fictional',authDomain:project+'.firebaseapp.com',storageBucket:project+'.appspot.com'},pub={...firebase,databaseURL:''}
  const values=new Map([[base+`projects/${project}/sites/${site}`,{name:`projects/${project}/sites/${site}`,appId}],[base+`sites/${site}/channels/live`,channel],[`https://firebase.googleapis.com/v1beta1/projects/${project}/webApps/${appId}/config`,firebase],[base+version,{name:version,status:'FINALIZED',fileCount:'3',config:maintenanceInputs().servingConfig}],[base+version+'/files',{files:[...maintenanceInputs().hostingFiles].map(([path,hash])=>({path,hash,status:'ACTIVE'})).concat(['/__/firebase/init.js','/__/firebase/init.json'].map(path=>({path,hash:'b'.repeat(64),status:'ACTIVE'})))}]])
  return {...target,base,version,values,pub,request:async url=>{assert.ok(values.has(url),url);return structuredClone(values.get(url))},readPublic:async url=>{assert.equal(url,`https://${site}.web.app/__/firebase/init.json`);return JSON.stringify(pub)}}
}
test('first maintenance baseline needs no Functions or previous version and is never app acceptance',async()=>{
  const f=bootstrapFixture(),result=await verifyBootstrapHosting(f)
  assert.equal(result.version,f.version);assert.equal(result.applicationReleaseVerified,false);assert.equal(result.cloudWrites,false)
})
test('read-only bootstrap transport scopes credentials, refuses redirects and never sends auth to public Hosting',async()=>{
  const f=bootstrapFixture();let authenticated=0,publicReads=0
  const result=await inspectBootstrap(target,{credentials:{credential:{getAccessToken:async()=>({access_token:'fictional'})}},fetcher:async(url,options)=>{
    assert.equal(options.method,'GET');assert.equal(options.redirect,'error')
    if(url.startsWith('https://fictional-site.web.app/')){publicReads++;assert.deepEqual(options.headers,{});return new Response(JSON.stringify(f.pub))}
    authenticated++;assert.equal(options.headers.Authorization,'Bearer fictional')
    return new Response(JSON.stringify(await f.request(url)))
  }})
  assert.equal(result.applicationReleaseVerified,false);assert.ok(authenticated>0);assert.equal(publicReads,1)
  for(const url of ['http://firebasehosting.googleapis.com/v1beta1/sites/fictional-site/channels/live','https://evil.invalid/','https://firebasehosting.googleapis.com/v1beta1/sites/other/channels/live','https://firebasehosting.googleapis.com/v1beta1/sites/fictional-site/channels/live?access_token=x','https://firebasehosting.googleapis.com/v1beta1/sites/fictional-site/versions/first/files?pageToken=a&pageToken=b'])assert.equal(bootstrapReadAllowed(url,target),false)
})
test('first publication precheck refuses any existing live version and accepts only verified empty site',async()=>{
  const f=bootstrapFixture(),credentials={credential:{getAccessToken:async()=>({access_token:'fictional'})}}
  const fetcher=async url=>new Response(JSON.stringify(await f.request(url)))
  await assert.rejects(()=>inspectBootstrap(target,{credentials,fetcher,requireEmpty:true}),/Existing live/)
  const empty=async url=>url.endsWith('/channels/live')?new Response('',{status:404}):fetcher(url)
  assert.equal((await inspectBootstrap(target,{credentials,fetcher:empty,requireEmpty:true})).kind,'empty-hosting-site')
  await assert.rejects(()=>inspectBootstrap(target,{credentials,fetcher:async()=>new Response('',{status:403}),requireEmpty:true}))
})
test('bootstrap workflow preserves all verification gates before auth, same-revision artifact and empty-site guard',async()=>{
  const workflow=parse(await readFile(new URL('../.github/workflows/deploy-production-bootstrap.yml',import.meta.url),'utf8'))
  assert.deepEqual(workflow.permissions,{contents:'read'})
  assert.equal(workflow.concurrency['cancel-in-progress'],false)
  const verify=workflow.jobs.verify.steps,publish=workflow.jobs.publish.steps
  for(const command of ['./scripts/check-governance.ps1','npm test','npm run typecheck','npm run build','npm run test:rules','node scripts/check-functions-syntax.mjs','node --check scripts/seed-emulator.mjs'])assert.ok(verify.some(s=>s.run===command))
  assert.ok(!verify.some(s=>s.uses?.startsWith('google-github-actions/auth')))
  assert.equal(workflow.jobs.publish.needs,'verify')
  assert.match(workflow.jobs.publish.if,/PRODUCTION_BOOTSTRAP_ENABLED/)
  assert.match(workflow.jobs.publish.if,/PRODUCTION_BOOTSTRAP_REVISION == github.sha/)
  assert.deepEqual(workflow.on,{push:{branches:['main']}})
  const guard=publish.findIndex(s=>s.run?.includes('--require-empty')),deploy=publish.findIndex(s=>s.run?.includes('firebase deploy'))
  assert.ok(guard>0&&deploy>guard)
  const artifact=publish.findIndex(s=>s.run?.includes('check-production-bootstrap-artifact.mjs'))
  assert.ok(artifact>=0&&artifact<publish.findIndex(s=>s.uses==='google-github-actions/auth@v3'))
  assert.match(publish[deploy].run,/--only hosting$/)
  assert.equal(publish.filter(s=>s.uses==='google-github-actions/auth@v3').length,2)
  assert.ok(!publish.some(s=>s.run==='npm run build'))
  assert.equal(verify.find(s=>s.uses?.startsWith('actions/upload-artifact')).with.name,publish.find(s=>s.uses?.startsWith('actions/download-artifact')).with.name)
})
test('bootstrap refuses altered maintenance, extra files, absent provider files, bad config and changing release',async()=>{
  for(const mode of ['hash','extra','missing','duplicate','config','public','app','changing','loop']){
    const f=bootstrapFixture(),files=f.values.get(f.base+f.version+'/files')
    if(mode==='hash')files.files[0].hash='c'.repeat(64)
    if(mode==='extra')files.files.push({path:'/app.js',hash:'c'.repeat(64),status:'ACTIVE'})
    if(mode==='missing')files.files.pop()
    if(mode==='duplicate')files.files.push(files.files[0])
    if(mode==='config')f.values.get(f.base+f.version).config={}
    if(mode==='public')f.pub.projectId='foreign'
    if(mode==='app')f.values.get(f.base+`projects/${f.project}/sites/${f.site}`).appId='1:123456:web:bbbb'
    if(mode==='changing'){const read=f.request;let n=0;f.request=async u=>{const v=await read(u);if(u.endsWith('/channels/live')&&++n>1)v.release.version.name=`sites/${f.site}/versions/changed`;return v}}
    if(mode==='loop'){files.nextPageToken='repeat';f.values.set(f.base+f.version+'/files?pageToken=repeat',{files:[],nextPageToken:'repeat'})}
    await assert.rejects(()=>verifyBootstrapHosting(f),mode)
  }
})

test('downloaded bootstrap artifact refuses altered HTML, extra file, wrong site and rewritten expected hash',async()=>{
  for(const mode of ['valid','html','extra','site','expected']){
    const root=await mkdtemp(join(tmpdir(),'bootstrap-artifact-')),out=join(root,'artifact')
    try{
      await prepareBootstrap(out)
      const config=JSON.parse(await readFile(join(out,'firebase.json'),'utf8'));config.hosting.site=mode==='site'?'foreign':target.site
      await writeFile(join(out,'firebase.json'),JSON.stringify(config))
      if(mode==='html')await writeFile(join(out,'public/index.html'),'wrong')
      if(mode==='extra')await writeFile(join(out,'public/extra.js'),'wrong')
      if(mode==='expected')await writeFile(join(out,'expected.json'),'{}')
      if(mode==='valid')assert.equal((await checkBootstrapArtifact(out,target)).cloudWrites,false)
      else await assert.rejects(()=>checkBootstrapArtifact(out,target))
    }finally{await rm(root,{recursive:true,force:true})}
  }
})
