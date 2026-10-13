import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as vue from 'vue'

function harness(callable=async()=>({data:{groups:[],companies:[],branches:[]}})) {
 const profile=vue.shallowRef({uid:'staff',accountType:'staff',role:'general_staff'})
 const runtime=vue.shallowRef({phase:'normal',generation:1})
 const listeners=[],metrics=[],exports={},clock={now:0}
 const scope=vue.effectScope()
 const sandbox={exports,setTimeout,clearTimeout,Date:{now:()=>clock.now},useSession:()=>({profile}),useNuxtApp:()=>({$firebase:{firestore:{},functions:{}}}),require:name=>{
  if(name==='vue')return vue
  if(name==='firebase/firestore')return {collection:(_,path)=>path}
  if(name==='firebase/functions')return {httpsCallable:()=>callable}
  if(name.includes('recoveryClient'))return {recoveryRuntime:runtime,withRuntimeGeneration:value=>value}
  if(name.includes('firestoreMetrics'))return {recordMetric:(...args)=>metrics.push(args),createMeasuredFirestore:()=>({onSnapshot:(path,options,next,error)=>{const record={path,next,error,stopped:false};listeners.push(record);return ()=>record.stopped=true}})}
  throw Error(name)
 }}
 const code=ts.transpileModule(readFileSync(new URL('../app/composables/useReferenceStore.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(code,sandbox)
 const store=scope.run(()=>exports.useReferenceStore())
 const send=(index,rows,fromCache=false)=>listeners[index].next({docs:rows.map(row=>({id:row.id,data:()=>row})),metadata:{fromCache}})
 return {store,profile,runtime,listeners,send,metrics,clock,dispose:()=>{profile.value=null;scope.stop()}}
}

test('shared subscription retains disabled names, no candidate cap, and filters parent eligibility',async()=>{
 const h=harness();try{
  assert.equal(h.listeners.length,3)
  const waiting=h.store.ensureReady()
  h.send(0,[{id:'g'},{id:'disabled-group',enabled:false}])
  h.send(1,Array.from({length:25},(_,i)=>({id:`c${i}`,defaultGroupId:'g',name:`C${i}`})).concat([{id:'inactive',defaultGroupId:'g',enabled:false,name:'Old'},{id:'bad',defaultGroupId:'disabled-group'}]))
  h.send(2,[{id:'b',constructionCompanyId:'c24'},{id:'old',constructionCompanyId:'c24',enabled:false,name:'Old branch'},{id:'bad',constructionCompanyId:'inactive'}])
  await waiting
  assert.equal(h.store.activeCompanies.value.length,25)
  assert.equal(h.store.activeBranches('c24').length,1)
  assert.equal(h.store.activeBranches('inactive').length,0)
  assert.equal(h.store.name('branches','old'),'Old branch')
  h.send(2,[{id:'old',constructionCompanyId:'c24',enabled:true,name:'Reenabled'}])
  assert.equal(h.store.activeBranches('c24')[0].name,'Reenabled')
  h.send(2,[]);assert.equal(h.store.branches.value.length,0)
 }finally{h.dispose()}
})

test('logout and recovery changes release subscriptions and reject old callbacks and pending waits',async()=>{
 const h=harness();try{
  const pending=h.store.ensureReady()
  h.profile.value=null
  await assert.rejects(pending,/利用範囲/)
  assert.ok(h.listeners.every(item=>item.stopped))
  h.send(0,[{id:'stale'}]);assert.equal(h.store.groups.value.length,0)
  h.profile.value={uid:'another',accountType:'staff'}
  assert.equal(h.listeners.length,6)
  h.runtime.value={phase:'recovering',generation:2}
  assert.ok(h.listeners.every(item=>item.stopped))
  await assert.rejects(h.store.ensureReady(),/接続状態/)
 }finally{h.dispose()}
})

test('listener failure stays failed despite another listener notification; retry starts replacement subscriptions',async()=>{
 const h=harness();try{
  h.send(0,[{id:'g'}]);h.send(1,[{id:'c',defaultGroupId:'g'}]);h.send(2,[{id:'b',constructionCompanyId:'c'}])
  assert.equal(h.store.status.value,'ready')
  assert.equal(h.store.activeCompanies.value.length,1)
  h.listeners[0].error(Error('offline'));h.send(1,[])
  assert.equal(h.store.status.value,'error')
  assert.equal(h.store.activeCompanies.value.length,0)
  assert.equal(h.store.activeBranches('c').length,0)
  const waiting=h.store.ensureReady();assert.equal(h.listeners.length,6)
  h.send(3,[{id:'g'}]);h.send(4,[{id:'c',defaultGroupId:'g'}]);h.send(5,[]);await waiting
  assert.equal(h.store.activeCompanies.value.length,1)
  h.send(5,[],true);assert.equal(h.store.status.value,'stale');assert.equal(h.store.activeCompanies.value.length,0)
  h.send(5,[],false);assert.equal(h.store.status.value,'ready')
 }finally{h.dispose()}
})

test('portal shares pending scoped request and discards response after identity change',async()=>{
 let finish,calls=0
 const h=harness(()=>{calls++;return new Promise(resolve=>finish=resolve)});try{
  h.profile.value={uid:'portal',accountType:'construction_company',constructionCompanyId:'c',scope:'company'}
  const a=h.store.ensureReady(),b=h.store.ensureReady()
  assert.equal(calls,1)
  h.profile.value=null
  finish({data:{groups:[{id:'old'}],companies:[],branches:[]}})
  await Promise.all([assert.rejects(a,/利用範囲/),assert.rejects(b,/利用範囲/)])
  assert.equal(h.store.groups.value.length,0)
 }finally{h.dispose()}
})


test('initial volume excludes later notifications and inactive references are unique per lifecycle',()=>{
 const h=harness();try{
  h.send(0,[{id:'g',name:'G',enabled:false}],true)
  assert.equal(h.metrics.length,0)
  h.send(0,[{id:'g',name:'G',enabled:false}])
  h.send(0,[{id:'g',name:'Changed',enabled:false}])
  h.store.name('groups','g');h.store.name('groups','g')
  const total=key=>h.metrics.reduce((n,[,c])=>n+(c[key] || 0),0)
  assert.equal(total('inactiveDocuments'),1)
  assert.equal(total('inactiveUniqueReferences'),1)
  assert.equal(total('inactiveReferenceHits'),2)
 }finally{h.dispose()}
})


test('portal cache expires only when referenced again after five minutes',async()=>{
 let calls=0
 const h=harness(async()=>{calls++;return {data:{groups:[],companies:[],branches:[]}}});try{
  h.profile.value={uid:'portal',accountType:'construction_company',constructionCompanyId:'c',scope:'company'}
  await h.store.ensureReady();await h.store.ensureReady();assert.equal(calls,1)
  h.clock.now=300001;assert.equal(calls,1)
  await h.store.ensureReady();assert.equal(calls,2)
 }finally{h.dispose()}
})


test('scoped Callable guard rejects deferred list/detail success and error after scope/reset',async()=>{
 const {createReferenceRequestGuard}=await import('../src/domain/reference-store-request.mjs')
 const guard=createReferenceRequestGuard()
 for(const result of ['list','detail','failure']){
  let finish,fail
  let applied=false
  const request=guard.run(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject})).then(()=>{applied=true})
  guard.invalidate();guard.invalidate() // identity can return to the earlier value
  if(result==='failure')fail(new Error('old account error'));else finish({rows:[{name:'old scope'}]})
  await assert.rejects(request,{name:'ReferenceScopeChangedError'})
  assert.equal(applied,false)
 }
 assert.deepEqual(await guard.run(async()=>({rows:[]})),{rows:[]})
})
