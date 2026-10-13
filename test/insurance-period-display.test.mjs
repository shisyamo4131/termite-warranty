import {test} from 'node:test'
import assert from 'node:assert/strict'
import {matchesSelectedInsurancePeriod,currentInsuranceSummary,nextInsuranceReportLabel} from '../app/utils/insuranceReportDisplay.mjs'
const period={id:'initial:1:1',warrantyPeriodId:'initial',basisRevision:1,half:1,startDate:'2025-10-01',expiryDate:'2030-09-30',state:'waived'}
test('selected period marker rejects corrected or re-extended identity even if dates match',()=>{
 assert.equal(matchesSelectedInsurancePeriod(period,{...period,insurancePeriodId:period.id}),true)
 assert.equal(matchesSelectedInsurancePeriod(period,{...period,insurancePeriodId:'initial:2:1'}),false)
 assert.equal(matchesSelectedInsurancePeriod(period,{...period,warrantyPeriodId:'new-extension'}),false)
 assert.equal(matchesSelectedInsurancePeriod(period,null),false)
})
test('current insurance display distinguishes waived, reported, unknown and outside periods',()=>{
 const row={insuranceStateVersion:1,insurancePeriods:[period]}
 assert.match(currentInsuranceSummary(row,'2026-10-10'),/報告不要/)
 assert.equal(currentInsuranceSummary(row,'2031-10-10'),'現在の対象期間なし')
 assert.match(currentInsuranceSummary({...row,insurancePeriods:[{...period,state:null}]},'2026-10-10'),/要確認/)
 assert.match(currentInsuranceSummary({...row,insurancePeriods:[{...period,state:'reported'}]},'2026-10-10'),/報告済み/)
})
test('no next pending period wording never conflates waiver with actual reporting',()=>{
 assert.equal(nextInsuranceReportLabel({status:'active',insuranceStateVersion:1,insurancePeriods:[period],insuranceEvents:[]}),'登録済み期間に未報告なし（報告不要を含む）')
 assert.equal(nextInsuranceReportLabel({status:'active',insuranceStateVersion:1,insurancePeriods:[{...period,state:'reported'}],insuranceEvents:[]}),'登録済み期間に未報告なし')
})
