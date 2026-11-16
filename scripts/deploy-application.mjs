// Ordinary deployment from one clean committed checkout. No GitHub dependency.
import {readFile,writeFile,mkdir,mkdtemp,open,unlink,readdir,lstat} from 'node:fs/promises'
import {join,resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {deploymentCredentials} from './lib/direct-deployment-credentials.mjs'
import {developmentTarget,activeInventory,developmentConfig,protectionHeld} from './development-deployment.mjs'
import {validateProductionTarget} from './lib/production-deployment-plan.mjs'
import {prepareProductionRelease} from './prepare-production-release.mjs'
import {verifyProductionBundle,stageProductionBundle,readHostingFiles,recoveryParameters} from './lib/production-release-bundle.mjs'
import {inspectProductionRelease} from './lib/production-release-inspection.mjs'
import {buildReleaseArtifacts,assertFreshBuild} from './lib/default-recovery-build.mjs'
import {collectFunctionsSource} from './lib/default-recovery-release-proof.mjs'
import {prepareFunctionsDomain} from './functions-domain.mjs'

const exec=promisify(execFile),root=fileURLToPath(new URL('..',import.meta.url))
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)
const requireEqual=(a,b,message)=>{if(stable(a)!==stable(b))throw Error(message)}
export function unknownChildTermination(error) {
  return error?.killed===true||!!error?.signal||['ETIMEDOUT','ERR_CHILD_PROCESS_STDIO_MAXBUFFER'].includes(error?.code)
}
async function recordLock(handle,value) {
  const bytes=Buffer.from(JSON.stringify(value))
  await handle.write(bytes,0,bytes.length,0);await handle.truncate(bytes.length)
}
export function deploymentOptions(args) {
  if(args.length!==3||!['dev','prod'].includes(args[0])||args[1]!=='--account'||!/^[-a-zA-Z0-9._+]+@[-a-zA-Z0-9.]+$/.test(args[2]??''))throw Error('Usage: npm run deploy -- dev|prod --account email')
  return {environment:args[0],account:args[2]}
}
export function deploymentEnvironment(source,home) {
  const result={}
  for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','TEMP','TMP','TMPDIR','LANG'])if(source[key])result[key]=source[key]
  for(const key of ['HOME','USERPROFILE','APPDATA','LOCALAPPDATA','XDG_CONFIG_HOME'])if(home||source[key])result[key]=home??source[key]
  return {...result,NUXT_TELEMETRY_DISABLED:'1'}
}
export function assertDeploymentEnvironment(env) {
  if(env.GITHUB_ACTIONS||Object.entries(env).some(([key,value])=>value&&(/^(GOOGLE_|FIREBASE_TOKEN$|CLOUDSDK_|NUXT_PUBLIC_FIREBASE_|TERMITE_|NODE_OPTIONS$|GIT_DIR$|GIT_WORK_TREE$|GIT_INDEX_FILE$)/.test(key)||key.endsWith('_EMULATOR_HOST'))))throw Error('Direct deployment requires a local environment without credential, target or emulator overrides.')
}
export async function cleanRevision(directory) {
  const run=async args=>(await exec('git',args,{cwd:directory,windowsHide:true})).stdout.trim()
  const revision=await run(['rev-parse','HEAD'])
  if(!/^[a-f0-9]{40}$/.test(revision)||await run(['status','--porcelain','--untracked-files=all']))throw Error('Deployment requires an exact clean committed checkout.')
  return revision
}
export async function stageDigest(directory) {
  const files=[]
  async function visit(relative=''){
    for(const name of (await readdir(join(directory,relative))).sort()){
      const path=relative?relative+'/'+name:name
      if(path==='functions/node_modules')continue
      const stat=await lstat(join(directory,path))
      if(stat.isSymbolicLink())throw Error('Deployment inputs cannot contain links.')
      if(stat.isDirectory())await visit(path)
      else if(stat.isFile())files.push([path,createHash('sha256').update(await readFile(join(directory,path))).digest('hex')])
      else throw Error('Unsupported deployment input.')
    }
  }
  await visit();return createHash('sha256').update(JSON.stringify(files)).digest('hex')
}
function decode(value) {
  if(value.mapValue)return Object.fromEntries(Object.entries(value.mapValue.fields??{}).map(([k,v])=>[k,decode(v)]))
  if(value.arrayValue)return (value.arrayValue.values??[]).map(decode)
  if(value.integerValue!==undefined)return Number(value.integerValue)
  if(value.nullValue!==undefined)return null
  for(const key of ['stringValue','booleanValue','doubleValue','timestampValue'])if(key in value)return value[key]
  throw Error('Unsupported runtime metadata.')
}
export function metadataReader(credentials,fetcher=fetch) {
  return async(url,{missing=false}={})=>{
    const response=await fetcher(url,{headers:{Authorization:'Bearer '+(await credentials.credential.getAccessToken()).access_token},redirect:'error',signal:AbortSignal.timeout(60000)})
    if(missing&&response.status===404)return null
    if(!response.ok)throw Error('Deployment metadata read failed: '+response.status)
    return response.json()
  }
}
export async function deploymentSnapshot(target,environment,read) {
  const project=target.project,base='https://firestore.googleapis.com/v1/projects/'+project+'/databases/'
  const identity=await read('https://firebase.googleapis.com/v1beta1/projects/'+project)
  if(identity.projectId!==project||String(identity.projectNumber)!==target.projectNumber)throw Error('Cloud project identity mismatch.')
  const inventory=await read('https://cloudfunctions.googleapis.com/v2/projects/'+project+'/locations/-/functions')
  if(!inventory.functions?.length||inventory.nextPageToken||inventory.unreachable?.length||new Set(inventory.functions.map(f=>f.name)).size!==inventory.functions.length||inventory.functions.some(f=>f.state!=='ACTIVE'||!f.name?.startsWith('projects/'+project+'/locations/asia-northeast1/functions/')))throw Error('Complete active Functions inventory required.')
  let parameters
  if(environment==='dev')parameters=activeInventory(inventory)
  else {
    parameters=recoveryParameters(Object.fromEntries(['RECOVERY_BACKUP_AUTOMATION','RECOVERY_AUTH_BACKUP_BUCKET','RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE','RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE'].map(key=>[key,inventory.functions[0].serviceConfig?.environmentVariables?.[key]??''])))
    for(const f of inventory.functions){
      const env=f.serviceConfig?.environmentVariables
      if(env?.RECOVERY_CONTROL_DATABASE!==target.control||Object.entries(parameters).some(([key,value])=>(env?.[key]??'')!==value))throw Error('Existing Functions recovery parameters disagree.')
    }
  }
  const protections=[]
  for(const id of ['(default)',target.control]){
    const db=await read(base+id),schedules=await read(base+id+'/backupSchedules')
    if(db.name!==`projects/${project}/databases/${id}`||db.locationId!=='asia-northeast1'||db.type!=='FIRESTORE_NATIVE'||!['POINT_IN_TIME_RECOVERY_ENABLED','POINT_IN_TIME_RECOVERY_DISABLED'].includes(db.pointInTimeRecoveryEnablement)||!['DELETE_PROTECTION_ENABLED','DELETE_PROTECTION_DISABLED'].includes(db.deleteProtectionState)||schedules.nextPageToken)throw Error('Database identity or complete protection snapshot required.')
    if(environment==='dev'&&id==='(default)')protectionHeld(db,schedules)
    protections.push({id,pitr:db.pointInTimeRecoveryEnablement,deleteProtection:db.deleteProtectionState,schedules:(schedules.backupSchedules??[]).sort((a,b)=>a.name.localeCompare(b.name))})
  }
  const document=async(db,path)=>{const value=await read(base+db+'/documents/'+path,{missing:true});return value?decode({mapValue:{fields:value.fields}}):null}
  const runtime=await document(target.control,'recovery/runtime'),marker=await document('(default)','_recovery/access')
  if(!runtime||!marker||runtime.phase!=='normal'||marker.phase!=='normal'||runtime.databaseId!=='(default)'||marker.databaseId!=='(default)'||runtime.controlDatabaseId!==target.control||marker.controlDatabaseId!==target.control||runtime.protocol!==2||marker.protocol!==2||!Number.isSafeInteger(runtime.generation)||runtime.generation<1||runtime.generation!==marker.generation)throw Error('Matching normal runtime and business marker required.')
  if(await document(target.control,'recovery/operatorLock')||await document(target.control,'recovery/authExportLock'))throw Error('Recovery operation is active.')
  const live=await read('https://firebasehosting.googleapis.com/v1beta1/sites/'+target.site+'/channels/live'),providerVersion=live.release?.version?.name
  if(!new RegExp(`^sites/${target.site}/versions/[-a-zA-Z0-9]+$`).test(providerVersion??''))throw Error('Current Hosting version required.')
  const version=await read('https://firebasehosting.googleapis.com/v1beta1/'+providerVersion)
  if(version.name!==providerVersion||version.status!=='FINALIZED')throw Error('Finalized live Hosting baseline required.')
  return {parameters,protections,runtime,marker,providerVersion,environments:Object.fromEntries(inventory.functions.map(f=>[f.name,f.serviceConfig?.environmentVariables??{}]))}
}
export async function buildDeployment({directory,environment,target,revision,parameters}) {
  if(environment==='prod')return prepareProductionRelease({root,directory:join(directory,'bundle'),target,revision,parameters})
  await prepareFunctionsDomain({sourceDirectory:join(root,'src/domain'),outputDirectory:join(root,'functions/domain')})
  const receipt=await buildReleaseArtifacts({root,revision,environment:{...process.env,TERMITE_DEPLOYMENT_ENVIRONMENT:'development'}})
  const files=new Map([...await collectFunctionsSource(join(root,'functions'))].map(([path,bytes])=>['functions/'+path,bytes]))
  for(const [path,bytes] of await readHostingFiles(root))files.set('public/'+path,bytes)
  for(const path of ['firestore.rules','firestore.control.rules','firestore.indexes.json'])files.set(path,await readFile(join(root,path)))
  const config=developmentConfig(JSON.parse(await readFile(join(root,'firebase.json'),'utf8')));config.hosting.public='public'
  files.set('firebase.json',JSON.stringify(config));files.set('functions/.env.'+target.project,Object.entries(parameters).map(([k,v])=>k+'='+v).join('\n')+'\n')
  const stage=join(directory,'stage');await mkdir(stage)
  for(const [path,bytes] of files){await mkdir(dirname(join(stage,path)),{recursive:true});await writeFile(join(stage,path),bytes,{flag:'wx'})}
  await assertFreshBuild(receipt,{root,revision});return {digest:await stageDigest(stage),revision}
}
async function childBuild(input,env) {
  const home=join(input.directory,'build-home');await mkdir(home)
  const options=join(input.directory,'build-input.json');await writeFile(options,JSON.stringify(input),{flag:'wx'})
  const result=await exec(process.execPath,[fileURLToPath(import.meta.url),'--build',options],{cwd:root,env:deploymentEnvironment(env,home),windowsHide:true,timeout:600000,maxBuffer:16*1024*1024})
  const lines=result.stdout.split(/\r?\n/).filter(line=>line.startsWith('DEPLOY_BUILD '))
  if(lines.length!==1)throw Error('Build result missing.');return JSON.parse(lines[0].slice(13))
}
async function runCommand(args,options) {
  // Capture output to avoid persisting CLI debug/config material in our reports.
  await exec(process.execPath,args,{...options,windowsHide:true,timeout:1200000,maxBuffer:16*1024*1024})
}
export async function deployApplication(options,dependencies={}) {
  const {environment,account}=deploymentOptions([options.environment,'--account',options.account])
  const env=dependencies.env??process.env;assertDeploymentEnvironment(env)
  const revisionOf=dependencies.revision??cleanRevision,authenticate=dependencies.authenticate??deploymentCredentials
  const snapshot=dependencies.snapshot??deploymentSnapshot,build=dependencies.build??childBuild,command=dependencies.command??runCommand
  const inspect=dependencies.inspect??inspectProductionRelease,fetcher=dependencies.fetcher??fetch
  const verifyBundle=dependencies.verifyBundle??verifyProductionBundle,stageBundle=dependencies.stageBundle??stageProductionBundle
  const directoryRoot=dependencies.root??root,revision=await revisionOf(directoryRoot)
  const target=environment==='dev'?developmentTarget:validateProductionTarget(JSON.parse(await readFile(join(directoryRoot,'deliverables/production-bootstrap-2026-10-13/target.json'),'utf8')))
  const parent=join(directoryRoot,'tmp/direct-deployment');await mkdir(parent,{recursive:true})
  const lock=join(parent,environment+'.lock'),handle=await open(lock,'wx')
  let directory,phase='local-preflight',preserveLock=false
  const now=dependencies.now??Date.now,started=now(),phases=[]
  const report=dependencies.report??(()=>{})
  const step=value=>{
    const at=now()
    if(phases.length)phases.at(-1).elapsedMs=at-phases.at(-1).startedMs
    phase=value;phases.push({phase,startedAt:new Date(at).toISOString(),startedMs:at})
    report({phase,startedAt:new Date(at).toISOString(),elapsedMs:at-started})
  }
  try {
    directory=await mkdtemp(join(parent,environment+'-'));await handle.writeFile(JSON.stringify({pid:process.pid,revision,directory}))
    if((await readdir(directoryRoot)).some(name=>/^\.env(?:\.|$)/.test(name)))throw Error('Build checkout must not contain dotenv files.')
    step('account-and-cloud-preflight')
    const credentials=await authenticate(account),read=metadataReader(credentials,fetcher)
    const before=await snapshot(target,environment,read)
    await inspect({target},{providerVersion:before.providerVersion,credentials,predeploy:true})
    step('credential-free-build')
    // Dev and Prod share .output and generated domain in this checkout.
    const buildLock=join(parent,'build.lock'),buildHandle=await open(buildLock,'wx')
    let result,preserveBuildLock=false
    try{
      await recordLock(buildHandle,{pid:process.pid,revision,directory,phase})
      result=await build({directory,environment,target,revision,parameters:before.parameters},env)
    }catch(error){preserveBuildLock=unknownChildTermination(error);throw error}
    finally{await buildHandle.close();if(!preserveBuildLock)await unlink(buildLock)}
    if(result.revision!==revision)throw Error('Build revision mismatch.')
    const stage=join(directory,'stage'),bundleOptions={directory:join(directory,'bundle'),target,revision,digest:result.digest}
    let bundle
    if(environment==='prod'){bundle=await verifyBundle(bundleOptions);await stageBundle(bundleOptions,stage)}
    else if(await stageDigest(stage)!==result.digest)throw Error('Dev build inputs changed.')
    const digest=await stageDigest(stage),manifest=JSON.parse(await readFile(join(directoryRoot,'package.json'),'utf8'))
    if(manifest.packageManager!=='npm@11.19.1'||!env.npm_execpath)throw Error('Run deployment through npm; the project npm version must be fixed.')
    const cli=join(directoryRoot,'node_modules/firebase-tools/lib/bin/firebase.js')
    const locked=JSON.parse(await readFile(join(directoryRoot,'package-lock.json'),'utf8')),installed=JSON.parse(await readFile(join(directoryRoot,'node_modules/firebase-tools/package.json'),'utf8'))
    if(installed.version!==locked.packages['node_modules/firebase-tools'].version)throw Error('Installed Firebase CLI differs from the lock; run the project npm ci first.')
    step('staged-functions-install')
    await command([env.npm_execpath,'exec','--yes','--package=npm@11.19.1','--','npm','ci','--prefix',join(stage,'functions'),'--ignore-scripts','--no-audit','--no-fund'],{cwd:directoryRoot,env:deploymentEnvironment(env)})
    if(await stageDigest(stage)!==digest)throw Error('Deployment inputs changed during dependency preparation.')
    if(await revisionOf(directoryRoot)!==revision)throw Error('Source changed during preparation.')
    step('final-source-and-cloud-check')
    await credentials.verifyIdentity()
    requireEqual(await snapshot(target,environment,read),before,'Cloud state changed during preparation; inspect before retrying.')
    if(environment==='prod')await verifyBundle(bundleOptions)
    if(await stageDigest(stage)!==digest||await revisionOf(directoryRoot)!==revision)throw Error('Deployment source or staged inputs changed before publication.')
    step('firebase-deploy')
    await command([cli,'deploy','--account',account,'--project',target.project,'--config',join(stage,'firebase.json'),'--only','firestore,functions,hosting','--non-interactive'],{cwd:stage,env:deploymentEnvironment(env)})
    step('postdeployment-verification')
    await credentials.verifyIdentity()
    const after=await snapshot(target,environment,read)
    for(const key of ['parameters','protections','runtime','marker','environments'])requireEqual(after[key],before[key],'Deployment changed preserved '+key+'. Do not retry automatically.')
    if(environment==='prod'){
      const proof=await inspect(bundle,{providerVersion:before.providerVersion,credentials})
      if(!proof.ready)throw Error('Production release proof failed. Do not retry deployment automatically.')
    }else{
      const response=await fetcher('https://'+target.site+'.web.app/__/firebase/init.json',{redirect:'error',signal:AbortSignal.timeout(20000)})
      if(!response.ok)throw Error('Dev public configuration unavailable.')
      const value=await response.json();if(value.projectId!==target.project||value.appId!==target.appId)throw Error('Dev public target mismatch.')
      const page=await fetcher('https://'+target.site+'.web.app/',{redirect:'error',signal:AbortSignal.timeout(20000)})
      if(!page.ok||!/<html[\s>]/i.test(await page.text()))throw Error('Dev application entry missing.')
    }
    const finished=now();phases.at(-1).elapsedMs=finished-phases.at(-1).startedMs
    return {ready:true,environment,project:target.project,revision,checks:environment==='prod'?'all-five':'bounded-dev',directory,
      startedAt:new Date(started).toISOString(),elapsedMs:finished-started,phases:phases.map(({startedMs,...value})=>value)}
  }catch(error){
    preserveLock=unknownChildTermination(error)
    error.deploymentPhase=phase
    if(preserveLock)await recordLock(handle,{pid:process.pid,revision,directory,phase,outcome:'unknown-child-termination'})
    throw error
  }finally{await handle.close();if(!preserveLock)await unlink(lock)}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2)
  const action=args.length===2&&args[0]==='--build'?async()=>{
    const input=JSON.parse(await readFile(args[1],'utf8'))
    console.log('DEPLOY_BUILD '+JSON.stringify(await buildDeployment(input)))
  }:async()=>console.log(JSON.stringify(await deployApplication(deploymentOptions(args),{report:event=>console.log(JSON.stringify({deploymentPhase:event}))})))
  action().catch(error=>{console.error('Application deployment stopped'+(error.deploymentPhase?' at '+error.deploymentPhase:'')+'. Inspect the current state before retrying. '+(unknownChildTermination(error)?'Owned locks retained: child termination is uncertain.':error.code==='EEXIST'?'A deployment lock already exists.':''));process.exitCode=1})
}
