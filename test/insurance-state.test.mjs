import assert from 'node:assert/strict'
import { test } from 'node:test'
import { materializeInsuranceState, insurancePeriodStates, insuranceProjection, insuranceProjectionMatches, validateInsuranceState, periodReportSelection, insuranceNoticeExpiry } from '../src/domain/insurance-state.mjs'
import { assertInsuranceCapacity, firestoreDocumentBytes, FIRESTORE_DOCUMENT_LIMIT } from '../src/domain/insurance-capacity.mjs'
import { warrantyNoticeCutoff } from '../src/domain/dashboard.mjs'
import { coveragePeriods, initialInsurance, alertStartDate, handoverChangeBlockers, extensionUndoPreview } from '../src/domain/property-warranty.mjs'
import { monthlyQueryProjection } from '../src/domain/monthly-query.mjs'

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
