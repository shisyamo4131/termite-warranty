import {createHash} from 'node:crypto'
import {gunzipSync} from 'node:zlib'
import {readFile,writeFile,unlink} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {productionOperation} from '../scripts/lib/production-operations.mjs'
import {operatorTarget} from '../scripts/production-operator-probe.mjs'
import {target} from '../scripts/production-auth-probe.mjs'
import {administratorInput,requireClosed} from '../scripts/lib/production-bootstrap-data.mjs'

export const workflowRef=target.repository+'/.github/workflows/execute-production-operation.yml@refs/heads/main'
const allowed=new Set(['observe','initialize','administrator','intake-inspect','intake-apply','plan-intake','preflight','publish','reopen'])
const refuse=()=>{throw Error('Production operation admission refused.')}
export function admit(env,encoded,digest){
  if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_REPOSITORY!==target.repository||env.GITHUB_REPOSITORY_ID!==target.repositoryId||env.GITHUB_REPOSITORY_OWNER_ID!==target.ownerId||env.GITHUB_WORKFLOW_REF!==workflowRef||!/^\w{40}$/.test(env.GITHUB_SHA??'')||Object.keys(env).some(k=>k.endsWith('_EMULATOR_HOST')&&env[k])||env.FUNCTIONS_EMULATOR==='true'||env.FIREBASE_TOKEN||env.TERMITE_TEST_RUN)refuse()
  if(typeof encoded!=='string'||encoded.length>65536||!/^[a-f0-9]{64}$/.test(digest??''))refuse()
  const bytes=gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:1024*1024})
  if(createHash('sha256').update(bytes).digest('hex')!==digest)refuse()
  const o=JSON.parse(bytes)
  if(o.revision!==env.GITHUB_SHA||o.target?.project!==target.project||o.target?.projectNumber!==target.number||o.target?.site!==target.project||o.target?.control!=='recovery-control'||o.operatorIdentity?.audience!==operatorTarget.audience||o.operatorIdentity?.serviceAccount!==operatorTarget.serviceAccount)refuse()
  if(o.command==='auth-create'){
    const {users,...rest}=o
    productionOperation({...rest,command:'administrator',administrator:users?.[0]})
    if(!Array.isArray(users)||users.length!==2||new Set(users.map(u=>u.role)).size!==2||new Set(users.map(u=>u.uid)).size!==2||new Set(users.map(u=>u.email)).size!==2)refuse()
    users.forEach(administratorInput)
  }else{
    if(!allowed.has(o.command))refuse()
    productionOperation(o)
    if(o.bundle!==undefined&&o.bundle!=='.production-release')refuse()
  }
  return o
}
export async function createAccounts(o,{auth,database}){
  await requireClosed(database,o.target.control,o.generation)
  for(const u of o.users){
    await requireClosed(database,o.target.control,o.generation)
    let existing
    try{existing=await auth.getUser(u.uid)}catch(e){if(e.code!=='auth/user-not-found')throw e}
    if(existing){if(existing.email!==u.email||existing.disabled||existing.displayName!==u.displayName)refuse();continue}
    // A fixed UID makes an unknown create outcome inspectable; no password,
    // verified-email claim, existing-user update or email delivery is performed.
    await auth.createUser({uid:u.uid,email:u.email,displayName:u.displayName,disabled:false,emailVerified:false})
    const result=await auth.getUser(u.uid)
    if(result.email!==u.email||result.disabled)refuse()
  }
  return {command:'auth-create',accounts:2,cloudWrites:true,passwordSet:false}
}
async function main(){
  const stage=process.argv[2]
  if(!['admit','execute'].includes(stage))refuse()
  const o=admit(process.env,process.env.PRODUCTION_OPERATION_REQUEST,process.env.REQUEST_DIGEST)
  const response=await fetch('https://api.github.com/repos/'+target.repository+'/git/ref/heads/main',{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(30000)})
  if(!response.ok||(await response.json()).object?.sha!==o.revision)refuse()
  const path='.production-operation-private.json'
  if(stage==='admit'){
    await writeFile(path,JSON.stringify(o),{mode:0o600})
    console.log(JSON.stringify({admitted:true,command:o.command,revision:o.revision}))
    return
  }
  try{
    if(JSON.stringify(JSON.parse(await readFile(path,'utf8')))!==JSON.stringify(o))refuse()
    if(o.command!=='auth-create'){
      const mode=productionOperation(o).readOnly?'inspect':'execute'
      const result=spawnSync(process.execPath,['scripts/production-operations.mjs',mode,path,...(mode==='execute'?['--execute-approved']:[])],{stdio:'inherit',windowsHide:true})
      if(result.status!==0)throw Error('Production command stopped; inspect before retry.')
      return
    }
    const {operatorCredentials}=await import('../scripts/lib/operator-credentials.mjs')
    const {Firestore}=await import('@google-cloud/firestore')
    const {initializeApp,deleteApp}=await import('firebase-admin/app')
    const {getAuth}=await import('firebase-admin/auth')
    const credentials=await operatorCredentials({mode:'adc',...o.operatorIdentity}),dbs=new Map()
    const database=id=>{if(!['(default)',o.target.control].includes(id))refuse();if(!dbs.has(id))dbs.set(id,new Firestore({projectId:o.target.project,databaseId:id,authClient:credentials.authClient}));return dbs.get(id)}
    const app=initializeApp({projectId:o.target.project,credential:credentials.credential},'bootstrap-auth')
    try{console.log(JSON.stringify(await createAccounts(o,{database,auth:getAuth(app)})))}finally{for(const db of dbs.values())await db.terminate();await deleteApp(app)}
  }finally{await unlink(path).catch(()=>{})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('PRODUCTION_OPERATION_STOPPED: inspect state; no automatic retry.');process.exitCode=1})
