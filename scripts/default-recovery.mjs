// Local rehearsal and guarded Dev commands. Actual execution requires separate approval.
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { databaseId } from '../src/domain/recovery.mjs'
import { defaultRecovery } from './lib/default-recovery.mjs'
import { LOCAL_RUNTIME, localRuntimeHost } from '../src/config/local-emulator.mjs'
import { devPreflight, repositoryPreflight, infrastructureChecks, closedDataRules, DEV_RUNTIME_PATHS } from './lib/default-recovery-preflight.mjs'
import {admitDev,sanitizeCommand,dispatchDev} from './lib/default-recovery-admission.mjs'
import {operatorCredentials} from './lib/operator-credentials.mjs'
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { releaseProof, localReleaseInputs, ARCHIVE_LIMIT } from './lib/default-recovery-release-proof.mjs'
import {buildReleaseArtifacts} from './lib/default-recovery-build.mjs'
import {observeFixedRecovery} from './lib/default-recovery-observation.mjs'
import {proofFetch} from './lib/default-recovery-diagnostics.mjs'

export function options(args) {
  const command=args.shift(),allowed=new Set(['initialize','observe','status','preflight','enter','plan','plan-address','plan-intake','apply','resume','publish','reopen','recover-operator','emergency-close','reconcile-emergency'])
  if(!allowed.has(command))throw Error('Unknown fixed recovery command.')
  const o={command},flags=new Set(['apply','worker-stopped','migration','dev-inspect','dev-execute'])
  const keys=new Set(['project','control','revision','generation','operation','source','site','hosting-provider-version','confirm','baseline','verification','approval','expected-owner','address-operation','address-plan-hash','intake-operation','intake-plan-hash','auth','wif-audience','service-account',...flags])
  while(args.length){const raw=args.shift();if(!raw?.startsWith('--'))throw Error('Unknown argument.');const k=raw.slice(2);if(!keys.has(k)||k in o)throw Error('Unknown or duplicate argument.');o[k]=flags.has(k)?true:args.shift();if(o[k]===undefined||String(o[k]).startsWith('--'))throw Error('Missing argument.')}
  if(o.auth!==undefined&&o.auth!=='adc')throw Error('Unknown authentication mode.')
  if(o.auth==='adc'&&(!o['dev-inspect']||o['dev-execute']||!o['wif-audience']||!o['service-account']))throw Error('ADC is restricted to explicit read-only inspection.')
  if(o.auth!=='adc'&&(o['wif-audience']||o['service-account']))throw Error('Federation identity requires ADC.')
  const dev=o.project==='termite-warranty-dev'
  if(!['demo-termite-warranty','termite-warranty-dev'].includes(o.project)||!o.control||o.control==='(default)'||!/^[a-f0-9]{40}$/.test(o.revision??''))throw Error('Explicit approved project, revision and separate control required.')
  // Read-only flag cannot promote ANY command, including --apply, to Dev writes.
  const execute=dev&&o['dev-execute']===true
  if(dev&&!execute&&(!o['dev-inspect']||!['observe','status','preflight'].includes(o.command)||o.apply||o.migration||o['worker-stopped']||o.operation||o.approval||o.baseline||o.verification||o['expected-owner']||o.confirm))throw Error('Explicit Dev inspection only.')
  if(execute&&(!['plan','plan-address','plan-intake','apply','resume','publish','reopen','recover-operator','enter'].includes(command)||o['dev-inspect']||o.apply!==true||o.confirm!=='fixed-recovery'||!o.site||!/^[-\w./:]{4,160}$/.test(o.approval??'')||!/^[\w-]{8,80}$/.test(o.operation??'')))throw Error('Explicit guarded Dev command required.')
  if(execute&&command==='plan'&&(!/^[\w-]{8,80}$/.test(o.baseline??'')||!o.migration&&!/^[\w-]{8,80}$/.test(o.verification??'')))throw Error('Explicit plan evidence required.')
  if(execute&&['resume','recover-operator'].includes(command)&&(!o['worker-stopped']||!o['expected-owner']))throw Error('Stopped worker and exact lock owner required.')
  if(command==='plan-address'&&(!/^[\w-]{8,80}$/.test(o.baseline??'')||!/^[\w-]{1,100}$/.test(o['address-operation']??'')||!/^[a-f0-9]{64}$/.test(o['address-plan-hash']??'')||o.source!=='(default)'||o.migration||o.verification))throw Error('Explicit address publication evidence required.')
  if(command!=='plan-address'&&(o['address-operation']!==undefined||o['address-plan-hash']!==undefined))throw Error('Address evidence is command-specific.')
  if(command==='plan-intake'&&(!/^[\w-]{8,80}$/.test(o['intake-operation']??'')||!/^[a-f0-9]{64}$/.test(o['intake-plan-hash']??'')||o.source!=='(default)'||o.migration||o.verification||o.baseline))throw Error('Explicit historical intake publication evidence required.')
  if(command!=='plan-intake'&&(o['intake-operation']!==undefined||o['intake-plan-hash']!==undefined))throw Error('Intake evidence is command-specific.')
  if(execute&&command!=='plan'&&command!=='plan-address'&&(o.migration||o.baseline||o.verification)||execute&&!['resume','recover-operator'].includes(command)&&(o['worker-stopped']||o['expected-owner']))throw Error('Command-specific evidence required.')
  if(!dev&&(o['dev-inspect']||o['dev-execute']||o.confirm||o.command==='preflight'))throw Error('Dev options cannot target emulators.')
  databaseId(o.control);if(o.source!==undefined)databaseId(o.source)
  if(o.generation!==undefined){o.generation=Number(o.generation);if(!Number.isSafeInteger(o.generation)||o.generation<1)throw Error('Invalid generation.')}
  if(command==='observe'){if(!dev||o.source||o.generation||o.site||o['hosting-provider-version'])throw Error('Observation discovers state without release arguments.');o.source='(default)'}
  if(dev&&command!=='observe'&&(!o.source||!Number.isSafeInteger(o.generation)||o.source===o.control))throw Error('Explicit observed source and generation required.')
  if(o.site!==undefined&&(!dev||!/^[-a-z0-9]+$/.test(o.site)))throw Error('Explicit valid Dev site required.')
  if(o['hosting-provider-version']!==undefined&&(!dev||!o.site||!new RegExp(`^sites/${o.site}/versions/[-a-zA-Z0-9]+$`).test(o['hosting-provider-version'])))throw Error('Explicit inspected same-site provider baseline required.')
  if(execute&&command==='enter'&&o.source!=='(default)')throw Error('Legacy maintenance entry uses the existing recovery CLI.')
  return o
}
async function inspectDev(o) {
  const git=promisify(execFile),cwd=fileURLToPath(new URL('..',import.meta.url))
  const repository={head:(await git('git',['rev-parse','HEAD'],{cwd})).stdout.trim(),dirty:Boolean((await git('git',['status','--porcelain','--untracked-files=all','--',...DEV_RUNTIME_PATHS],{cwd})).stdout.trim())}
  const local=repositoryPreflight(o,repository)
  if(o['dev-execute']&&local.some(check=>check.status==='blocked'))throw Error('Local release gate blocked.')
  if(o.command!=='observe'&&local.some(check=>check.status==='blocked'))return {mode:'inspect',writesPerformed:false,liveMutationAvailable:false,ready:false,checks:[...local,{id:'cloud-preflight',status:'blocked',reason:'local-gate-blocked'},{id:'functions-release-proof',status:'blocked',reason:'not-implemented'},{id:'hosting-release-proof',status:'blocked',reason:'not-implemented'}]}
  if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Mixed environment forbidden.')
  const credentials=await operatorCredentials({mode:o.auth??'firebase-cli',audience:o['wif-audience'],serviceAccount:o['service-account']})
  const {Firestore}=await import('@google-cloud/firestore')
  const instances=new Map()
  const database=id=>{if(!instances.has(id))instances.set(id,new Firestore({projectId:o.project,databaseId:id,authClient:credentials.authClient}));return instances.get(id)}
  let verifiedProjectNumber
  const authorizedFetch=async url=>{
    const target=new URL(url)
    const scopedV1=['https://firestore.googleapis.com','https://firebaserules.googleapis.com'].includes(target.origin)&&target.pathname.startsWith(`/v1/projects/${o.project}/`)
    const management=target.origin==='https://firebase.googleapis.com'&&(target.pathname===`/v1beta1/projects/${o.project}`||new RegExp(`^/v1beta1/projects/${o.project}/webApps/([-]|1:[0-9]+:web:[a-f0-9]+)/config$`).test(target.pathname))
    const functions=target.origin==='https://cloudfunctions.googleapis.com'&&target.pathname===`/v2/projects/${o.project}/locations/-/functions`
    const run=target.origin==='https://run.googleapis.com'&&[o.project,verifiedProjectNumber].filter(Boolean).some(id=>new RegExp(`^/v2/projects/${id}/locations/asia-northeast1/services/[a-z0-9-]+(/revisions/[a-z0-9-]+)?$`).test(target.pathname))
    const hosting=o.site&&target.origin==='https://firebasehosting.googleapis.com'&&(target.pathname===`/v1beta1/projects/${o.project}/sites/${o.site}`||new RegExp(`^/v1beta1/sites/${o.site}/(channels/live(/releases)?|versions/[-a-zA-Z0-9]+(/files)?)$`).test(target.pathname))
    const storage=verifiedProjectNumber&&target.origin==='https://storage.googleapis.com'&&new RegExp(`^/storage/v1/b/gcf-v2-(sources|uploads)-${verifiedProjectNumber}-asia-northeast1/o/[^/]+$`).test(target.pathname)&&/^[1-9]\d*$/.test(target.searchParams.get('generation')??'')
    if(target.username||target.password||!(scopedV1||management||functions||run||hosting||storage))throw Error('Unapproved read-only API scope.')
    const token=await credentials.credential.getAccessToken()
    const response=await proofFetch(fetch,url,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(60000)},'api-read')
    return response
  }
  const request=async url=>{
    const value=await (await authorizedFetch(url)).json()
    if(new URL(url).origin==='https://firebase.googleapis.com'&&value.projectId===o.project&&/^\d+$/.test(String(value.projectNumber)))verifiedProjectNumber=String(value.projectNumber)
    return value
  }
  const readArchive=async source=>{
    const url=`https://storage.googleapis.com/storage/v1/b/${source.bucket}/o/${encodeURIComponent(source.object)}?generation=${source.generation}`
    const meta=await request(url)
    if(String(meta.generation)!==String(source.generation)||meta.bucket!==source.bucket||meta.name!==source.object||!/^\d+$/.test(String(meta.size))||Number(meta.size)>ARCHIVE_LIMIT)throw Error('Archive metadata mismatch.')
    const response=await authorizedFetch(url+'&alt=media'),parts=[];let size=0
    for await(const chunk of response.body){size+=chunk.length;if(size>ARCHIVE_LIMIT||size>Number(meta.size))throw Error('Archive budget exceeded.');parts.push(Buffer.from(chunk))}
    if(size!==Number(meta.size))throw Error('Archive size mismatch.')
    return Buffer.concat(parts,size)
  }
  let authApp
  try {
    if(o.command==='observe')return {...await observeFixedRecovery({project:o.project,control:o.control,request,readDocument:async(id,path)=>{const row=await database(id).doc(path).get();return row.exists?row.data():null},listOperations:async id=>(await database(id).collection('recoveryOperations').limit(1).get()).docs.map(()=>true)}),checks:local,localArtifactBuild:false}
    const expectedRules={default:await readFile(new URL('../firestore.rules',import.meta.url),'utf8'),control:await readFile(new URL('../firestore.control.rules',import.meta.url),'utf8'),controlId:o.control}
    const indexConfig=JSON.parse(await readFile(new URL('../firestore.indexes.json',import.meta.url),'utf8'))
    let receipt
    const readPublic=async url=>{
      if(url!==`https://${o.site}.web.app/__/firebase/init.json`)throw Error('Unapproved public configuration scope.')
      const response=await proofFetch(fetch,url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000)},'public-config-read')
      const chunks=[];let size=0
      for await(const chunk of response.body){size+=chunk.length;if(size>16384)throw Error('Public configuration budget exceeded.');chunks.push(Buffer.from(chunk))}
      return Buffer.concat(chunks,size).toString('utf8')
    }
    const releaseChecks=async()=>{
      receipt??=await buildReleaseArtifacts({root:cwd,revision:o.revision})
      return releaseProof({project:o.project,control:o.control,site:o.site,request,readArchive,inputs:await localReleaseInputs(cwd,{receipt,revision:o.revision}),providerVersion:o['hosting-provider-version'],readPublic})
    }
    const verifyDeployment=async()=>{
      const fresh={head:(await git('git',['rev-parse','HEAD'],{cwd})).stdout.trim(),dirty:Boolean((await git('git',['status','--porcelain','--untracked-files=all','--',...DEV_RUNTIME_PATHS],{cwd})).stdout.trim())}
      if(repositoryPreflight(o,fresh).some(c=>c.status!=='pass'))return false
      const checks=await infrastructureChecks({project:o.project,request,expectedRules,indexConfig,releaseChecks})
      return checks.length===5&&checks.every(c=>c.status==='pass')
    }
    if(o['dev-execute']) {
      const admission=()=>admitDev({options:o,repository,request,readDocument:async(id,path)=>{const row=await database(id).doc(path).get();return row.exists?row.data():null},listOperations:async id=>(await database(id).collection('recoveryOperations').limit(1).get()).docs.map(()=>true)})
      authApp=initializeApp({projectId:o.project,credential:credentials.credential},'fixed-dev-operator')
      const factory=defaultRecovery({database,auth:getAuth(authApp),controlId:o.control,revision:o.revision,verifyDeployment})
      const result=await dispatchDev(o,{factory,admission,verifyClosedRules:()=>closedDataRules({project:o.project,control:o.control,request,expectedRules})})
      return {...sanitizeCommand(result,o.command),localArtifactBuild:Boolean(receipt)}
    }
    const report=await devPreflight({options:o,repository,request,
      readDocument:async(id,path)=>{const row=await database(id).doc(path).get();return row.exists?row.data():null},
      listOperations:async id=>(await database(id).collection('recoveryOperations').limit(1).get()).docs.map(()=>true),
      expectedRules,indexConfig,releaseChecks})
    const observed={}
    if(o.command==='status') {
      const select=value=>{
        if(!value)return null
        const output={}
        for(const key of ['databaseId','controlDatabaseId'])if(typeof value[key]==='string'){try{databaseId(value[key]);output[key]=value[key]}catch{}}
        if(['normal','recovering','verification','retired'].includes(value.phase))output.phase=value.phase
        if(Number.isSafeInteger(value.generation)&&value.generation>0)output.generation=value.generation
        if([1,2].includes(value.protocol))output.protocol=value.protocol
        return output
      }
      const runtime=await database(o.control).doc('recovery/runtime').get(),marker=await database('(default)').doc('_recovery/access').get(),held=(await database(o.control).doc('recovery/operatorLock').get()).data()
      observed.runtime=select(runtime.data());observed.marker=select(marker.data());observed.interruptedOperation=null
      if(held&&/^[\w-]{8,80}$/.test(held.operationId??'')&&/^[\w-]{8,160}$/.test(held.owner??'')&&['default-enter','default-apply','default-seal','default-publish'].includes(held.intent?.kind))observed.interruptedOperation={operationId:held.operationId,owner:held.owner,kind:held.intent.kind,failed:held.failed===true}
    }
    return {...report,...observed,localArtifactBuild:Boolean(receipt),cloudWrites:false}
  }finally{for(const instance of instances.values())await instance.terminate();if(authApp)await deleteApp(authApp)}
}
async function main(){
  const o=options(process.argv.slice(2))
  if(o['dev-inspect']||o['dev-execute']){console.log(JSON.stringify(await inspectDev(o)));return}
  if(o.command!=='status'&&!o.apply){console.log(JSON.stringify({mode:'plan',command:o.command,writesPerformed:false}));return}
  for(const [key,port] of [['FIRESTORE_EMULATOR_HOST',LOCAL_RUNTIME.firestorePort],['FIREBASE_AUTH_EMULATOR_HOST',LOCAL_RUNTIME.authPort]]){const expected=localRuntimeHost(port);if(process.env[key]!==expected)throw Error('Dedicated emulator endpoints must already be configured.')}
  const app=initializeApp({projectId:o.project},'fixed-recovery-operator'),database=id=>id==='(default)'?getFirestore(app):getFirestore(app,id)
  try{
    const api=defaultRecovery({database,auth:getAuth(app),controlId:o.control,revision:o.revision})
    const resume={workerStopped:o['worker-stopped']===true,expectedOwner:o['expected-owner']}
    let result
    if(o.command==='status')result=await api.status()
    else if(o.command==='initialize')result=await api.initialize()
    else if(o.command==='enter')result=await api.enter(o.generation,o.operation)
    else if(o.command==='emergency-close')result=await api.emergencyClose(o.generation,o.operation)
    else if(o.command==='reconcile-emergency')result=await api.reconcileEmergency(o.generation,o.operation,resume)
    else if(o.command==='plan')result=await api.plan(o.generation,o.operation,{source:o.source,baselineId:o.baseline,verificationId:o.verification,approval:o.approval,migration:o.migration===true})
    else if(o.command==='plan-address')result=await api.planAddress(o.generation,o.operation,{baselineId:o.baseline,addressOperationId:o['address-operation'],addressPlanHash:o['address-plan-hash'],approval:o.approval})
    else if(o.command==='plan-intake')result=await api.planIntake(o.generation,o.operation,{intakeOperationId:o['intake-operation'],intakePlanHash:o['intake-plan-hash'],approval:o.approval})
    else if(o.command==='apply'||o.command==='resume')result=await api.apply(o.operation,{...resume,resume:o.command==='resume'})
    else if(o.command==='recover-operator')result=await api.recoverOperator(o.operation,resume)
    else result=await api.publish(o.operation,o.approval,{reopen:o.command==='reopen'})
    console.log(JSON.stringify(result))
  }finally{await deleteApp(app)}
}
if(process.argv[1]&&new URL(import.meta.url).pathname.toLowerCase().endsWith(process.argv[1].replaceAll('\\','/').split('/').at(-1).toLowerCase()))main().catch(()=>{console.error('Fixed recovery refused or interrupted. Retain maintenance and inspect private evidence; no automatic reopening.');process.exitCode=1})
