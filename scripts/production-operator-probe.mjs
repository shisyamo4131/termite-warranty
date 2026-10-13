// Fixed read-only proof for the proposed operator identity. No Auth user reads.
import {pathToFileURL} from 'node:url'
import {Firestore} from '@google-cloud/firestore'
import {checkContext,target} from './production-auth-probe.mjs'
import {operatorCredentials} from './lib/operator-credentials.mjs'

export const operatorTarget=Object.freeze({project:target.project,number:target.number,serviceAccount:'prod-operator@termite-warranty-prod.iam.gserviceaccount.com',audience:'//iam.googleapis.com/projects/988295873733/locations/global/workloadIdentityPools/github-production-operations/providers/github',workflowRef:'shisyamo4131/termite-warranty/.github/workflows/verify-production-operator.yml@refs/heads/main'})
const databases=['(default)','recovery-control']
export async function operatorProbe({env=process.env,credentials=operatorCredentials,fetcher=fetch,createDatabase=options=>new Firestore(options)}={}) {
  let stage='context',status=null
  const clients=[]
  try {
    checkContext(env,'allow')
    if(env.GITHUB_WORKFLOW_REF!==operatorTarget.workflowRef||!env.GOOGLE_APPLICATION_CREDENTIALS||env.FIREBASE_TOKEN||env.FUNCTIONS_EMULATOR==='true'||env.TERMITE_TEST_RUN||Object.keys(env).some(k=>k.endsWith('_EMULATOR_HOST')&&env[k]))throw Error()
    stage='credentials'
    const auth=await credentials({mode:'adc',environment:env,audience:operatorTarget.audience,serviceAccount:operatorTarget.serviceAccount})
    async function get(url){
      status=null
      const response=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${(await auth.credential.getAccessToken()).access_token}`}})
      status=response.status
      if(!response.ok)throw Error()
      const chunks=[];let size=0
      for await(const chunk of response.body){size+=chunk.length;if(size>1048576)throw Error();chunks.push(Buffer.from(chunk))}
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    }
    stage='project-metadata'
    const project=await get(`https://firebase.googleapis.com/v1beta1/projects/${operatorTarget.project}`)
    if(project.projectId!==operatorTarget.project||String(project.projectNumber)!==operatorTarget.number)throw Error()
    for(const id of databases){
      stage=id==='(default)'?'business-metadata':'control-metadata'
      const name=`projects/${operatorTarget.project}/databases/${id}`
      const db=await get(`https://firestore.googleapis.com/v1/${name}`)
      if(db.name!==name||db.type!=='FIRESTORE_NATIVE'||db.locationId!=='asia-northeast1')throw Error()
    }
    status=null;stage='sdk-clients'
    for(const databaseId of databases)clients.push(createDatabase({projectId:operatorTarget.project,databaseId,authClient:auth.authClient}))
    stage='business-marker'
    const marker=await clients[0].doc('_recovery/access').get()
    stage='control-runtime'
    const runtime=await clients[1].doc('recovery/runtime').get()
    stage='control-lock'
    const lock=await clients[1].doc('recovery/operatorLock').get()
    stage='control-operations'
    const operations=await clients[1].collection('recoveryOperations').limit(1).get()
    // Existence flags only. Never emit document contents, UID, email or credentials.
    if([marker,runtime,lock].some(s=>typeof s.exists!=='boolean')||![0,1].includes(operations.size))throw Error()
    return {result:'pass',sdkRead:true,businessMarkerExists:marker.exists,runtimeExists:runtime.exists,operatorBlocked:lock.exists,activeOperationExists:operations.size===1,initializationVerified:false,cloudResourceWrites:false}
  } catch(error) {
    const code=Number.isInteger(error?.code)&&[4,7,16].includes(error.code)?error.code:null
    throw Error(`Production operator probe failed at ${stage}; http=${status??'none'}; grpc=${code??'none'}; response bodies suppressed.`)
  } finally {
    const results=await Promise.allSettled(clients.map(async c=>c.terminate()))
    if(results.some(r=>r.status==='rejected'))throw Error('Production operator probe cleanup failed; response bodies suppressed.')
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.length!==3||process.argv[2]!=='--execute-approved'){console.error('Explicit approved invocation required.');process.exitCode=1}
  else operatorProbe().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1})
}
