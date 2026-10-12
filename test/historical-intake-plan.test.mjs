import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareHistoricalIntake} from '../scripts/lib/historical-intake-plan.mjs'

import {historicalFixture as fixture} from './helpers/historical-intake.mjs'
import {Timestamp} from 'firebase-admin/firestore'
import {typed} from '../scripts/lib/default-recovery.mjs'
import {captureIntakeSettings,restoreIntakeSettings} from '../scripts/lib/historical-intake-settings.mjs'
const prepare=input=>prepareHistoricalIntake(input,{today:'2026-10-10'})
test('442 fictional records preserve numbers, initial states, deterministic IDs and untouched source',()=>{
  const input=fixture(),original=structuredClone(input),plan=prepare(input)
  assert.deepEqual(input,original);assert.deepEqual(prepare(input),plan)
  assert.equal(plan.summary.properties,442);assert.deepEqual(plan.summary.errors,[])
  const values=plan.documents.filter(r=>r.path.startsWith('propertyWarranties/')).map(r=>r.data)
  assert.deepEqual(values.map(v=>v.warrantyNumber),input.rows.map(v=>v.warrantyNumber))
  for(const v of values){assert.equal(v.years,10);assert.equal(v.billingItems[0].state,'billed');assert.equal(v.certificateItems[0].issued,true);assert.equal(v.insurancePeriods.length,2);assert.ok(v.insurancePeriods.every(p=>p.state==='pending'));assert.equal(v.receivedRecordId,undefined);assert.deepEqual(v.history,[])}
})
test('counters follow preserved number year and reserved gaps, not application year',()=>{
  const input=fixture();input.rows[0].warrantyNumber='HSC-25-999';input.reservedNumbers=[{group:'HSC',number:'HSC-25-1001',reference:'fictional excluded source'}]
  const plan=prepare(input);assert.equal(plan.summary.counters.find(x=>x.id==='HSC_2025').nextValue,1002);assert.equal(plan.summary.yearDifferences.length,1)
})
test('missing, extra, duplicated, unmapped and invalid rows fail closed',()=>{
  for(const change of [i=>i.rows.pop(),i=>i.rows.push({...i.rows[0],sourceRow:999,warrantyNumber:'HSC-26-998'}),i=>i.rows[1].warrantyNumber=i.rows[0].warrantyNumber,i=>i.rows[0].branchId='unknown',i=>i.rows.at(-1).externalKey='bad',i=>i.rows.at(-1).fields.maxYears=20,i=>i.branches[0].address={postalCode:'bad'},i=>delete i.decisions['S-03'],i=>i.rows[0].fields.handoverDate='2026-02-30']){const input=fixture();change(input);assert.throws(()=>prepare(input))}
  assert.throws(()=>prepareHistoricalIntake(fixture(),{today:'2026-02-30'}))
})
test('expired initial warranty is a blocking issue instead of automatic extension',()=>{
  const input=fixture();input.rows[0].fields.handoverDate='2010-01-01';const p=prepare(input)
  assert.equal(p.summary.errors[0].code,'INITIAL_WARRANTY_EXPIRED');assert.equal(p.documents.find(d=>d.path.startsWith('propertyWarranties/')).data.years,10)
})
test('preserved company and billing settings bind the plan; names are not identity and timestamps survive',()=>{
  const original=prepare(fixture()),group=original.documents.find(row=>row.path==='warrantyGroups/HSC').data
  const profile={companyName:'架空株式会社',bankName:'架空銀行',bankBranchName:'架空支店',bankAccountType:'普通',bankAccountNumber:'0012345',bankAccountHolder:'架空株式会社',updatedAt:new Timestamp(1000,123),updatedBy:'fictional'},recipient={name:'架空請求先',department:'経理'}
  const image=new Map([['prototypeSettings/companyProfile',{fields:profile}],['warrantyGroups/HSC',{fields:{...group,name:'名称は変更可能',billingRecipient:recipient}}]])
  const preserved=captureIntakeSettings(image),input=fixture();input.preservedBusinessSettings=preserved
  const plan=prepare(input);assert.notEqual(plan.planDigest,original.planDigest)
  const docs=restoreIntakeSettings(structuredClone(plan.documents),plan.preservedSettings)
  assert.deepEqual(docs.find(r=>r.path==='prototypeSettings/companyProfile').data,profile)
  assert.deepEqual(docs.find(r=>r.path==='warrantyGroups/HSC').data.billingRecipient,recipient)
  assert.deepEqual(plan.summary.counters,original.summary.counters)
  for(const mutate of [v=>v.billingRecipients.push(v.billingRecipients[0]),v=>v.billingRecipients[0].groupId='renamed-id',v=>v.billingRecipients[0].identity.prefix='DIFFERENT',v=>v.companyProfile=typed('invalid')]){const bad=structuredClone(input);mutate(bad.preservedBusinessSettings);assert.throws(()=>prepare(bad))}
  assert.throws(()=>captureIntakeSettings(new Map([['warrantyGroups/unknown',{fields:{...group,billingRecipient:recipient}}]])))
})
