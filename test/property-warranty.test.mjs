import { nextInsuranceReportLabel } from '../app/utils/insuranceReportDisplay.mjs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { externalKeySettings, normalizeExternalKey } from '../src/domain/external-key.mjs'
import { monthlyQueryProjection, withInsuranceDefaults, monthlyProjectionMatches } from '../src/domain/monthly-query.mjs'
import { initialInsurance, insuranceReportKind, billingRows } from '../src/domain/property-warranty.mjs'

test('monthly query ranges equal existing insurance and billing rules across boundaries and legacy states',()=>{
  for(const handoverDate of ['2016-10-01','2016-10-06','2020-02-29','2026-12-31'])for(const years of [10,20,30]){
    const base={status:'active',handoverDate,applicationDate:'2016-09-30',years,expiryDate:coveragePeriods(handoverDate,years).at(-1).expiryDate,...initialInsurance(handoverDate)}
    for(const patch of [{},{status:'cancelled'},{status:'draft'},{insuranceReported:true},{insuranceHistoryIncomplete:true},{insuranceRenewalMonth:''},{expiryDate:'2026-11-15'},{insuranceEvents:[{kind:'report',requestId:'legacy'}]},{handoverDate:''}]){
      const row=withInsuranceDefaults({...base,...patch}),projection=monthlyQueryProjection(row)
      assert.equal(monthlyProjectionMatches({...row,...projection}),true)
      for(let year=2015;year<=2057;year++)for(let n=1;n<=12;n++){
        const month=`${year}-${String(n).padStart(2,'0')}`
        const expected=row.status==='active'&&!!(row.insuranceNeedsReview||insuranceReportKind(row,month))
        assert.equal(!!projection.insuranceQueryStart&&projection.insuranceQueryStart<=month&&projection.insuranceQueryEnd>=month,expected,JSON.stringify({handoverDate,years,patch,month}))
        assert.equal(projection.billingQueryMonths.includes(month),billingRows([row],month).length>0)
      }
    }
  }
})

test('external key settings preserve optional legacy groups and require labelled UH keys',()=>{
  assert.deepEqual(externalKeySettings({name:'HSC'}),{required:false,label:'外部キー'})
  assert.deepEqual(externalKeySettings({name:'UH'}),{required:true,label:'お施主様契約No'})
  assert.throws(()=>externalKeySettings({name:'UH',externalKeyRequired:false}))
  assert.throws(()=>externalKeySettings({externalKeyRequired:'false'}))
  assert.throws(()=>externalKeySettings({externalKeyRequired:true,externalKeyLabel:' '}))
  assert.throws(()=>externalKeySettings({externalKeyLabel:'x'.repeat(81)}))
  assert.throws(()=>externalKeySettings({externalKeyLabel:'a\nb'}))
  assert.equal(normalizeExternalKey(' 0001-2026001 '),'0001-2026001')
  assert.throws(()=>normalizeExternalKey(123))
  assert.throws(()=>normalizeExternalKey('x'.repeat(201)))
  assert.throws(()=>normalizeExternalKey('a\nb'))
})
import { coveragePeriods, fiscalYear, warrantyNumber, initialGroups, japanDate, reportRows, csvCell, normalizeProperty, propertyAddress, matchesProperty } from '../src/domain/property-warranty.mjs'

test('property name is the only current identity field and stale owner-name requests are refused',()=>{
  const input={name:'架空物件',address:'架空住所',buildingArea:100,applicationDate:'2026-10-01',handoverDate:'2026-10-01'}
  const result=normalizeProperty(input,true)
  assert.equal(result.name,input.name);assert.equal(Object.hasOwn(result,'ownerName'),false)
  assert.throws(()=>normalizeProperty({...input,ownerName:'架空物件'},true),/再読込/)
  assert.throws(()=>normalizeProperty({...input,name:''},true),/物件名/)
})

test('imported warranty periods are source-bound, date-exact and subordinate to real extensions', async () => {
  const { importedWarrantyPeriods, warrantyTransactions, extensionUndoPreview } = await import('../src/domain/property-warranty.mjs')
  const row = { handoverDate: '2015-01-01', years: 30, receivedRecordId: 'source-1', importedWarrantyPeriods: importedWarrantyPeriods('2015-01-01', 30, 'source-1'), history: [] }
  const periods = warrantyTransactions(row)
  assert.deepEqual(periods.map(period => period.id), ['initial', 'import-source-1-1', 'import-source-1-2'])
  assert.ok(periods.every(period => period.identifiable))
  assert.equal(extensionUndoPreview({ ...row, status: 'active' }), null)
  const corrupt = structuredClone(row)
  corrupt.importedWarrantyPeriods[1].expiryDate = '2034-12-30'
  assert.equal(warrantyTransactions(corrupt)[1].identifiable, false)
  assert.equal(warrantyTransactions({ ...row, receivedRecordId: 'other' })[1].identifiable, false)
  const duplicated = { ...row, importedWarrantyPeriods: [...row.importedWarrantyPeriods, row.importedWarrantyPeriods[1]] }
  assert.equal(warrantyTransactions(duplicated)[1].identifiable, false)
  const actual = { ...row, history: [{ kind: 'extend', requestId: 'actual', before: { years: 10 } }] }
  assert.equal(warrantyTransactions(actual)[1].id, 'actual')
  assert.throws(() => importedWarrantyPeriods('2015-01-01', 20, '../bad'))
})

test('first insurance period skips elapsed uninsured periods without inventing reports', async () => {
  const {initialInsurancePeriodAt}=await import('../src/domain/property-warranty.mjs')
  const row={status:'active',handoverDate:'2016-10-06',expiryDate:'2026-10-05',insuranceReported:false}
  const before=structuredClone(row)
  assert.equal(initialInsurancePeriodAt(row,'2021-10-05').insuranceStartDate,'2016-10-06')
  const second=initialInsurancePeriodAt(row,'2021-10-06')
  assert.equal(second.insuranceStartDate,'2021-10-06')
  assert.equal(second.insuranceExpiryDate,'2026-10-05')
  assert.equal(second.insuranceReported,false)
  assert.equal(second.insuranceEverRenewed,false)
  assert.equal(second.insuranceLastReport,null)
  assert.equal(initialInsurancePeriodAt(row,'2023-10-01').insuranceStartDate,'2021-10-06')
  assert.equal(initialInsurancePeriodAt(row,'2026-10-05').insuranceExpiryDate,'2026-10-05')
  assert.equal(initialInsurancePeriodAt(row,'2026-10-06'),null)
  assert.equal(initialInsurancePeriodAt({...row,expiryDate:'2036-10-05'},'2026-10-06').insuranceStartDate,'2026-10-06')
  assert.equal(initialInsurancePeriodAt({...row,status:'cancelled'},'2023-10-01'),null)
  assert.equal(initialInsurancePeriodAt({...row,insuranceReported:true},'2023-10-01'),null)
  assert.equal(initialInsurancePeriodAt(row,'2016-10-05'),null)
  assert.throws(()=>initialInsurancePeriodAt(row,'2026-02-30'))
  const leap={...row,handoverDate:'2016-02-29',expiryDate:'2026-02-28'}
  assert.equal(initialInsurancePeriodAt(leap,'2021-02-28').insuranceExpiryDate,'2021-02-28')
  assert.equal(initialInsurancePeriodAt(leap,'2021-03-01').insuranceStartDate,'2021-03-01')
  assert.equal(initialInsurancePeriodAt(leap,'2026-03-01'),null)
  assert.deepEqual(row,before)
})

test('extension billing uses coverage start month, independent of procedure month and billing state', async () => {
  const {billingRows}=await import('../src/domain/property-warranty.mjs')
  const row={status:'active',years:20,handoverDate:'2026-10-06',applicationDate:'2026-09-01',history:[{kind:'extend',requestId:'e',date:'2027-03-01',before:{years:10}}],billingItems:[{id:'e',state:'billed'}]}
  assert.equal(billingRows([row],'2027-03').length,0)
  assert.equal(billingRows([row],'2026-09')[0].billingKind,'新規')
  const result=billingRows([row],'2036-10')
  assert.equal(result.length,1)
  assert.equal(result[0].billingDate,'2036-10-06')
  assert.equal(result[0].billingState,'billed')
  assert.equal(billingRows([{...row,status:'cancelled'}],'2036-10').length,0)
})

test('initial report follows selected month and keeps final-month candidates for HS selection', async () => {
  const {initialInsurance,insuranceReportKind,insuranceReportTarget}=await import('../src/domain/property-warranty.mjs')
  const row={status:'active',years:10,handoverDate:'2016-10-06',expiryDate:'2026-10-05',...initialInsurance('2016-10-06'),insuranceEvents:[]}
  const target=insuranceReportTarget(row,'2021-10','2040-01-01')
  assert.equal(target.startDate,'2021-10-06');assert.equal(target.expiryDate,'2026-10-05')
  assert.deepEqual(insuranceReportTarget(row,'2021-10','2021-11-01'),target)
  assert.equal(insuranceReportTarget(row,'2021-09').startDate,'2016-10-06')
  assert.equal(insuranceReportTarget(row,'2026-10').expiryDate,'2026-10-05')
  assert.equal(insuranceReportTarget(row,'2026-11'),null)
  assert.equal(insuranceReportKind({...row,insuranceHistoryIncomplete:true},'2021-10'),'review')
  const monthEnd={...row,handoverDate:'2020-10-01',expiryDate:'2030-09-30',...initialInsurance('2020-10-01')}
  assert.equal(insuranceReportTarget(monthEnd,'2030-09','2030-10-01').expiryDate,'2030-09-30')
  assert.equal(insuranceReportTarget(monthEnd,'2030-10'),null)
})

test('fiscal boundary and minimum three digit annual numbers', () => {
  assert.equal(fiscalYear('2027-03-31', 4), 2026)
  assert.equal(fiscalYear('2027-04-01', 4), 2027)
  assert.equal(warrantyNumber(initialGroups[1], '2027-03-31', 999), 'SHS-26-999')
  assert.equal(warrantyNumber(initialGroups[1], '2027-04-01', 1000), 'SHS-27-1000')
  assert.equal(warrantyNumber(initialGroups[2], '2026-10-01', 1), '26-001')
  assert.equal(japanDate(new Date('2026-09-30T15:00:00Z')), '2026-10-01')
})

test('confirmed property validation: optional postal, required handover, materials and area precision',()=>{
  const f={name:'架空',prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'1',buildingArea:10.12,applicationDate:'2026-10-01',handoverDate:'2026-10-01'}
  assert.equal(normalizeProperty(f,true).postalCode,'')
  assert.throws(()=>normalizeProperty({...f,handoverDate:''},true))
  assert.throws(()=>normalizeProperty({...f,buildingArea:10.123},true))
  assert.throws(()=>normalizeProperty({...f,postalCode:'123'},true))
  assert.throws(()=>normalizeProperty({...f,foundationInsulation:true},true))
  assert.equal(normalizeProperty({...f,foundationInsulation:true,insulationMaterials:'架空資材'},true).insulationMaterials,'架空資材')
})

test('insurance uses expiry month, pending categories, continuous renewal and legacy guard',async()=>{
  const { initialInsurance, insuranceReportKind, nextInsurancePeriod, billingRows }=await import('../src/domain/property-warranty.mjs')
  const row={status:'active',handoverDate:'2025-10-01',expiryDate:'2035-09-30',...initialInsurance('2025-10-01')}
  assert.equal(row.insuranceRenewalMonth,'203009')
  assert.equal(insuranceReportKind(row,'2025-10'),'new')
  assert.equal(insuranceReportKind(row,'2026-10'),'past-new')
  assert.equal(insuranceReportKind({...row,insuranceReported:true},'2026-10'),'')
  assert.equal(insuranceReportKind({...row,insuranceReported:true},'2030-09'),'renewal')
  assert.equal(insuranceReportKind({...row,insuranceReported:true},'2030-10'),'past-renewal')
  assert.equal(insuranceReportKind(row,'2030-10'),'past-new')
  assert.equal(insuranceReportKind(row,'2025-10','2030-10-01'),'new')
  assert.equal(insuranceReportKind({...row,status:'cancelled'},'2025-10'),'')
  assert.equal(nextInsurancePeriod(row).insuranceExpiryDate,'2035-09-30')
  assert.equal(insuranceReportKind({...row,insuranceReported:true,...nextInsurancePeriod(row)},'2035-09'),'')
  assert.equal(initialInsurance('2025-10-06').insuranceRenewalMonth,'203010')
  assert.equal(initialInsurance('2024-02-29').insuranceExpiryDate,'2029-02-28')
  assert.throws(()=>insuranceReportKind(row,'2030-13'))
  assert.equal(billingRows([{...row,years:20,applicationDate:'2025-10-03',history:[{kind:'extend',requestId:'extend',before:{years:10},date:'2026-10-02'}]}],'2035-10')[0].billingKind,'延長')
})
test('coverage uses consecutive ten-year periods including leap-day handover', () => {
  const periods = coveragePeriods('2024-02-29', 30)
  assert.equal(periods[0].expiryDate, '2034-02-28')
  assert.equal(periods[1].startDate, '2034-03-01')
  assert.equal(periods.at(-1).expiryDate, '2054-02-28')
  assert.throws(()=>coveragePeriods('2024-02-30', 10))
})

test('transactions expose distinct ten-year bills and explicit insurance target across same-month renewals',async()=>{
 const {warrantyTransactions,initialInsurance,insuranceReportTarget,nextInsurancePeriod,handoverChangeBlockers}=await import('../src/domain/property-warranty.mjs')
 const row={status:'active',years:30,handoverDate:'2026-10-06',applicationDate:'2026-10-04',expiryDate:'2056-10-05',...initialInsurance('2026-10-06'),history:[{kind:'extend',requestId:'e1',date:'2026-10-04',before:{years:10}},{kind:'extend',requestId:'e2',date:'2026-10-04',before:{years:20}}]}
 assert.deepEqual(warrantyTransactions(row).map(p=>[p.id,p.startDate,p.billingState]),[['initial','2026-10-06','unknown'],['e1','2036-10-06','unknown'],['e2','2046-10-06','unknown']])
 row.insuranceReported=true
 const first=insuranceReportTarget(row,'2036-10','2026-10-04')
 assert.equal(first.warrantyPeriodId,'initial');assert.equal(first.startDate,'2031-10-06')
 Object.assign(row,nextInsurancePeriod(row))
 const second=insuranceReportTarget(row,'2036-10','2026-10-04')
 assert.equal(second.warrantyPeriodId,'e1');assert.equal(second.startDate,'2036-10-06')
 assert.notDeepEqual(first,second)
 const reversed={...row,years:10,history:[],insuranceEvents:[],insuranceReported:false,insuranceEverRenewed:true,billingItems:[{id:'initial',state:'pending'}]}
 assert.deepEqual(handoverChangeBlockers(reversed),[])
 assert.ok(handoverChangeBlockers({...reversed,billingItems:[]}).some(x=>x.includes('未確認')))
})
test('insurance report uses inclusive handover dates regardless of registration or extension dates', () => {
  const row={id:'a', status:'active',handoverDate:'2026-09-01',history:[{kind:'register',date:'2026-10-02'}]}
  const input=[row,{...row,id:'end',handoverDate:'2026-09-30'},{...row,id:'cancel',status:'cancelled'},{...row,id:'draft',status:'draft'},{...row,id:'missing',handoverDate:''},{...row,id:'outside',handoverDate:'2026-10-01'}]
  assert.deepEqual(reportRows(input,'2026-09-01','2026-09-30').map(r=>r.id),['a','end'])
  assert.deepEqual(reportRows(input,'2026-09-01','2026-09-30',true).map(r=>r.id),['a','end','cancel'])
  assert.throws(()=>reportRows([],'2026-10-01','2026-09-01'))
  assert.throws(()=>reportRows([],'2026-02-30','2026-03-01'))
})
test('draft allows pending handover; formal registration requires complete property fields', () => {
  assert.equal(normalizeProperty({name:'架空物件'},false).maxYears,20)
  assert.throws(()=>normalizeProperty({name:'架空物件'},true))
  assert.throws(()=>normalizeProperty({name:'架空物件',buildingArea:-1},false))
  assert.throws(()=>normalizeProperty({name:'架空物件',applicationDate:'2026-02-30'},false))
  assert.equal(normalizeProperty({name:'架空物件',applicationDate:'2026-09-30'},false).applicationDate,'2026-09-30')
  assert.equal(csvCell('=1+1'),'"\'=1+1"')
  assert.equal(csvCell('a"b'),'"a""b"')
})


test('calendar-month alerts include boundary and overdue, excluding unknown dates and cancellation', async () => {
  const { alertStartDate, expiryAlertEligible, insuranceExpiryDate, normalizeAlertSettings, matchesProperty } = await import('../src/domain/property-warranty.mjs')
  assert.equal(alertStartDate('2027-04-30',2),'2027-02-28')
  assert.equal(alertStartDate('2028-04-30',2),'2028-02-29')
  const row={status:'active',years:10,maxYears:20,expiryDate:'2027-04-30',insuranceExpiryDate:'2027-04-30'}
  assert.equal(expiryAlertEligible(row,'warranty','2027-02-27'),false)
  assert.equal(expiryAlertEligible(row,'warranty','2027-02-28'),true)
  assert.equal(expiryAlertEligible(row,'insurance','2027-05-01'),true)
  assert.equal(expiryAlertEligible({...row,status:'cancelled'},'insurance','2027-05-01'),false)
  assert.equal(expiryAlertEligible({status:'active'},'insurance','2027-05-01'),false)
  assert.equal(insuranceExpiryDate('2026-10-01'),'2031-09-30')
  assert.equal(insuranceExpiryDate(''),'')
  assert.deepEqual(normalizeAlertSettings(),{warrantyMonths:2,insuranceMonths:2})
  assert.throws(()=>normalizeAlertSettings({warrantyMonths:0}))
  assert.throws(()=>normalizeAlertSettings({insuranceMonths:1.5}))
  assert.equal(matchesProperty({handoverDate:''},{handoverMissing:'yes'}),true)
  assert.equal(matchesProperty({handoverDate:'2026-10-01'},{handoverMissing:'yes'}),false)
})

test('single property address accepts legacy input but never resurrects an explicit cleared value', () => {
  const legacy={name:'架空',prefecture:' 東京都 ',municipality:' 架空市 ',streetTownAndNumber:' 1-2 ',postalCode:'012-3456',buildingName:'架空ビル',buildingArea:10,applicationDate:'2026-10-01',handoverDate:'2026-10-01'}
  const original=structuredClone(legacy)
  assert.equal(propertyAddress(legacy),'東京都架空市1-2')
  const normalized=normalizeProperty(legacy,true)
  assert.equal(normalized.address,'東京都架空市1-2')
  assert.equal(normalized.postalCode,'0123456')
  assert.equal(normalized.buildingName,'架空ビル')
  for(const field of ['prefecture','municipality','streetTownAndNumber']) assert.equal(Object.hasOwn(normalized,field),false)
  assert.equal(normalizeProperty({...legacy,address:' 別の住所 '},true).address,'別の住所')
  assert.equal(normalizeProperty({...legacy,address:''},false).address,'')
  assert.equal(propertyAddress({...legacy,address:null}),'')
  assert.throws(()=>normalizeProperty({...legacy,address:' '},true),/住所/)
  assert.throws(()=>normalizeProperty({...legacy,address:'あ'.repeat(2001)},true),/長すぎ/)
  assert.equal(normalizeProperty({...legacy,address:'不明'},true).address,'不明')
  assert.deepEqual(legacy,original)
  assert.equal(matchesProperty({...legacy,address:'京都府架空町'},{search:'京都'}),true)
  assert.equal(matchesProperty({...legacy,address:'京都府架空町'},{search:'東京'}),false)
  assert.equal(normalizeProperty({...legacy,maxYears:10},true).maxYears,10)
  assert.throws(()=>normalizeProperty({...legacy,maxYears:15},true),/最長保証期間/)
})

test('sample certificate prints single and legacy addresses consistently', async () => {
  const {sampleCertificatePdf}=await import('../src/domain/sample-certificate.mjs')
  const legacy={name:'架空',prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'1-2',buildingName:'架空ビル'}
  const single={...legacy,address:propertyAddress(legacy)}
  assert.deepEqual(sampleCertificatePdf(legacy,'架空工務店','','2026-10-07'),sampleCertificatePdf(single,'架空工務店','','2026-10-07'))
  assert.notDeepEqual(sampleCertificatePdf(single,'架空工務店','','2026-10-07'),sampleCertificatePdf({...single,address:'不明'},'架空工務店','','2026-10-07'))
})

test('warranty notices exclude the final period without changing insurance alerts', async () => {
  const { expiryAlertEligible } = await import('../src/domain/property-warranty.mjs')
  const row={status:'active',expiryDate:'2027-04-30',insuranceExpiryDate:'2027-04-30'}
  for (const [years,maxYears,expected] of [[10,10,false],[10,20,true],[10,30,true],[20,30,true],[20,20,false],[30,30,false]]) {
    const property={...row,years,maxYears}
    assert.equal(expiryAlertEligible(property,'warranty','2027-02-28'),expected,`${years}/${maxYears}`)
    assert.equal(expiryAlertEligible(property,'warranty','2027-05-01'),expected,`overdue ${years}/${maxYears}`)
    assert.equal(expiryAlertEligible(property,'insurance','2027-02-28'),true)
    assert.equal(expiryAlertEligible({...property,status:'cancelled'},'warranty','2027-05-01'),false)
  }
  assert.equal(expiryAlertEligible(row,'warranty','2027-05-01'),false)
  assert.equal(normalizeProperty({name:'架空物件',maxYears:10},false).maxYears,10)
})
import { readFileSync } from 'node:fs'

test('property branch selection is required for drafts and no longer implies head office',()=>{
  const source=readFileSync(new URL('../app/components/MeetingPrototype.vue',import.meta.url),'utf8')
  const input=source.match(/<v-autocomplete v-model="form.branchId"[^>]*>/)?.[0]
  assert.ok(input)
  assert.match(input,/:rules="requiredRules" required/)
  assert.match(input,/label="本支店"/)
  assert.doesNotMatch(source,/空欄は本店/)
  assert.match(source,/下書きも物件名・工務店・本支店の指定が必要/)
})
import ts from 'typescript'

async function propertyAddressViewForTest(provider) {
  const vue=await import('vue')
  const postal=await import('../src/domain/postal-lookup.mjs')
  const rules=await import('../src/domain/input-rules.mjs')
  const source=readFileSync(new URL('../app/components/PropertyAddressFields.vue',import.meta.url),'utf8')
    .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm,'')
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
  const form=vue.ref({postalCode:'1000001',address:'手入力住所',buildingName:'別建物'})
  const props=vue.reactive({postalLookupProvider:provider,validateRequired:true})
  let unmount
  const view=new Function('defineProps','defineModel','ref','watch','onBeforeUnmount','defineExpose','createPostalLookupCoordinator','propertyAddress','requiredRule','lengthRule','postalRule',
    compiled+'\nreturn {handlePostalBlur,applyCandidate,candidateOptions,lookupMessage};')(
    ()=>props,()=>form,vue.ref,vue.watch,fn=>unmount=fn,()=>{},postal.createPostalLookupCoordinator,propertyAddress,rules.requiredRule,rules.lengthRule,rules.postalRule)
  return {...view,form,props,unmount}
}

test('single address postal lookup preserves manual edits and invalidates stale candidates', async () => {
  let resolve
  const provider={lookup:()=>new Promise(r=>resolve=r)}
  const view=await propertyAddressViewForTest(provider)
  const pending=view.handlePostalBlur()
  view.form.value.address='途中の手修正'
  view.form.value.address='手入力住所'
  resolve({status:'resolved',address:{prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'架空町'}})
  await pending
  assert.equal(view.form.value.address,'手入力住所')
  const fresh=view.handlePostalBlur()
  resolve({status:'resolved',address:{prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'架空町'}})
  await fresh
  assert.equal(view.form.value.address,'東京都架空市架空町')
  assert.equal(view.form.value.buildingName,'別建物')
  const ambiguous=view.handlePostalBlur()
  resolve({status:'ambiguous',address:{prefecture:'東京都',municipality:'架空市'},candidates:[{prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'候補町'}]})
  await ambiguous
  assert.equal(view.form.value.address,'東京都架空市架空町')
  const oldCandidate=view.candidateOptions.value[0]
  view.form.value.postalCode='1000002'
  view.applyCandidate(oldCandidate)
  assert.equal(view.form.value.address,'東京都架空市架空町')
  const second=view.handlePostalBlur()
  resolve({status:'ambiguous',address:{prefecture:'東京都',municipality:'架空市'},candidates:[{prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'候補町'}]})
  await second
  view.applyCandidate(view.candidateOptions.value[0])
  assert.equal(view.form.value.address,'東京都架空市候補町')
  const replaced=view.handlePostalBlur()
  view.form.value={postalCode:'1000002',address:'別物件住所',buildingName:''}
  resolve({status:'resolved',address:{prefecture:'古い県',municipality:'古い市'}})
  await replaced
  assert.equal(view.form.value.address,'別物件住所')
  view.unmount()
})

test('single address postal lookup failure retains address and allows a later retry', async () => {
  let fail=true
  const view=await propertyAddressViewForTest({lookup:async()=>{if(fail)throw new Error('offline');return {status:'resolved',address:{prefecture:'架空県',municipality:'架空市',streetTownAndNumber:'架空町'}}}})
  await view.handlePostalBlur()
  assert.equal(view.form.value.address,'手入力住所')
  assert.equal(view.lookupMessage.value.type,'error')
  fail=false
  await view.handlePostalBlur()
  assert.equal(view.form.value.address,'架空県架空市架空町')
  assert.equal(view.lookupMessage.value,null)
  view.unmount()
})

test('session read failure releases loading, retry works, stale login cannot replace a newer account',async()=>{
  const source=readFileSync(new URL('../app/composables/useSession.ts',import.meta.url),'utf8')
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  let authCallback, snapshotCallback, rejectReads=true, reads=[], auth={currentUser:{uid:'first'}}
  const api={browserSessionPersistence:{},onAuthStateChanged:(_,cb)=>{authCallback=cb},signOut:async()=>{},setPersistence:async()=>{},signInWithEmailAndPassword:async()=>{},sendPasswordResetEmail:async()=>{}}
  const firestore={doc:(_,collection,uid)=>({path:`${collection}/${uid}`}),getDoc:ref=>rejectReads ? Promise.reject(Error('offline')) : new Promise(resolve=>reads.push(()=>resolve({exists:()=>ref.path.startsWith('staffAccounts/')}))),onSnapshot:(ref,cb)=>{snapshotCallback=()=>cb({exists:()=>true,ref,data:()=>({enabled:true,role:'general_staff',displayName:ref.path})});return ()=>{}}}
  const diagnostics=[]
  const exports={};new Function('require','exports','shallowRef','ref','useNuxtApp',compiled)(name=>name==='firebase/auth'?api:name.includes('authDiagnostics')?{recordAuthFailure:(stage,error)=>diagnostics.push({stage,error})}:name.includes('firestoreMetrics')?{createMeasuredFirestore:()=>firestore}:firestore,exports,value=>({value}),value=>({value}),()=>({$firebase:{auth,firestore:{}}}))
  const session=exports.useSession()
  await authCallback(auth.currentUser)
  assert.equal(session.loading.value,false);assert.match(session.errorMessage.value,/再試行/)
  assert.equal(diagnostics[0].stage,'profile_read')
  rejectReads=false
  const stale=session.retryProfile();const staleReads=reads.splice(0)
  auth.currentUser={uid:'second'};const fresh=authCallback(auth.currentUser);reads.splice(0).forEach(r=>r());await fresh;snapshotCallback()
  assert.equal(session.profile.value.uid,'second')
  staleReads.forEach(r=>r());await stale;assert.equal(session.profile.value.uid,'second')
  await authCallback(null);assert.equal(session.profile.value,null);assert.equal(session.loading.value,false)
})


test('prefix separator is automatic, omitted when empty, compatible with legacy trailing hyphens',()=>{
  for(const prefix of ['HSC','HSC-','HSC--',' HSC- '])assert.equal(warrantyNumber({prefix,fiscalStartMonth:1},'2026-10-01',1),'HSC-26-001')
  assert.equal(warrantyNumber({prefix:'',fiscalStartMonth:1},'2026-10-01',1000),'26-1000')
  assert.equal(warrantyNumber({prefix:'AB-CD',fiscalStartMonth:4},'2026-03-31',1),'AB-CD-25-001')
})


async function prototypeViewForTest(invoke,sendMail=async()=>{}){
  const {readFile}=await import('node:fs/promises')
  const ts=(await import('typescript')).default
  const vue=await import('vue')
  const source=(await readFile(new URL('../app/components/MeetingPrototype.vue',import.meta.url),'utf8')).split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*$/gm,'')
  const inputRules=await import('../src/domain/input-rules.mjs')
  const fixtureProfile=vue.ref({accountType:'staff',uid:'fictional-hs',role:'house_solution_administrator'})
  const references={companies:vue.ref([]),branches:vue.ref([]),groups:vue.ref([]),status:vue.ref('ready'),error:vue.ref('')}
  let referenceLoaded=false
  references.ensureReady=async(force=false)=>{if(referenceLoaded && !force)return;const value=await invoke({action:'catalog',purpose:'referenceStore'});for(const key of ['companies','branches','groups'])references[key].value=value?.[key] || [];referenceLoaded=true}
  references.reset=()=>{referenceLoaded=false;for(const key of ['companies','branches','groups'])references[key].value=[]}
  references.activeCompanies=vue.computed(()=>references.companies.value.filter(row=>row.enabled!==false))
  references.activeBranches=id=>references.branches.value.filter(row=>row.constructionCompanyId===id && row.enabled!==false)
  references.name=(kind,id)=>references[kind].value.find(row=>row.id===id)?.name || id
  vue.watch(fixtureProfile,()=>references.reset(),{flush:'sync'})
  const notifications=[];const env={useReferenceStore:()=>references,...(await import('../src/domain/reference-store-request.mjs')),...(await import('../src/domain/branch-code.mjs')),...(await import('../app/utils/recoveryClient.ts')),sendPasswordResetEmail:sendMail,window:{location:{origin:"http://fictional.invalid"}},nextInsuranceReportLabel,notifications,useAppSnackbar:()=>({showValidationError:()=>notifications.push("validation"),showSnackbar:(...args)=>notifications.push(args)}),...(await import('../src/domain/property-warranty.mjs')),...(await import('../src/domain/external-key.mjs')),...(await import('../src/domain/property-field-requirements.mjs')),...inputRules,nextTick:vue.nextTick,ref:vue.ref,reactive:vue.reactive,computed:vue.computed,watch:vue.watch,onMounted:()=>{},onUnmounted:()=>{},...(await import('../src/domain/reference-fetch-cache.mjs')),useNuxtApp:()=>({$firebase:{functions:{},auth:{}}}),useSession:()=>({profile:fixtureProfile,logout:()=>{}}),httpsCallable:()=>async data=>({data:await invoke(data)}),japanDate:()=> '2026-10-04',coveragePeriods,normalizeWarrantyPrefix:()=>'',hostedPostalLookupProvider:{}}
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  return new Function(...Object.keys(env),code+';return {references,groups,propertyKeySettings,propertyRequirements,externalKeyRule,referenceCache,loadCatalog,profile,rows,reportKey,reportDirty,clearFilter,selectedKeys,selectedRows,reportConfirm,markReports,accountCreated,searchForm,loadRows,appliedPropertyFilters,removePropertyFilter,current,maxYearsRule,maxYearsOptions,historyFields,tab,filter,fetchRows,insuranceRenewalLabel,companies,branches,dialogCompanies,dialogBranches,propertyDialog,form,notifications,catalogBusy,catalogError,busy,resetDialogCatalog,fetchCompanyOptions,choosePropertyCompany,selectPropertyCompany,confirmRegistration,confirmWarnings,registrationWarnings,openRegistrationConfirmation,propertyForm,settingForm,accountForm,errors,run,settingDialog,accountDialog,confirmation,saveSetting,saveProperty,openProperty,createAccount};')(...Object.values(env))
}

test('property editor discards the former name field before saving legacy documents',async()=>{
  const calls=[]
  const row={id:'fictional-legacy',name:'架空物件',ownerName:'架空物件',constructionCompanyId:'fictional-company',status:'draft',revision:1,address:'架空住所'}
  const v=await prototypeViewForTest(async data=>{calls.push(data);return data.action==='detail'?row:{companies:[],branches:[],groups:[],rows:[]}})
  await v.openProperty(row.id)
  assert.equal(v.form.value.name,'架空物件')
  assert.equal(Object.hasOwn(v.form.value,'ownerName'),false)
  v.propertyForm.value={validate:async()=>({valid:true})}
  await v.saveProperty('save')
  const saved=calls.find(x=>x.action==='save')
  assert.ok(saved)
  assert.equal(saved.fields.name,'架空物件')
  assert.equal(Object.hasOwn(saved.fields,'ownerName'),false)
  assert.equal(Object.hasOwn(v.form.value,'ownerName'),false)
})

test('shared company candidates preserve the selected value and company change clears former branch',async()=>{
  const calls=[]
  const view=await prototypeViewForTest(async data=>{calls.push(data);return {companies:[{id:'chosen',name:'選択中'},{id:'found',name:'検索一致'}],branches:[{id:'found-branch',constructionCompanyId:'found'}],groups:[]}})
  await view.loadCatalog();view.resetDialogCatalog();view.propertyDialog.value=true;view.form.value.constructionCompanyId='chosen';view.form.value.branchId='old'
  assert.deepEqual((await view.fetchCompanyOptions('検索')).map(row=>row.id),['chosen','found'])
  assert.equal(view.form.value.branchId,'old')
  view.choosePropertyCompany({id:'found',name:'検索一致'});assert.equal(view.form.value.branchId,'');assert.deepEqual(view.dialogBranches.value,[])
  await new Promise(r=>setImmediate(r));assert.deepEqual(view.dialogBranches.value.map(row=>row.id),['found-branch'])
  assert.equal(calls.filter(row=>row.action==='catalog').length,1);assert.equal(view.catalogBusy.value,false)
})

test('shared references reuse catalogs while alert cache refreshes on save and lists remain fresh', async()=>{
  const calls=[]
  const v=await prototypeViewForTest(async data=>{
    calls.push(data.action)
    if(data.action==='saveCompany')return {id:'new-company'}
    return {companies:[],branches:[],groups:[],rows:[],limited:true,warrantyMonths:2,insuranceMonths:2}
  })
  await v.loadCatalog();await v.loadCatalog()
  assert.equal(calls.filter(action=>action==='catalog').length,1)
  assert.equal(calls.filter(action=>action==='alertSettings').length,1)
  await v.fetchRows();await v.fetchRows()
  assert.equal(calls.filter(action=>action==='propertyList').length,2)
  await v.referenceCache.get('other-condition',async()=>['stale'])
  await v.loadCatalog(true)
  assert.equal(v.referenceCache.size(),1)
  assert.equal(calls.filter(action=>action==='catalog').length,2)
  v.settingForm.value={validate:async()=>({valid:true})}
  await v.saveSetting()
  assert.equal(calls.filter(action=>action==='catalog').length,2)
  assert.equal(calls.filter(action=>action==='alertSettings').length,3)
  v.profile.value={accountType:'staff',uid:'another',role:'house_solution_administrator'}
  await v.loadCatalog()
  assert.equal(calls.filter(action=>action==='catalog').length,3)
  v.profile.value=null
  assert.equal(v.referenceCache.size(),0)
})

test('dialog lookup failure releases loading and registration confirmation never carries over',async()=>{
  let fail=true
  const view=await prototypeViewForTest(async()=>{if(fail)throw new Error('通信エラー');return {branches:[]}})
  view.selectPropertyCompany('chosen');await new Promise(r=>setImmediate(r));assert.equal(view.catalogBusy.value,false);assert.equal(view.busy.value,false);assert.equal(view.catalogError.value,'通信エラー')
  fail=false;view.selectPropertyCompany('chosen');await new Promise(r=>setImmediate(r));assert.equal(view.catalogError.value,'')
  view.confirmRegistration.value=true;view.confirmWarnings.value=true;view.registrationWarnings.value=['前の物件の注意']
  view.propertyForm.value={validate:async()=>({valid:true})};await view.openRegistrationConfirmation();assert.equal(view.confirmRegistration.value,false);assert.equal(view.confirmWarnings.value,false);assert.deepEqual(view.registrationWarnings.value,[])
})
test('property editor uses loaded company key settings and preserves issued group settings',async()=>{
  const view=await prototypeViewForTest(async()=>({branches:[],companies:[{id:'selected',name:'架空工務店',defaultGroupId:'required'}],groups:[{id:'required',name:'架空グループ',externalKeyRequired:true,externalKeyLabel:'架空契約No'}]}))
  view.form.value.constructionCompanyId='selected';view.selectPropertyCompany('selected');await new Promise(r=>setImmediate(r))
  assert.deepEqual(view.propertyKeySettings.value,{required:true,label:'架空契約No'})
  assert.match(view.externalKeyRule('invalid\nkey'),/架空契約No/)
  view.groups.value.push({id:'issued',name:'架空任意',externalKeyRequired:false,externalKeyLabel:'発行時の名称'})
  view.current.value={warrantyNumber:'TEST-26-001',groupId:'issued'}
  assert.deepEqual(view.propertyKeySettings.value,{required:false,label:'発行時の名称'})
  view.current.value=null
  assert.equal(view.propertyKeySettings.value.required,true)
})


test('field rules accept optional postal, normalize hyphens and reject eight digits, invalid dates and areas',async()=>{
 const r=await import('../src/domain/input-rules.mjs')
 for(const v of ['', '1000001','100-0001'])assert.equal(r.postalRule(v),true)
 for(const v of ['12345678','１２３４５６７','123'])assert.notEqual(r.postalRule(v),true)
 assert.equal(r.dateRule('2024-02-29'),true);assert.notEqual(r.dateRule('2026-02-29'),true)
 assert.equal(r.areaRule('100.25'),true);for(const v of ['0','-1','1.001'])assert.notEqual(r.areaRule(v),true)
 assert.equal(r.phoneRule('03-0000-0000'),true);assert.notEqual(r.phoneRule('(03)0000'),true)
 assert.notEqual(r.requiredRule(' '),true);assert.equal(r.emailRule('sample@example.invalid'),true)
})

test('dialog server errors stay in the originating surface even if another surface opens',async()=>{
 const view=await prototypeViewForTest(async()=>({}))
 view.settingDialog.value=true
 let reject;const task=view.run(()=>new Promise((_,r)=>{reject=r}))
 view.settingDialog.value=false;view.accountDialog.value=true
 reject(new Error('保存失敗'));await task
 assert.equal(view.errors.setting,'保存失敗');assert.equal(view.errors.page,'');assert.equal(view.errors.account,'')
 view.accountDialog.value=false;view.propertyDialog.value=true;view.confirmation.value='register'
 await new Promise(r=>setImmediate(r))
 await view.run(async()=>{throw new Error('本登録失敗')})
 assert.equal(view.errors.confirmation,'本登録失敗');assert.equal(view.errors.property,'');assert.equal(view.errors.page,'')
})

test('invalid component validation prevents master, property and account network writes',async()=>{
 let calls=0;const view=await prototypeViewForTest(async()=>{calls++;return {}})
 const invalid={validate:async()=>({valid:false})}
 view.settingForm.value=invalid;view.propertyForm.value=invalid;view.accountForm.value=invalid
 view.settingDialog.value=true;await view.saveSetting();assert.equal(view.notifications.length,1);view.settingDialog.value=false;view.propertyDialog.value=true;await view.saveProperty('save');assert.equal(view.notifications.length,2);view.propertyDialog.value=false;view.accountDialog.value=true;await view.createAccount();assert.equal(view.notifications.length,3);await view.openRegistrationConfirmation()
 assert.equal(calls,0);assert.equal(view.confirmation.value,'')
})

async function autocompleteForTest(fetchOptions){
 const vue=await import('vue'),props=vue.reactive({modelValue:'',items:[],active:true,disabled:false,fetchOptions}),events=[]
 let dispose
 const env={...vue,requiredRules:[],defineProps:()=>props,defineEmits:()=> (event,value)=>{events.push([event,value]);if(event==='update:modelValue')props.modelValue=value},onBeforeUnmount:fn=>{dispose=fn}}
 const source=readFileSync(new URL('../app/components/CompanyAutocomplete.vue',import.meta.url),'utf8').split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*$/gm,'')
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
 const state=new Function(...Object.keys(env),code+';return {rows,available,loading,problem,choose,load};')(...Object.values(env))
 return {...state,props,events,tick:vue.nextTick,dispose:()=>dispose()}
}

test('company autocomplete supplies all candidates to standard filtering and rejects stale loads',async()=>{
 const calls=[],pending=[];const v=await autocompleteForTest(q=>{calls.push(q);return new Promise(resolve=>pending.push(resolve))})
 const latest=v.load();const candidates=Array.from({length:25},(_,i)=>({id:String(i),name:'架空工務店'+i}))
 pending[1](candidates);await latest;pending[0]([{id:'stale',name:'旧候補'}]);await v.tick()
 assert.deepEqual(calls,['','']);assert.equal(v.rows.value.length,25);assert.equal(v.rows.value[24].id,'24')
 const template=readFileSync(new URL('../app/components/CompanyAutocomplete.vue',import.meta.url),'utf8').split('<template>')[1]
 assert.match(template,/<v-autocomplete/);assert.doesNotMatch(template,/no-filter|custom-filter|update:search|auto-select-first/)
 v.props.active=false;await v.tick();assert.deepEqual(v.rows.value,[]);v.dispose()
})

test('company autocomplete retries failures, selects by id, clears and suppresses unmounted replies',async()=>{
 let fail=true;const v=await autocompleteForTest(async()=>{if(fail)throw Error('offline');return [{id:'a',name:'工務店A'}]})
 await v.tick();assert.match(v.problem.value,/取得できません/);assert.equal(v.loading.value,false)
 fail=false;await v.load();assert.equal(v.problem.value,'');v.choose('a');await v.tick();assert.equal(v.props.modelValue,'a')
 v.choose(null);assert.equal(v.props.modelValue,'');assert.deepEqual(v.events.at(-1),['select',null]);v.dispose()
 let resolve;const late=await autocompleteForTest(()=>new Promise(r=>resolve=r));late.dispose();resolve([{id:'late',name:'遅延'}]);await late.tick();assert.deepEqual(late.rows.value,[])
})

test('validation snackbar appears at the top and repeat attempts restart the notification',()=>{
 const source=readFileSync(new URL('../app/composables/useAppSnackbar.ts',import.meta.url),'utf8')
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const exports={};new Function('exports','useState',code)(exports,(_,init)=>({value:init()}))
 const s=exports.useAppSnackbar();s.showSnackbar('保存完了','success');assert.equal(s.state.value.location,'bottom center')
 s.showValidationError();const first=s.state.value.id;assert.equal(s.state.value.location,'top center');assert.equal(s.state.value.type,'error');assert.equal(s.state.value.timeout,8000)
 s.closeSnackbar();s.showValidationError();assert.equal(s.state.value.open,true);assert.ok(s.state.value.id>first)
})


test('insurance report sends only month; renewal label ends with warranty but returns after extension',async()=>{
 const calls=[];const v=await prototypeViewForTest(async data=>{calls.push(data);return {rows:[],limited:false,companies:[],branches:[],groups:[]}})
 v.tab.value='report';await new Promise(r=>setImmediate(r));calls.length=0
 v.filter.month='2026-10';v.filter.search='hidden';v.filter.companyId='hidden';await v.fetchRows()
 assert.deepEqual(calls.at(-1).filter,{reportMonth:'2026-10'})
 const row={insuranceReported:true,insuranceEvents:[],expiryDate:'2036-10-05',insuranceExpiryDate:'2036-10-05',insuranceRenewalMonth:'203610'}
 assert.equal(v.insuranceRenewalLabel(row),'次回報告不要（保証延長がなければ）')
 assert.equal(v.insuranceRenewalLabel({...row,insuranceExpiryDate:'2037-10-05'}),'次回報告不要（保証延長がなければ）')
 assert.equal(v.insuranceRenewalLabel({...row,expiryDate:'2046-10-05'}),'2036年10月分')
 assert.equal(v.insuranceRenewalLabel({}),'要確認')
})


test('saving a draft closes the dialog and delivers completion via snackbar',async()=>{
 const v=await prototypeViewForTest(async data=>data.action==='detail' ? {id:'test',name:'架空',status:'draft'} : {rows:[],limited:false})
 v.propertyDialog.value=true;v.propertyForm.value={validate:async()=>({valid:true})}
 await v.saveProperty('save')
 assert.deepEqual(v.notifications,[['保存しました。','success']])
 assert.equal(v.propertyDialog.value,false);assert.equal(v.errors.page,'');assert.equal(v.errors.property,'')
})


test('after thirty-year extension UI disallows a twenty-year cap and history labels are explicit',async()=>{
 const v=await prototypeViewForTest(async()=>({}))
 v.current.value={years:30,maxYears:30}
 assert.equal(v.maxYearsOptions.value[0].props.disabled,true)
 assert.notEqual(v.maxYearsRule(20),true);assert.equal(v.maxYearsRule(30),true)
 v.current.value={years:20,maxYears:30};assert.equal(v.maxYearsRule(20),true)
 assert.deepEqual(v.historyFields.filter(f=>['applicationDate','handoverDate','expiryDate'].includes(f.key)).map(f=>f.label),['申込日','引渡日','保証満了日'])
})


test('extension undo keeps auditable events and removes only reversed billing entries', async () => {
  const {activeExtensions, extensionUndoPreview, billingRows} = await import('../src/domain/property-warranty.mjs')
  const row = {status:'active', years:30, handoverDate:'2026-10-06', applicationDate:'2026-09-30', history:[
    {kind:'extend',requestId:'first',date:'2026-10-04',before:{years:10}},
    {kind:'extend',requestId:'second',date:'2026-10-04',before:{years:20}},
  ]}
  assert.equal(extensionUndoPreview(row).expiryDate,'2046-10-05')
  assert.equal(extensionUndoPreview(row).targetRequestId,'second')
  row.history.push({kind:'undoExtend',targetRequestId:'second',date:'2026-11-01'})
  row.years=20
  assert.equal(billingRows([row],'2036-10').length,1)
  assert.equal(activeExtensions(row)[0].requestId,'first')
  assert.equal(extensionUndoPreview(row).expiryDate,'2036-10-05')
  row.history.push({kind:'undoExtend',targetRequestId:'first',date:'2026-11-01'})
  row.years=10
  assert.equal(extensionUndoPreview(row),null)
  assert.equal(billingRows([row],'2036-10').length,0)
  assert.equal(billingRows([row],'2026-09').length,1)
  assert.equal(extensionUndoPreview({...row,years:20,history:[]}),null)
})
test('keyboard date entry formats complete digits and rejects impossible dates without repairing them', async () => {
 const { normalizeDateEntry: format } = await import('../src/domain/date-entry.mjs')
 const {dateRule,monthRule}=await import('../src/domain/input-rules.mjs')
 assert.equal(format('20261004'),'2026-10-04')
 assert.equal(format('2026/10/04'),'2026-10-04')
 assert.equal(format('202610','month'),'2026-10')
 assert.equal(format('2026/10','month'),'2026-10')
 assert.equal(format('2026'),'2026')
 assert.equal(format(''),'')
 assert.equal(dateRule(format('20240229')),true)
 assert.notEqual(dateRule(format('20260230')),true)
 assert.notEqual(monthRule(format('202613','month')),true)
})


 test('report display distinguishes unreported, renewal, final coverage and incomplete history without mutation',()=>{
 const row={status:'active',insuranceReported:false,insuranceEvents:[],expiryDate:'2035-09-30',insuranceExpiryDate:'2035-09-30',insuranceRenewalMonth:'203509'}
 const before=structuredClone(row)
 assert.equal(nextInsuranceReportLabel(row),'初回報告が必要')
 assert.equal(nextInsuranceReportLabel({...row,insuranceReported:true}),'次回報告不要（保証延長がなければ）')
 assert.equal(nextInsuranceReportLabel({...row,insuranceReported:true,expiryDate:'2045-09-30'}),'2035年09月分')
 assert.equal(nextInsuranceReportLabel({...row,insuranceHistoryIncomplete:true}),'要確認（記録不足）')
 assert.equal(nextInsuranceReportLabel({...row,status:'cancelled'}),'対象外（物件・保証取消）')
 assert.equal(nextInsuranceReportLabel({...row,status:'draft'}),'本登録前')
 assert.equal(nextInsuranceReportLabel({...row,insuranceReported:true,expiryDate:'2045-09-30',insuranceRenewalMonth:'203513'}),'要確認')
 assert.equal(nextInsuranceReportLabel({}),'要確認')
 assert.deepEqual(row,before)
})

test('warranty alerts always request pending notices despite hidden filters',async()=>{
 const calls=[];const v=await prototypeViewForTest(async data=>{calls.push(data);return {rows:[],limited:false,companies:[],branches:[],groups:[]}})
 v.tab.value='alerts';await new Promise(r=>setImmediate(r));
 Object.assign(v.filter,{search:'hidden',companyId:'hidden',fiscalYear:'2026',status:'cancelled',applicationFrom:'2026-01-01'});
 for(const notification of ['pending','done','all']){v.filter.notification=notification;await v.fetchRows();assert.deepEqual(calls.at(-1).filter,{alertKind:'warranty',notification:'pending'})}
})

test('insurance alerts ignore hidden filters and warranty notification state',async()=>{
 const calls=[];const v=await prototypeViewForTest(async data=>{calls.push(data);return {rows:[],limited:false,companies:[],branches:[],groups:[]}})
 v.tab.value='insuranceAlerts';await new Promise(r=>setImmediate(r));
 Object.assign(v.filter,{notification:'done',search:'hidden',fiscalYear:'2026',companyId:'hidden'});await v.fetchRows();assert.deepEqual(calls.at(-1).filter,{alertKind:'insurance'})
})

test('failed draft save keeps the dialog and entered values',async()=>{
 const v=await prototypeViewForTest(async()=>{throw new Error('save failed')});v.propertyDialog.value=true;v.propertyForm.value={validate:async()=>({valid:true})};v.form.value.name='架空入力';await v.saveProperty('save');assert.equal(v.propertyDialog.value,true);assert.equal(v.form.value.name,'架空入力');assert.equal(v.notifications.length,0)
})
test('successful registration closes both dialogs; active edit remains open',async()=>{
 for(const action of ['register','save']){const v=await prototypeViewForTest(async data=>data.action==='detail'?{id:'test',status:'active'}:{rows:[],limited:false});v.propertyDialog.value=true;v.propertyForm.value={validate:async()=>({valid:true})};v.confirmRegistration.value=true;v.confirmation.value=action==='register'?'register':'';await v.saveProperty(action);assert.equal(v.propertyDialog.value,action==='save');assert.equal(v.confirmation.value,'')}
})

test('property search submits only the exact number, clears the applied number, and blocks invalid input',async()=>{
 const calls=[];const v=await prototypeViewForTest(async data=>{calls.push(data);return {rows:[],limited:false}});v.tab.value='properties';v.searchForm.value={validate:async()=>({valid:true})};v.filter.warrantyNumber='QA-26-001';v.filter.search='ignored';v.filter.fiscalYear='2026';await v.loadRows();assert.equal(calls.at(-1).action,'propertyList');assert.deepEqual(calls.at(-1).filter,{warrantyNumber:'QA-26-001'});assert.deepEqual(v.appliedPropertyFilters.value,[{key:'warrantyNumber',label:'保証番号：QA-26-001'}]);await v.removePropertyFilter('warrantyNumber');assert.deepEqual(calls.at(-1).filter,{warrantyNumber:''});assert.equal(v.appliedPropertyFilters.value.length,0);v.searchForm.value={validate:async()=>({valid:false})};const before=calls.length;await v.loadRows();assert.equal(calls.length,before)
})

test('pending list results keep submitted filters and busy clear cannot erase them',async()=>{
 let resolve;const v=await prototypeViewForTest(()=>new Promise(r=>{resolve=r}))
 v.searchForm.value={validate:async()=>({valid:true})};v.filter.warrantyNumber='QA-26-001'
 const pending=v.loadRows();await new Promise(r=>setImmediate(r))
 await v.clearFilter();assert.equal(v.filter.warrantyNumber,'QA-26-001')
 v.filter.warrantyNumber='QA-26-002';resolve({rows:[{id:'tokyo'}],limited:false});await pending
 assert.equal(v.rows.value[0].id,'tokyo');assert.equal(v.appliedPropertyFilters.value[0].label,'保証番号：QA-26-001');assert.equal(v.reportDirty.value,true)
})

test('account creation sends setup mail despite list refresh failure and prevents duplicate creation',async()=>{
 const calls=[],mail=[];const v=await prototypeViewForTest(async data=>{calls.push(data.action);if(data.action==='createAccount')return {email:'fictional@example.invalid'};throw Error('refresh failed')},async(auth,email)=>mail.push(email))
 v.accountDialog.value=true;v.accountForm.value={validate:async()=>({valid:true})}
 await v.createAccount();assert.deepEqual(mail,['fictional@example.invalid']);assert.equal(v.accountCreated.value,true);assert.equal(v.accountDialog.value,false);assert.match(v.errors.page,/一覧を更新できません/);assert.equal(v.notifications.at(-1)[1],'success')
 await v.createAccount();assert.equal(calls.filter(a=>a==='createAccount').length,1)
})

test('account mail and refresh failures remain truthful without creation success',async()=>{
 const v=await prototypeViewForTest(async data=>{if(data.action==='createAccount')return {email:'fictional@example.invalid'};throw Error('refresh failed')},async()=>{throw Error('mail failed')})
 v.accountDialog.value=true;v.accountForm.value={validate:async()=>({valid:true})};await v.createAccount()
 assert.equal(v.accountCreated.value,true);assert.equal(v.accountDialog.value,true);assert.match(v.errors.account,/アカウントは作成済み/);assert.match(v.errors.account,/設定メールを送信できません/);assert.match(v.errors.account,/一覧を更新できません/);assert.equal(v.notifications.length,0)
})

const reportFixture=(id)=>({id,revision:1,reportKind:'new'})
async function prepareReports(v){v.tab.value='report';await new Promise(r=>setImmediate(r));v.rows.value=[reportFixture('A'),reportFixture('B')];v.selectedKeys.value=['A:::','B:::'];v.reportKey.value=JSON.stringify(v.filter);v.reportConfirm.value=true;await new Promise(r=>setImmediate(r))}

test('partial report failure retries only remaining selection with the original receipt',async()=>{
 const calls=[];let failed=true;const v=await prototypeViewForTest(async data=>{calls.push(data);if(data.action==='report'&&data.id==='B'&&failed)throw Error('B rejected');return data.action==='list'?{rows:failed?[reportFixture('B')]:[],limited:false}:{}})
 await prepareReports(v);await v.markReports();assert.deepEqual(v.selectedRows.value.map(r=>r.id),['B']);assert.match(v.errors.report,/B rejected/);assert.equal(v.reportConfirm.value,true);assert.equal(v.notifications.length,0)
 failed=false;await v.markReports();const reports=calls.filter(c=>c.action==='report');assert.deepEqual(reports.map(c=>c.id),['A','B','B']);assert.equal(reports[1].requestId,reports[2].requestId);assert.equal(v.reportConfirm.value,false);assert.equal(v.notifications.at(-1)[1],'success')
})

test('report primary error survives refresh error and successful rows stay unselected',async()=>{
 const v=await prototypeViewForTest(async data=>{if(data.action==='report'&&data.id==='B')throw Error('B rejected');if(data.action==='list')throw Error('refresh offline');return {}})
 await prepareReports(v);await v.markReports();assert.match(v.errors.report,/B rejected/);assert.match(v.errors.report,/一覧も更新できません/);assert.deepEqual(v.selectedRows.value.map(r=>r.id),['B']);assert.equal(v.notifications.length,0)
})

test('empty report confirmation cannot claim success or call the server',async()=>{
 let calls=0;const v=await prototypeViewForTest(async()=>{calls++;return {}});v.reportKey.value=JSON.stringify(v.filter);v.reportConfirm.value=true;await new Promise(r=>setImmediate(r));await v.markReports();assert.equal(calls,0);assert.equal(v.reportConfirm.value,true);assert.match(v.errors.report,/選択してください/);assert.equal(v.notifications.length,0)
})

test('successful report updates with failed refresh report completion and refresh warning separately',async()=>{
 const v=await prototypeViewForTest(async data=>{if(data.action==='list')throw Error('refresh offline');return {}})
 await prepareReports(v);await v.markReports();assert.equal(v.reportConfirm.value,false);assert.deepEqual(v.selectedKeys.value,[]);assert.equal(v.notifications.at(-1)[1],'success');assert.match(v.errors.page,/更新は完了しましたが/)
})

test('ambiguous report commit never reselects a refreshed next interval or changed revision',async()=>{
 const originalTarget={warrantyPeriodId:'initial',startDate:'2031-10-01',expiryDate:'2036-09-30'}
 const nextTarget={warrantyPeriodId:'initial',startDate:'2036-10-01',expiryDate:'2041-09-30'}
 for(const changed of [{revision:2,reportTarget:nextTarget},{revision:2,reportTarget:originalTarget},{revision:1,reportTarget:nextTarget}]){
  const calls=[];const v=await prototypeViewForTest(async data=>{calls.push(data);if(data.action==='report')throw Error('response lost');return {rows:[{...reportFixture('B'),...changed}],limited:false}})
  v.rows.value=[{...reportFixture('B'),reportTarget:{...originalTarget}}];v.selectedKeys.value=['B:::'];v.reportKey.value=JSON.stringify(v.filter);v.reportConfirm.value=true;await new Promise(r=>setImmediate(r))
  await v.markReports();assert.deepEqual(v.selectedKeys.value,[]);assert.match(v.errors.report,/response lost/);assert.match(v.errors.report,/選択し直してください/)
  await v.markReports();const reports=calls.filter(c=>c.action==='report');assert.equal(reports.length,1);assert.deepEqual(reports[0].reportTarget,originalTarget);assert.equal(v.notifications.length,0);assert.equal(v.reportConfirm.value,true)
 }
})

test('group field requirements default safely and apply equally to formal manual registration',async()=>{
 const {propertyFieldRequirements}=await import('../src/domain/property-field-requirements.mjs');
 assert.deepEqual(propertyFieldRequirements({name:'HSC'}),{addressRequired:true,insulationMaterialsRequired:true});
 assert.deepEqual(propertyFieldRequirements({name:'UH'}),{addressRequired:false,insulationMaterialsRequired:false});
 assert.throws(()=>propertyFieldRequirements({addressRequired:'false'}));assert.throws(()=>propertyFieldRequirements({insulationMaterialsRequired:null}));
 const input={name:'架空物件',buildingArea:100,applicationDate:'2026-10-01',handoverDate:'2026-10-02',address:'',foundationInsulation:true,insulationMaterials:''};
 assert.throws(()=>normalizeProperty(input,true));assert.equal(normalizeProperty(input,true,{name:'UH'}).address,'');
 assert.throws(()=>normalizeProperty(input,true,{addressRequired:false,insulationMaterialsRequired:true}),/資材/);
 assert.throws(()=>normalizeProperty({...input,insulationMaterials:'架空資材'},true,{addressRequired:true,insulationMaterialsRequired:false}),/住所/);
 const view=await prototypeViewForTest(async()=>({}));view.groups.value=[{id:'old',name:'UH'},{id:'new',name:'HSC'}];view.dialogCompanies.value=[{id:'c',defaultGroupId:'new'}];view.form.value={constructionCompanyId:'c'};
 assert.equal(view.propertyKeySettings.value.required,false);assert.equal(view.propertyRequirements.value.addressRequired,true);
 view.current.value={warrantyNumber:'issued',groupId:'old'};assert.equal(view.propertyKeySettings.value.required,true);assert.equal(view.propertyRequirements.value.addressRequired,false);
});


test('account scope change rejects delayed property list and keeps previous account rows cleared',async()=>{
 let resolve
 const v=await prototypeViewForTest(data=>data.action==='propertyList' ? new Promise(r=>resolve=r) : Promise.resolve({groups:[],companies:[],branches:[]}))
 v.rows.value=[{id:'old-visible'}]
 const pending=v.fetchRows()
 v.profile.value={uid:'new-user',accountType:'staff',role:'general_staff'}
 assert.deepEqual(v.rows.value,[])
 resolve({rows:[{id:'old-late'}],limited:true})
 await assert.rejects(pending)
 assert.deepEqual(v.rows.value,[])
})


test('certificate issuance is period-specific; selected month includes earlier unissued periods only', async()=>{
  const {certificatePeriods,certificateProjection,certificateRows,certificateCsv}=await import('../src/domain/warranty-certificate.mjs')
  const initial={id:'initial',startDate:'2026-10-06',expiryDate:'2036-10-05',issued:true}
  const row={id:'certificate',status:'active',years:20,handoverDate:'2026-10-06',applicationDate:'2026-09-01',history:[{kind:'extend',requestId:'ext',before:{years:10}}],certificateItems:[initial]}
  assert.deepEqual(certificatePeriods(row).map(p=>p.certificateIssued),[true,false])
  assert.deepEqual(certificateRows([row],'2026-09'),[])
  assert.equal(certificateRows([row],'2026-10')[0].certificatePeriodId,'initial')
  assert.equal(certificateRows([row],'2036-09').length,0)
  assert.equal(certificateRows([row],'2036-10')[0].certificatePeriodId,'ext')
  assert.equal(certificateRows([row],'2036-11')[0].certificatePeriodId,'ext')
  assert.equal(certificateProjection(row).certificatePendingMonth,'2036-10')
  assert.equal(certificateRows([{...row,status:'cancelled'}],'2036-10').length,0)
  assert.equal(certificatePeriods({...row,handoverDate:'2026-10-07'})[0].certificateIssued,false)
  const old={...row,certificateItems:[]};assert.equal(certificateRows([old],'2036-10').length,2)
  assert.equal(certificateProjection({...row,status:'cancelled'}).certificatePendingMonth,'')
  assert.equal(certificateCsv([{warrantyNumber:'A',name:'架空,物件',handoverDate:'2026-10-06',companyLabel:'会社',branchLabel:'本店'}]),'\uFEFF"保証書No","物件名","引渡日","担当工務店","担当本支店","住所"\r\n"A","架空,物件","2026-10-06","会社","本店",""')
})


test('billing backlog includes pending periods through selected month; CSV address remains optional', async()=>{
  const {billingProjection,pendingBillingRows}=await import('../src/domain/billing-output.mjs')
  const {certificateCsv}=await import('../src/domain/warranty-certificate.mjs')
  const row={id:'one',status:'active',years:20,applicationDate:'2026-09-01',handoverDate:'2026-10-06',history:[{kind:'extend',requestId:'ext',before:{years:10}}],billingItems:[{id:'initial',state:'pending'},{id:'ext',state:'pending'}]}
  assert.equal(billingProjection(row).billingPendingMonth,'2026-09')
  assert.equal(pendingBillingRows([row],'2026-08').length,0)
  assert.deepEqual(pendingBillingRows([row],'2036-10').map(r=>r.billingEventId),['initial','ext'])
  assert.equal(pendingBillingRows([{...row,billingItems:[{id:'initial',state:'billed'}]}],'2036-11').length,0)
  assert.equal(billingProjection({...row,status:'cancelled'}).billingPendingMonth,'')
  assert.equal(certificateCsv([{address:'東京都架空区1-1',buildingName:'架空棟'}]).split('\r\n')[1].endsWith('"東京都架空区1-1 架空棟"'),true)
})
