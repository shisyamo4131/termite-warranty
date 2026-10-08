import test from 'node:test'
import assert from 'node:assert/strict'
import {fixtureTasks} from './helpers/fixture-tasks.mjs'

test('fixture work is bounded and completes every independent task', async () => {
  let active=0, maximum=0, completed=0
  await fixtureTasks(Array.from({length:11},()=>async()=>{
    active++;maximum=Math.max(maximum,active)
    await new Promise(resolve=>setImmediate(resolve))
    active--;completed++
  }))
  assert.equal(maximum,4);assert.equal(active,0);assert.equal(completed,11)
})

test('a fixture failure waits for started siblings and never starts the next batch', async () => {
  let release, settled=false, completed=false, later=false
  const gate=new Promise(resolve=>{release=resolve})
  const result=fixtureTasks([()=>{throw Error('injected fixture failure')},async()=>{await gate;completed=true},()=>{later=true}],2)
  const checked=assert.rejects(result,error=>error instanceof AggregateError&&error.errors[0].message==='injected fixture failure')
  result.catch(()=>{settled=true})
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(settled,false);assert.equal(completed,false);assert.equal(later,false)
  release();await checked
  assert.equal(completed,true);assert.equal(later,false)
})

test('invalid fixture batches cannot start any task', async () => {
  let started=false
  for(const limit of [0,5,1.5])await assert.rejects(fixtureTasks([()=>{started=true}],limit))
  await assert.rejects(fixtureTasks([()=>{started=true},null]))
  assert.equal(started,false)
})
