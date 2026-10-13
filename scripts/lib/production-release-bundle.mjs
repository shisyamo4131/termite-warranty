// Transfer verified bytes between CI jobs. The manifest digest must arrive via
// the successful build job output, never from the downloaded bundle itself.
import {createHash} from 'node:crypto'
import {readFile,writeFile,mkdir,readdir,lstat} from 'node:fs/promises'
import {resolve,join,dirname} from 'node:path'
import {validateProductionTarget} from './production-deployment-plan.mjs'
import {hostingHash,hostingConfig} from './default-recovery-release-proof.mjs'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const fail=()=>{throw Error('Production release bundle refused.')}
const revisionPattern=/^[a-f0-9]{40}$/
const safe=name=>typeof name==='string'&&name&&!name.includes('\\')&&!name.includes(':')&&!name.startsWith('/')&&!name.split('/').some(part=>!part||part==='.'||part==='..')
const secret=name=>/(^|\/)(gha-creds-.*\.json|\.env(?:\..*)?|\.runtimeconfig\.json|node_modules)(\/|$)/.test(name)
async function filesAt(root) {
  const files=new Map();let size=0
  async function visit(dir,prefix=''){
    for(const item of await readdir(dir,{withFileTypes:true})){
      const name=prefix+item.name,path=join(dir,item.name)
      if(!safe(name)||item.isSymbolicLink())fail()
      if(item.isDirectory())await visit(path,name+'/')
      else if(item.isFile()){
        if((await lstat(path)).size>32*1024*1024||files.size>=15000)fail()
        const bytes=await readFile(path);size+=bytes.length;if(size>256*1024*1024)fail();files.set(name,bytes)
      }else fail()
    }
  }
  if(!(await lstat(root)).isDirectory()||(await lstat(root)).isSymbolicLink())fail()
  await visit(root);return files
}
export function recoveryParameters(parameters){
  const keys=['RECOVERY_BACKUP_AUTOMATION','RECOVERY_AUTH_BACKUP_BUCKET','RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE','RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE']
  if(!parameters||Object.keys(parameters).length!==keys.length||keys.some(k=>typeof parameters[k]!=='string'||!/^[-a-zA-Z0-9_./:]*$/.test(parameters[k])||parameters[k].length>160)||!['true','false'].includes(parameters.RECOVERY_BACKUP_AUTOMATION))fail()
  if(parameters.RECOVERY_BACKUP_AUTOMATION==='true'&&keys.slice(1).some(k=>!parameters[k]))fail()
  return {...parameters}
}
export function runtimeEnvironment(target,parameters){return Object.entries({TERMITE_DEPLOYMENT_ENVIRONMENT:'production',TERMITE_PRODUCTION_PROJECT:target.project,TERMITE_PRODUCTION_PROJECT_NUMBER:target.projectNumber,RECOVERY_CONTROL_DATABASE:target.control,...recoveryParameters(parameters)}).map(([k,v])=>`${k}=${v}\n`).join('')}
export async function writeProductionBundle({directory,target,revision,inputs,hostingFiles,rules,indexes,parameters}) {
  target=validateProductionTarget(target)
  if(!revisionPattern.test(revision)||!(inputs.sourceFiles instanceof Map)||!(hostingFiles instanceof Map)||!inputs.sourceFiles.has('index.js')||!hostingFiles.has('index.html'))fail()
  const files=new Map()
  for(const [name,bytes] of inputs.sourceFiles){if(!safe(name)||secret(name)||!Buffer.isBuffer(bytes))fail();files.set('functions/'+name,bytes)}
  for(const [name,bytes] of hostingFiles){if(!safe(name)||secret(name)||name.startsWith('__/')||!Buffer.isBuffer(bytes)||inputs.hostingFiles.get('/'+name)!==hostingHash(bytes))fail();files.set('public/'+name,bytes)}
  if(hostingFiles.size!==inputs.hostingFiles.size)fail()
  parameters=recoveryParameters(parameters)
  files.set(`functions/.env.${target.project}`,Buffer.from(runtimeEnvironment(target,parameters)))
  files.set('firestore.rules',Buffer.from(rules.default));files.set('firestore.control.rules',Buffer.from(rules.control));files.set('firestore.indexes.json',Buffer.from(JSON.stringify(indexes)))
  // Match repository Hosting behavior; no predeploy source regeneration allowed.
  const firebase={functions:{source:'functions'},firestore:[{database:'(default)',rules:'firestore.rules',indexes:'firestore.indexes.json'},{database:target.control,rules:'firestore.control.rules'}],hosting:{...inputs.hostingConfig,public:'public',site:target.site}}
  if(JSON.stringify(hostingConfig(firebase.hosting))!==JSON.stringify(inputs.servingConfig))fail()
  files.set('firebase.json',Buffer.from(JSON.stringify(firebase,null,2)+'\n'))
  const manifest={schema:1,target,revision,parameters,functionNames:inputs.functionNames,region:inputs.region,files:Object.fromEntries([...files].sort(([a],[b])=>a.localeCompare(b)).map(([name,bytes])=>[name,hash(bytes)]))}
  const encoded=Buffer.from(JSON.stringify(manifest)+'\n'),digest=hash(encoded)
  await mkdir(directory,{recursive:false})
  for(const [name,bytes] of files){await mkdir(dirname(join(directory,name)),{recursive:true});await writeFile(join(directory,name),bytes,{flag:'wx'})}
  await writeFile(join(directory,'release-manifest.json'),encoded,{flag:'wx'})
  return {digest,revision,files:files.size}
}
export async function verifyProductionBundle({directory,target,revision,digest}) {
  target=validateProductionTarget(target)
  if(!revisionPattern.test(revision)||!/^[a-f0-9]{64}$/.test(digest??''))fail()
  const files=await filesAt(resolve(directory)),encoded=files.get('release-manifest.json')
  if(!encoded||hash(encoded)!==digest)fail()
  const manifest=JSON.parse(encoded)
  if(manifest.schema!==1||manifest.revision!==revision||Object.keys(target).some(k=>target[k]!==manifest.target?.[k])||Object.keys(manifest.target??{}).length!==Object.keys(target).length||manifest.region!=='asia-northeast1'||!Array.isArray(manifest.functionNames)||!manifest.functionNames.length||new Set(manifest.functionNames).size!==manifest.functionNames.length||manifest.functionNames.some(n=>!/^\w+$/.test(n)))fail()
  files.delete('release-manifest.json')
  if(!manifest.files||files.size!==Object.keys(manifest.files).length)fail()
  for(const [name,bytes] of files){if(hash(bytes)!==manifest.files[name]||secret(name)&&name!==`functions/.env.${target.project}`)fail()}
  if(files.get(`functions/.env.${target.project}`)?.toString()!==runtimeEnvironment(target,manifest.parameters))fail()
  const config=JSON.parse(files.get('firebase.json')??fail())
  if(config.functions?.source!=='functions'||config.functions.predeploy||config.hosting?.public!=='public'||config.hosting.site!==target.site)fail()
  const sourceFiles=new Map([...files].filter(([n])=>n.startsWith('functions/')&&!secret(n)).map(([n,b])=>[n.slice(10),b]))
  const hostingFiles=new Map([...files].filter(([n])=>n.startsWith('public/')).map(([n,b])=>['/'+n.slice(7),hostingHash(b)]))
  if(!sourceFiles.has('index.js')||!hostingFiles.has('/index.html'))fail()
  return {target,revision,files,inputs:{functionNames:manifest.functionNames,region:manifest.region,sourceFiles,hostingFiles,servingConfig:hostingConfig(config.hosting),expectedEnvironment:{TERMITE_DEPLOYMENT_ENVIRONMENT:'production',TERMITE_PRODUCTION_PROJECT:target.project,TERMITE_PRODUCTION_PROJECT_NUMBER:target.projectNumber,...manifest.parameters}},rules:{default:files.get('firestore.rules').toString(),control:files.get('firestore.control.rules').toString(),controlId:target.control},indexes:JSON.parse(files.get('firestore.indexes.json'))}
}
export async function readHostingFiles(root){return filesAt(join(root,'.output/public'))}
export async function stageProductionBundle(options,destination){
  const bundle=await verifyProductionBundle(options)
  await mkdir(destination,{recursive:false})
  const files=new Map(bundle.files)
  files.set('release-manifest.json',await readFile(join(options.directory,'release-manifest.json')))
  for(const [name,bytes] of files){await mkdir(dirname(join(destination,name)),{recursive:true});await writeFile(join(destination,name),bytes,{flag:'wx'})}
  await verifyProductionBundle({...options,directory:destination})
}
