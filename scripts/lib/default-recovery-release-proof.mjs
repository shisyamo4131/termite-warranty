// Artifact contents and raw environment values stay in memory, never in reports.
import {createHash} from 'node:crypto'
import {inflateRawSync,gzipSync} from 'node:zlib'
import {readFile,readdir,lstat} from 'node:fs/promises'
import {join} from 'node:path'
import {assertFunctionsDomainSynchronized} from '../functions-domain.mjs'
import {assertFreshBuild} from './default-recovery-build.mjs'
import {bindProviderInitialization} from './default-recovery-provider-init.mjs'
import {proofFailure,proofDiagnostic} from './default-recovery-diagnostics.mjs'

export const ARCHIVE_LIMIT=64*1024*1024
const fail=()=>{throw proofFailure('release-proof','artifact-mismatch')}
export function crc32(buffer) {let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let i=0;i<8;i++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1}return (crc^0xffffffff)>>>0}
function safePath(name) {return typeof name==='string'&&name.length>0&&name.length<512&&!name.includes('\\')&&!name.includes('\0')&&!name.startsWith('/')&&!name.includes(':')&&!name.split('/').some(p=>p==='.'||p==='..'||p==='')}
export function readSourceZip(buffer) {
  if(!Buffer.isBuffer(buffer)||buffer.length>ARCHIVE_LIMIT||buffer.length<22)fail()
  let end=-1
  for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50&&i+22+buffer.readUInt16LE(i+20)===buffer.length){end=i;break}
  if(end<0||buffer.readUInt16LE(end+4)||buffer.readUInt16LE(end+6))fail()
  const count=buffer.readUInt16LE(end+10),size=buffer.readUInt32LE(end+12),offset=buffer.readUInt32LE(end+16)
  if(count!==buffer.readUInt16LE(end+8)||count<1||count>=5000||size===0xffffffff||offset===0xffffffff||offset+size!==end)fail()
  const files=new Map(),names=new Set(),ranges=[];let cursor=offset,total=0
  for(let i=0;i<count;i++) {
    if(cursor+46>end||buffer.readUInt32LE(cursor)!==0x02014b50)fail()
    const flags=buffer.readUInt16LE(cursor+8),method=buffer.readUInt16LE(cursor+10),crc=buffer.readUInt32LE(cursor+16),compressed=buffer.readUInt32LE(cursor+20),length=buffer.readUInt32LE(cursor+24),nameLength=buffer.readUInt16LE(cursor+28),extra=buffer.readUInt16LE(cursor+30),comment=buffer.readUInt16LE(cursor+32),local=buffer.readUInt32LE(cursor+42),mode=buffer.readUInt32LE(cursor+38)>>>16
    if(flags&~0x808||![0,8].includes(method)||buffer.readUInt16LE(cursor+34)||length>8*1024*1024||compressed===0xffffffff||local===0xffffffff||cursor+46+nameLength+extra+comment>end)fail()
    const nameBytes=buffer.subarray(cursor+46,cursor+46+nameLength),name=new TextDecoder('utf-8',{fatal:true}).decode(nameBytes),directory=name.endsWith('/'),path=directory?name.slice(0,-1):name
    if(!safePath(path)||names.has(path.toLowerCase())||(mode&0xf000)&&![(directory?0x4000:0x8000)].includes(mode&0xf000))fail()
    names.add(path.toLowerCase())
    if(local+30>offset||buffer.readUInt32LE(local)!==0x04034b50||buffer.readUInt16LE(local+6)!==flags||buffer.readUInt16LE(local+8)!==method)fail()
    const localName=buffer.readUInt16LE(local+26),localExtra=buffer.readUInt16LE(local+28),start=local+30+localName+localExtra,stop=start+compressed
    if(stop>offset||!buffer.subarray(local+30,local+30+localName).equals(nameBytes))fail()
    if(!(flags&8)&&(buffer.readUInt32LE(local+14)!==crc||buffer.readUInt32LE(local+18)!==compressed||buffer.readUInt32LE(local+22)!==length))fail()
    let rangeEnd=stop
    if(flags&8){const descriptor=stop+(stop+4<=offset&&buffer.readUInt32LE(stop)===0x08074b50?4:0);if(descriptor+12>offset||buffer.readUInt32LE(descriptor)!==crc||buffer.readUInt32LE(descriptor+4)!==compressed||buffer.readUInt32LE(descriptor+8)!==length)fail();rangeEnd=descriptor+12}
    if(ranges.some(([a,b])=>local<b&&rangeEnd>a))fail();ranges.push([local,rangeEnd])
    const bytes=method===0?buffer.subarray(start,stop):inflateRawSync(buffer.subarray(start,stop),{maxOutputLength:8*1024*1024})
    total+=bytes.length;if(total>128*1024*1024||bytes.length!==length||crc32(bytes)!==crc||directory&&length!==0)fail()
    if(!directory)files.set(path,bytes)
    cursor+=46+nameLength+extra+comment
  }
  if(cursor!==end)fail()
  return files
}
const privateSource=name=>/^\.env(?:\.|$)/.test(name)||name==='.runtimeconfig.json'
function compareSource(actual,expected) {
  if(!(expected instanceof Map)||!expected.has('package.json')||!expected.has('index.js')||!expected.has('recovery-runtime.js')||!expected.has('domain/fixed-recovery.mjs'))fail()
  const publicFiles=new Map([...actual].filter(([name])=>!privateSource(name)))
  if(publicFiles.size!==expected.size)fail()
  for(const [name,bytes] of expected)if(!publicFiles.get(name)?.equals(bytes))fail()
}
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)
export function hostingConfig(config) {
  if(!config||Object.keys(config).some(key=>!['public','ignore','site','headers','rewrites','redirects','cleanUrls','trailingSlash'].includes(key)))fail()
  const value={}
  const pattern=item=>{if(typeof item.source!=='string'||item.glob||item.regex)fail();return {glob:item.source}}
  if(config.headers?.length)value.headers=config.headers.map(item=>{const headers={};for(const h of item.headers??[]){if(typeof h.key!=='string'||typeof h.value!=='string'||h.key in headers)fail();headers[h.key]=h.value}return {...pattern(item),headers}})
  if(config.rewrites?.length)value.rewrites=config.rewrites.map(item=>{if(Object.keys(item).some(k=>!['source','destination'].includes(k))||typeof item.destination!=='string')fail();return {...pattern(item),path:item.destination}})
  if(config.redirects?.length)value.redirects=config.redirects.map(item=>{if(typeof item.destination!=='string')fail();return {...pattern(item),location:item.destination,...(item.type?{statusCode:item.type}:{})}})
  if(config.cleanUrls===true)value.cleanUrls=true
  if(typeof config.trailingSlash==='boolean')value.trailingSlashBehavior=config.trailingSlash?'ADD':'REMOVE'
  return value
}
function normalizedConfig(value) {const result={...value};for(const key of ['headers','rewrites','redirects'])if(Array.isArray(result[key])&&result[key].length===0)delete result[key];if(result.cleanUrls===false)delete result.cleanUrls;if(result.trailingSlashBehavior==='TRAILING_SLASH_BEHAVIOR_UNSPECIFIED')delete result.trailingSlashBehavior;return result}
export const hostingHash=bytes=>createHash('sha256').update(gzipSync(bytes,{level:9})).digest('hex')
async function collect(directory) {
  const files=new Map();let total=0
  async function visit(path,prefix='') {for(const entry of await readdir(path,{withFileTypes:true})){if(entry.isSymbolicLink())fail();const name=prefix+entry.name,full=join(path,entry.name);if(entry.isDirectory())await visit(full,name+'/');else if(entry.isFile()){if(!safePath(name)||files.size>=10000||(await lstat(full)).size>16*1024*1024)fail();const bytes=await readFile(full);total+=bytes.length;if(total>128*1024*1024)fail();files.set(name,bytes)}else fail()}}
  await visit(directory);return files
}
export async function localReleaseInputs(root,{receipt,revision}={}) {
  await assertFreshBuild(receipt,{root,revision})
  await assertFunctionsDomainSynchronized({sourceDirectory:join(root,'src/domain'),outputDirectory:join(root,'functions/domain')})
  const functions=await collect(join(root,'functions'))
  for(const name of [...functions.keys()])if(privateSource(name))functions.delete(name)
  const index=functions.get('index.js')?.toString('utf8')??'',exports=[...index.matchAll(/export const (\w+)\s*=/g)].map(m=>m[1])
  for(const m of index.matchAll(/export\s*\{\s*(\w+)\s*\}\s*from/g))exports.push(m[1])
  if(new Set(exports).size!==exports.length||exports.length<1||/export default|export \*/.test(index))fail()
  const region=index.match(/setGlobalOptions\(\{ region: '([^']+)' \}\)/)?.[1]
  if(region!=='asia-northeast1')fail()
  const config=JSON.parse(await readFile(join(root,'firebase.json'),'utf8'))
  const files=await collect(join(root,'.output','public'))
  await assertFreshBuild(receipt,{root,revision})
  return {functionNames:exports.sort(),sourceFiles:functions,region,hostingFiles:new Map([...files].map(([path,bytes])=>['/'+path,hostingHash(bytes)])),servingConfig:hostingConfig(config.hosting)}
}
async function paged(request,url,key) {
  const items=[],seen=new Set();let token
  do {const value=await request(url+(token?`?pageToken=${encodeURIComponent(token)}`:''));if(value[key]!==undefined&&!Array.isArray(value[key]))fail();items.push(...(value[key]??[]));token=value.nextPageToken;if(token!==undefined&&(typeof token!=='string'||!token||seen.has(token)))fail();if(token)seen.add(token);if(seen.size>100||items.length>10000||value.unreachable?.length)fail()}while(token)
  return items
}
function revisionName(service,value) {if(typeof value!=='string')fail();const name=value.includes('/')?value:`${service}/revisions/${value}`;if(!name.startsWith(`${service}/revisions/`)||!/^[a-z0-9-]+$/.test(name.slice(`${service}/revisions/`.length)))fail();return name}
function controlEnvironment(containers,control,expected={}) {if(!Array.isArray(containers)||containers.length!==1)fail();for(const [key,value] of Object.entries({...expected,RECOVERY_CONTROL_DATABASE:control})){const entries=containers[0].env?.filter(e=>e.name===key);if(entries?.length!==1||entries[0].value!==value||entries[0].valueSource)fail()}}
export async function functionsReleaseProof({project,projectNumber,control,request,readArchive,inputs}) {
  const inventoryURL=`https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/-/functions`
  const functions=await paged(request,inventoryURL,'functions')
  const names=[],archives=new Map()
  for(const f of functions) {
    const match=f.name?.match(/^projects\/([^/]+)\/locations\/([^/]+)\/functions\/(\w+)$/)
    if(!match||![project,projectNumber].includes(match[1])||match[2]!==inputs.region||f.state!=='ACTIVE'||f.environment!=='GEN_2'||names.includes(match[3])||!inputs.functionNames.includes(match[3]))fail()
    names.push(match[3])
    const build=f.buildConfig,service=f.serviceConfig
    const expectedIdentity=inputs.expectedRuntimeIdentities?.[match[3]]
    if(inputs.expectedRuntimeIdentities&&(!expectedIdentity||service?.serviceAccountEmail!==expectedIdentity))fail()
    if(build?.entryPoint!==match[3]||build.runtime!=='nodejs22'||service?.environmentVariables?.RECOVERY_CONTROL_DATABASE!==control||service.allTrafficOnLatestRevision!==true)fail()
    if(Object.entries(inputs.expectedEnvironment??{}).some(([key,value])=>service.environmentVariables[key]!==value))fail()
    const source=build.sourceProvenance?.resolvedStorageSource??build.source?.storageSource
    if(!source||!/^[1-9]\d*$/.test(String(source.generation??''))||typeof source.object!=='string'||!source.object||!new Set([`gcf-v2-sources-${projectNumber}-${inputs.region}`,`gcf-v2-uploads-${projectNumber}-${inputs.region}`]).has(source.bucket))fail()
    const archiveKey=canonical(source)
    if(!archives.has(archiveKey)){const bytes=await readArchive(source);compareSource(readSourceZip(bytes),inputs.sourceFiles);archives.set(archiveKey,true)}
    const runName=service.service
    if(typeof runName!=='string'||!new RegExp(`^projects/(${project}|${projectNumber})/locations/${inputs.region}/services/[a-z0-9-]+$`).test(runName))fail()
    const run=await request(`https://run.googleapis.com/v2/${runName}`),rev=revisionName(runName,service.revision)
    if(run.name!==runName||run.reconciling===true||!/^[1-9]\d*$/.test(String(run.generation))||String(run.observedGeneration)!==String(run.generation)||run.terminalCondition?.state!=='CONDITION_SUCCEEDED'||revisionName(runName,run.latestReadyRevision)!==rev||revisionName(runName,run.latestCreatedRevision)!==rev||run.conditions?.some(c=>c.state!=='CONDITION_SUCCEEDED'))fail()
    for(const traffic of [run.traffic,run.trafficStatuses]){if(!Array.isArray(traffic)||traffic.length!==1||traffic[0].percent!==100||traffic[0].tag||traffic[0].revision&&revisionName(runName,traffic[0].revision)!==rev||!traffic[0].revision&&traffic[0].type!=='TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST')fail()}
    controlEnvironment(run.template?.containers,control,inputs.expectedEnvironment)
    if(expectedIdentity&&run.template?.serviceAccount!==expectedIdentity)fail()
    const revision=await request(`https://run.googleapis.com/v2/${rev}`)
    if(revision.name!==rev||revision.reconciling===true||!revision.conditions?.some(c=>c.type==='Ready'&&c.state==='CONDITION_SUCCEEDED')||revision.conditions.some(c=>c.state!=='CONDITION_SUCCEEDED'))fail()
    controlEnvironment(revision.containers,control,inputs.expectedEnvironment)
    if(expectedIdentity&&revision.serviceAccount!==expectedIdentity)fail()
  }
  if(canonical(names.sort())!==canonical(inputs.functionNames))fail()
  // Recheck the complete provider snapshot, retaining raw environments only in memory.
  const snapshot=list=>canonical([...list].sort((a,b)=>a.name.localeCompare(b.name)))
  if(snapshot(await paged(request,inventoryURL,'functions'))!==snapshot(functions))fail()
  return {functions:names.length,sourceArchives:archives.size}
}
export async function hostingReleaseProof({project,projectNumber,site,request,inputs,settle=false,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  let stage='hosting-site'
  const fail=(reason='identity-mismatch',counts)=>{throw proofFailure(stage,reason,undefined,counts)}
  if(typeof site!=='string'||!/^[-a-z0-9]+$/.test(site))fail()
  const description=await request(`https://firebasehosting.googleapis.com/v1beta1/projects/${project}/sites/${site}`)
  if(![`projects/${project}/sites/${site}`,`projects/${projectNumber}/sites/${site}`].includes(description.name))fail()
  const channelURL=`https://firebasehosting.googleapis.com/v1beta1/sites/${site}/channels/live`,channel=await request(channelURL),name=channel.release?.version?.name
  if(channel.name!==`sites/${site}/channels/live`||channel.release?.type!=='DEPLOY'||typeof name!=='string'||!new RegExp(`^sites/${site}/versions/[-a-zA-Z0-9]+$`).test(name))fail()
  if(inputs.providerLiveVersion!==undefined&&inputs.providerLiveVersion!==name)fail('snapshot-changed')
  for(let observation=1;observation<=(settle?4:1);observation++) {
    try {
      stage='hosting-version'
      const version=await request(`https://firebasehosting.googleapis.com/v1beta1/${name}`)
      if(version.name!==name||version.status!=='FINALIZED')fail()
      if(canonical(normalizedConfig(version.config))!==canonical(inputs.servingConfig))fail('configuration-mismatch')
      stage='hosting-files'
      const files=await paged(request,`https://firebasehosting.googleapis.com/v1beta1/${name}/files`,'files'),seen=new Set()
      let pending=false
      for(const file of files){if(typeof file.path!=='string'||seen.has(file.path))fail();if(!inputs.hostingFiles.has(file.path)||inputs.hostingFiles.get(file.path)!==file.hash)fail('hash-mismatch');if(file.status==='EXPECTED')pending=true;else if(file.status!=='ACTIVE')fail();seen.add(file.path)}
      if(pending)fail('file-not-active')
      const reportedValid=/^(0|[1-9]\d*)$/.test(String(version.fileCount??''))&&Number.isSafeInteger(Number(version.fileCount))&&Number(version.fileCount)<=10000
      const fileCounts={expected:inputs.hostingFiles.size,listed:seen.size,reported:reportedValid?Number(version.fileCount):null,reportedState:reportedValid?'value':version.fileCount===undefined?'missing':'invalid',observation}
      if(seen.size!==inputs.hostingFiles.size)fail('file-list-count-mismatch',fileCounts)
      if(String(version.fileCount)!==String(seen.size))fail('file-metadata-count-mismatch',fileCounts)
      stage='hosting-stability'
      const latest=await request(channelURL)
      if(latest.release?.name!==channel.release.name||latest.release?.version?.name!==name)fail('snapshot-changed')
      return {files:seen.size,...(settle?{observations:observation,fileCounts}:{})}
    } catch(error) {
      const diagnostic=proofDiagnostic(error)
      if(!settle||observation===4||diagnostic.stage!=='hosting-files'||!['file-list-count-mismatch','file-metadata-count-mismatch','file-not-active'].includes(diagnostic.reasonCode))throw error
      // Retry only GET verification, never deployment. Pin the original live release.
      stage='hosting-stability'
      const current=await request(channelURL)
      if(current.release?.name!==channel.release.name||current.release?.version?.name!==name)fail('snapshot-changed')
      await wait(5000)
    }
  }
}
export async function releaseProof({project,control,site,request,readArchive,inputs,providerVersion,readPublic,hostingSettling=false}) {
  const checks=[]
  let projectNumber
  try{const p=await request(`https://firebase.googleapis.com/v1beta1/projects/${project}`);if(p.projectId!==project||!/^\d+$/.test(String(p.projectNumber)))fail();projectNumber=String(p.projectNumber)}catch(error){return ['functions-release-proof','hosting-release-proof'].map(id=>({id,status:'blocked',diagnostic:proofDiagnostic(error,'project-metadata')}))}
  const hosting=async()=>{
    const expected=providerVersion?await bindProviderInitialization({project,projectNumber,site,priorVersion:providerVersion,request,readPublic,inputs}):inputs
    return hostingReleaseProof({project,projectNumber,site,request,inputs:expected,settle:hostingSettling})
  }
  for(const [id,run] of [['functions-release-proof',()=>functionsReleaseProof({project,projectNumber,control,request,readArchive,inputs})],['hosting-release-proof',hosting]]) {
    try{checks.push({id,status:'pass',summary:await run()})}catch(error){checks.push({id,status:'blocked',diagnostic:proofDiagnostic(error,id==='functions-release-proof'?'functions-proof':'hosting-proof')})}
  }
  return checks
}
