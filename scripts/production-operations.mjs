// Explicit operator entry. `plan` is credential-free and never contacts Cloud.
import {readFile} from 'node:fs/promises'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {fileURLToPath} from 'node:url'
import {initializeApp,deleteApp} from 'firebase-admin/app'
import {getAuth} from 'firebase-admin/auth'
import {Firestore} from '@google-cloud/firestore'
import {gunzipSync} from 'node:zlib'
import {productionOperation,productionOperationPlan,dispatchProductionOperation} from './lib/production-operations.mjs'
import {operatorCredentials} from './lib/operator-credentials.mjs'
import {defaultRecovery} from './lib/default-recovery.mjs'
import {recoveryController} from './lib/recovery-controller.mjs'
import {firestoreRecoveryProvider} from './lib/firestore-recovery-provider.mjs'
import {closedDataRules} from './lib/default-recovery-preflight.mjs'
import {verifyProductionBundle} from './lib/production-release-bundle.mjs'
import {inspectProductionRelease,productionReadAllowed} from './lib/production-release-inspection.mjs'
import {readPrivateAuthObject,authImportOptions,loadAuthAuthority,missingAuthPlan} from './lib/auth-recovery.mjs'
import {assertPrivateAuthBucket} from '../src/domain/backup-health.mjs'

async function main(){
  const [mode,path,confirmation]=process.argv.slice(2)
  if(!['plan','inspect','execute'].includes(mode)||!path||process.argv.length>(mode==='execute'?5:4)||mode==='execute'&&confirmation!=='--execute-approved')throw Error('Explicit mode required.')
  const bytes=await readFile(path);if(bytes.length>32*1024*1024)throw Error('Input budget exceeded.')
  const o=productionOperation(JSON.parse(bytes)),target=o.target
  if(mode==='plan'){console.log(JSON.stringify(productionOperationPlan(o)));return}
  if((mode==='inspect')!==o.readOnly)throw Error('Read/write mode mismatch.')
  if(Object.keys(process.env).some(k=>k.endsWith('_EMULATOR_HOST')&&process.env[k])||process.env.FUNCTIONS_EMULATOR==='true'||process.env.TERMITE_TEST_RUN)throw Error('Mixed environment.')
  const git=promisify(execFile),root=fileURLToPath(new URL('..',import.meta.url))
  const head=(await git('git',['rev-parse','HEAD'],{cwd:root})).stdout.trim()
  const dirty=(await git('git',['status','--porcelain','--untracked-files=all','--','app','functions','src','scripts','test','package.json','package-lock.json','firebase.json','firestore.rules','firestore.control.rules','firestore.indexes.json','nuxt.config.ts','.github'],{cwd:root})).stdout.trim()
  if(head!==o.revision||dirty)throw Error('Committed reviewed implementation required.')
  const credentials=await operatorCredentials({mode:'adc',...o.operatorIdentity})
  const bucketRoot=o.bucket?`/storage/v1/b/${o.bucket}`:null
  const requestRaw=async(url,method='GET',body)=>{
    const u=new URL(url),resource=`/v1/projects/${target.project}`
    const bucketRead=bucketRoot&&u.origin==='https://storage.googleapis.com'&&(u.pathname===bucketRoot||u.pathname===bucketRoot+'/iam'||u.pathname.startsWith(bucketRoot+'/o/'))
    const providerWrite=mode==='execute'&&u.origin==='https://firestore.googleapis.com'&&(
      o.command==='configure-backups'&&(method==='POST'&&u.pathname===resource+'/databases/(default)/backupSchedules'&&!u.search||method==='PATCH'&&u.pathname===resource+'/databases/(default)'&&u.search==='?updateMask=pointInTimeRecoveryEnablement')||
      o.command==='restore'&&method==='POST'&&!u.search&&[resource+'/databases:restore',resource+'/databases:clone'].includes(u.pathname))
    if(u.protocol!=='https:'||u.username||u.password||u.hash||!(method==='GET'&&(productionReadAllowed(url,target)||bucketRead)||providerWrite))throw Error('Unapproved request.')
    return fetch(url,{method,headers:{Authorization:`Bearer ${(await credentials.credential.getAccessToken()).access_token}`,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(60000),...(body?{body:JSON.stringify(body)}:{})})
  }
  const request=async(url,method,body)=>{const response=await requestRaw(url,method,body);if(!response.ok){const error=Error('Provider request failed.');error.status=response.status;throw error}const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>4*1024*1024)throw Error('Read budget exceeded.');chunks.push(Buffer.from(chunk))}return JSON.parse(Buffer.concat(chunks).toString())}
  const identity=await request(`https://firebase.googleapis.com/v1beta1/projects/${target.project}`)
  if(identity.projectId!==target.project||String(identity.projectNumber)!==target.projectNumber)throw Error('Project mismatch.')
  for(const id of ['(default)',target.control]){const name=`projects/${target.project}/databases/${id}`,db=await request(`https://firestore.googleapis.com/v1/${name}`);if(db.name!==name||db.type!=='FIRESTORE_NATIVE'||db.locationId!=='asia-northeast1')throw Error('Existing target database mismatch.')}
  const app=initializeApp({projectId:target.project,credential:credentials.credential},'production-operator'),instances=new Map()
  const database=id=>{if(!['(default)',target.control,o.targetDatabase].filter(Boolean).includes(id))throw Error('Database outside operation scope.');if(!instances.has(id))instances.set(id,new Firestore({projectId:target.project,databaseId:id,authClient:credentials.authClient}));return instances.get(id)}
  try{
    const auth=getAuth(app),rules={default:await readFile(new URL('../firestore.rules',import.meta.url),'utf8'),control:await readFile(new URL('../firestore.control.rules',import.meta.url),'utf8')}
    const assertRules=async extra=>closedDataRules({project:target.project,control:extra??target.control,request,expectedRules:{...rules,control:extra?rules.default:rules.control}})
    const verifyDeployment=async()=>{const bundle=await verifyProductionBundle({directory:o.bundle,target,revision:o.revision,digest:o.digest});const report=await inspectProductionRelease(bundle,{providerVersion:o.providerVersion,credentials});if(!report.ready)throw Error('Release proof blocked.');return true}
    const fixed=defaultRecovery({database,auth,controlId:target.control,revision:o.revision,productionTarget:target,verifyDeployment})
    const controller=recoveryController({database,auth,controlId:target.control,revision:o.revision}),provider=firestoreRecoveryProvider({projectId:target.project,productionTarget:target,request})
    const inspectAuth=async bucket=>{
      const base=`https://storage.googleapis.com/storage/v1/b/${bucket}`,metadata=await request(base),policy=await request(base+'/iam')
      if(metadata.name!==bucket||String(metadata.projectNumber)!==target.projectNumber)throw Error('Bucket project mismatch.')
      assertPrivateAuthBucket(metadata,policy)
      const control=database(target.control),last=(await control.doc('recovery/lastAuthBackup').get()).data(),evidence=(await control.doc('recovery/hashConfigurationEvidence').get()).data()
      const snapshot=await readPrivateAuthObject(last,requestRaw,{expectedBucket:bucket}),configuration=await readPrivateAuthObject(evidence,requestRaw,{expectedBucket:bucket,requirePinned:true})
      const data=JSON.parse(gunzipSync(snapshot.bytes,{maxOutputLength:16*1024*1024}).toString()),config=JSON.parse(configuration.bytes)
      authImportOptions(config,target.project)
      if(data.hashConfigurationEvidence!=='recovery/hashConfigurationEvidence')throw Error('Unexpected evidence.')
      const {profiles,users}=await loadAuthAuthority(database('(default)'),auth),plan=missingAuthPlan(data,profiles,users)
      return {accounts:plan.total,missing:plan.missing,preserved:plan.preserved,liveAuthImportAvailable:false}
    }
    const result=await dispatchProductionOperation(o,{database,auth,fixed,controller,provider,assertRules,verifyDeployment,inspectAuth})
    // Never serialize raw documents, UID/email, backup references or Auth data.
    const safe={command:o.command,mode,cloudWrites:!o.readOnly}
    for(const key of ['phase','generation','initialized','administratorBound','maintenanceRetained','complete','properties','documents','restoreSubmitted','restoreDone','accounts','missing','preserved','deleteCount','inventoryHash','authorizationHash','accountHash','count','hash','status'])if(['boolean','string','number'].includes(typeof result?.[key]))safe[key]=result[key]
    if(o.command==='preflight')safe.releaseVerified=result===true
    if(o.command==='observe'){safe.phase=result.runtime?.phase??null;safe.generation=result.runtime?.generation??null;safe.activeOperations=result.activeOperations;safe.operatorBlocked=result.operatorBlocked}
    if(o.command==='backups'){safe.schedules=result.schedules.length;safe.backups=result.backups.length;safe.policyVerified=result.policyVerified;safe.firestoreBackupStatus=result.firestoreBackupStatus}
    console.log(JSON.stringify(safe))
  }finally{for(const db of instances.values())await db.terminate();await deleteApp(app)}
}
main().catch(()=>{console.error('PRODUCTION_OPERATION_REFUSED_OR_INTERRUPTED: keep maintenance; inspect private evidence and exact owner before retrying.');process.exitCode=1})
