import {insuranceNoticeProjection,insuranceNoticeProjectionMatches} from '../../src/domain/insurance-notice-query.mjs'
import assert from 'node:assert/strict'
import {after,test} from 'node:test'
import {randomUUID} from 'node:crypto'
import {initializeApp,deleteApp} from 'firebase-admin/app'
import {getFirestore,Timestamp,FieldValue} from 'firebase-admin/firestore'
import {propertyPrototypeOperation} from '../../functions/property-warranty.js'
import {coveragePeriods,initialInsurance,insuranceReportTarget,latestInsuranceReport,expiryAlertEligible} from '../../src/domain/property-warranty.mjs'
import {materializeInsuranceState,insuranceProjection,validateInsuranceState} from '../../src/domain/insurance-state.mjs'
import {monthlyQueryProjection,withInsuranceDefaults} from '../../src/domain/monthly-query.mjs'
import {LOCAL_RUNTIME,localRuntimeHost} from '../helpers/emulator-runtime.mjs'

if(process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort))throw Error('Dedicated fictional emulator required')
const app=initializeApp({projectId:'demo-termite-warranty-test'},'dashboard-insurance-test')
const auth={} // These business operations do not perform Auth administration.
const today='2026-10-10', now='2026-10-10T03:00:00.000Z'
let sequence=0
after(()=>deleteApp(app))

async function fixture(t) {
  t.mock.timers.enable({apis:['Date'],now:new Date(now)})
  const db=getFirestore(app,`test-dashboard-insurance-${++sequence}`)
  for(const collection of await db.listCollections())await db.recursiveDelete(collection)
  const batch=db.batch()
  batch.set(db.doc('staffAccounts/hs'),{enabled:true,role:'house_solution_administrator',displayName:'架空担当者'})
  batch.set(db.doc('staffAccounts/general'),{enabled:true,role:'general_staff'})
  batch.set(db.doc('staffAccounts/disabled'),{enabled:false,role:'house_solution_administrator'})
  batch.set(db.doc('constructionCompanyAccounts/company'),{enabled:true,role:'construction_company',scope:'company',constructionCompanyId:'fictional-company'})
  batch.set(db.doc('prototypeSettings/insuranceStates'),{version:1,generation:1,operationId:'fictional-ready'})
  batch.set(db.doc('prototypeSettings/dashboard'),{version:1,generation:1,operationId:'fictional-ready'})
  batch.set(db.doc('prototypeSettings/monthlyQueries'),{version:1})
  batch.set(db.doc('prototypeSettings/alerts'),{warrantyMonths:2,insuranceMonths:2})
  batch.set(db.doc('_recovery/access'),{protocol:2,phase:'normal',generation:1,databaseId:'(default)',controlDatabaseId:'test-fixed-control'})
  await batch.commit()
  const invoke=(action,input={},uid='hs')=>propertyPrototypeOperation(auth,db,{operationProtocol:2,runtimeGeneration:1,action,...input},uid)
  const get=async id=>(await db.doc('propertyWarranties/'+id).get()).data()
  const mutate=async(action,id,extra={},uid='hs')=>{const result=await invoke(action,{id,revision:(await get(id)).revision,requestId:randomUUID(),...extra},uid);assert.equal(insuranceNoticeProjectionMatches(await get(id)),true);return result}
  return {db,invoke,get,mutate}
}

function property(start,patch={}) {
  const periods=coveragePeriods(start,10)
  const row={name:'架空個人情報を含む物件',address:'架空住所',constructionCompanyId:'fictional-company',branchId:'fictional-branch',groupId:'fictional-group',warrantyNumber:'FICTIONAL-001',applicationDate:start,handoverDate:start,startDate:start,expiryDate:periods[0].expiryDate,years:10,maxYears:20,status:'active',periods,revision:1,createdAt:Timestamp.fromDate(new Date(now)),updatedAt:Timestamp.fromDate(new Date(now)),warrantyNotified:false,history:[{kind:'register',requestId:'fictional-register',date:start}],insuranceEvents:[],insuranceHistoryIncomplete:false,billingItems:[{id:'initial',...periods[0],state:'pending'}],...initialInsurance(start),...patch}
  return materializeInsuranceState(row,{at:now,newRegistration:true})
}
function reported(row,index) {
  const period=row.insurancePeriods[index]
  const event={kind:'report',requestId:`fictional-report-${index}`,reportKind:index?'renewal':'new',month:period.startDate.slice(0,7),warrantyPeriodId:period.warrantyPeriodId,startDate:period.startDate,expiryDate:period.expiryDate,before:{insuranceReported:row.insuranceReported,insuranceStartDate:row.insuranceStartDate,insuranceExpiryDate:row.insuranceExpiryDate,insuranceRenewalMonth:row.insuranceRenewalMonth},at:now,actorUid:'hs'}
  return materializeInsuranceState({...row,insuranceEvents:[...row.insuranceEvents,event],insuranceReported:true,insuranceStartDate:period.startDate,insuranceExpiryDate:period.expiryDate,insuranceRenewalMonth:period.expiryDate.slice(0,7).replace('-',''),insuranceLastReport:{...event,kind:event.reportKind}},{reconcile:true})
}
function waived(row,index) {
  const period=row.insurancePeriods[index]
  return materializeInsuranceState({...row,insuranceWaiverEvents:[...row.insuranceWaiverEvents,{id:`fictional-waiver-${index}`,kind:'waive',periodId:period.id,startDate:period.startDate,expiryDate:period.expiryDate,reason:'架空の報告不要理由',actorUid:'hs',at:now}]},{reconcile:true})
}
async function put(db,id,row) {
  await db.doc('propertyWarranties/'+id).set({...row,...monthlyQueryProjection(row),...insuranceProjection(row),...insuranceNoticeProjection(row)})
}
function aggregateProbe(db) {
  const queries=[]
  let documentReads=0,writes=0
  const wrap=query=>new Proxy(query,{get(target,key){
    if(key==='get')return(...args)=>{documentReads++;return target.get(...args)}
    if(key==='count')return()=>{queries.push(target);return target.count()}
    if(['where','orderBy','limit','select'].includes(key))return(...args)=>wrap(target[key](...args))
    if(['add','set','update','delete'].includes(key))return()=>{writes++;throw Error('Dashboard must not write properties')}
    const value=target[key];return typeof value==='function'?value.bind(target):value
  }})
  return {queries,get documentReads(){return documentReads},get writes(){return writes},db:new Proxy(db,{get(target,key){
    if(key==='collection')return name=>name==='propertyWarranties'?wrap(target.collection(name)):target.collection(name)
    const value=target[key];return typeof value==='function'?value.bind(target):value
  }})}
}

function propertyReadProbe(db, afterRead = async () => {}) {
  const reads = []
  const wrap = query => new Proxy(query, {get(target, key) {
    if (key === 'get') return async (...args) => {
      const result = await target.get(...args)
      reads.push(result.size)
      await afterRead(reads.length)
      return result
    }
    if (['where','orderBy','limit'].includes(key)) return (...args) => wrap(target[key](...args))
    const value = target[key]; return typeof value === 'function' ? value.bind(target) : value
  }})
  return {reads, db: new Proxy(db, {get(target, key) {
    if (key === 'collection') return name => name === 'propertyWarranties' ? wrap(target.collection(name)) : target.collection(name)
    const value = target[key]; return typeof value === 'function' ? value.bind(target) : value
  }})}
}

test('pending warranty list reads only candidates and preserves all pages, timestamp precision, IDs and legacy exclusions', async t => {
  const {db, invoke} = await fixture(t)
  for (let index = 0; index < 25; index++) await put(db, `eligible-${index}`, property('2016-10-01', {updatedAt:new Timestamp(100, index % 3)}))
  for (const [id, patch] of [
    ['future', {expiryDate:'2046-01-01'}], ['done', {warrantyNotified:true}],
    ['cancelled', {status:'cancelled'}], ['final', {maxYears:10}],
    ['stale-positive', {status:'cancelled',warrantyNoticePending:true}],
  ]) await put(db, id, property('2016-10-01', patch))
  // A stale positive must still pass the original business predicate.
  await db.doc('propertyWarranties/stale-positive').update({warrantyNoticePending:true})
  const missing = property('2016-10-01'); delete missing.updatedAt
  await put(db, 'missing-updated', missing)
  await put(db, 'null-updated', property('2016-10-01', {updatedAt:null}))
  const input = {action:'list',filter:{alertKind:'warranty',notification:'pending'},omitReferenceLabels:true}
  const probe = propertyReadProbe(db)
  const optimized = await propertyPrototypeOperation(auth, probe.db, input, 'hs')
  assert.deepEqual(probe.reads, [28])
  assert.equal(optimized.rows.length, 26)
  assert.equal(optimized.limited, false)
  assert.equal(optimized.rows.at(-1).id, 'null-updated')
  const marker = (await db.doc('prototypeSettings/dashboard').get()).data()
  await db.doc('prototypeSettings/dashboard').delete()
  const baselineProbe = propertyReadProbe(db)
  await assert.rejects(propertyPrototypeOperation(auth, baselineProbe.db, input, 'hs'),{code:'failed-precondition'})
  assert.deepEqual(baselineProbe.reads, [])
  await assert.rejects(propertyPrototypeOperation(auth, baselineProbe.db, {...input,filter:{...input.filter,status:'active'}}, 'hs'),{code:'invalid-argument'})
  assert.deepEqual(baselineProbe.reads, [])
  // Test-only reference scan preserves the old full-response comparison without a product fallback.
  const reference = (await db.collection('propertyWarranties').orderBy('updatedAt','desc').orderBy('__name__','desc').get()).docs.map(d=>withInsuranceDefaults({...d.data(),id:d.id})).filter(r=>expiryAlertEligible(r,'warranty',today,2)&&r.warrantyNotified===false)
  assert.deepEqual(optimized.rows, reference)
  await db.doc('prototypeSettings/dashboard').set(marker)
  for (const filter of [
    {alertKind:'warranty',notification:'all'}, {alertKind:'warranty',notification:'done'},
    {alertKind:'warranty',notification:'pending',groupId:'fictional-group'},
  ]) {
    const other = propertyReadProbe(db)
    await assert.rejects(propertyPrototypeOperation(auth, other.db, {...input, filter}, 'hs'),{code:'invalid-argument'})
    assert.deepEqual(other.reads, [])
  }
  const company = propertyReadProbe(db)
  const scoped = await propertyPrototypeOperation(auth, company.db, input, 'company')
  assert.deepEqual(company.reads, [28])
  assert.equal(scoped.rows.length, 26)
  assert.deepEqual((await invoke('list',{filter:input.filter,omitReferenceLabels:true},'general')).rows, optimized.rows)
})

test('warranty candidate read keeps initial settings and never falls back on migration changes', async t => {
  const {db} = await fixture(t)
  await put(db, 'near', property('2016-10-01'))
  await put(db, 'later', property('2017-01-01'))
  const input = {action:'list',filter:{alertKind:'warranty',notification:'pending'},omitReferenceLabels:true}
  const changing = propertyReadProbe(db, async count => {
    if (count === 1) await db.doc('prototypeSettings/alerts').update({warrantyMonths:12})
  })
  const result = await propertyPrototypeOperation(auth, changing.db, input, 'hs')
  assert.deepEqual(changing.reads, [1])
  assert.deepEqual(result.rows.map(row => row.id), ['near'])
  await db.doc('prototypeSettings/dashboard').update({operationId:'different'})
  const unready = propertyReadProbe(db)
  await assert.rejects(propertyPrototypeOperation(auth, unready.db, input, 'hs'),{code:'failed-precondition'})
  assert.deepEqual(unready.reads, [])
  await db.doc('prototypeSettings/dashboard').update({operationId:'fictional-ready'})
  const revoked = propertyReadProbe(db, async count => {
    if (count === 1) await db.doc('prototypeSettings/dashboard').delete()
  })
  await assert.rejects(propertyPrototypeOperation(auth, revoked.db, input, 'hs'),{code:'failed-precondition'})
  assert.deepEqual(revoked.reads, [2])
})

test('notice queries omit missing search fields without rescue, writes or unrelated property reads',async t=>{
  const {db}=await fixture(t)
  await db.doc('prototypeSettings/insuranceNoticeQueries').set({version:1,generation:1,operationId:'notice-ready'})
  await put(db,'warranty-valid',property('2016-10-01'))
  await put(db,'warranty-missing',property('2016-10-01'))
  await db.doc('propertyWarranties/warranty-missing').update({warrantyNoticePending:FieldValue.delete()})
  await put(db,'insurance-valid',reported(property('2021-10-01'),0))
  await put(db,'insurance-missing',reported(property('2021-10-01'),0))
  await db.doc('propertyWarranties/insurance-missing').update({insuranceNoticeQueryExpiry:FieldValue.delete()})
  const missingIds=['warranty-missing','insurance-missing']
  const before=await Promise.all(missingIds.map(async id=>(await db.doc('propertyWarranties/'+id).get()).data()))
  for(const count of [0,30]){
    for(let i=0;i<count;i++)await put(db,'unrelated-'+i,property('2046-10-01'))
    for(const [filter,expected] of [[{alertKind:'warranty',notification:'pending'},'warranty-valid'],[{alertKind:'insurance'},'insurance-valid']]){
      const probe=propertyReadProbe(db)
      const result=await propertyPrototypeOperation(auth,probe.db,{action:'list',filter,omitReferenceLabels:true},'hs')
      assert.deepEqual(result.rows.map(row=>row.id),[expected])
      assert.deepEqual(probe.reads,[1])
    }
  }
  assert.deepEqual(await Promise.all(missingIds.map(async id=>(await db.doc('propertyWarranties/'+id).get()).data())),before)
})

test('dashboard approved six-property example returns four counts and exact target sets without property reads or writes',async t=>{
  const {db}=await fixture(t)
  await put(db,'F01',property('2026-10-10'))
  await put(db,'F02',reported(property('2016-10-11',{billingItems:[{id:'initial',...coveragePeriods('2016-10-11',10)[0],state:'billed'}]}),1))
  await put(db,'F03',property('2016-10-10'))
  await put(db,'F04',property('2026-11-01'))
  await put(db,'F05',waived(property('2021-10-01'),1))
  await put(db,'F06',property('2026-10-10',{status:'cancelled'}))
  const probe=aggregateProbe(db)
  const response=await propertyPrototypeOperation(auth,probe.db,{action:'dashboard',runtimeGeneration:1},'hs')
  assert.deepEqual(response.counts,{active:3,insurancePending:1,warrantyNoticePending:2,billingPending:3})
  assert.equal(response.basisDate,today)
  assert.equal(response.basisMonth,'2026-10')
  assert.equal(response.version,1)
  assert.equal(response.runtimeGeneration,1)
  assert.equal(response.warrantyMonths,2)
  assert.ok(Number.isFinite(Date.parse(response.startedAt)))
  assert.ok(Number.isFinite(Date.parse(response.completedAt)))
  assert.equal(probe.queries.length,4)
  assert.equal(probe.documentReads,0)
  assert.equal(probe.writes,0)
  assert.deepEqual(Object.keys(response).sort(),['version','counts','basisDate','basisMonth','startedAt','completedAt','warrantyMonths','runtimeGeneration'].sort())
  assert.doesNotMatch(JSON.stringify(response),/F01|FICTIONAL|架空|propertyWarranties/)
  // Target queries are inspected only after the measured dashboard operation has finished.
  const sets=await Promise.all(probe.queries.map(async query=>(await query.get()).docs.map(doc=>doc.id).sort().join(',')))
  assert.deepEqual(sets.sort(),['F01,F02,F05','F01','F02,F03','F01,F03,F05'].sort())
})

test('dashboard permits all enabled HS roles and rejects company, disabled and unpublished access',async t=>{
  const {db,invoke}=await fixture(t)
  assert.deepEqual((await invoke('dashboard',{},'general')).counts,{active:0,insurancePending:0,warrantyNoticePending:0,billingPending:0})
  for(const uid of ['company','disabled'])await assert.rejects(invoke('dashboard',{},uid),e=>e.code==='permission-denied')
  await db.doc('prototypeSettings/dashboard').delete()
  await assert.rejects(invoke('dashboard'),e=>e.code==='failed-precondition')
})

test('waiver changes only the chosen period, requires reason, preserves history and repeats safely',async t=>{
  const {db,invoke,get,mutate}=await fixture(t)
  await put(db,'future',property('2026-10-01'))
  const before=await get('future'), future=before.insurancePeriods[1]
  await assert.rejects(mutate('waiveInsurance','future',{insurancePeriodId:future.id,reason:' '}),e=>e.code==='invalid-argument')
  await assert.rejects(mutate('waiveInsurance','future',{insurancePeriodId:future.id,reason:'不要'},'company'),e=>e.code==='permission-denied')
  await assert.rejects(mutate('waiveInsurance','future',{insurancePeriodId:'outside-registered-warranty',reason:'不要'}),e=>e.code==='failed-precondition')
  assert.deepEqual(await get('future'),before)
  const request={id:'future',revision:1,requestId:randomUUID(),insurancePeriodId:future.id,reason:'  将来の期間は報告不要  '}
  await invoke('waiveInsurance',request)
  const saved=await get('future')
  assert.deepEqual(saved.insurancePeriods.map(p=>p.state),['pending','waived'])
  assert.deepEqual(saved.history,before.history)
  assert.deepEqual(saved.insuranceEvents,before.insuranceEvents)
  assert.equal(saved.insuranceWaiverEvents[0].reason,'将来の期間は報告不要')
  assert.equal(saved.insuranceWaiverEvents[0].actorUid,'hs')
  assert.equal(saved.revision,2)
  assert.deepEqual(validateInsuranceState(saved),[])
  assert.equal((await invoke('dashboard')).counts.insurancePending,1)
  await assert.rejects(invoke('waiveInsurance',{...request,operationProtocol:undefined}),{code:'failed-precondition'})
  await assert.rejects(invoke('waiveInsurance',{...request,operationProtocol:1}),{code:'failed-precondition'})
  assert.deepEqual(await get('future'),saved)
  await invoke('waiveInsurance',{...request,operationProtocol:2})
  assert.deepEqual(await get('future'),saved)
  await mutate('undoInsuranceWaiver','future',{insurancePeriodId:future.id})
  const undone=await get('future')
  assert.deepEqual(undone.insurancePeriods.map(p=>p.state),['pending','pending'])
  assert.equal(undone.insuranceWaiverEvents.length,2)
  assert.deepEqual(undone.insuranceWaiverEvents[0],saved.insuranceWaiverEvents[0])
})

test('current waiver removes monthly reporting and count, stale target cannot report, undo restores it',async t=>{
  const {db,invoke,get,mutate}=await fixture(t)
  await put(db,'current',property('2026-10-01'))
  const initial=await get('current'), period=initial.insurancePeriods[0],target=insuranceReportTarget(initial,'2026-10')
  const list=()=>invoke('list',{filter:{reportMonth:'2026-10'},omitReferenceLabels:true})
  assert.deepEqual((await list()).rows.map(r=>r.id),['current'])
  await mutate('waiveInsurance','current',{insurancePeriodId:period.id,reason:'HS判断'})
  assert.deepEqual((await list()).rows,[])
  assert.equal((await invoke('dashboard')).counts.insurancePending,0)
  await assert.rejects(mutate('report','current',{month:'2026-10',reportTarget:target}),e=>e.code==='failed-precondition')
  await mutate('undoInsuranceWaiver','current',{insurancePeriodId:period.id})
  assert.deepEqual((await list()).rows.map(r=>r.id),['current'])
  assert.equal((await invoke('dashboard')).counts.insurancePending,1)
})

test('report must be undone before waiver; report cancellation retains another period waiver',async t=>{
  const {db,get,mutate}=await fixture(t)
  await put(db,'reported',property('2026-10-01'))
  const initial=await get('reported')
  await mutate('waiveInsurance','reported',{insurancePeriodId:initial.insurancePeriods[1].id,reason:'将来の不要'})
  await mutate('report','reported',{month:'2026-10',reportTarget:insuranceReportTarget(await get('reported'),'2026-10')})
  await assert.rejects(mutate('waiveInsurance','reported',{insurancePeriodId:initial.insurancePeriods[0].id,reason:'不要'}),e=>e.code==='failed-precondition')
  const saved=await get('reported'),report=latestInsuranceReport(saved)
  await mutate('undoReport','reported',{targetReportId:report.requestId})
  await mutate('waiveInsurance','reported',{insurancePeriodId:initial.insurancePeriods[0].id,reason:'報告取消後の不要'})
  const final=await get('reported')
  assert.deepEqual(final.insurancePeriods.map(p=>p.state),['waived','waived'])
  assert.equal(final.insuranceEvents.length,2)
  assert.deepEqual(final.insuranceEvents[0],saved.insuranceEvents[0])
  assert.equal(final.insuranceEvents[1].targetRequestId,report.requestId)
  assert.deepEqual(final.insuranceWaiverEvents[0],saved.insuranceWaiverEvents[0])
})

test('period-end date and next Japanese day allow waiver and cancellation without losing history',async t=>{
  const {db,get,mutate}=await fixture(t)
  await put(db,'last-day',property('2021-10-11'))
  await put(db,'locked',property('2021-10-11'))
  const period=(await get('last-day')).insurancePeriods[0]
  assert.equal(period.expiryDate,today)
  await mutate('waiveInsurance','last-day',{insurancePeriodId:period.id,reason:'満了当日'})
  await mutate('undoInsuranceWaiver','last-day',{insurancePeriodId:period.id})
  await mutate('waiveInsurance','locked',{insurancePeriodId:period.id,reason:'満了当日'})
  const preserved=await get('locked')
  t.mock.timers.setTime(new Date('2026-10-10T15:00:00.000Z').getTime())
  await mutate('undoInsuranceWaiver','locked',{insurancePeriodId:period.id})
  await mutate('waiveInsurance','last-day',{insurancePeriodId:period.id,reason:'翌日'})
  assert.equal((await get('locked')).insurancePeriods[0].state,'pending')
  assert.deepEqual((await get('locked')).insuranceWaiverEvents[0],preserved.insuranceWaiverEvents[0])
  assert.equal((await get('last-day')).insurancePeriods[0].state,'waived')
})

test('2018 historical first half can be waived or reported and disappears from its monthly pending list',async t=>{
  const {db,invoke,get,mutate}=await fixture(t)
  await put(db,'historical',property('2018-07-08'))
  const initial=await get('historical'),period=initial.insurancePeriods[0]
  const list=()=>invoke('list',{filter:{reportMonth:'2018-10'},omitReferenceLabels:true})
  assert.deepEqual((await list()).rows.map(row=>row.id),['historical'])
  await mutate('waiveInsurance','historical',{insurancePeriodId:period.id,reason:'過去の満了期間'})
  assert.deepEqual((await list()).rows,[])
  await mutate('undoInsuranceWaiver','historical',{insurancePeriodId:period.id})
  assert.deepEqual((await list()).rows.map(row=>row.id),['historical'])
  await mutate('report','historical',{month:'2018-10',reportTarget:insuranceReportTarget(await get('historical'),'2018-10')})
  assert.equal((await get('historical')).insurancePeriods[0].state,'reported')
  assert.deepEqual((await list()).rows,[])
  await assert.rejects(mutate('waiveInsurance','historical',{insurancePeriodId:period.id,reason:'直接上書き'}),e=>e.code==='failed-precondition')
  await mutate('undoReport','historical',{targetReportId:latestInsuranceReport(await get('historical')).requestId})
  assert.equal((await get('historical')).insurancePeriods[0].state,'pending')
  assert.deepEqual((await get('historical')).periods,initial.periods)
})

test('old operation format and stale revision cannot change confirmed state',async t=>{
  const {db,get,mutate}=await fixture(t)
  await put(db,'fenced',property('2026-10-01'))
  const old=await get('fenced'),period=old.insurancePeriods[0]
  await assert.rejects(mutate('waiveInsurance','fenced',{insurancePeriodId:period.id,reason:'不要',operationProtocol:undefined}),e=>e.code==='failed-precondition')
  await assert.rejects(mutate('waiveInsurance','fenced',{insurancePeriodId:period.id,reason:'不要',revision:0}),e=>e.code==='aborted')
  assert.deepEqual(await get('fenced'),old)
})

test('future pending period after a waived initial period remains a monthly target',async t=>{
  const {db,invoke,get,mutate}=await fixture(t)
  await put(db,'hole',property('2026-10-01'))
  await mutate('waiveInsurance','hole',{insurancePeriodId:(await get('hole')).insurancePeriods[0].id,reason:'初回期間のみ不要'})
  const current=await invoke('list',{filter:{reportMonth:'2026-10'},omitReferenceLabels:true})
  assert.deepEqual(current.rows,[])
  const future=await invoke('list',{filter:{reportMonth:'2031-10'},omitReferenceLabels:true})
  assert.deepEqual(future.rows.map(r=>r.id),['hole'])
  assert.equal(future.rows[0].reportTarget.startDate,'2031-10-01')
  await mutate('report','hole',{month:'2031-10',reportTarget:future.rows[0].reportTarget})
  assert.deepEqual((await get('hole')).insurancePeriods.map(p=>p.state),['waived','reported'])
})

test('undoing an earlier waiver restores its monthly target even after a future period has been reported',async t=>{
  const {db,invoke,get,mutate}=await fixture(t)
  await put(db,'earlier',property('2026-10-01'))
  const initial=(await get('earlier')).insurancePeriods[0]
  await mutate('waiveInsurance','earlier',{insurancePeriodId:initial.id,reason:'初回のみ不要'})
  await mutate('report','earlier',{month:'2031-10',reportTarget:insuranceReportTarget(await get('earlier'),'2031-10')})
  const recorded=await get('earlier')
  await mutate('undoInsuranceWaiver','earlier',{insurancePeriodId:initial.id})
  const list=await invoke('list',{filter:{reportMonth:'2026-10'},omitReferenceLabels:true})
  assert.deepEqual(list.rows.map(r=>r.id),['earlier'])
  assert.equal(list.rows[0].reportTarget.startDate,'2026-10-01')
  assert.deepEqual((await get('earlier')).insuranceEvents,recorded.insuranceEvents)
  assert.equal((await invoke('dashboard')).counts.insurancePending,1)
})

test('insurance notice skips a waived middle period and excludes initial unreported properties',async t=>{
  const {db,invoke}=await fixture(t)
  await db.doc('prototypeSettings/insuranceNoticeQueries').set({version:1,generation:1,operationId:'notice-ready'})
  let extended=property('2026-10-01',{years:20,periods:coveragePeriods('2026-10-01',20),expiryDate:'2046-09-30',maxYears:30,history:[{kind:'register',requestId:'fictional-register',date:'2026-10-01'},{kind:'extend',requestId:'fictional-extension',date:'2036-10-01',before:{years:10}}]})
  extended=waived(reported(extended,0),1)
  await put(db,'skip-middle',extended)
  await put(db,'initial-only',property('2026-10-01'))
  const list=()=>invoke('list',{filter:{alertKind:'insurance'},omitReferenceLabels:true})
  t.mock.timers.setTime(new Date('2031-08-01T03:00:00.000Z').getTime())
  assert.deepEqual((await list()).rows,[])
  t.mock.timers.setTime(new Date('2036-08-01T03:00:00.000Z').getTime())
  assert.deepEqual((await list()).rows.map(r=>r.id),['skip-middle'])
})

test('one aggregate failure rejects the complete dashboard response without automatic retry',async t=>{
  const {db}=await fixture(t)
  let attempts=0
  const wrap=query=>new Proxy(query,{get(target,key){
    if(key==='count')return()=>({get:async()=>{const attempt=++attempts;if(attempt===2)throw Error('Fictional aggregate failure');return target.count().get()}})
    if(['where','orderBy','limit'].includes(key))return(...args)=>wrap(target[key](...args))
    const value=target[key];return typeof value==='function'?value.bind(target):value
  }})
  const broken=new Proxy(db,{get(target,key){
    if(key==='collection')return name=>name==='propertyWarranties'?wrap(target.collection(name)):target.collection(name)
    const value=target[key];return typeof value==='function'?value.bind(target):value
  }})
  await assert.rejects(propertyPrototypeOperation(auth,broken,{action:'dashboard',runtimeGeneration:1},'hs'))
  assert.ok(attempts>=2&&attempts<=4,`Unexpected retry count: ${attempts}`)
})

test('matching published provenance survives recovery generation change while mismatched readiness is refused',async t=>{
  const {db,invoke}=await fixture(t)
  await db.doc('_recovery/access').update({generation:2})
  const value=await invoke('dashboard',{runtimeGeneration:2})
  assert.equal(value.runtimeGeneration,2)
  assert.equal(value.counts.active,0)
  await db.doc('prototypeSettings/insuranceStates').update({operationId:'another-publication'})
  await assert.rejects(invoke('dashboard',{runtimeGeneration:2}),e=>e.code==='failed-precondition')
})

test('unknown cancelled insurance cannot be restored and unpublished legacy unrelated updates preserve unknown',async t=>{
  const {db,get,mutate}=await fixture(t)
  const source=property('2026-10-01')
  for(const key of ['insuranceStateVersion','insuranceBasisRevision','insurancePeriods','insuranceWaiverEvents','insuranceEvents'])delete source[key]
  delete source.insuranceReported
  source.history=[]
  await db.doc('propertyWarranties/unknown-cancelled').set({...source,status:'cancelled'})
  const cancelled=await get('unknown-cancelled')
  await assert.rejects(mutate('restore','unknown-cancelled',{reason:'架空の復元'}),e=>e.code==='failed-precondition')
  assert.deepEqual(await get('unknown-cancelled'),cancelled)
  await db.doc('propertyWarranties/unknown-active').set(source)
  await db.doc('prototypeSettings/insuranceStates').set({version:0})
  await mutate('notify','unknown-active',{notified:true})
  const unpublished=await get('unknown-active')
  assert.equal(unpublished.warrantyNotified,true)
  assert.ok(unpublished.insurancePeriods.every(period=>period.state===null))
  await db.doc('prototypeSettings/insuranceStates').set({version:1,generation:1,operationId:'fictional-ready'})
  await assert.rejects(mutate('notify','unknown-active',{notified:false}),e=>e.code==='failed-precondition')
  assert.deepEqual(await get('unknown-active'),unpublished)
})


test('insurance notice query preserves full response and reduces property reads, with legacy and missing timestamp compatibility',async t=>{
  const {db,invoke}=await fixture(t)
  for(let i=0;i<24;i++)await put(db,`notice-${i}`,reported(property('2021-10-01',{updatedAt:new Timestamp(1000,i)}),0))
  await put(db,'first-unreported',property('2021-10-01'))
  await put(db,'future',reported(property('2026-10-01'),0))
  await put(db,'all-reported',reported(reported(property('2021-10-01'),0),1))
  await put(db,'waived',waived(reported(property('2021-10-01'),0),1))
  await put(db,'null',reported(property('2021-10-01',{updatedAt:null}),0))
  const missing=reported(property('2021-10-01'),0);delete missing.updatedAt;await put(db,'missing',missing)
  const legacy={status:'active',handoverDate:'2021-10-01',updatedAt:Timestamp.fromMillis(1000)}
  await db.doc('propertyWarranties/legacy').set({...legacy,...insuranceNoticeProjection(legacy)})
  const input={action:'list',filter:{alertKind:'insurance'},omitReferenceLabels:true}
  const unready=propertyReadProbe(db)
  await assert.rejects(propertyPrototypeOperation(auth,unready.db,input,'hs'),{code:'failed-precondition'})
  assert.deepEqual(unready.reads,[])
  const old=propertyReadProbe(db)
  await assert.rejects(propertyPrototypeOperation(auth,old.db,{...input,filter:{...input.filter,status:'active'}},'hs'),{code:'invalid-argument'})
  assert.deepEqual(old.reads,[])
  const baseline={rows:(await db.collection('propertyWarranties').orderBy('updatedAt','desc').orderBy('__name__','desc').get()).docs.map(d=>withInsuranceDefaults({...d.data(),id:d.id})).filter(r=>expiryAlertEligible(r,'insurance',today,2)),limited:false}
  await db.doc('prototypeSettings/insuranceNoticeQueries').set({version:1,generation:1,operationId:'notice-ready'})
  const measured=propertyReadProbe(db),result=await propertyPrototypeOperation(auth,measured.db,input,'hs')
  assert.deepEqual(measured.reads,[27]);assert.equal(result.rows.length,26);assert.deepEqual(result,baseline)
  assert.equal(result.rows.at(-1).id,'null')
  const extra=propertyReadProbe(db);await assert.rejects(propertyPrototypeOperation(auth,extra.db,{...input,filter:{alertKind:'insurance',status:'active'}},'hs'),{code:'invalid-argument'});assert.deepEqual(extra.reads,[])
  await assert.rejects(invoke('list',{filter:input.filter},'company'),e=>e.code==='permission-denied')
  assert.deepEqual((await invoke('list',{filter:input.filter,omitReferenceLabels:true},'general')),baseline)
  const changing=propertyReadProbe(db,async count=>{if(count===1)await db.doc('prototypeSettings/insuranceNoticeQueries').update({version:0})})
  await assert.rejects(propertyPrototypeOperation(auth,changing.db,input,'hs'),{code:'failed-precondition'});assert.deepEqual(changing.reads,[27])
})

test('insurance notice projection follows waiver, undo, cancellation and restoration in the business transaction',async t=>{
  const {db,get,mutate}=await fixture(t)
  await put(db,'lifecycle',reported(property('2021-10-01'),0))
  const period=(await get('lifecycle')).insurancePeriods[1]
  for(const [action,input,expiry] of [
    ['waiveInsurance',{insurancePeriodId:period.id,reason:'fictional'},''],
    ['undoInsuranceWaiver',{insurancePeriodId:period.id},'2026-09-30'],
    ['cancel',{reason:'fictional',confirmCancellation:true},''],
    ['restore',{reason:'fictional'},'2026-09-30'],
  ]) {await mutate(action,'lifecycle',input);const row=await get('lifecycle');assert.equal(insuranceNoticeProjectionMatches(row),true);assert.equal(row.insuranceNoticeQueryExpiry,expiry)}
})


test('insurance candidate query uses starting settings and Japanese date and propagates query failures',async t=>{
  const {db}=await fixture(t)
  await put(db,'near-insurance',reported(property('2021-10-01'),0))
  await put(db,'later-insurance',reported(property('2022-01-01'),0))
  await db.doc('prototypeSettings/insuranceNoticeQueries').set({version:1,generation:1,operationId:'notice-ready'})
  const input={action:'list',filter:{alertKind:'insurance'},omitReferenceLabels:true}
  const changed=propertyReadProbe(db,async count=>{if(count===1)await db.doc('prototypeSettings/alerts').update({insuranceMonths:12})})
  assert.equal((await propertyPrototypeOperation(auth,changed.db,input,'hs')).rows.length,1);assert.deepEqual(changed.reads,[1])
  const dateChanged=propertyReadProbe(db,async count=>{if(count===1)t.mock.timers.setTime(new Date('2026-10-10T15:00:00Z').getTime())})
  assert.equal((await propertyPrototypeOperation(auth,dateChanged.db,input,'hs')).rows.length,2);assert.deepEqual(dateChanged.reads,[2])
  const failed=propertyReadProbe(db,async()=>{throw Error('fictional query failure')})
  await assert.rejects(propertyPrototypeOperation(auth,failed.db,input,'hs'),/fictional query failure/)
})
