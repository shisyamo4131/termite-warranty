// Explicitly inspected prior same-site FINALIZED version is the provider baseline.
// This does not trust the current release's own hashes as its expected artifact.
const paths=['/__/firebase/init.js','/__/firebase/init.json']
const refuse=()=>{throw Error('Provider initialization provenance unavailable.')}
export async function bindProviderInitialization({project,projectNumber,site,priorVersion,request,readPublic,inputs}) {
 if(!/^[-a-z0-9]+$/.test(project)||!/^[-a-z0-9]+$/.test(site)||!/^\d+$/.test(String(projectNumber))||!new RegExp(`^sites/${site}/versions/[-a-zA-Z0-9]+$`).test(priorVersion)||[...inputs.hostingFiles.keys()].some(p=>p.startsWith('/__/')))refuse()
 const channelURL=`https://firebasehosting.googleapis.com/v1beta1/sites/${site}/channels/live`
 const live=await request(channelURL)
 if(live.name!==`sites/${site}/channels/live`||live.release?.type!=='DEPLOY'||!live.release?.name||!new RegExp(`^sites/${site}/versions/[-a-zA-Z0-9]+$`).test(live.release?.version?.name)||live.release.version.name===priorVersion)refuse()
 const liveTime=Date.parse(live.release.releaseTime)
 if(!Number.isFinite(liveTime))refuse()
 let releasePage,releaseRounds=0,priorPublished=false;const releaseTokens=new Set()
 do {
   const history=await request(`https://firebasehosting.googleapis.com/v1beta1/sites/${site}/channels/live/releases${releasePage?'?pageToken='+encodeURIComponent(releasePage):''}`)
   if(!Array.isArray(history.releases)||++releaseRounds>100)refuse()
   for(const release of history.releases){if(release.version?.name===priorVersion&&release.type==='DEPLOY'&&new RegExp(`^sites/${site}/(channels/live/)?releases/[-a-zA-Z0-9]+$`).test(release.name)&&Number.isFinite(Date.parse(release.releaseTime))&&Date.parse(release.releaseTime)<liveTime)priorPublished=true}
   const next=history.nextPageToken;if(next!==undefined&&(typeof next!=='string'||!next||releaseTokens.has(next)))refuse();if(next)releaseTokens.add(next);releasePage=next
 }while(releasePage&&!priorPublished)
 if(!priorPublished)refuse()
 const description=await request(`https://firebasehosting.googleapis.com/v1beta1/projects/${project}/sites/${site}`)
 if(description.name!==`projects/${project}/sites/${site}`&&description.name!==`projects/${projectNumber}/sites/${site}`)refuse()
 const app=description.appId??'-'
 if(app!=='-'&&!/^1:\d+:web:[a-f0-9]+$/.test(app))refuse()
 const configURL=`https://firebase.googleapis.com/v1beta1/projects/${project}/webApps/${app}/config`
 const config=await request(configURL),published=JSON.parse(await readPublic(`https://${site}.web.app/__/firebase/init.json`))
 const keys=['apiKey','appId','authDomain','messagingSenderId','projectId','storageBucket']
 if(config.projectId!==project||published.projectId!==project||app!=='-'&&config.appId!==app||keys.some(k=>typeof config[k]!=='string'||config[k]!==published[k])||Object.keys(published).some(k=>![...keys,'databaseURL'].includes(k))||!/^1:\d+:web:[a-f0-9]+$/.test(config.appId)||config.appId.split(':')[1]!==String(projectNumber)||!['','https://'+project+'.firebaseio.com','https://'+project+'-default-rtdb.firebaseio.com'].includes(published.databaseURL))refuse()
 const old=await request(`https://firebasehosting.googleapis.com/v1beta1/${priorVersion}`)
 if(old.name!==priorVersion||old.status!=='FINALIZED')refuse()
 const reserved=new Map(),seen=new Set();let page,rounds=0
 do{const r=await request(`https://firebasehosting.googleapis.com/v1beta1/${priorVersion}/files${page?'?pageToken='+encodeURIComponent(page):''}`);if(!Array.isArray(r.files)||++rounds>100)refuse();for(const f of r.files){if(seen.has(f.path))refuse();seen.add(f.path);if(paths.includes(f.path)){if(f.status!=='ACTIVE'||!/^[a-f0-9]{64}$/.test(f.hash))refuse();reserved.set(f.path,f.hash)}}const next=r.nextPageToken;if(next!==undefined&&(typeof next!=='string'||!next||next===page))refuse();page=next}while(page)
 if(reserved.size!==2)refuse()
 const currentConfig=await request(configURL)
 if(JSON.stringify(currentConfig)!==JSON.stringify(config))refuse()
 const latest=await request(channelURL)
 if(latest.release?.name!==live.release.name||latest.release?.version?.name!==live.release.version.name)refuse()
 return {...inputs,providerLiveVersion:live.release.version.name,hostingFiles:new Map([...inputs.hostingFiles,...reserved])}
}
