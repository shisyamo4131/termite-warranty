import {test} from 'node:test'
import assert from 'node:assert/strict'
import {planPropertyAddresses} from '../scripts/lib/property-address-migration.mjs'
const doc=(id,value)=>({id,data:()=>value})
test('address plan preserves postal/building and business data, repeats safely',()=>{
  const value={prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'1-1',postalCode:'1000001',buildingName:'架空棟',warrantyNumber:'HSC-26-001',revision:3}
  const before=structuredClone(value),p=planPropertyAddresses([doc('one',value)])
  assert.equal(p.rows[0].address,'東京都架空市1-1');assert.deepEqual(value,before)
  assert.equal(p.rows[0].revision,3);assert.equal(p.rows[0].fields.postalCode,undefined)
  assert.equal(planPropertyAddresses([doc('one',{address:p.rows[0].address,revision:4})]).rows.length,0)
})
test('address mismatch, explicit cleared address and bad revision refuse migration',()=>{
  const common={prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'1-1'}
  assert.deepEqual(planPropertyAddresses([doc('a',{...common,address:''}),doc('b',{...common,address:'別の住所'}),doc('c',{...common,revision:-1})]).conflicts,['a','b','c'])
  assert.equal(planPropertyAddresses([doc('same',{...common,address:'東京都架空市1-1'})]).rows.length,1)
})
test('plan binds changed business data and keeps absent fields distinct from empty',()=>{
  const value={prefecture:'東京都',revision:0,name:'架空物件'}
  const first=planPropertyAddresses([doc('a',value)])
  assert.notEqual(first.hash,planPropertyAddresses([doc('a',{...value,name:'別名'})]).hash)
  assert.equal(Object.hasOwn(first.rows[0].fields,'address'),false)
  assert.equal(Object.hasOwn(first.rows[0].fields,'municipality'),false)
})
