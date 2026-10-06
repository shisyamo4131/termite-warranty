import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {options} from '../scripts/default-recovery.mjs'
import {devPreflight} from '../scripts/lib/default-recovery-preflight.mjs'

const revision='a'.repeat(40),project='termite-warranty-dev',control='recovery-control',source='recovery-drill-20261006'
const base=['--project',project,'--control',control,'--source',source,'--generation','4','--revision',revision,'--dev-inspect']
function fixture() {
  const calls=[],state={phase:'normal',generation:4,databaseId:source,controlDatabaseId:control,private:'secret canary'}
  const documents=new Map([[`${control}/recovery/runtime`,state],[`${source}/_recovery/access`,{phase:'normal',generation:4,databaseId:source}],['(default)/_recovery/access',{phase:'retired',generation:3,databaseId:'(default)'}],['(default)/_recovery/activation',{controlDatabaseId:control}]])
  const config={indexes:[{collectionGroup:'properties',queryScope:'COLLECTION',fields:[{fieldPath:'updatedAt',order:'DESCENDING'}]}],fieldOverrides:[{collectionGroup:'properties',fieldPath:'runtimeNonce',indexes:[]}]}
  const index={...config.indexes[0],name:`projects/${project}/databases/(default)/collectionGroups/properties/indexes/idx`,state:'READY'}
  const data={options:options(['preflight',...base]),repository:{head:revision,dirty:false},indexConfig:config,expectedRules:{default:'default bytes',control:'control bytes'},documents,index,operations:[]}
  data.readDocument=async(id,path)=>{calls.push(`document:${id}/${path}`);return documents.get(`${id}/${path}`)??null}
  data.listOperations=async()=>data.operations
  data.request=async url=>{
    calls.push(url)
    if(url.endsWith('/indexes'))return {indexes:[index]}
    if(url.includes('/fields/'))return {name:url.split('/v1/')[1],indexConfig:{usesAncestorConfig:false,indexes:[]}}
    if(url.includes('/releases/'))return {rulesetName:`projects/${project}/rulesets/${url.endsWith('cloud.firestore')?'default':'control'}`}
    if(url.includes('/rulesets/'))return {source:{files:[{content:url.endsWith('/default')?data.expectedRules.default:data.expectedRules.control}]}}
    return {name:url.split('/v1/')[1],locationId:'asia-northeast1',type:'FIRESTORE_NATIVE'}
  }
  return {...data,calls}
}
const status=(result,id)=>result.checks.find(check=>check.id===id)?.status
test('Auth export lock and mixed release proof cannot enable live mutation',async()=>{
  const f=fixture();f.documents.set(`${control}/recovery/authExportLock`,{private:'secret canary'})
  f.releaseChecks=async()=>[{id:'functions-release-proof',status:'pass'},{id:'hosting-release-proof',status:'blocked'}]
  const result=await devPreflight(f);assert.equal(status(result,'operations-drained-no-lock'),'blocked');assert.equal(status(result,'functions-release-proof'),'pass');assert.equal(status(result,'hosting-release-proof'),'blocked');assert.equal(result.ready,false);assert.equal(result.liveMutationAvailable,false)
})

test('Dev preflight reports independent read-only gates, never converts Rules/index success to release readiness',async()=>{
  const f=fixture(),result=await devPreflight(f)
  for(const id of ['git-revision','runtime-source-clean','database-identities-location','runtime-marker-scope','operations-drained-no-lock','default-rules','control-rules','default-indexes-ready'])assert.equal(status(result,id),'pass')
  assert.equal(status(result,'functions-release-proof'),'blocked');assert.equal(status(result,'hosting-release-proof'),'blocked')
  assert.equal(result.ready,false);assert.equal(result.writesPerformed,false);assert.equal(result.liveMutationAvailable,false)
  assert.equal(JSON.stringify(result).includes('secret canary'),false)
})
test('wrong revision or dirty runtime prevents every external request and document read',async()=>{
  for(const repository of [{head:'b'.repeat(40),dirty:false},{head:revision,dirty:true}]){
    const f=fixture();f.repository=repository
    const result=await devPreflight(f);assert.equal(result.ready,false);assert.deepEqual(f.calls,[])
  }
})
test('database absence, wrong project and mixed location are blocked without leaking response contents',async()=>{
  for(const mode of ['missing','wrong','location']){
    const f=fixture(),request=f.request
    f.request=async url=>{
      if(url.endsWith(`/databases/${source}`)){
        if(mode==='missing')throw Error('secret canary')
        return {name:`projects/${mode==='wrong'?'wrong-project':project}/databases/${source}`,locationId:mode==='location'?'other-region':'asia-northeast1',type:'FIRESTORE_NATIVE'}
      }
      return request(url)
    }
    const result=await devPreflight(f);assert.equal(status(result,'database-identities-location'),'blocked');assert.equal(JSON.stringify(result).includes('secret canary'),false)
  }
})
test('missing raw runtime, wrong source/generation and partial protocol transition are blocked',async()=>{
  for(const change of [null,{databaseId:'wrong-source'},{generation:5},{protocol:2}]){
    const f=fixture(),key=`${control}/recovery/runtime`
    f.documents.set(key,change===null?null:{...f.documents.get(key),...change})
    assert.equal(status(await devPreflight(f),'runtime-marker-scope'),'blocked')
  }
})
test('active mutation or retained lock blocks drained evidence',async()=>{
  for(const mode of ['operations','lock']){
    const f=fixture()
    if(mode==='operations')f.listOperations=async()=>[true]
    else f.documents.set(`${control}/recovery/operatorLock`,{private:'secret canary'})
    assert.equal(status(await devPreflight(f),'operations-drained-no-lock'),'blocked')
  }
})
test('Rules bytes and foreign rulesets are checked independently and fail closed',async()=>{
  for(const mode of ['bytes','foreign']){
    const f=fixture(),request=f.request
    f.request=async url=>{
      if(mode==='foreign'&&url.includes('/releases/cloud.firestore/recovery-control'))return {rulesetName:'projects/wrong/rulesets/x'}
      if(mode==='bytes'&&url.endsWith('/rulesets/control'))return {source:{files:[{content:'older bytes'}]}}
      return request(url)
    }
    const result=await devPreflight(f);assert.equal(status(result,'default-rules'),'pass');assert.equal(status(result,'control-rules'),'blocked')
  }
})
test('indexes require every local shape READY, matching database, explicit exemptions and complete pagination',async()=>{
  for(const mode of ['state','shape','database','missing','exemption','pagination']){
    const f=fixture(),request=f.request
    f.request=async url=>{
      if(url.endsWith('/indexes')){
        if(mode==='state')return {indexes:[{...f.index,state:'CREATING'}]}
        if(mode==='shape')return {indexes:[{...f.index,fields:[{fieldPath:'other',order:'DESCENDING'}]}]}
        if(mode==='database')return {indexes:[{...f.index,name:f.index.name.replace('(default)','other-db')}]}
        if(mode==='missing')return {}
        if(mode==='pagination')return {indexes:[f.index],nextPageToken:'repeated'}
      }
      if(mode==='pagination'&&url.includes('pageToken'))return {nextPageToken:'repeated'}
      if(mode==='exemption'&&url.includes('/fields/'))return {name:url.split('/v1/')[1],indexConfig:{usesAncestorConfig:true}}
      return request(url)
    }
    assert.equal(status(await devPreflight(f),'default-indexes-ready'),'blocked')
  }
})
test('Dev writes cannot be enabled by inspection flags and fail before credential loading',()=>{
  for(const command of ['initialize','enter','apply','resume','publish','reopen','recover-operator','emergency-close','reconcile-emergency']){
    assert.throws(()=>options([command,...base,'--apply']))
    const result=spawnSync(process.execPath,['scripts/default-recovery.mjs',command,...base,'--apply'],{encoding:'utf8'})
    assert.equal(result.status,1);assert.equal(result.stdout,'');assert.equal(result.stderr.includes('firebase-tools.json'),false)
  }
  assert.throws(()=>options(['status',...base,'--apply']))
  for(const key of ['--source','--generation','--revision','--dev-inspect']){
    const args=['preflight',...base],i=args.indexOf(key);args.splice(i,key==='--dev-inspect'?1:2);assert.throws(()=>options(args))
  }
  assert.throws(()=>options(['preflight',...base,'--dev-inspect']))
})
