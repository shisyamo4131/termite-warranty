// Read-only entry for the separately approved future WIF/Hosting experiment.
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {validateProductionTarget} from './lib/production-deployment-plan.mjs'
import {operatorCredentials} from './lib/operator-credentials.mjs'
import {verifyBootstrapHosting} from './lib/production-bootstrap-hosting.mjs'

export function bootstrapReadAllowed(value,target,{publicRead=false}={}) {
  try {
    const u=new URL(value)
    if(u.username||u.password||u.hash||u.protocol!=='https:')return false
    if(publicRead)return value===`https://${target.site}.web.app/__/firebase/init.json`
    if([...u.searchParams.keys()].some(k=>k!=='pageToken')||u.searchParams.getAll('pageToken').length>1)return false
    const path=u.pathname
    if(u.origin==='https://firebase.googleapis.com')return !u.search&&path===`/v1beta1/projects/${target.project}/webApps/${target.appId}/config`
    if(u.origin!=='https://firebasehosting.googleapis.com')return false
    if(path===`/v1beta1/projects/${target.project}/sites/${target.site}`||path===`/v1beta1/sites/${target.site}/channels/live`)return !u.search
    return new RegExp(`^/v1beta1/sites/${target.site}/versions/[-a-zA-Z0-9]+(/files)?$`).test(path)&&(!u.search||path.endsWith('/files'))
  }catch{return false}
}
export async function inspectBootstrap(target,{credentials,fetcher=fetch,requireEmpty=false}={}) {
  target=validateProductionTarget(target)
  const auth=credentials??await operatorCredentials({mode:'adc',audience:target.audience,serviceAccount:target.serviceAccount})
  const read=async(url,publicRead=false)=>{
    if(!bootstrapReadAllowed(url,target,{publicRead}))throw Error('Unapproved bootstrap read.')
    const headers=publicRead?{}:{Authorization:`Bearer ${(await auth.credential.getAccessToken()).access_token}`}
    const response=await fetcher(url,{method:'GET',redirect:'error',headers,signal:AbortSignal.timeout(60000)})
    if(requireEmpty&&response.status===404&&url===`https://firebasehosting.googleapis.com/v1beta1/sites/${target.site}/channels/live`)return 'null'
    if(!response.ok)throw Error('Bootstrap read failed.')
    const chunks=[];let size=0
    for await(const chunk of response.body){size+=chunk.length;if(size>1024*1024)throw Error('Bootstrap response budget exceeded.');chunks.push(Buffer.from(chunk))}
    return Buffer.concat(chunks,size).toString('utf8')
  }
  if(requireEmpty){
    const description=JSON.parse(await read(`https://firebasehosting.googleapis.com/v1beta1/projects/${target.project}/sites/${target.site}`))
    if(![`projects/${target.project}/sites/${target.site}`,`projects/${target.projectNumber}/sites/${target.site}`].includes(description.name)||description.appId!==target.appId)throw Error('Bootstrap site mismatch.')
    const channel=JSON.parse(await read(`https://firebasehosting.googleapis.com/v1beta1/sites/${target.site}/channels/live`))
    if(channel!==null&&(channel.name!==`sites/${target.site}/channels/live`||channel.release))throw Error('Existing live release; bootstrap refused.')
    return {kind:'empty-hosting-site',cloudWrites:false}
  }
  return verifyBootstrapHosting({...target,request:async url=>JSON.parse(await read(url)),readPublic:url=>read(url,true)})
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(![3,4].includes(process.argv.length)||process.argv.length===4&&process.argv[3]!=='--require-empty'){console.error('Usage: node scripts/inspect-production-bootstrap.mjs <verified-target-json> [--require-empty]');process.exitCode=1}
  else readFile(process.argv[2],'utf8').then(JSON.parse).then(target=>inspectBootstrap(target,{requireEmpty:process.argv[3]==='--require-empty'})).then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error('Production bootstrap inspection refused or incomplete. No writes performed.');process.exitCode=1})
}
