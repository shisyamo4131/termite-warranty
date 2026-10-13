import assert from 'node:assert/strict'
import {before, after, test} from 'node:test'
import {initializeApp, deleteApp} from 'firebase-admin/app'
import {getFirestore, Timestamp} from 'firebase-admin/firestore'
import {propertyPrototypeOperation} from '../../functions/property-warranty.js'
import {measureFirestoreOperation,observedFirestore} from '../../functions/firestore-metrics.js'
import {LOCAL_RUNTIME, localRuntimeHost} from '../helpers/emulator-runtime.mjs'

if (process.env.FIRESTORE_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.firestorePort)) throw Error('Dedicated emulator required')
// A separate fictional database prevents fixture cleanup from affecting sibling workers.
const app = initializeApp({projectId:'demo-termite-warranty-test'}, 'reference-store-test')
const db = getFirestore(app, 'test-reference-store')
const auth = new Proxy({}, {get(){throw Error('Reference tests cannot access Auth')}})
const call = (action, input={}, uid='hs', target=db) => propertyPrototypeOperation(auth, target, {action,...input}, uid)
before(async()=>{
  for (const collection of await db.listCollections()) await db.recursiveDelete(collection)
  const batch=db.batch(), updatedAt=Timestamp.now()
  batch.set(db.doc('staffAccounts/hs'),{enabled:true,role:'general_staff'})
  for(const id of ['own','other']) {
    batch.set(db.doc(`warrantyGroups/${id}`),{name:`架空保証${id}`,enabled:id!=='own'})
    batch.set(db.doc(`constructionCompanies/${id}`),{name:`架空工務店${id}`,defaultGroupId:id,enabled:id!=='own',updatedAt})
  }
  for(let i=0;i<25;i++)batch.set(db.doc(`companyBranches/b${i}`),{name:`架空本支店${i}`,constructionCompanyId:'own',enabled:i!==24,updatedAt})
  batch.set(db.doc('companyBranches/foreign'),{name:'他社本支店',constructionCompanyId:'other',enabled:true,updatedAt})
  for(const [uid,scope] of [['head','company'],['branch','branch']])batch.set(db.doc(`constructionCompanyAccounts/${uid}`),{enabled:true,role:'construction_company',constructionCompanyId:'own',scope,branchId:'b24'})
  batch.set(db.doc('propertyWarranties/property'),{name:'架空保証物件',warrantyNumber:'HSC-26-001',constructionCompanyId:'own',branchId:'b24',groupId:'own',status:'active',handoverDate:'2026-10-01',updatedAt})
  await batch.commit()
})
after(()=>deleteApp(app))

test('retired catalog reads no masters and portal cache reads only its authorized master set',async()=>{
  let record
  const invoke=(uid,input)=>measureFirestoreOperation('propertyPrototype','catalog',()=>call('catalog',input,uid,observedFirestore(db)),value=>{record=value})
  const masterRows=()=>record.rows.filter(row=>['warrantyGroups','constructionCompanies','companyBranches'].includes(row.collection))
  for(const uid of ['hs','head','branch'])for(const input of [{},{search:''},{search:'架空'},{groupId:'own'},{companyId:'own'},{purpose:'companyOptions'},{purpose:'referenceStore',companyId:'other'},{purpose:'referenceStore',unknown:''}]){
    await assert.rejects(invoke(uid,input),{code:'invalid-argument'})
    assert.deepEqual(masterRows(),[])
  }
  await assert.rejects(invoke('hs',{purpose:'referenceStore'}),{code:'failed-precondition'});assert.deepEqual(masterRows(),[])
  const count=()=>masterRows().reduce((sum,row)=>sum+(row.counters.returnedDocuments??0),0)
  assert.equal((await invoke('head',{purpose:'referenceStore'})).branches.length,25);assert.equal(count(),27)
  const batch=db.batch();for(let i=0;i<30;i++)batch.set(db.doc('companyBranches/other-extra-'+i),{name:'架空他社',constructionCompanyId:'other',updatedAt:Timestamp.now()});await batch.commit()
  assert.equal((await invoke('head',{purpose:'referenceStore'})).branches.length,25);assert.equal(count(),27)
  assert.deepEqual((await invoke('branch',{purpose:'referenceStore'})).branches.map(r=>r.id),['b24']);assert.equal(count(),3)
  for(const [uid,patch] of [['disabled',{enabled:false}],['missing',{constructionCompanyId:''}],['bad',{branchId:'bad/path'}]]){
    await db.doc('constructionCompanyAccounts/'+uid).set({enabled:true,role:'construction_company',scope:'branch',constructionCompanyId:'own',branchId:'b24',...patch})
    await assert.rejects(invoke(uid,{purpose:'referenceStore'}),{code:'permission-denied'});assert.deepEqual(masterRows(),[])
  }
})

// Observe real SDK reads while leaving the production operation unchanged.
function observedDb(){
  const reads=[]
  const wrapDoc=ref=>new Proxy(ref,{get(target,key){
    if(key==='get')return(...args)=>{reads.push(target.path);return target.get(...args)}
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value
  }})
  const target=new Proxy(db,{get(target,key){
    if(key==='doc')return path=>wrapDoc(target.doc(path))
    if(key==='getAll')return(...refs)=>{reads.push(...refs.map(ref=>ref.path));return target.getAll(...refs)}
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value
  }})
  return {target,masterReads:()=>reads.filter(path=>/^(constructionCompanies|companyBranches)\//.test(path))}
}

test('HS reference opt-in skips label reads for list, detail and export source while preserving old clients',async()=>{
  for(const [action,input] of [['list',{}],['propertyList',{}],['detail',{id:'property'}],['list',{filter:{warrantyNumber:'HSC-26-001'}}]]) {
    const observation=observedDb()
    const result=await call(action,{...input,omitReferenceLabels:true},'hs',observation.target)
    const row=action==='detail'?result:result.rows[0]
    assert.equal(row.id,'property')
    assert.equal(Object.hasOwn(row,'companyLabel'),false)
    assert.equal(Object.hasOwn(row,'branchLabel'),false)
    assert.deepEqual(observation.masterReads(),[])
    const legacy=observedDb(),response=await call(action,input,'hs',legacy.target)
    const old=action==='detail'?response:response.rows[0]
    assert.equal(old.companyLabel,'架空工務店own')
    assert.equal(old.branchLabel,'架空本支店24')
    assert.deepEqual(legacy.masterReads().sort(),['companyBranches/b24','constructionCompanies/own'])
  }
})

test('portal reference catalog includes 25 scoped branches and inactive historical masters without exposing others',async()=>{
  await assert.rejects(call('catalog',{},'head'),{code:'invalid-argument'})
  const complete=await call('catalog',{purpose:'referenceStore'},'head')
  assert.equal(complete.branches.length,25)
  assert(complete.branches.every(row=>row.constructionCompanyId==='own'))
  assert.equal(complete.branches.find(row=>row.id==='b24').enabled,false)
  assert.deepEqual(complete.companies.map(row=>row.id),['own'])
  assert.deepEqual(complete.groups.map(row=>row.id),['own'])
  assert.equal(complete.groups[0].enabled,false)
  assert.equal(complete.companies[0].enabled,false)
  const scoped=await call('catalog',{purpose:'referenceStore'},'branch')
  assert.deepEqual(scoped.branches.map(row=>row.id),['b24'])
  assert.deepEqual(scoped.groups.map(row=>row.id),['own'])
  await assert.rejects(call('catalog',{purpose:'referenceStore',companyId:'other'},'head'),error=>error.code==='invalid-argument')
  await assert.rejects(call('catalog',{purpose:'referenceStore',groupId:'other'},'branch'),error=>error.code==='invalid-argument')
})

test('portal cannot opt out of server labels and branch scope still rejects another branch property',async()=>{
  for(const action of ['list','propertyList','detail']) {
    const response=await call(action,{id:'property',omitReferenceLabels:true},'branch')
    const row=action==='detail'?response:response.rows[0]
    assert.equal(row.companyLabel,'架空工務店own')
    assert.equal(row.branchLabel,'架空本支店24')
  }
  await db.doc('propertyWarranties/other-branch').set({constructionCompanyId:'own',branchId:'b0',updatedAt:Timestamp.now()})
  await assert.rejects(call('detail',{id:'other-branch',omitReferenceLabels:true},'branch'),error=>error.code==='permission-denied')
  assert.deepEqual((await call('propertyList',{omitReferenceLabels:true},'branch')).rows.map(row=>row.id),['property'])
})
