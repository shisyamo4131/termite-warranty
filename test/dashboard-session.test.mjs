import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDashboardSession } from '../app/utils/dashboardSession.mjs'
const fixture=()=>({version:1,counts:{active:3,insurancePending:1,warrantyNoticePending:2,billingPending:3},basisDate:'2026-10-10',basisMonth:'2026-10',startedAt:'2026-10-10T00:00:00Z',completedAt:'2026-10-10T00:00:01Z',warrantyMonths:2,runtimeGeneration:1})
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
test('initial, return, mutation, day change and manual refresh preserve the request budget',async()=>{
 let calls=0,date='2026-10-10';const store=createDashboardSession({fetch:async()=>{calls++;return fixture()},today:()=>date,generation:()=>1,publish:()=>{}})
 await store.ensure();await store.ensure();store.markStale();await store.ensure();date='2026-10-11';store.checkDate();await store.ensure()
 assert.equal(calls,1);assert.equal(store.getState().stale,true);await store.refresh();assert.equal(calls,2);assert.equal(store.getState().stale,true)
})
test('all four values and successful timestamp survive missing, negative, fractional or wrong-version results',async()=>{
 let result=fixture();const store=createDashboardSession({fetch:async()=>result,today:()=>result.basisDate,generation:()=>1,publish:()=>{}})
 await store.ensure();const previous=store.getState().value
 for(const bad of [{...fixture(),counts:{active:8}},{...fixture(),counts:{...fixture().counts,billingPending:-1}},{...fixture(),counts:{...fixture().counts,active:1.5}},{...fixture(),version:2}]){result=bad;await store.refresh();assert.equal(store.getState().value,previous);assert.ok(store.getState().error)}
})
test('first failure is unavailable and returning does not retry',async()=>{
 let calls=0;const store=createDashboardSession({fetch:async()=>{calls++;throw Error('offline')},today:()=>'',generation:()=>1,publish:()=>{}})
 await store.ensure();await store.ensure();assert.equal(calls,1);assert.equal(store.getState().value,null);assert.equal(store.getState().loading,false)
})
test('one in-flight request, changes during refresh remain stale',async()=>{
 const request=deferred();let calls=0;const store=createDashboardSession({fetch:()=>{calls++;return request.promise},today:()=>fixture().basisDate,generation:()=>1,publish:()=>{}})
 const a=store.refresh(),b=store.refresh();store.markStale();request.resolve(fixture());await Promise.all([a,b]);assert.equal(calls,1);assert.equal(store.getState().stale,true)
})
test('identity/reset fences both late success and failure from a new session',async()=>{
 for(const fails of [false,true]){const old=deferred();let calls=0;const store=createDashboardSession({fetch:()=>++calls===1?old.promise:Promise.resolve(fixture()),today:()=>fixture().basisDate,generation:()=>1,publish:()=>{}})
 const a=store.ensure();await Promise.resolve();store.reset();await store.ensure();const fresh=store.getState().value;if(fails)old.reject(Error('late'));else old.resolve({...fixture(),counts:{...fixture().counts,active:999}});await a;assert.equal(store.getState().value,fresh);assert.equal(store.getState().error,'')}
})
test('timeout releases refresh; a late old result never overwrites the next result',async()=>{
 const old=deferred();let calls=0;const store=createDashboardSession({fetch:()=>++calls===1?old.promise:Promise.resolve(fixture()),today:()=>fixture().basisDate,generation:()=>1,publish:()=>{},timeoutMs:5})
 await store.ensure();assert.ok(store.getState().error);await store.refresh();old.resolve({...fixture(),version:7});await Promise.resolve();assert.equal(store.getState().value.version,1);assert.equal(store.getState().error,'')
})
test('late authentication denial cannot clear a newer account or post-timeout refresh',async()=>{
 for(const boundary of ['account','timeout']) {
  const old=deferred();let calls=0;const store=createDashboardSession({fetch:()=>++calls===1?old.promise:Promise.resolve(fixture()),today:()=>fixture().basisDate,generation:()=>1,publish:()=>{},timeoutMs:5})
  const pending=store.ensure();await Promise.resolve()
  if(boundary==='account')store.reset();else await pending
  await store.refresh();const fresh=store.getState().value
  old.reject(Object.assign(new Error('permission denied'),{code:'functions/permission-denied'}));await pending;await Promise.resolve()
  assert.equal(store.getState().value,fresh);assert.equal(store.getState().error,'')
 }
})
test('current authentication denial hides previous counts and leaves refresh available',async()=>{
 let denied=false;const store=createDashboardSession({fetch:async()=>{if(denied)throw Object.assign(new Error('not authorized'),{code:'functions/unauthenticated'});return fixture()},today:()=>fixture().basisDate,generation:()=>1,publish:()=>{}})
 await store.ensure();denied=true;await store.refresh();assert.equal(store.getState().value,null);assert.equal(store.getState().loading,false);assert.equal(store.getState().error,'not authorized')
})
