import {operatorCredentials} from './operator-credentials.mjs'
import {releaseProof,ARCHIVE_LIMIT} from './default-recovery-release-proof.mjs'
import {infrastructureChecks} from './default-recovery-preflight.mjs'
import {proofFetch,proofFailure} from './default-recovery-diagnostics.mjs'
export function productionReadAllowed(url,target){
  try{
    const u=new URL(url),p=u.pathname
    if(u.username||u.password||u.hash||u.protocol!=='https:')return false
    const standard=[...u.searchParams.keys()].every(k=>k==='pageToken')&&u.searchParams.getAll('pageToken').length<=1
    if(['https://firestore.googleapis.com','https://firebaserules.googleapis.com'].includes(u.origin))return standard&&p.startsWith(`/v1/projects/${target.project}/`)
    if(u.origin==='https://firebase.googleapis.com')return !u.search&&(p===`/v1beta1/projects/${target.project}`||p===`/v1beta1/projects/${target.project}/webApps/${target.appId}/config`)
    if(u.origin==='https://cloudfunctions.googleapis.com')return standard&&p===`/v2/projects/${target.project}/locations/-/functions`
    if(u.origin==='https://run.googleapis.com')return !u.search&&[target.project,target.projectNumber].some(id=>new RegExp(`^/v2/projects/${id}/locations/asia-northeast1/services/[a-z0-9-]+(/revisions/[a-z0-9-]+)?$`).test(p))
    if(u.origin==='https://firebasehosting.googleapis.com')return standard&&(p===`/v1beta1/projects/${target.project}/sites/${target.site}`||new RegExp(`^/v1beta1/sites/${target.site}/(channels/live(/releases)?|versions/[-a-zA-Z0-9]+(/files)?)$`).test(p))
    if(u.origin==='https://storage.googleapis.com')return new RegExp(`^/storage/v1/b/gcf-v2-(sources|uploads)-${target.projectNumber}-asia-northeast1/o/[^/]+$`).test(p)&&/^[1-9]\d*$/.test(u.searchParams.get('generation')??'')&&[...u.searchParams.keys()].every(k=>['generation','alt'].includes(k)&&u.searchParams.getAll(k).length===1)&&(!u.searchParams.has('alt')||u.searchParams.get('alt')==='media')
    return false
  }catch{return false}
}
export async function inspectProductionRelease(bundle,{providerVersion,credentials,fetcher=fetch,predeploy=false}={}) {
  const target=bundle.target
  if(!new RegExp(`^sites/${target.site}/versions/[-a-zA-Z0-9]+$`).test(providerVersion??''))throw Error('Explicit same-site initial provider baseline required.')
  const auth=credentials??await operatorCredentials({mode:'adc',audience:target.audience,serviceAccount:target.serviceAccount})
  const read=async(url,{publicRead=false,max=4*1024*1024}={})=>{
    if(publicRead?url!==`https://${target.site}.web.app/__/firebase/init.json`:!productionReadAllowed(url,target))throw Error('Unapproved production read.')
    const headers=publicRead?{}:{Authorization:`Bearer ${(await auth.credential.getAccessToken()).access_token}`}
    const response=await proofFetch(fetcher,url,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(60000)},publicRead?'public-config-read':'api-read')
    const chunks=[];let size=0
    for await(const chunk of response.body){size+=chunk.length;if(size>max)throw Error('Read budget exceeded.');chunks.push(Buffer.from(chunk))}
    return Buffer.concat(chunks,size)
  }
  const request=async url=>{const bytes=await read(url);try{return JSON.parse(bytes.toString())}catch{throw proofFailure('api-read','invalid-response')}}
  const identity=await request(`https://firebase.googleapis.com/v1beta1/projects/${target.project}`)
  if(identity.projectId!==target.project||String(identity.projectNumber)!==target.projectNumber)throw Error('Production project identity mismatch.')
  if(predeploy){
    for(const id of ['(default)',target.control]){
      const name=`projects/${target.project}/databases/${id}`,db=await request(`https://firestore.googleapis.com/v1/${name}`)
      if(db.name!==name||db.locationId!=='asia-northeast1'||db.type!=='FIRESTORE_NATIVE')throw Error('Existing production database required.')
    }
    const site=await request(`https://firebasehosting.googleapis.com/v1beta1/projects/${target.project}/sites/${target.site}`)
    if(![target.project,target.projectNumber].some(id=>site.name===`projects/${id}/sites/${target.site}`)||site.appId!==target.appId)throw Error('Production site identity mismatch.')
    const prior=await request(`https://firebasehosting.googleapis.com/v1beta1/${providerVersion}`)
    if(prior.name!==providerVersion||prior.status!=='FINALIZED')throw Error('Finalized initial baseline required.')
    return {cloudWrites:false,ready:true,existingFoundation:true}
  }
  const readArchive=async source=>{
    const url=`https://storage.googleapis.com/storage/v1/b/${source.bucket}/o/${encodeURIComponent(source.object)}?generation=${source.generation}`
    const meta=await request(url)
    if(meta.bucket!==source.bucket||meta.name!==source.object||String(meta.generation)!==String(source.generation)||!/^\d+$/.test(String(meta.size))||Number(meta.size)>ARCHIVE_LIMIT)throw Error('Source archive mismatch.')
    const bytes=await read(url+'&alt=media',{max:Number(meta.size)})
    if(bytes.length!==Number(meta.size))throw Error('Source archive size mismatch.')
    return bytes
  }
  const checks=await infrastructureChecks({project:target.project,request,expectedRules:bundle.rules,indexConfig:bundle.indexes,
    releaseChecks:()=>releaseProof({project:target.project,control:target.control,site:target.site,inputs:bundle.inputs,request,readArchive,providerVersion,readPublic:async url=>(await read(url,{publicRead:true,max:16384})).toString()})})
  return {cloudWrites:false,ready:checks.length===5&&checks.every(c=>c.status==='pass'),checks}
}
