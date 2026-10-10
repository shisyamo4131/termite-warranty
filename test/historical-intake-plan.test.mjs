import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareHistoricalIntake} from '../scripts/lib/historical-intake-plan.mjs'

import {historicalFixture as fixture} from './helpers/historical-intake.mjs'
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
