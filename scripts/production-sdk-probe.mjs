// Read-only, fixed-target SDK/CLI verification. Never print credentials or CLI bodies.
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {checkContext,target} from './production-auth-probe.mjs'
import {operatorCredentials} from './lib/operator-credentials.mjs'

const appId='1:988295873733:web:bdb85668f28779d8f51cac'
const cli=fileURLToPath(new URL('../node_modules/firebase-tools/lib/bin/firebase.js',import.meta.url))
export const cliArgs=Object.freeze([cli,'hosting:sites:list','--project',target.project,'--json','--non-interactive'])
export async function sdkProbe({env=process.env,credentials=operatorCredentials,run=promisify(execFile),fetcher=fetch}={}) {
  let stage='context'
  try {
    checkContext(env,'allow')
    if(!env.GOOGLE_APPLICATION_CREDENTIALS||env.FIREBASE_TOKEN||Object.keys(env).some(k=>k.endsWith('_EMULATOR_HOST')&&env[k]))throw Error()
    stage='sdk-credentials'
    const auth=await credentials({mode:'adc',environment:env,audience:target.audience,serviceAccount:target.serviceAccount})
    async function get(path){
      const response=await fetcher('https://firebasehosting.googleapis.com/v1beta1/'+path,{method:'GET',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${(await auth.credential.getAccessToken()).access_token}`}})
      if(!response.ok)throw Error()
      const chunks=[];let size=0
      for await(const chunk of response.body){size+=chunk.length;if(size>1048576)throw Error();chunks.push(Buffer.from(chunk))}
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    }
    const matches=site=>[target.project,target.number].some(id=>site?.name===`projects/${id}/sites/${target.project}`)&&site.appId===appId&&site.defaultUrl===`https://${target.project}.web.app`
    stage='sdk-site-read'
    if(!matches(await get(`projects/${target.project}/sites/${target.project}`)))throw Error()
    stage='sdk-empty-live'
    const live=await get(`sites/${target.project}/channels/live`)
    if(live.name!==`sites/${target.project}/channels/live`||live.release)throw Error()
    stage='firebase-cli-read'
    const result=await run(process.execPath,[...cliArgs],{env:{...env,CI:'true'},timeout:90000,maxBuffer:1048576,windowsHide:true})
    const output=JSON.parse(result.stdout)
    if(output.status!=='success'||!Array.isArray(output.result?.sites)||output.result.sites.length!==1||!matches(output.result.sites[0]))throw Error()
    return {result:'pass',sdkRead:true,cliRead:true,emptyLive:true,cloudResourceWrites:false}
  }catch{throw Error(`Production SDK/CLI probe failed at ${stage}; credentials and response bodies suppressed.`)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.length!==3||process.argv[2]!=='--execute-approved'){console.error('Explicit approved invocation required.');process.exitCode=1}
  else sdkProbe().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1})
}
