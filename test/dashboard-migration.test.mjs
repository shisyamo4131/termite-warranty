import {test} from 'node:test'
import assert from 'node:assert/strict'
import {prepareDashboardRow} from '../scripts/lib/dashboard-migration.mjs'
const at='2026-10-10T03:00:00.000Z',documentPath='propertyWarranties/fictional'
test('dashboard migration is idempotent, preserves original freshness and business history',()=>{
  const row={status:'draft',revision:7,updatedAt:'2026-01-01',history:[{kind:'edit',at:'2026-01-01'}]}
  const before=structuredClone(row),first=prepareDashboardRow(row,{at,documentPath})
  assert.equal(first.changed,true);assert.equal(first.next.revision,8)
  assert.equal(first.next.updatedAt,row.updatedAt);assert.deepEqual(first.next.history,row.history);assert.deepEqual(row,before)
  const second=prepareDashboardRow(first.next,{at:'2026-10-11T03:00:00.000Z',documentPath})
  assert.equal(second.changed,false);assert.deepEqual(second.next,first.next)
})
test('dashboard migration refuses unknown versions and unsafe revisions',()=>{
  for(const row of [{status:'draft',insuranceStateVersion:2},{status:'draft',revision:-1}])assert.throws(()=>prepareDashboardRow(row,{at,documentPath}))
})
