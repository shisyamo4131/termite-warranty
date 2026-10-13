import {test} from 'node:test'
import assert from 'node:assert/strict'
import {planPropertyNames} from '../scripts/lib/property-name-migration.mjs'
const doc=(id,value)=>({id,data:()=>value})
test('name migration preserves name, phone and historical identity while binding all fields',()=>{
 const value={name:'架空物件',ownerName:'架空物件',ownerTelephone:'03-0000-0000',revision:4,history:[{before:{ownerName:'過去の架空名'}}],warrantyNumber:'FICTION-1'}
 const before=structuredClone(value),p=planPropertyNames([doc('one',value)])
 assert.deepEqual(value,before);assert.equal(p.rows.length,1);assert.equal(p.rows[0].fields.name,value.name);assert.equal(p.rows[0].fields.ownerName,value.ownerName)
 assert.notEqual(p.hash,planPropertyNames([doc('one',{...value,warrantyNumber:'FICTION-2'})]).hash)
 assert.equal(planPropertyNames([doc('one',{name:'架空物件',revision:5})]).rows.length,0)
})
test('name migration refuses unequal names, missing name and invalid revision',()=>{
 const p=planPropertyNames([doc('different',{name:'架空A',ownerName:'架空B'}),doc('missing',{ownerName:'架空'}),doc('revision',{name:'架空',ownerName:'架空',revision:-1})])
 assert.deepEqual(p.conflicts,['different','missing','revision']);assert.equal(p.rows.length,0)
})
