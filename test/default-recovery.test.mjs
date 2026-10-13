import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { Timestamp, GeoPoint } from 'firebase-admin/firestore'
import { typed,digest,difference,defaultRecovery } from '../scripts/lib/default-recovery.mjs'
import { options } from '../scripts/default-recovery.mjs'
import { inspectBusinessIntegrity } from '../scripts/lib/recovery-controller.mjs'

test('business integrity reserves only branch-local active codes and detects stale or missing reservations',async()=>{
 const codeId=createHash('sha256').update('C\0'+'0001').digest('hex')
 const branches={active:{constructionCompanyId:'C',branchCode:'0001'},disabled:{constructionCompanyId:'C',branchCode:'0001',enabled:false},blank:{constructionCompanyId:'C',branchCode:''}}
 const reservation={constructionCompanyId:'C',branchCode:'0001',branchId:'active'}
 const data={constructionCompanies:{C:{name:'fictional company',enabled:false}},companyBranches:branches,branchCodeReservations:{[codeId]:reservation}}
 // Read-only in-memory collection adapter; no SDK/environment access.
 const db={doc(path){const [collection,id]=path.split('/');return {get:async()=>({data:()=>data[collection]?.[id]})}},collection(name){const query={orderBy:()=>query,limit:()=>query,get:async()=>{const docs=Object.entries(data[name]??{}).map(([id,value])=>({id,data:()=>value}));return {docs,size:docs.length}}};return query}}
 assert.deepEqual(await inspectBusinessIntegrity(db),{})
 branches.duplicate={constructionCompanyId:'C',branchCode:'0001',enabled:true}
 await assert.rejects(inspectBusinessIntegrity(db),/Duplicate branch code/)
 delete branches.duplicate
 delete data.branchCodeReservations[codeId]
 await assert.rejects(inspectBusinessIntegrity(db),/reservations/)
 data.branchCodeReservations[codeId]={...reservation,branchId:'disabled'}
 await assert.rejects(inspectBusinessIntegrity(db),/missing or mismatched/)
 data.branchCodeReservations[codeId]=reservation
 branches.active.enabled=false
 await assert.rejects(inspectBusinessIntegrity(db),/reservations/)
 delete data.branchCodeReservations[codeId]
 assert.deepEqual(await inspectBusinessIntegrity(db),{})
})
test('typed comparison includes reference database, nanoseconds, bytes and rejects unsafe integers',()=>{
 const ref=databaseId=>({firestore:{projectId:'demo-termite-warranty',databaseId},path:'properties/a'})
 assert.notDeepEqual(typed(ref('source')),typed(ref('(default)')))
 assert.notDeepEqual(typed(new Timestamp(3,1)),typed(new Timestamp(3,2)))
 assert.deepEqual(typed(new GeoPoint(1,2)),['point',1,2])
 assert.deepEqual(typed(Buffer.from([0,255])),['bytes','AP8='])
 assert.equal(digest(typed({b:2,a:1})),digest(typed({a:1,b:2})))
 assert.throws(()=>typed(2**53));assert.throws(()=>typed(-(2**53)))
 assert.notDeepEqual(typed(-0),typed(0))
})
test('full synchronization deletes children first and sets parents first, identical rows omitted',()=>{
 const row=hash=>({hash,fields:{v:hash}})
 const before=new Map([['properties/old',row('a')],['properties/old/history/child',row('b')],['properties/same',row('s')]])
 const after=new Map([['properties/new/history/child',row('c')],['properties/new',row('d')],['properties/same',row('s')]])
 assert.deepEqual(difference(after,before).map(x=>[x.kind,x.path]),[['delete','properties/old/history/child'],['delete','properties/old'],['set','properties/new'],['set','properties/new/history/child']])
})
test('operator refuses live targets, duplicate arguments and invalid generations before any SDK call',()=>{
 const base=['status','--project','demo-termite-warranty','--control','test-control','--revision','a'.repeat(40)]
 assert.equal(options([...base]).command,'status')
 assert.throws(()=>options([...base,'--project','termite-warranty-dev']))
 assert.throws(()=>options(base.map(v=>v==='demo-termite-warranty'?'termite-warranty-dev':v)))
 assert.throws(()=>options([...base,'--generation','0']))
 assert.throws(()=>options([...base,'--unexpected']))
})

test('invalid control is rejected before SDK target discovery',()=>{let calls=0;assert.throws(()=>defaultRecovery({database:()=>{calls++},controlId:'test-control-',revision:'a'.repeat(40)}));assert.equal(calls,0);assert.throws(()=>options(['status','--project','demo-termite-warranty','--control','test-control-','--revision','a'.repeat(40)]))})

test('address publication-only plan is refused by apply before operator acquisition or target writes',async()=>{
 let writes=0
 const plan={kind:'address-migration',publicationOnly:true,status:'verified',revision:'a'.repeat(40)}
 const database=()=>({projectId:'demo-termite-warranty',doc:path=>({get:async()=>({data:()=>path==='defaultRecoveryPlans/address-publication'?plan:undefined}),set:()=>{writes++}}),runTransaction:()=>{writes++;throw Error('unexpected mutation')}})
 const api=defaultRecovery({database,controlId:'test-control',revision:'a'.repeat(40)})
 await assert.rejects(api.apply('address-publication'));assert.equal(writes,0)
 await assert.rejects(api.apply('address-publication',{resume:true,workerStopped:true,expectedOwner:'owner-123'}));assert.equal(writes,0)
})
