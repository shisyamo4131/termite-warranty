// CI-only preparation and read-only release inspection; no business-data writes.
import {readFile,writeFile,readdir,lstat,mkdir} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {GoogleAuth} from 'google-auth-library'
import {prepareFunctionsDomain} from './functions-domain.mjs'
import {git,repository} from './lib/verification-evidence.mjs'
import {hostingHash,hostingConfig} from './lib/default-recovery-release-proof.mjs'
import {inspectProductionRelease} from './lib/production-release-inspection.mjs'
import {proofDiagnostic} from './lib/default-recovery-diagnostics.mjs'

export const developmentTarget=Object.freeze({project:'termite-warranty-dev',projectNumber:'1039792105037',site:'termite-warranty-dev',appId:'1:1039792105037:web:39be28742dfbc14be65e04',control:'recovery-control'})
const environmentKeys=['RECOVERY_AUTH_BACKUP_BUCKET','RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE','RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE']
export function preservedDevelopmentParameters(functions){
  if(!Array.isArray(functions)||!functions.length)throw Error('Existing Dev functions required.')
  const result={RECOVERY_CONTROL_DATABASE:developmentTarget.control,RECOVERY_BACKUP_AUTOMATION:'false'}
  for(const f of functions){
    const env=f.serviceConfig?.environmentVariables
    if(f.state!=='ACTIVE'||env?.RECOVERY_CONTROL_DATABASE!==result.RECOVERY_CONTROL_DATABASE||env?.RECOVERY_BACKUP_AUTOMATION!=='false')throw Error('Dev control or backup hold differs.')
    for(const key of environmentKeys){
      const value=env[key]??''
      if(typeof value!=='string'||value.length>160||!/^[a-zA-Z0-9_./:-]*$/.test(value)||key in result&&result[key]!==value)throw Error('Dev retained parameters differ.')
      result[key]=value
    }
  }
  return result
}
export function developmentConfig(base){
  return {functions:{source:'functions'},firestore:[{database:'(default)',rules:'firestore.rules',indexes:'firestore.indexes.json'},{database:developmentTarget.control,rules:'firestore.control.rules'}],hosting:{...base.hosting,site:developmentTarget.site}}
}
async function files(directory,{functions=false}={}){
  const result=new Map();let size=0
  async function visit(path,prefix=''){
    for(const e of await readdir(path,{withFileTypes:true})){
      if(functions&&(e.name==='node_modules'||/^\.env(?:\.|$)/.test(e.name)||e.name==='.runtimeconfig.json'))continue
      if(e.isSymbolicLink()||e.name.includes('\\'))throw Error('Unsafe release file.')
      const name=prefix+e.name,full=join(path,e.name)
      if(e.isDirectory())await visit(full,name+'/')
      else if(e.isFile()){if((await lstat(full)).size>16*1024*1024||result.size>=15000)throw Error('Release budget exceeded.');const b=await readFile(full);size+=b.length;if(size>128*1024*1024)throw Error('Release budget exceeded.');result.set(name,b)}
      else throw Error('Unsafe release entry.')
    }
  }
  await visit(directory);return result
}
async function main(mode){
  if(!['prepare','check'].includes(mode)||process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==repository||process.env.GITHUB_REF!=='refs/heads/dev'||!['push','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)||git('rev-parse','HEAD')!==process.env.GITHUB_SHA)throw Error('Exact Dev CI checkout required.')
  const credentials=JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'))
  if(credentials.type!=='service_account'||credentials.project_id!==developmentTarget.project||!credentials.client_email?.endsWith('@'+developmentTarget.project+'.iam.gserviceaccount.com'))throw Error('Dev credential identity mismatch.')
  const auth=new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/cloud-platform']}),client=await auth.getClient()
  const credential={getAccessToken:async()=>({access_token:(await client.getAccessToken()).token})}
  const read=async path=>{
    const response=await fetch(path,{headers:{Authorization:'Bearer '+(await credential.getAccessToken()).access_token},redirect:'error',signal:AbortSignal.timeout(20000)})
    if(!response.ok)throw Error('Dev metadata read failed: '+response.status)
    return response.json()
  }
  const t=developmentTarget,base=JSON.parse(await readFile('firebase.json','utf8'))
  if(mode==='prepare'){
    const inventory=await read(`https://cloudfunctions.googleapis.com/v2/projects/${t.project}/locations/-/functions`)
    if(inventory.nextPageToken||inventory.unreachable?.length)throw Error('Incomplete Dev inventory.')
    const parameters=preservedDevelopmentParameters(inventory.functions)
    const live=await read(`https://firebasehosting.googleapis.com/v1beta1/sites/${t.site}/channels/live`)
    const baseline=live.release?.version?.name
    await inspectProductionRelease({target:t},{providerVersion:baseline,credentials:{credential},predeploy:true})
    await prepareFunctionsDomain()
    await writeFile('functions/.env.'+t.project,Object.entries(parameters).map(([k,v])=>k+'='+v).join('\n')+'\n',{flag:'wx'})
    await writeFile('firebase.development.generated.json',JSON.stringify(developmentConfig(base),null,2),{flag:'wx'})
    await mkdir('tmp',{recursive:true})
    await writeFile('tmp/development-provider.json',JSON.stringify({baseline,revision:process.env.GITHUB_SHA}),{flag:'wx'})
    console.log(JSON.stringify({prepared:true,project:t.project,control:t.control,backupAutomation:false}));return
  }
  const {baseline,revision}=JSON.parse(await readFile('tmp/development-provider.json','utf8'))
  if(revision!==process.env.GITHUB_SHA)throw Error('Dev prepared revision changed.')
  const sourceFiles=await files('functions',{functions:true}),hostingFiles=await files('.output/public')
  if(!hostingFiles.has('index.html'))throw Error('Missing verified Hosting artifact.')
  const index=sourceFiles.get('index.js').toString(),names=[...index.matchAll(/export const (\w+)\s*=/g)].map(m=>m[1])
  for(const m of index.matchAll(/export\s*\{\s*(\w+)\s*\}\s*from/g))names.push(m[1])
  const expectedEnvironment=Object.fromEntries((await readFile('functions/.env.'+t.project,'utf8')).trim().split('\n').map(line=>line.split('=')))
  const bundle={target:t,rules:{default:await readFile('firestore.rules','utf8'),control:await readFile('firestore.control.rules','utf8'),controlId:t.control},indexes:JSON.parse(await readFile('firestore.indexes.json','utf8')),inputs:{functionNames:names.sort(),sourceFiles,region:'asia-northeast1',hostingFiles:new Map([...hostingFiles].map(([name,b])=>['/'+name,hostingHash(b)])),servingConfig:hostingConfig(base.hosting),expectedEnvironment}}
  const result=await inspectProductionRelease(bundle,{providerVersion:baseline,credentials:{credential}})
  console.log(JSON.stringify(result));if(!result.ready)throw Error('Dev deployed release does not match verified inputs.')
  const db=await read(`https://firestore.googleapis.com/v1/projects/${t.project}/databases/(default)`),schedules=await read(`https://firestore.googleapis.com/v1/projects/${t.project}/databases/(default)/backupSchedules`)
  if(db.pointInTimeRecoveryEnablement!=='POINT_IN_TIME_RECOVERY_DISABLED'||schedules.backupSchedules?.length||schedules.nextPageToken)throw Error('Dev protection hold changed.')
  console.log(JSON.stringify({protectionHeld:true,pitr:false,dailySchedules:0,backupAutomation:false}))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv[2]).catch(e=>{console.error(JSON.stringify({ready:false,...proofDiagnostic(e,'development-deployment')}));process.exitCode=1})
