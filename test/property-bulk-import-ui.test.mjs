import { usePaginationScroll } from '../app/composables/usePaginationScroll.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as vue from 'vue'
import * as pending from '../src/domain/property-bulk-import-pending.mjs'
import { requiredRules } from '../src/domain/input-rules.mjs'
import { BULK_IMPORT_MAX_BYTES } from '../src/domain/property-bulk-import.mjs'

const scope={projectId:'demo-termite-warranty',actorUid:'fictional-staff'}
function storageForTest() {
  const map=new Map()
  return {map,getItem:key=>map.get(key) ?? null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}
}
function viewForTest(storage,invoke,identity=scope) {
  const props=vue.reactive({...identity,referenceReady:true,companies:[],groups:[{id:'fictional-group',name:'架空取込みグループ',externalKeyRequired:true}],fetchCompanies:async()=>[],invoke})
  const open=vue.ref(false),mounted=[],unmount=[],events=[]
  const source=readFileSync(new URL('../app/components/PropertyBulkImportDialog.vue',import.meta.url),'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm,'')
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
  const env={usePaginationScroll,...pending,requiredRules,BULK_IMPORT_MAX_BYTES,window:{sessionStorage:storage,addEventListener:()=>{},removeEventListener:()=>{}},defineProps:()=>props,defineModel:()=>open,defineEmits:()=>((...args)=>events.push(args)),ref:vue.ref,computed:vue.computed,watch:vue.watch,onMounted:fn=>mounted.push(fn),onBeforeUnmount:fn=>unmount.push(fn)}
  const view=new Function(...Object.keys(env),code+'\nreturn {searchCompanies,activeGroups,selectedGroup,groupId,companyId,csv,format,file,preview,confirmed,requestId,pendingRecord,locked,rejected,result,problem,discardConfirmation,commitFile,checkStatus,readFile,discardRejected,restorePending,previewFile,importForm};')(...Object.values(env))
  return {...view,props,open,events,mount:()=>mounted.forEach(fn=>fn()),unmount:()=>unmount.forEach(fn=>fn())}
}
const csvFile=csv=>({size:new TextEncoder().encode(csv).length,arrayBuffer:async()=>new TextEncoder().encode(csv).buffer})
function prepareView(view,csv='fictional CSV content') {
  view.groupId.value='fictional-group';view.companyId.value='fictional-company';view.csv.value=csv
  view.preview.value={count:1,rows:[],errors:[],previewHash:'a'.repeat(64)};view.confirmed.value=true
}
const settle=()=>new Promise(resolve=>setImmediate(resolve))

test('pending identity stores no source rows, binds scope, and refuses an unrelated overwrite',async()=>{
  const storage=storageForTest(),csvHash=await pending.hashImportCsv('fictional CSV')
  const identity={requestId:'fictional-execution',groupId:'fictional-group',companyId:'fictional-company',format:'common',csvHash,previewHash:'a'.repeat(64),csv:'must never persist',rows:[{address:'must never persist'}]}
  const saved=pending.savePendingImport(storage,scope,identity)
  assert.deepEqual(Object.keys(saved).sort(),['version','projectId','actorUid','requestId','groupId','companyId','format','csvHash','previewHash'].sort())
  assert.equal([...storage.map.values()].some(value=>value.includes('must never persist')),false)
  assert.equal(pending.loadPendingImport(storage,{...scope,actorUid:'other-staff'}),null)
  assert.equal(pending.loadPendingImport(storage,{...scope,projectId:'other-project'}),null)
  assert.throws(()=>pending.savePendingImport(storage,scope,{...identity,requestId:'new-execution'}),/未確認/)
  assert.throws(()=>pending.clearPendingImport(storage,scope,'different-execution'),/別の取込/)
  assert.equal(pending.loadPendingImport(storage,scope).requestId,'fictional-execution')
})

test('lost commit response is recovered after remount by read-only status without resubmission',async()=>{
  const storage=storageForTest(),calls=[]
  const first=viewForTest(storage,async payload=>{calls.push(payload);assert.equal(pending.loadPendingImport(storage,scope).requestId,payload.requestId);throw new Error('response lost')})
  prepareView(first);await first.commitFile()
  assert.equal(first.locked.value,true);assert.equal(first.result.value,null)
  const id=first.requestId.value
  first.unmount()
  const second=viewForTest(storage,async payload=>{calls.push(payload);return {count:1,ids:['fictional-property'],replayed:true}})
  second.mount();await settle()
  assert.equal(second.requestId.value,id)
  assert.deepEqual(calls.map(value=>value.action),['commit','status'])
  assert.equal(second.result.value.count,1)
  assert.equal(pending.loadPendingImport(storage,scope),null)
  assert.equal(second.csv.value,'')
  second.unmount()
})

test('absence stays locked; only an identical attached file can replay the same execution',async()=>{
  const storage=storageForTest(),calls=[],csv='fictional CSV with leading code 0012'
  const first=viewForTest(storage,async payload=>{calls.push(payload);throw new Error('response lost')})
  prepareView(first,csv);await first.commitFile();const original=calls[0]
  first.unmount()
  const second=viewForTest(storage,async payload=>{calls.push(payload);return payload.action==='status' ? {pending:true} : {count:1,ids:['fictional-property'],replayed:true}})
  second.mount();await settle()
  assert.equal(second.locked.value,true);assert.equal(second.rejected.value,false)
  await second.readFile(csvFile('different content'))
  assert.equal(second.csv.value,'');assert.match(second.problem.value,/一致しません/)
  await second.commitFile()
  assert.equal(calls.filter(value=>value.action==='commit').length,1)
  await second.readFile(csvFile(csv));await second.commitFile()
  assert.deepEqual(calls.at(-1),original)
  assert.equal(second.result.value.replayed,true)
  assert.equal(pending.loadPendingImport(storage,scope),null)
  second.unmount()
})

test('storage failure prevents submission; corrupt saved identity cannot be silently replaced',async()=>{
  let calls=0
  const unavailable={getItem:()=>null,setItem:()=>{throw new Error('storage unavailable')},removeItem:()=>{}}
  const view=viewForTest(unavailable,async()=>{calls++;return {count:1,ids:[]}})
  prepareView(view);await view.commitFile()
  assert.equal(calls,0);assert.equal(view.result.value,null)
  const storage=storageForTest();storage.setItem(pending.pendingImportStorageKey(scope),'invalid JSON')
  const broken=viewForTest(storage,async()=>{calls++;return {pending:true}})
  broken.mount();await settle()
  assert.equal(broken.locked.value,true);assert.equal(broken.pendingRecord.value,null)
  prepareView(broken);await broken.commitFile()
  assert.equal(calls,0)
  assert.equal(storage.getItem(pending.pendingImportStorageKey(scope)),'invalid JSON')
})

test('only explicit deterministic rejection permits discard; auth changes hide old pending results',async()=>{
  const storage=storageForTest()
  let safe=false
  const view=viewForTest(storage,async()=>{throw Object.assign(new Error('denied'),{code:'functions/permission-denied',details:safe ? {safeToDiscard:true} : undefined})})
  prepareView(view);await view.commitFile();const oldId=view.requestId.value
  view.discardConfirmation.value=true;view.discardRejected()
  assert.equal(view.requestId.value,oldId);assert.equal(view.locked.value,true)
  safe=true;await view.commitFile();assert.equal(view.rejected.value,true)
  view.discardRejected();assert.equal(view.locked.value,false)
  assert.notEqual(view.requestId.value,oldId);assert.equal(pending.loadPendingImport(storage,scope),null)
  let resolve, submitted
  const submission=new Promise(r=>submitted=r)
  const next=viewForTest(storage,()=>new Promise(r=>{resolve=r;submitted()}))
  prepareView(next);const committing=next.commitFile();await submission
  next.props.actorUid='other-staff';resolve({count:1,ids:['old-user-property'],replayed:true});await committing
  assert.equal(next.result.value,null);assert.equal(next.csv.value,'')
  assert.equal(pending.loadPendingImport(storage,scope)?.actorUid,scope.actorUid)
  assert.equal(pending.loadPendingImport(storage,{...scope,actorUid:'other-staff'}),null)
})

test('unmount during submission preserves recovery metadata and suppresses late completion callbacks',async()=>{
  const storage=storageForTest()
  let submitted,resolve
  const submission=new Promise(r=>submitted=r)
  const view=viewForTest(storage,()=>new Promise(r=>{resolve=r;submitted()}))
  prepareView(view);const committing=view.commitFile();await submission
  view.unmount();resolve({count:1,ids:['fictional-property']});await committing
  assert.equal(view.result.value,null)
  assert.equal(view.events.length,0)
  assert.ok(pending.loadPendingImport(storage,scope))
})

test('only enabled required-key groups can be selected, and an invalidated selection is cleared',async()=>{
 const view=viewForTest(storageForTest(),async()=>({}));view.props.groups=[{id:'HSC',name:'HSC',externalKeyRequired:false},{id:'UH',name:'UH',externalKeyRequired:true},{id:'disabled',name:'架空停止',externalKeyRequired:true,enabled:false}];
 assert.deepEqual(view.activeGroups.value.map(g=>g.id),['UH']);view.groupId.value='UH';assert.equal(view.format.value,'common');
 view.props.groups[1].externalKeyRequired=false;await settle();assert.equal(view.groupId.value,'');assert.equal(view.activeGroups.value.length,0);view.unmount();
});

test('a safely rejected legacy UH request can switch to the new template without changing groups',async()=>{
 const storage=storageForTest(),oldCsv='obsolete CSV';const saved={requestId:'legacy-uh',groupId:'fictional-group',companyId:'fictional-company',format:'uh',csvHash:await pending.hashImportCsv(oldCsv),previewHash:'a'.repeat(64)};
 pending.savePendingImport(storage,scope,saved);const calls=[];
 const view=viewForTest(storage,async payload=>{calls.push(payload);if(payload.action==='commit')throw Object.assign(new Error('old format'),{details:{safeToDiscard:true}});return {count:1,rows:[],errors:[],previewHash:'b'.repeat(64)}});
 view.restorePending();await view.readFile(csvFile(oldCsv));await view.commitFile();assert.equal(view.rejected.value,true);
 view.discardConfirmation.value=true;view.discardRejected();assert.equal(view.locked.value,false);assert.equal(view.format.value,'common');assert.equal(view.csv.value,'');assert.equal(view.groupId.value,'fictional-group');
 view.importForm.value={validate:async()=>({valid:true})};await view.readFile(csvFile('new template'));await view.previewFile();assert.equal(calls.at(-1).action,'preview');assert.equal(calls.at(-1).format,'common');assert.equal(view.preview.value.errors.length,0);view.unmount();
});


test('shared company options retain full group candidates and discard a reply after group change',async()=>{
 const view=viewForTest(storageForTest(),async()=>({}))
 view.groupId.value='fictional-group'
 const candidates=Array.from({length:25},(_,i)=>({id:String(i),name:'架空工務店'+i,defaultGroupId:'fictional-group'}))
 view.props.fetchCompanies=async()=>[...candidates,{id:'other',defaultGroupId:'other'},{id:'inactive',defaultGroupId:'fictional-group',enabled:false}]
 assert.equal((await view.searchCompanies('')).length,25)
 let resolve;view.props.fetchCompanies=()=>new Promise(r=>resolve=r)
 const pending=view.searchCompanies('')
 view.groupId.value='other';resolve(candidates)
 assert.deepEqual(await pending,[])
 view.unmount()
})
