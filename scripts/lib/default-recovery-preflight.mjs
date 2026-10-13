// Read-only release evidence. No result from this module enables live mutations.
import { databaseId } from '../../src/domain/recovery.mjs'
export const DEV_RUNTIME_PATHS = ['app','functions','src','scripts','firestore.rules','firestore.control.rules','firestore.indexes.json','firebase.json','package.json','package-lock.json','nuxt.config.ts','.github/workflows/deploy-development.yml']
const phases=new Set(['normal','recovering','verification'])
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
export function repositoryPreflight(o, repository) {
  return [
    {id:'git-revision',status:repository.head===o.revision?'pass':'blocked'},
    {id:'runtime-source-clean',status:repository.dirty===false?'pass':'blocked'},
  ]
}
export async function infrastructureChecks({project,request,expectedRules,indexConfig,releaseChecks}) {
  const checks=[]
  for(const [id,run] of [['default-rules',()=>rules(request,project,'(default)',expectedRules.default)],['control-rules',()=>rules(request,project,expectedRules.controlId,expectedRules.control)],['default-indexes-ready',()=>indexes(request,project,indexConfig)]]) {
    try{await run();checks.push({id,status:'pass'})}catch{checks.push({id,status:'blocked'})}
  }
  try {
    const result=await releaseChecks()
    if(!Array.isArray(result)||result.length!==2||new Set(result.map(c=>c.id)).size!==2||result.some(c=>!['functions-release-proof','hosting-release-proof'].includes(c.id)||!['pass','blocked'].includes(c.status)))throw Error('Unknown release proof')
    checks.push(...result)
  }catch{for(const id of ['functions-release-proof','hosting-release-proof'])checks.push({id,status:'blocked'})}
  return checks
}
export async function closedDataRules({project,control,request,expectedRules}) {
  await rules(request,project,'(default)',expectedRules.default)
  await rules(request,project,control,expectedRules.control)
}
function fields(value) {
  if(!Array.isArray(value)||value.length<1)throw Error('Unknown index fields')
  return value.map(field=>{
    if(typeof field.fieldPath!=='string'||!field.fieldPath)throw Error('Unknown index field')
    if(['ASCENDING','DESCENDING'].includes(field.order)&&!field.arrayConfig&&!field.vectorConfig)return {fieldPath:field.fieldPath,order:field.order}
    if(field.arrayConfig==='CONTAINS'&&!field.order&&!field.vectorConfig)return {fieldPath:field.fieldPath,arrayConfig:field.arrayConfig}
    throw Error('Unsupported index mode')
  })
}
function key(index) {
  if(!['COLLECTION','COLLECTION_GROUP'].includes(index.queryScope))throw Error('Unknown index scope')
  const f=fields(index.fields)
  if(!f.some(field=>field.fieldPath==='__name__'))f.push({fieldPath:'__name__',order:f.at(-1).order??'ASCENDING'})
  return JSON.stringify([index.collectionGroup,index.queryScope,f])
}
async function indexes(request, project, config) {
  if(!Array.isArray(config.indexes)||!Array.isArray(config.fieldOverrides))throw Error('Missing local index manifest')
  const root=`projects/${project}/databases/(default)/collectionGroups`,observed=[],seen=new Set()
  let token
  do {
    const response=await request(`https://firestore.googleapis.com/v1/${root}/-/indexes${token?`?pageToken=${encodeURIComponent(token)}`:''}`)
    if(response.indexes!==undefined&&!Array.isArray(response.indexes))throw Error('Invalid index response')
    for(const index of response.indexes??[]) {
      const prefix=`${root}/`,suffix=String(index.name??'').slice(prefix.length).split('/')
      if(!String(index.name??'').startsWith(prefix)||suffix.length!==3||suffix[1]!=='indexes'||!suffix[0]||!suffix[2]||index.state!=='READY')throw Error('Index absent or not ready')
      observed.push(key({...index,collectionGroup:suffix[0]}))
    }
    if(observed.length>1000)throw Error('Index inspection budget exceeded')
    token=response.nextPageToken
    if(token!==undefined&&(!token||typeof token!=='string'||seen.has(token)))throw Error('Invalid index pagination')
    if(token)seen.add(token)
    if(seen.size>100)throw Error('Index pagination budget exceeded')
  } while(token)
  if(config.indexes.some(index=>!observed.includes(key(index))))throw Error('Required index missing')
  for(const field of config.fieldOverrides) {
    if(typeof field.collectionGroup!=='string'||!field.collectionGroup||typeof field.fieldPath!=='string'||!field.fieldPath||!Array.isArray(field.indexes)||field.indexes.length!==0)throw Error('Unsupported field override')
    const name=`${root}/${encodeURIComponent(field.collectionGroup)}/fields/${encodeURIComponent(field.fieldPath)}`
    const actual=await request(`https://firestore.googleapis.com/v1/${name}`)
    if(actual.name!==name||!actual.indexConfig||actual.indexConfig.usesAncestorConfig===true||(actual.indexConfig.indexes??[]).length!==0)throw Error('Field exemption not deployed')
  }
  return {required:config.indexes.length,observed:observed.length,fieldExemptions:config.fieldOverrides.length}
}
async function rules(request, project, id, content) {
  const release=id==='(default)'?'cloud.firestore':`cloud.firestore/${id}`
  const released=await request(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/${release}`)
  const prefix=`projects/${project}/rulesets/`
  if(typeof released.rulesetName!=='string'||!released.rulesetName.startsWith(prefix)||!/^[-\w]+$/.test(released.rulesetName.slice(prefix.length)))throw Error('Rules release unavailable')
  const actual=await request(`https://firebaserules.googleapis.com/v1/${released.rulesetName}`)
  if(!actual.source||!Array.isArray(actual.source.files)||actual.source.files.length!==1||actual.source.files[0].content!==content)throw Error('Rules byte mismatch')
}
export async function devPreflight({options:o,repository,request,readDocument,listOperations,expectedRules,indexConfig,releaseChecks}) {
  const checks=repositoryPreflight(o,repository)
  const report=()=>{
    for(const id of ['functions-release-proof','hosting-release-proof'])if(!checks.some(check=>check.id===id))checks.push({id,status:'blocked',reason:'not-implemented'})
    return {mode:'inspect',writesPerformed:false,liveMutationAvailable:false,ready:false,checks}
  }
  if(checks.some(check=>check.status==='blocked'))return report()
  if(o.project!=='termite-warranty-dev'||!o['dev-inspect']||!o.source||!o.control||!Number.isSafeInteger(o.generation)||o.generation<1)throw Error('Explicit Dev inspection scope required')
  databaseId(o.control);databaseId(o.source)
  if(o.control==='(default)'||o.control===o.source||!/^[a-f0-9]{40}$/.test(o.revision??''))throw Error('Invalid Dev inspection scope')
  async function check(id,run) {try{const summary=await run();checks.push({id,status:'pass',...(summary?{summary}:{})});return true}catch{checks.push({id,status:'blocked'});return false}}
  const dbIds=[...new Set(['(default)',o.control,o.source])]
  await check('database-identities-location',async()=>{
    const descriptions=await Promise.all(dbIds.map(id=>request(`https://firestore.googleapis.com/v1/projects/${o.project}/databases/${id}`)))
    if(descriptions.some((d,i)=>d.name!==`projects/${o.project}/databases/${dbIds[i]}`||typeof d.locationId!=='string'||!d.locationId||d.type!=='FIRESTORE_NATIVE')||new Set(descriptions.map(d=>d.locationId)).size!==1)throw Error('Database mismatch')
    return {databases:dbIds.length}
  })
  const matches=value=>value&&phases.has(value.phase)&&value.generation===o.generation&&value.databaseId===o.source
  await check('runtime-marker-scope',async()=>{
    const state=await readDocument(o.control,'recovery/runtime'),marker=await readDocument(o.source,'_recovery/access')
    if(!matches(state)||state.controlDatabaseId!==o.control||!matches(marker)||marker.phase!==state.phase)throw Error('Runtime or marker mismatch')
    if(state.protocol!==undefined&&state.protocol!==2||marker.protocol!==state.protocol||state.protocol===2&&(o.source!=='(default)'||marker.controlDatabaseId!==o.control))throw Error('Protocol mismatch')
    if(o.source!=='(default)'){
      const target=await readDocument('(default)','_recovery/access'),activation=await readDocument('(default)','_recovery/activation')
      if(!target||target.databaseId!=='(default)'||target.phase!=='retired'||!Number.isSafeInteger(target.generation)||target.generation<1||target.generation>o.generation||activation?.controlDatabaseId!==o.control)throw Error('Legacy default state mismatch')
    }
    return {phase:state.phase,generation:state.generation,protocol:state.protocol??1}
  })
  await check('operations-drained-no-lock',async()=>{
    const [operations,lock,authLock]=await Promise.all([listOperations(o.control),readDocument(o.control,'recovery/operatorLock'),readDocument(o.control,'recovery/authExportLock')])
    if(!Array.isArray(operations)||operations.length!==0||lock!==null||authLock!==null)throw Error('Active operation or lock')
    return {activeOperations:0,operatorLock:false,authExportLock:false}
  })
  await check('default-rules',()=>rules(request,o.project,'(default)',expectedRules.default))
  await check('control-rules',()=>rules(request,o.project,o.control,expectedRules.control))
  await check('default-indexes-ready',()=>indexes(request,o.project,indexConfig))
  if(releaseChecks) {
    try {
      const result=await releaseChecks()
      if(!Array.isArray(result)||result.length!==2||new Set(result.map(c=>c.id)).size!==2||result.some(c=>!['functions-release-proof','hosting-release-proof'].includes(c.id)||!['pass','blocked'].includes(c.status)))throw Error('Unknown release proof')
      checks.push(...result)
    }catch{for(const id of ['functions-release-proof','hosting-release-proof'])checks.push({id,status:'blocked'})}
  }
  // Read-only evidence never enables a mutation command.
  return report()
}
