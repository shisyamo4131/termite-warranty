import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectScope, nextTick, ref } from 'vue'
import { usePaginationScroll } from '../app/composables/usePaginationScroll.ts'

function setup(t) {
  const scope=effectScope(), page=ref(1)
  const table=scope.run(()=>usePaginationScroll(page))
  t.after(()=>scope.stop())
  const wrapper={scrollTop:300,scrollLeft:80}
  const root={querySelector:()=>wrapper,parentElement:null,ownerDocument:{body:{},documentElement:{}}}
  table.value={$el:root}
  return {scope,page,table,wrapper,root}
}
test('forward/back page changes reset vertical position after update; same page and horizontal position stay intact',async t=>{
  const v=setup(t)
  v.page.value=2;assert.equal(v.wrapper.scrollTop,300)
  await nextTick();assert.equal(v.wrapper.scrollTop,0);assert.equal(v.wrapper.scrollLeft,80)
  v.wrapper.scrollTop=150;v.page.value=2;await nextTick();assert.equal(v.wrapper.scrollTop,150)
  v.page.value=1;await nextTick();assert.equal(v.wrapper.scrollTop,0)
})
test('only the matching table resets; unmounted or missing tables do not throw',async t=>{
  const a=setup(t),b=setup(t)
  a.page.value=2;await nextTick();assert.equal(b.wrapper.scrollTop,300)
  a.table.value=null;a.page.value=3;await nextTick()
  b.scope.stop();b.page.value=2;await nextTick();assert.equal(b.wrapper.scrollTop,300)
})
test('scrolling workspace reveals the first row while preserving horizontal position and document scroll',async t=>{
  const v=setup(t),body={scrollTop:77}
  const previous=globalThis.getComputedStyle
  globalThis.getComputedStyle=()=>({overflowY:'auto'})
  t.after(()=>{if(previous)globalThis.getComputedStyle=previous;else delete globalThis.getComputedStyle})
  const parent={scrollHeight:900,clientHeight:200,clientTop:1,scrollTop:400,scrollLeft:25,parentElement:body,getBoundingClientRect:()=>({top:10})}
  v.root.parentElement=parent;v.root.ownerDocument.body=body;v.root.getBoundingClientRect=()=>({top:-89})
  v.page.value=2;await nextTick()
  assert.equal(parent.scrollTop,300);assert.equal(parent.scrollLeft,25);assert.equal(body.scrollTop,77)
  parent.scrollTop=400;v.root.getBoundingClientRect=()=>({top:40});v.page.value=3;await nextTick();assert.equal(parent.scrollTop,400)
})
