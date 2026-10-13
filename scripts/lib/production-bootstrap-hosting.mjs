// A maintenance-only first release establishes the provider baseline. It is NOT
// proof of the application release; the latter still requires a prior version.
import {isDeepStrictEqual} from 'node:util'
import {hostingHash,hostingReleaseProof} from './default-recovery-release-proof.mjs'
export const maintenanceHtml='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="robots" content="noindex"><title>準備中</title><body><h1>準備中</h1><p>現在は業務利用できません。</p></body></html>\n'
export function maintenanceInputs(){return {hostingFiles:new Map([['/index.html',hostingHash(Buffer.from(maintenanceHtml))]]),servingConfig:{headers:[{glob:'**',headers:{'Cache-Control':'no-cache, no-store, must-revalidate'}}],rewrites:[{glob:'**',path:'/index.html'}]}}}
export async function verifyBootstrapHosting({project,projectNumber,site,appId,request,readPublic}) {
  const fail=()=>{throw Error('Initial maintenance Hosting proof incomplete.')}
  if(!/^[a-z][a-z0-9-]+$/.test(project??'')||!/^[-a-z0-9]+$/.test(site??'')||!/^\d+$/.test(projectNumber??'')||!new RegExp(`^1:${projectNumber}:web:[a-f0-9]+$`).test(appId??''))fail()
  const base='https://firebasehosting.googleapis.com/v1beta1/',channelURL=base+`sites/${site}/channels/live`
  const channel=await request(channelURL),version=channel.release?.version?.name
  if(channel.name!==`sites/${site}/channels/live`||channel.release?.type!=='DEPLOY'||!new RegExp(`^sites/${site}/versions/[-a-zA-Z0-9]+$`).test(version)||!Number.isFinite(Date.parse(channel.release.releaseTime)))fail()
  const description=await request(base+`projects/${project}/sites/${site}`)
  if(![`projects/${project}/sites/${site}`,`projects/${projectNumber}/sites/${site}`].includes(description.name)||description.appId!==appId)fail()
  const configURL=`https://firebase.googleapis.com/v1beta1/projects/${project}/webApps/${appId}/config`,config=await request(configURL)
  const published=JSON.parse(await readPublic(`https://${site}.web.app/__/firebase/init.json`))
  const keys=['apiKey','appId','authDomain','messagingSenderId','projectId','storageBucket']
  if(config.projectId!==project||config.appId!==appId||config.messagingSenderId!==projectNumber||keys.some(k=>typeof config[k]!=='string'||published[k]!==config[k])||Object.keys(published).some(k=>![...keys,'databaseURL'].includes(k))||!['','https://'+project+'.firebaseio.com','https://'+project+'-default-rtdb.firebaseio.com'].includes(published.databaseURL))fail()
  const expected=maintenanceInputs(),seen=new Set(),tokens=new Set();let page
  do {
    const result=await request(base+version+'/files'+(page?'?pageToken='+encodeURIComponent(page):''))
    if(!Array.isArray(result.files)||tokens.size>=100)fail()
    for(const file of result.files){
      if(seen.has(file.path)||file.status!=='ACTIVE'||!/^[a-f0-9]{64}$/.test(file.hash??''))fail()
      seen.add(file.path)
      // Only Google's two reserved files may be taken from the first platform
      // version. Application files ALWAYS use locally derived expected hashes.
      if(['/__/firebase/init.js','/__/firebase/init.json'].includes(file.path))expected.hostingFiles.set(file.path,file.hash)
      else if(expected.hostingFiles.get(file.path)!==file.hash)fail()
    }
    page=result.nextPageToken
    if(page!==undefined&&(typeof page!=='string'||!page||tokens.has(page)))fail()
    if(page)tokens.add(page)
  }while(page)
  if(seen.size!==3||expected.hostingFiles.size!==3)fail()
  await hostingReleaseProof({project,projectNumber,site,request,inputs:{...expected,providerLiveVersion:version}})
  if(!isDeepStrictEqual(config,await request(configURL))||!isDeepStrictEqual(channel,await request(channelURL)))fail()
  return {kind:'maintenance-provider-baseline',version,applicationReleaseVerified:false,cloudWrites:false}
}
