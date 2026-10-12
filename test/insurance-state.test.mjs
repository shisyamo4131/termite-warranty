import assert from 'node:assert/strict'
import { test } from 'node:test'
import { materializeInsuranceState, insurancePeriodStates, insuranceProjection, insuranceProjectionMatches, validateInsuranceState, periodReportSelection, insuranceNoticeExpiry, insuranceMonthlyRows, insuranceReportedQueryProjection } from '../src/domain/insurance-state.mjs'
import { assertInsuranceCapacity, firestoreDocumentBytes, FIRESTORE_DOCUMENT_LIMIT } from '../src/domain/insurance-capacity.mjs'
import { warrantyNoticeCutoff } from '../src/domain/dashboard.mjs'
import { coveragePeriods, initialInsurance, alertStartDate, handoverChangeBlockers, extensionUndoPreview } from '../src/domain/property-warranty.mjs'
import { monthlyQueryProjection } from '../src/domain/monthly-query.mjs'
import { migrateInsuranceReportQueries } from '../scripts/lib/insurance-report-query-migration.mjs'

function fixture(years=30) {
  const handoverDate='2020-10-01',periods=coveragePeriods(handoverDate,years)
  const history=[{kind:'register',requestId:'register'},...Array.from({length:years/10-1},(_,index)=>({kind:'extend',requestId:`ext${index+1}`,before:{years:(index+1)*10},date:'2026-10-10'}))]
  return materializeInsuranceState({status:'active',handoverDate,startDate:handoverDate,years,maxYears:30,expiryDate:periods.at(-1).expiryDate,periods,...initialInsurance(handoverDate),insuranceEvents:[],insuranceHistoryIncomplete:false,history,revision:1,billingItems:[]},{newRegistration:true})
}
function report(row,index,id=`report${index}`) {
  const period=row.insurancePeriods[index]
  return materializeInsuranceState({...row,insuranceReported:true,insuranceEvents:[...row.insuranceEvents,{kind:'report',requestId:id,warrantyPeriodId:period.warrantyPeriodId,startDate:period.startDate,expiryDate:period.expiryDate}]},{reconcile:true})
}
function waive(row,index,id=`waiver${index}`) {
  const period=row.insurancePeriods[index]
  return materializeInsuranceState({...row,insuranceWaiverEvents:[...row.insuranceWaiverEvents,{kind:'waive',id,periodId:period.id,warrantyPeriodId:period.warrantyPeriodId,basisRevision:period.basisRevision,half:period.half,startDate:period.startDate,expiryDate:period.expiryDate,reason:'架空の判断理由',actorUid:'staff',actorName:'架空担当',at:'2026-10-10T00:00:00.000Z'}]},{reconcile:true})
}
function undoWaive(row,index) {
  const period=row.insurancePeriods[index]
  return materializeInsuranceState({...row,insuranceWaiverEvents:[...row.insuranceWaiverEvents,{kind:'undoWaive',id:`undo-${period.waiverId}`,targetId:period.waiverId,periodId:period.id,actorUid:'staff',at:'2026-10-10T00:00:00.000Z'}]},{reconcile:true})
}

function recordedReport(row,index,reportKind,id=`known${index}`) {
  const period=row.insurancePeriods[index]
  return materializeInsuranceState({...row,insuranceReported:true,insuranceEvents:[...row.insuranceEvents,{kind:'report',reportKind,requestId:id,insurancePeriodId:period.id,warrantyPeriodId:period.warrantyPeriodId,startDate:period.startDate,expiryDate:period.expiryDate,month:'2099-12'}]},{reconcile:true})
}

test('insurance exact-month mode keeps original target month and saved late-first report period',()=>{
  const pending=fixture(10)
  assert.equal(insuranceMonthlyRows([pending],'2025-10').rows[0].reportTarget.startDate,'2025-10-01')
  assert.equal(insuranceMonthlyRows([pending],'2025-10').rows[0].reportBasisMonth,'2020-10')
  assert.equal(insuranceMonthlyRows([pending],'2025-10',{includeDone:true}).rows.length,0)
  const done=recordedReport(pending,1,'new')
  assert.deepEqual(insuranceReportedQueryProjection(done).insuranceReportedQueryMonths,['2020-10'])
  const rows=insuranceMonthlyRows([done],'2020-10',{includeDone:true}).rows
  assert.equal(rows.length,1);assert.equal(rows[0].reportState,'reported');assert.equal(rows[0].reportKind,'new')
  assert.equal(rows[0].reportTarget.startDate,'2025-10-01');assert.equal(rows[0].reportId,'known1')
  assert.equal(insuranceMonthlyRows([done],'2099-12',{includeDone:true}).rows.length,0)
  assert.deepEqual(insuranceReportedQueryProjection({...done,status:'cancelled'}).insuranceReportedQueryMonths,[])
  const undone=materializeInsuranceState({...done,insuranceEvents:[...done.insuranceEvents,{kind:'undoReport',requestId:'undo',targetRequestId:'known1'}]},{reconcile:true})
  assert.deepEqual(insuranceReportedQueryProjection(undone).insuranceReportedQueryMonths,[])
})

test('insurance renewal uses the day before start; waived and unconfirmed records never become done rows',()=>{
  let row=recordedReport(fixture(10),0,'new')
  const pending=insuranceMonthlyRows([row],'2025-09',{includeDone:true}).rows
  assert.equal(pending.length,1);assert.equal(pending[0].reportState,'pending');assert.equal(pending[0].reportBasisMonth,'2025-09')
  row=recordedReport(row,1,'renewal')
  assert.deepEqual(insuranceReportedQueryProjection(row).insuranceReportedQueryMonths,['2020-10','2025-09'])
  assert.equal(insuranceMonthlyRows([row],'2025-10',{includeDone:true}).rows.length,0)
  assert.equal(insuranceMonthlyRows([row],'2025-09',{includeDone:true}).rows[0].reportTarget.startDate,'2025-10-01')
  const bad={...row,insuranceEvents:row.insuranceEvents.map(event=>({...event,reportKind:'unknown'}))}
  assert.deepEqual(insuranceReportedQueryProjection(bad).insuranceReportedQueryMonths,[])
  assert.deepEqual(insuranceMonthlyRows([bad],'2025-09',{includeDone:true}),{rows:[],unclassifiedCount:1})
  const waived=waive(fixture(10),0)
  assert.equal(insuranceMonthlyRows([waived],'2020-10',{includeDone:true}).rows.length,0)
  const review={...fixture(10),insuranceHistoryIncomplete:true}
  assert.equal(insuranceMonthlyRows([review],'2020-10').rows[0].reportState,'review')
  assert.equal(insuranceMonthlyRows([review],'2020-10').unclassifiedCount,0)
  assert.deepEqual(insuranceMonthlyRows([review],'2020-10',{includeDone:true}),{rows:[],unclassifiedCount:1})
})

function migrationMemory(row, beforeTransaction=()=>{}) {
  const values=new Map([['propertyWarranties/fixture',structuredClone(row)],['_recovery/access',{phase:'normal',databaseId:'(default)',generation:1}]])
  let transactions=0
  const snapshot=path=>({id:path.split('/').at(-1),ref:db.doc(path),exists:values.has(path),data:()=>structuredClone(values.get(path))})
  const db={
    doc:path=>({path,get:async()=>snapshot(path)}),
    collection:collection=>{let after='';const query={orderBy:()=>query,limit:()=>query,startAfter:cursor=>{after=cursor.id;return query},get:async()=>{const docs=[...values.keys()].filter(path=>path.startsWith(collection+'/')&&path.split('/').at(-1)>after).sort().slice(0,100).map(snapshot);return {docs,size:docs.length}}};return query},
    runTransaction:async callback=>{beforeTransaction(++transactions,values);const writes=[];const result=await callback({get:async ref=>snapshot(ref.path),set:(ref,value)=>writes.push(()=>values.set(ref.path,structuredClone(value))),update:(ref,patch)=>writes.push(()=>values.set(ref.path,{...values.get(ref.path),...structuredClone(patch)}))});writes.forEach(write=>write());return result},
  }
  return {db,values}
}

test('reported projection excludes malformed period boundaries and missing or duplicate report identities',()=>{
  const row=recordedReport(fixture(10),0,'new')
  const legacy=structuredClone(row);delete legacy.insuranceEvents[0].insurancePeriodId
  assert.deepEqual(insuranceReportedQueryProjection(legacy).insuranceReportedQueryMonths,['2020-10'])
  for(const change of [
    value=>{value.insurancePeriods[0].startDate='2020-10-02';value.insuranceEvents[0].startDate='2020-10-02'},
    value=>{value.insurancePeriods[0].reportId='';value.insuranceEvents[0].requestId=''},
    value=>{value.insuranceEvents.push({...value.insuranceEvents[0],startDate:'2025-10-01'})},
    value=>{value.insurancePeriods.push({...value.insurancePeriods[0]})},
    value=>{value.insuranceEvents[0].insurancePeriodId=value.insurancePeriods[1].id},
    value=>{value.insuranceEvents.push({...value.insuranceEvents[0],requestId:'other-report'})},
    value=>{value.insuranceWaiverEvents.push({kind:'waive',id:'conflict',periodId:value.insurancePeriods[0].id})},
  ]){
    const invalid=structuredClone(row);change(invalid)
    assert.deepEqual(insuranceReportedQueryProjection(invalid).insuranceReportedQueryMonths,[])
  }
})

test('reported-query migration repairs only added fields, re-reads current records and is idempotent',async()=>{
  const original={...fixture(10),revision:7,updatedAt:'unchanged',billingPendingMonth:'unrelated-corrupt-projection'}
  const {db,values}=migrationMemory(original,(number,data)=>{
    if(number===2)data.set('propertyWarranties/fixture',{...recordedReport(original,0,'new'),revision:8})
  })
  assert.deepEqual(await migrateInsuranceReportQueries(db),{scanned:1,changed:1,applied:false})
  assert.equal(values.has('prototypeSettings/insuranceReportQueries'),false)
  assert.deepEqual(await migrateInsuranceReportQueries(db,{apply:true,generation:1}),{scanned:1,changed:1,applied:true})
  const saved=values.get('propertyWarranties/fixture')
  assert.equal(saved.revision,8);assert.equal(saved.updatedAt,'unchanged');assert.equal(saved.billingPendingMonth,'unrelated-corrupt-projection')
  assert.deepEqual(saved.insuranceReportedQueryMonths,['2020-10']);assert.equal(saved.insuranceReportedQueryVersion,1)
  assert.equal(values.get('prototypeSettings/insuranceReportQueries').version,1)
  assert.equal((await migrateInsuranceReportQueries(db,{apply:true,generation:1})).changed,0)
})

test('reported-query migration cannot publish after phase or generation changes including final publication',async()=>{
  for(const stage of [1,2,3])for(const change of [{phase:'verification'},{generation:2}]){
    const {db,values}=migrationMemory(fixture(10),(number,data)=>{if(number===stage)data.set('_recovery/access',{...data.get('_recovery/access'),...change})})
    await assert.rejects(migrateInsuranceReportQueries(db,{apply:true,generation:1}),/Recovery state changed/)
    assert.notEqual(values.get('prototypeSettings/insuranceReportQueries')?.version,1)
    if(stage<3)assert.equal(values.get('propertyWarranties/fixture').insuranceReportedQueryVersion,undefined)
  }
})
test('new periods have identity, saved migration has no day-dependent guessed past states',()=>{
  const row=fixture(10)
  assert.deepEqual(row.insurancePeriods.map(p=>[p.id,p.state]),[['initial:1:1','pending'],['initial:1:2','pending']])
  const legacy={...row,insuranceStartDate:'2025-10-01',insuranceExpiryDate:'2030-09-30'}
  delete legacy.insuranceStateVersion;delete legacy.insurancePeriods;delete legacy.insuranceBasisRevision
  const migrated=materializeInsuranceState(legacy,{at:'2026-10-10T00:00:00.000Z',sourceFingerprint:'stored-evidence'})
  assert.deepEqual(migrated.insurancePeriods.map(p=>p.state),[null,'pending'])
  assert.deepEqual(validateInsuranceState(migrated,{today:'2026-10-10'}),[])
  assert.ok(validateInsuranceState(migrated,{today:'2024-10-10'}).length)
  assert.equal(migrated.revision,legacy.revision)
  assert.deepEqual(materializeInsuranceState(migrated,{at:'2090-01-01'}),migrated)
  const unsupported={...legacy,history:[],receivedRecordId:undefined}
  assert.ok(materializeInsuranceState(unsupported).insurancePeriods.every(p=>p.state===null))
})
test('drafts and unknown newer versions are distinct',()=>{
  const draft=materializeInsuranceState({status:'draft',years:0})
  assert.deepEqual(validateInsuranceState(draft,{today:'2026-10-10'}),[])
  assert.deepEqual(insurancePeriodStates(draft),[])
  assert.throws(()=>materializeInsuranceState({...fixture(),insuranceStateVersion:2}),/形式/)
  assert.throws(()=>materializeInsuranceState({...fixture(),insurancePeriods:[]}),/期間/)
})
test('all 729 state patterns form at most three exact pending ranges',()=>{
  const base=fixture()
  for(let pattern=0;pattern<729;pattern++) {
    let encoded=pattern
    const row={...base,insurancePeriods:base.insurancePeriods.map(p=>{const state=['pending','reported','waived'][encoded%3];encoded=Math.floor(encoded/3);return {...p,state}})}
    const projection=insuranceProjection(row)
    for(const period of row.insurancePeriods) {
      const included=[1,2,3].some(index=>projection[`insurancePendingStart${index}`]<=period.startDate&&projection[`insurancePendingEnd${index}`]>=period.expiryDate)
      assert.equal(included,period.state==='pending',String(pattern))
    }
    assert.equal(Object.keys(projection).filter(key=>key.startsWith('insurancePending')).length,6)
  }
})
test('waived first half leaves future initial target available, with month-end initial rules',()=>{
  const row=waive(fixture(10),0)
  assert.equal(periodReportSelection(row,'2020-10').kind,'')
  assert.equal(periodReportSelection(row,'2025-09').kind,'')
  assert.equal(periodReportSelection(row,'2025-10').target.startDate,'2025-10-01')
  assert.equal(periodReportSelection(row,'2025-10').kind,'past-new')
  assert.equal(monthlyQueryProjection(row).insuranceQueryStart,'2025-10')
  assert.equal(insuranceNoticeExpiry(row),'')
})
test('reported then waived gap delays next report and notice; waiver undo reinstates earlier pending',()=>{
  let row=waive(report(fixture(),0),1)
  assert.equal(periodReportSelection(row,'2025-09').kind,'')
  assert.equal(periodReportSelection(row,'2030-09').target.startDate,'2030-10-01')
  assert.equal(insuranceNoticeExpiry(row),'2030-09-30')
  row=report(row,2)
  row=undoWaive(row,1)
  assert.equal(periodReportSelection(row,'2026-10').target.startDate,'2025-10-01')
  assert.equal(row.insurancePeriods[2].state,'reported')
  assert.deepEqual(validateInsuranceState(row),[])
})
test('report cancellation preserves other period waiver and operation-order evidence',()=>{
  let row=waive(report(fixture(),0),1)
  row=materializeInsuranceState({...row,insuranceEvents:[...row.insuranceEvents,{kind:'undoReport',requestId:'undo-report',targetRequestId:'report0'}],insuranceReported:false},{reconcile:true})
  assert.equal(row.insurancePeriods[0].state,'pending')
  assert.equal(row.insurancePeriods[1].state,'waived')
  assert.equal(row.insuranceWaiverEvents.length,1)
  assert.ok(handoverChangeBlockers(row).some(reason=>reason.includes('報告不要')))
})
test('extension cancel only blocks disappearing waivers; re-extension does not inherit old decision',()=>{
  let row=fixture(20)
  row.billingItems=[{id:'ext1',state:'pending'}]
  const kept=waive(row,0)
  assert.ok(!extensionUndoPreview(kept).blockers.some(reason=>reason.includes('報告不要')))
  let removed=waive(row,2)
  assert.ok(extensionUndoPreview(removed).blockers.some(reason=>reason.includes('報告不要')))
  removed=undoWaive(removed,2)
  const next={...removed,history:[...removed.history,{kind:'undoExtend',targetRequestId:'ext1'},{kind:'extend',requestId:'ext2',before:{years:10}}]}
  const result=materializeInsuranceState(next,{reconcile:true})
  assert.equal(result.insurancePeriods[2].id,'ext2:1:1')
  assert.equal(result.insurancePeriods[2].state,'pending')
  let outOfOrder=report(report(row,2),1)
  outOfOrder.insuranceExpiryDate=outOfOrder.insurancePeriods[1].expiryDate
  assert.ok(extensionUndoPreview(outOfOrder).blockers.some(reason=>reason.includes('保険報告')))
})
test('unknown current state fails readiness, unrelated past unknown stays distinguishable',()=>{
  const row=fixture(10)
  row.insurancePeriods[0]={...row.insurancePeriods[0],state:null,unknownReason:'既存記録不足'}
  assert.equal(validateInsuranceState(row,{today:'2026-10-10'}).length,0)
  assert.equal(validateInsuranceState(row,{today:'2024-10-10'}).length,1)
  const projected={...row,...insuranceProjection(row)}
  assert.ok(insuranceProjectionMatches(projected))
  assert.ok(!insuranceProjectionMatches({...projected,insurancePendingEnd3:undefined}))
})
test('warranty cutoff is exact inverse around every date of leap and nonleap years',()=>{
  for(let year=2026;year<=2028;year++)for(let month=1;month<=12;month++)for(let day=1;day<=31;day++) {
    const date=new Date(Date.UTC(year,month-1,day));if(date.getUTCMonth()!==month-1)continue
    const today=date.toISOString().slice(0,10)
    for(let months=1;months<=12;months++) {
      const cutoff=warrantyNoticeCutoff(today,months)
      const after=new Date(`${cutoff}T00:00:00Z`);after.setUTCDate(after.getUTCDate()+1)
      assert.ok(alertStartDate(cutoff,months)<=today)
      assert.ok(alertStartDate(after.toISOString().slice(0,10),months)>today)
    }
  }
})
test('capacity uses UTF8 and field/map overhead, reserves entire cancellation combinations',()=>{
  assert.equal(firestoreDocumentBytes({a:'日'},'c/d'),16+2+2+32+2+4)
  let row=fixture()
  for(const index of [1,3,5])row=waive(row,index)
  row={...row,...insuranceProjection(row),...monthlyQueryProjection(row)}
  const options={documentPath:'propertyWarranties/example',today:'2026-10-10'}
  const size=assertInsuranceCapacity(row,options)
  assert.ok(size.maximumBytes>size.bytes)
  for(let mask=0;mask<8;mask++) {
    let candidate=row
    ;[1,3,5].forEach((index,bit)=>{if(mask&(1<<bit))candidate=undoWaive(candidate,index)})
    candidate={...candidate,...insuranceProjection(candidate),...monthlyQueryProjection(candidate)}
    assert.ok(firestoreDocumentBytes(candidate,options.documentPath)<=size.maximumBytes)
  }
  const padding=FIRESTORE_DOCUMENT_LIMIT-size.bytes-10
  assert.throws(()=>assertInsuranceCapacity({...row,padding:'x'.repeat(padding)},options),/容量/)
  assert.equal(row.insuranceWaiverEvents.length,3)
})
