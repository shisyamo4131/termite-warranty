import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {deploymentOptions,deploymentEnvironment,assertDeploymentEnvironment,deployApplication,stageDigest,deploymentSnapshot,metadataReader} from '../scripts/deploy-application.mjs'
import {selectDeploymentAccount} from '../scripts/lib/direct-deployment-credentials.mjs'
import {developmentTarget} from '../scripts/development-deployment.mjs'

const root=fileURLToPath(new URL('..',import.meta.url)),revision='a'.repeat(40),email='deployer@example.invalid'
test('direct entry requires exactly an environment and explicit account, never ambient overrides',()=>{
 assert.deepEqual(deploymentOptions(['prod','--account',email]),{environment:'prod',account:email})
 for(const args of [[],['prod'],['main','--account',email],['dev','--account',email,'--force'],['prod','--account','']])assert.throws(()=>deploymentOptions(args))
 for(const env of [{GITHUB_ACTIONS:'true'},{FIREBASE_TOKEN:'private'},{GOOGLE_APPLICATION_CREDENTIALS:'private'},{NODE_OPTIONS:'--require other'},{FIRESTORE_EMULATOR_HOST:'localhost:1'},{TERMITE_PRODUCTION_PROJECT:'other'}])assert.throws(()=>assertDeploymentEnvironment(env))
 const sanitized=deploymentEnvironment({PATH:'path',HOME:'private',APPDATA:'private',LOCALAPPDATA:'private',USERPROFILE:'private',FIREBASE_TOKEN:'private',GOOGLE_APPLICATION_CREDENTIALS:'private',GITHUB_TOKEN:'private',NUXT_PUBLIC_FIREBASE_API_KEY:'private'},'empty-home')
 assert.equal(sanitized.PATH,'path')
 for(const key of ['HOME','USERPROFILE','APPDATA','LOCALAPPDATA','XDG_CONFIG_HOME'])assert.equal(sanitized[key],'empty-home')
 assert.ok(!Object.values(sanitized).includes('private'))
 assert.equal(sanitized.GIT_CONFIG_COUNT,'1');assert.equal(sanitized.GIT_CONFIG_KEY_0,'safe.directory')
 assert.equal(resolve(sanitized.GIT_CONFIG_VALUE_0),resolve(root))
 assert.notEqual(sanitized.GIT_CONFIG_VALUE_0,'*')
 assert.equal(deploymentEnvironment({PATH:'path'}).GIT_CONFIG_COUNT,undefined)
})
test('account selection rejects missing, duplicate and mismatched identities without default fallback',()=>{
 const loggedIn={user:{email},tokens:{refresh_token:'fictional'}}
 assert.equal(selectDeploymentAccount([loggedIn],email),loggedIn)
 for(const accounts of [[],[loggedIn,loggedIn],[{...loggedIn,user:{email:'other@example.invalid'}}],[{user:{email},tokens:{}}]])assert.throws(()=>selectDeploymentAccount(accounts,email))
})
async function fixture(t,environment='dev') {
 const directory=await mkdtemp(join(tmpdir(),'direct-deploy-'))
 t.after(async()=>{assert.ok(directory.startsWith(join(tmpdir(),'direct-deploy-')));await rm(directory,{recursive:true,force:true})})
 const put=async(path,value)=>{await mkdir(join(directory,path,'..'),{recursive:true});await writeFile(join(directory,path),typeof value==='string'?value:JSON.stringify(value))}
 await put('package.json',{packageManager:'npm@11.19.1'})
 await put('package-lock.json',{packages:{'node_modules/firebase-tools':{version:'fixture'}}})
 await put('node_modules/firebase-tools/package.json',{version:'fixture'})
 await put('deliverables/production-bootstrap-2026-10-13/target.json',await readFile(join(root,'deliverables/production-bootstrap-2026-10-13/target.json'),'utf8'))
 const calls=[],state={parameters:{},protections:[],runtime:{phase:'normal'},marker:{phase:'normal'},environments:{},providerVersion:'sites/fixture/versions/baseline'}
 const makeStage=async(stage)=>{await mkdir(join(stage,'functions'),{recursive:true});await writeFile(join(stage,'firebase.json'),'{}');await writeFile(join(stage,'functions/package-lock.json'),'{}')}
 const deps={root:directory,env:{npm_execpath:'fixture-npm'},revision:async()=>revision,
  authenticate:async selected=>{assert.equal(selected,email);return {credential:{getAccessToken:async()=>{throw Error('No real OAuth in unit test')}},verifyIdentity:async()=>calls.push('identity')}},
  snapshot:async()=>structuredClone(state),inspect:async(_,options)=>{calls.push(options.predeploy?'preflight':'proof');return {ready:true}},
  build:async input=>{calls.push('build');if(environment==='dev')await makeStage(join(input.directory,'stage'));return {revision,digest:environment==='dev'?await stageDigest(join(input.directory,'stage')):'b'.repeat(64)}},
  verifyBundle:async()=>({target:{}}),stageBundle:async(_,stage)=>makeStage(stage),
  command:async args=>calls.push(args),fetcher:async url=>new Response(url.endsWith('init.json')?JSON.stringify({projectId:developmentTarget.project,appId:developmentTarget.appId}):'<html></html>')}
 return {directory,deps,calls,state,run:()=>deployApplication({environment,account:email},deps)}
}
test('both direct paths build once, install only staged Functions, deploy once with selected identity and verify',async t=>{
 for(const environment of ['dev','prod']){
  const f=await fixture(t,environment),result=await f.run()
  assert.equal(result.ready,true);assert.equal(result.revision,revision)
  assert.equal(f.calls.filter(call=>call==='build').length,1)
  const commands=f.calls.filter(Array.isArray);assert.equal(commands.length,2)
  assert.ok(commands[0].includes('--ignore-scripts'));assert.ok(commands[0].includes('--prefix'))
  assert.ok(commands[0][commands[0].indexOf('--prefix')+1].endsWith('functions'))
  assert.equal(commands[1][1],'deploy');assert.equal(commands[1][commands[1].indexOf('--account')+1],email)
  assert.equal(f.calls.includes('proof'),environment==='prod')
  await assert.rejects(access(join(f.directory,'tmp/direct-deployment',environment+'.lock')))
 }
})
test('stale state, changed source, staged tampering and credential mismatch stop before deployment',async t=>{
 for(const mode of ['state','source','stage','identity','dotenv','build']){
  const f=await fixture(t),original=f.deps.command
  if(mode==='state'){let calls=0;f.deps.snapshot=async()=>({...f.state,protections:++calls===1?[]:['changed']})}
  if(mode==='source'){let calls=0;f.deps.revision=async()=>++calls===1?revision:'b'.repeat(40)}
  if(mode==='stage')f.deps.command=async(args,options)=>{await original(args,options);await writeFile(join(args[args.indexOf('--prefix')+1],'package-lock.json'),'changed')}
  if(mode==='identity')f.deps.authenticate=async()=>{throw Error('identity mismatch')}
  if(mode==='dotenv')await writeFile(join(f.directory,'.env'),'fictional override')
  if(mode==='build')f.deps.build=async()=>{throw Error('build failure')}
  await assert.rejects(f.run());assert.equal(f.calls.filter(Array.isArray).some(args=>args[1]==='deploy'),false)
  await assert.rejects(access(join(f.directory,'tmp/direct-deployment/dev.lock')))
 }
})
test('CLI failure is never retried and same-environment concurrent invocation is refused',async t=>{
 const f=await fixture(t);let publications=0
 f.deps.command=async args=>{if(args[1]==='deploy'){publications++;throw Error('unknown provider result')}}
 await assert.rejects(f.run());assert.equal(publications,1)
 const g=await fixture(t),authenticate=g.deps.authenticate
 let release,started;const entered=new Promise(ok=>{started=ok}),pending=new Promise(ok=>{release=ok})
 g.deps.authenticate=async account=>{started();await pending;return authenticate(account)}
 const first=g.run();await entered
 await assert.rejects(g.run(),{code:'EEXIST'});release();assert.equal((await first).ready,true)
})
test('postdeployment preservation or release proof failures cannot claim success or retry publication',async t=>{
 for(const mode of ['protection','proof']){
  const f=await fixture(t,'prod')
  if(mode==='protection'){let count=0;f.deps.snapshot=async()=>({...f.state,protections:++count===3?['changed']:[]})}
  else f.deps.inspect=async(_,options)=>({ready:!!options.predeploy})
  await assert.rejects(f.run());assert.equal(f.calls.filter(Array.isArray).filter(args=>args[1]==='deploy').length,1)
 }
})
test('unknown child termination retains owned locks; ordinary exited build failure releases them',async t=>{
 for(const [mode,properties] of [['build-timeout',{killed:true}],['build-signal',{signal:'SIGTERM'}],['build-buffer',{code:'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'}],['deploy-timeout',{code:'ETIMEDOUT'}],['build-exit',{code:1}]]){
  const f=await fixture(t),error=Object.assign(Error('simulated child termination'),properties)
  if(mode.startsWith('build'))f.deps.build=async()=>{throw error}
  else f.deps.command=async args=>{if(args[1]==='deploy')throw error}
  await assert.rejects(f.run())
  const parent=join(f.directory,'tmp/direct-deployment')
  if(mode==='build-exit'){
   await assert.rejects(access(join(parent,'dev.lock')));await assert.rejects(access(join(parent,'build.lock')))
  }else{
   const owner=JSON.parse(await readFile(join(parent,'dev.lock'),'utf8'))
   assert.equal(owner.outcome,'unknown-child-termination');assert.equal(owner.revision,revision)
   assert.equal(owner.phase,mode.startsWith('build')?'credential-free-build':'firebase-deploy')
   if(mode.startsWith('build'))assert.equal(JSON.parse(await readFile(join(parent,'build.lock'),'utf8')).directory,owner.directory)
   else await assert.rejects(access(join(parent,'build.lock')))
   await assert.rejects(f.run(),{code:'EEXIST'})
  }
 }
})
test('phase measurements contain timestamps and elapsed durations without private state',async t=>{
 const f=await fixture(t),events=[];let now=1700000000000
 f.deps.now=()=>now+=100;f.deps.report=event=>events.push(event)
 const result=await f.run()
 assert.equal(events.length,6);assert.equal(result.phases.length,6)
 assert.equal(result.elapsedMs,700)
 assert.ok(events.every(event=>Number.isFinite(Date.parse(event.startedAt))&&event.elapsedMs>0))
 assert.ok(result.phases.every(phase=>phase.elapsedMs===100&&!('startedMs' in phase)))
 assert.ok(!JSON.stringify(events).includes(email))
})
test('snapshot requires agreed active recovery configuration, normal runtime and complete protection state',async()=>{
 const t=developmentTarget,env={RECOVERY_CONTROL_DATABASE:t.control,RECOVERY_BACKUP_AUTOMATION:'false'},fields={phase:{stringValue:'normal'},databaseId:{stringValue:'(default)'},controlDatabaseId:{stringValue:t.control},protocol:{integerValue:'2'},generation:{integerValue:'3'}}
 const run=mode=>deploymentSnapshot(t,'dev',async url=>{
  if(url.includes('/documents/recovery/operatorLock'))return mode==='lock'?{fields:{}}:null
  if(url.includes('/documents/recovery/authExportLock'))return null
  if(url.includes('/documents/'))return {fields:mode==='phase'?{...fields,phase:{stringValue:'recovering'}}:fields}
  if(url.includes('cloudfunctions'))return {functions:[{name:`projects/${t.project}/locations/asia-northeast1/functions/one`,state:mode==='inactive'?'DEPLOYING':'ACTIVE',serviceConfig:{environmentVariables:env}}]}
  if(url.includes('/backupSchedules'))return mode==='page'?{nextPageToken:'more'}:{}
  if(url.includes('/databases/'))return {name:new URL(url).pathname.slice(4),locationId:'asia-northeast1',type:'FIRESTORE_NATIVE',pointInTimeRecoveryEnablement:mode==='pitr'?'POINT_IN_TIME_RECOVERY_ENABLED':'POINT_IN_TIME_RECOVERY_DISABLED',deleteProtectionState:'DELETE_PROTECTION_ENABLED'}
  if(url.endsWith('/channels/live'))return {release:{version:{name:`sites/${t.site}/versions/current`}}}
  if(url.includes('/versions/'))return {name:`sites/${t.site}/versions/current`,status:mode==='version'?'CREATED':'FINALIZED'}
  return {projectId:mode==='project'?'other':t.project,projectNumber:t.projectNumber}
 })
 assert.equal((await run('valid')).runtime.phase,'normal')
 for(const mode of ['lock','phase','inactive','page','pitr','version','project'])await assert.rejects(run(mode))
})
test('metadata failures do not expose response bodies or automatically retry',async()=>{
 let count=0
 const read=metadataReader({credential:{getAccessToken:async()=>({access_token:'fictional'})}},async()=>{count++;return new Response('private provider body',{status:403})})
 await assert.rejects(read('https://example.invalid'),error=>!error.message.includes('private'))
 assert.equal(count,1)
})
