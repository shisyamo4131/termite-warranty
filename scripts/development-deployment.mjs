// Dev CLI preparation and bounded read-only checks; no business-data writes.
import {readFile,writeFile,access} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {GoogleAuth} from 'google-auth-library'
import {git,repository} from './lib/verification-evidence.mjs'
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
  if(base.hosting?.public!=='.output/public'||Object.keys(base.hosting).some(k=>!['public','headers','ignore','rewrites','site'].includes(k)))throw Error('Unsupported Dev Hosting configuration.')
  return {functions:{source:'functions'},firestore:[{database:'(default)',rules:'firestore.rules',indexes:'firestore.indexes.json'},{database:developmentTarget.control,rules:'firestore.control.rules'}],hosting:{...base.hosting,site:developmentTarget.site}}
}
export function protectionHeld(db,schedules){
  if(db.pointInTimeRecoveryEnablement!=='POINT_IN_TIME_RECOVERY_DISABLED'||!schedules||schedules.backupSchedules?.length||schedules.nextPageToken)throw Error('Dev protection hold changed.')
}
export function activeInventory(inventory){
  if(!inventory||inventory.nextPageToken||inventory.unreachable?.length)throw Error('Incomplete Dev Functions inventory.')
  return preservedDevelopmentParameters(inventory.functions)
}
async function main(mode){
  if(!['prepare','check'].includes(mode)||process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==repository||process.env.GITHUB_REF!=='refs/heads/dev'||process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'||git('rev-parse','HEAD')!==process.env.GITHUB_SHA)throw Error('Exact protected Dev controller required.')
  const root=resolve('candidate'),t=developmentTarget
  const credentials=JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'))
  if(credentials.type!=='service_account'||credentials.project_id!==t.project||!credentials.client_email?.endsWith('@'+t.project+'.iam.gserviceaccount.com'))throw Error('Dev credential identity mismatch.')
  const auth=new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/cloud-platform']}),client=await auth.getClient()
  const credential={getAccessToken:async()=>({access_token:(await client.getAccessToken()).token})}
  const read=async url=>{
    const response=await fetch(url,{headers:{Authorization:'Bearer '+(await credential.getAccessToken()).access_token},redirect:'error',signal:AbortSignal.timeout(20000)})
    if(!response.ok)throw Error('Dev metadata read failed: '+response.status)
    return response.json()
  }
  const inventory=await read('https://cloudfunctions.googleapis.com/v2/projects/'+t.project+'/locations/-/functions')
  const parameters=activeInventory(inventory)
  protectionHeld(await read('https://firestore.googleapis.com/v1/projects/'+t.project+'/databases/(default)'),await read('https://firestore.googleapis.com/v1/projects/'+t.project+'/databases/(default)/backupSchedules'))
  if(mode==='prepare'){
    const live=await read('https://firebasehosting.googleapis.com/v1beta1/sites/'+t.site+'/channels/live')
    await inspectProductionRelease({target:t},{providerVersion:live.release?.version?.name,credentials:{credential},predeploy:true})
    for(const file of ['.output/public/index.html','functions/index.js','functions/domain/recovery.mjs'])await access(join(root,file))
    const base=JSON.parse(await readFile(join(root,'firebase.json'),'utf8'))
    await writeFile(join(root,'functions/.env.'+t.project),Object.entries(parameters).map(([k,v])=>k+'='+v).join('\n')+'\n',{flag:'wx'})
    await writeFile(join(root,'firebase.development.generated.json'),JSON.stringify(developmentConfig(base),null,2),{flag:'wx'})
    console.log(JSON.stringify({prepared:true,project:t.project,control:t.control,backupAutomation:false}));return
  }
  const expected=Object.fromEntries((await readFile(join(root,'functions/.env.'+t.project),'utf8')).trim().split('\n').map(line=>line.split('=')))
  if(JSON.stringify(parameters)!==JSON.stringify(expected))throw Error('Dev retained parameters changed.')
  const publicRead=async path=>{
    const response=await fetch('https://'+t.site+'.web.app/'+path,{redirect:'error',signal:AbortSignal.timeout(20000)})
    if(!response.ok)throw Error('Dev public read failed.')
    return response
  }
  const config=await (await publicRead('__/firebase/init.json')).json()
  if(config.projectId!==t.project||config.appId!==t.appId)throw Error('Dev public target mismatch.')
  const html=await (await publicRead('')).text()
  if(!/<html[\s>]/i.test(html))throw Error('Dev application entry missing.')
  console.log(JSON.stringify({ready:true,functionsActive:inventory.functions.length,publicEntry:true,protectionHeld:true,pitr:false,dailySchedules:0,backupAutomation:false,sourceArchiveComparison:false,hostingFileHashComparison:false}))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv[2]).catch(e=>{console.error(JSON.stringify({ready:false,...proofDiagnostic(e,'development-deployment')}));process.exitCode=1})
