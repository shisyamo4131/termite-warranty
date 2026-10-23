import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {compile} from '@vue/compiler-dom'
import * as Vue from 'vue'
import {renderToString} from 'vue/server-renderer'
import {csvCell,propertyAddress} from '../src/domain/property-warranty.mjs'
import {matchesSelectedInsurancePeriod,currentInsuranceSummary,nextInsuranceReportLabel} from '../app/utils/insuranceReportDisplay.mjs'
const period={id:'initial:1:1',warrantyPeriodId:'initial',basisRevision:1,half:1,startDate:'2025-10-01',expiryDate:'2030-09-30',state:'waived'}
test('selected period marker rejects corrected or re-extended identity even if dates match',()=>{
 assert.equal(matchesSelectedInsurancePeriod(period,{...period,insurancePeriodId:period.id}),true)
 assert.equal(matchesSelectedInsurancePeriod(period,{...period,insurancePeriodId:'initial:2:1'}),false)
 assert.equal(matchesSelectedInsurancePeriod(period,{...period,warrantyPeriodId:'new-extension'}),false)
 assert.equal(matchesSelectedInsurancePeriod(period,null),false)
})

// Execute the real component export handler with fictional reference data.
async function insuranceExport({branchId='branch',branchLabel='',branches=[{id:'branch'}],ensureReady=async()=>{},dirty=false}={}){
 const source=readFileSync(new URL('../app/components/MeetingPrototype.vue',import.meta.url),'utf8')
 const handler=source.match(/async function exportCsv\(\)\{[\s\S]*?\n\}/)?.[0]
 assert.ok(handler)
 let output,clicked=false
 const row={name:'架空物件',constructionCompanyId:'company',branchId,branchLabel,handoverDate:'2026-09-30',buildingArea:80}
 const anchor={click(){clicked=true}}
 const errors={}
 const env={busy:{value:false},reportDirty:{value:dirty},selectedRows:{value:[row]},references:{ensureReady},errors,companies:{value:[{id:'company'}]},branches:{value:branches},tab:{value:'report'},loadedReportMonth:{value:'2026-09'},filter:{month:'2026-10'},companyName:()=> '架空工務店',branchName:()=> '架空,「東」支店',propertyAddress,csvCell,Blob,URL:{createObjectURL(blob){output=blob;return 'blob:fictional'},revokeObjectURL(){}},document:{createElement:()=>anchor},setTimeout:fn=>fn()}
 await new Function(...Object.keys(env),handler+';return exportCsv()')(...Object.values(env))
 return {text:output ? new TextDecoder('utf-8',{ignoreBOM:true}).decode(await output.arrayBuffer()):null,clicked,errors,filename:anchor.download}
}
test('insurance CSV adds branch after company with BOM, escaping and unchanged blank application',async()=>{
 const result=await insuranceExport()
 assert.equal(result.clicked,true)
 assert.equal(result.filename,'保険報告_2026-09.csv')
 assert.equal(result.text.split('\r\n')[0],'\uFEFF"対象月","物件名","住所","工務店名","支店名","引渡日","建面積","保険申込"')
 assert.ok(result.text.endsWith('"架空工務店","架空,「東」支店","2026-09-30","80",""'))
 const labelled=await insuranceExport({branchLabel:'架空"西"支店'})
 assert.match(labelled.text,/,"架空""西""支店",/)
 const absent=await insuranceExport({branchId:'',branchLabel:'古い表示名'})
 assert.ok(absent.text.endsWith('"架空工務店","","2026-09-30","80",""'))
})
test('insurance CSV refuses missing references, loading failure and changed search conditions',async()=>{
 for(const options of [{branches:[]},{ensureReady:async()=>{throw new Error('参照失敗')}},{dirty:true}]){
  const result=await insuranceExport(options)
  assert.equal(result.clicked,false)
  assert.equal(result.text,null)
 }
})
test('shared billing/certificate template renders application date only for billing',async()=>{
 const source=readFileSync(new URL('../app/components/WarrantyCertificateManagement.vue',import.meta.url),'utf8')
 const cell=source.match(/<td>\{\{ row.warrantyNumber \}\}[\s\S]*?<\/td>/)?.[0]
 assert.ok(cell)
 const render=new Function('Vue',compile(cell,{mode:'function',prefixIdentifiers:true}).code)(Vue)
 for(const billing of [true,false]){
  const html=await renderToString(Vue.createSSRApp({render,data:()=>({billing,row:{warrantyNumber:'TEST',name:'架空物件',applicationDate:'2026-08-01',handoverDate:'2026-09-30'}})}))
  assert.ok(html.includes(billing?'申込日：2026-08-01':'引渡日：2026-09-30'))
  assert.ok(!html.includes(billing?'引渡日':'申込日'))
 }
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
