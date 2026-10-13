// Fresh-build evidence lives only in this process; no private input hashes are persisted.
import {createHash} from 'node:crypto'
import {readFile,readdir,lstat,writeFile} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
const exec=promisify(execFile),receipts=new WeakMap()
const inputs=['app','src','functions','public','scripts','nuxt.config.ts','tsconfig.json','package.json','package-lock.json','firebase.json','firestore.rules','firestore.control.rules','firestore.indexes.json']
const refuse=()=>{throw Error('Fresh local build evidence unavailable.')}
function releaseEnvironment(environment,revision) {
 if(!/^[a-f0-9]{40}$/.test(revision??'')||environment.RECOVERY_RELEASE_REVISION!==undefined&&environment.RECOVERY_RELEASE_REVISION!==revision)refuse()
 return {...environment,RECOVERY_RELEASE_REVISION:revision,NUXT_TELEMETRY_DISABLED:'1'}
}
export function normalizeSpaHtml(html) {
 const open='<script type="application/json" data-nuxt-data="nuxt-app" data-ssr="false" id="__NUXT_DATA__">'
 if(typeof html!=='string'||html.split('id="__NUXT_DATA__"').length!==2||html.split(open).length!==2)refuse()
 const start=html.indexOf(open)+open.length,end=html.indexOf('</script>',start)
 if(end<0)refuse()
 const payload=html.slice(start,end),match=/^(\[\{"prerenderedAt":1,"serverRendered":2\},)([1-9]\d*)(,false\])$/.exec(payload)
 if(!match||!Number.isSafeInteger(Number(match[2])))refuse()
 // Nuxt uses truthiness for prerendered payload caching; retain it with stable 1.
 return html.slice(0,start)+match[1]+'1'+match[3]+html.slice(end)
}
async function normalizeHtml(root) {
 const directory=join(root,'.output/public'),changes=[]
 async function visit(path) {
  const stat=await lstat(path);if(stat.isSymbolicLink())refuse()
  if(stat.isDirectory())for(const name of await readdir(path))await visit(join(path,name))
  else if(stat.isFile()&&path.endsWith('.html')){if(stat.size>4*1024*1024||changes.length>=1000)refuse();changes.push([path,normalizeSpaHtml(await readFile(path,'utf8'))])}
 }
 await visit(directory);if(!changes.length)refuse()
 // Validate all known generated SPA payloads before replacing any HTML.
 for(const [path,value] of changes)await writeFile(path,value)
}
export async function normalizeReleaseManifest(root,revision) {
 if(!/^[a-f0-9]{40}$/.test(revision??''))refuse()
 const base=join(root,'.output/public/_nuxt/builds'),meta=join(base,'meta'),latest=join(base,'latest.json'),current=join(meta,revision+'.json')
 if(!(await lstat(base)).isDirectory()||(await lstat(base)).isSymbolicLink()||!(await lstat(meta)).isDirectory()||(await lstat(meta)).isSymbolicLink())refuse()
 const names=await readdir(meta)
 if(names.length!==1||names[0]!==revision+'.json')refuse()
 const values=[];let timestamp
 for(const [path,keys] of [[latest,['id','timestamp']],[current,['id','timestamp','prerendered','matcher']]]) {
  const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024*1024)refuse()
  const value=JSON.parse(await readFile(path,'utf8'))
  if(!value||Array.isArray(value)||value.id!==revision||!Number.isSafeInteger(value.timestamp)||value.timestamp<0||Object.keys(value).some(key=>!keys.includes(key)))refuse()
  if(timestamp!==undefined&&value.timestamp!==timestamp)refuse();timestamp=value.timestamp
  if(path===current&&(!Array.isArray(value.prerendered)||value.prerendered.some(p=>typeof p!=='string')||value.matcher!==undefined&&(!value.matcher||Array.isArray(value.matcher)||typeof value.matcher!=='object')))refuse()
  values.push([path,{...value,timestamp:0}])
 }
 if(values[0][1].id!==values[1][1].id)refuse()
 for(const [path,value] of values)await writeFile(path,JSON.stringify(value))
}
async function tree(root,paths) {
  const result=[];let total=0
  async function visit(path) {
    let stat;try{stat=await lstat(join(root,path))}catch(e){if(e.code==='ENOENT')return;throw e}
    if(stat.isSymbolicLink())refuse()
    if(stat.isDirectory()){for(const entry of (await readdir(join(root,path))).sort()){if(['node_modules','.git'].includes(entry)||entry.startsWith('firebase-debug'))continue;await visit(path+'/'+entry)}}
    else if(stat.isFile()){if(stat.size>32*1024*1024||result.length>=20000)refuse();const bytes=await readFile(join(root,path));total+=bytes.length;if(total>256*1024*1024)refuse();result.push([path,createHash('sha256').update(bytes).digest('hex')])}else refuse()
  }
  for(const path of paths)await visit(path)
  return createHash('sha256').update(JSON.stringify(result.sort(([a],[b])=>a.localeCompare(b)))).digest('hex')
}
async function inputHash(root,environment) {
  const envFiles=(await readdir(root)).filter(name=>/^\.env(?:\.|$)/.test(name))
  return createHash('sha256').update(await tree(root,[...inputs,...envFiles])).update(JSON.stringify(Object.entries(environment).sort(([a],[b])=>a.localeCompare(b)))).digest('hex')
}
async function actualRepository(root) {
 const head=(await exec('git',['rev-parse','HEAD'],{cwd:root})).stdout.trim()
 const dirty=Boolean((await exec('git',['status','--porcelain','--untracked-files=all','--',...inputs],{cwd:root})).stdout.trim())
 return {head,dirty}
}
async function trustedGenerate(root,environment) {
 const path=join(root,'node_modules/nuxt/bin/nuxt.mjs')
 if(!(await lstat(path)).isFile())refuse()
 await exec(process.execPath,[path,'generate'],{cwd:root,env:environment,timeout:300000,maxBuffer:16*1024*1024,windowsHide:true})
}
// Test injection is a code-level dependency, never a CLI claim or receipt file.
export async function buildReleaseArtifacts({root,revision,environment=process.env,repository=actualRepository,generate=trustedGenerate}) {
 root=resolve(root)
 const env=releaseEnvironment(environment,revision),before=await repository(root)
 if(before.head!==revision||before.dirty!==false)refuse()
 const sourceHash=await inputHash(root,env)
 try{await generate(root,env)}catch{refuse()}
 await normalizeReleaseManifest(root,revision)
 await normalizeHtml(root)
 const after=await repository(root)
 if(after.head!==revision||after.dirty!==false||await inputHash(root,releaseEnvironment(environment,revision))!==sourceHash)refuse()
 const outputHash=await tree(root,['.output/public'])
 if(!(await lstat(join(root,'.output/public'))).isDirectory())refuse()
 const receipt=Object.freeze({})
 receipts.set(receipt,{root,revision,sourceHash,outputHash,environment,repository})
 return receipt
}
export async function assertFreshBuild(receipt,{root,revision}) {
 const value=receipts.get(receipt)
 if(!value||value.root!==resolve(root)||value.revision!==revision)refuse()
 const state=await value.repository(value.root)
 if(state.head!==revision||state.dirty!==false||await inputHash(value.root,releaseEnvironment(value.environment,revision))!==value.sourceHash||await tree(value.root,['.output/public'])!==value.outputHash)refuse()
}
