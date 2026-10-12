import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as vue from 'vue'
import { companyProfileDefaults, normalizeCompanyProfile } from '../src/domain/company-settings.mjs'
import { postalRule, lengthRule, phoneRule, emailRule } from '../src/domain/input-rules.mjs'
import { propertyAddress } from '../src/domain/property-warranty.mjs'

function harness(t, fetch) {
  const profile = vue.ref({accountType:'staff', role:'house_solution_administrator', uid:'fictional-admin'})
  const recoveryRuntime = vue.ref({phase:'normal',generation:1})
  const scopes=[]
  const source=readFileSync(new URL('../app/composables/useCompanyProfile.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace('export function useCompanyProfile','function useCompanyProfile')
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  const env={...vue,effectScope:()=>{const scope=vue.effectScope(true);scopes.push(scope);return scope},useNuxtApp:()=>({$firebase:{functions:{}}}),useSession:()=>({profile}),httpsCallable:()=>async data=>({data:await fetch(data)}),withRuntimeGeneration:x=>x,recoveryRuntime,companyProfileDefaults,normalizeCompanyProfile}
  const store=new Function(...Object.keys(env),code+'\nreturn useCompanyProfile();')(...Object.values(env))
  t.after(()=>scopes.forEach(scope=>scope.stop()))
  return {store,profile,recoveryRuntime}
}
test('profile cache avoids repeat reads; edit refresh and save replace shared value',async t=>{
  const calls=[]
  const {store}=harness(t,async input=>{calls.push(input);return {...companyProfileDefaults(),companyName:input.profile?.companyName || '架空会社',updatedByName:'架空管理者'}})
  await store.load();await store.load();assert.equal(calls.length,1)
  await store.load(true);assert.equal(calls.length,2)
  await store.save({...companyProfileDefaults(),companyName:'変更後の架空会社'})
  assert.equal(calls[2].action,'saveCompanyProfile');assert.equal(store.value.value.companyName,'変更後の架空会社')
})
test('identity reset discards late replies and clears previous company values',async t=>{
  let resolve
  const {store,profile}=harness(t,()=>new Promise(done=>{resolve=done}))
  const pending=store.load()
  profile.value={accountType:'staff',role:'general_staff',uid:'fictional-other'}
  resolve({...companyProfileDefaults(),companyName:'old'})
  await assert.rejects(pending,/利用状態/)
  assert.equal(store.value.value,null);assert.equal(store.loading.value,false)
})
test('general staff cannot save; portal cannot read; verification admins only read',async t=>{
  let calls=0
  const {store,profile,recoveryRuntime}=harness(t,async()=>{calls++;return companyProfileDefaults()})
  profile.value={accountType:'staff',role:'general_staff',uid:'fictional-staff'}
  await store.load();await assert.rejects(store.save({...companyProfileDefaults(),companyName:'架空'}),/変更できません/)
  profile.value={accountType:'construction_company',role:'',uid:'fictional-company'}
  await assert.rejects(store.load(),/参照できません/)
  profile.value={accountType:'staff',role:'house_solution_administrator',uid:'fictional-admin'}
  recoveryRuntime.value={phase:'verification',generation:2};await store.load()
  await assert.rejects(store.save({...companyProfileDefaults(),companyName:'架空'}),/変更できません/)
  assert.equal(calls,2)
})
test('failed refresh retains previous value, next load can retry',async t=>{
  let fail=false
  const {store}=harness(t,async()=>{if(fail)throw new Error('通信失敗');return {...companyProfileDefaults(),companyName:'架空会社'}})
  await store.load();fail=true;await assert.rejects(store.load(true),/通信失敗/)
  assert.equal(store.value.value.companyName,'架空会社');assert.equal(store.loading.value,false)
  fail=false;await store.load(true)
})

test('screen retry actually refetches after a failed edit refresh despite existing cache',async t=>{
  let calls=0,fail=false
  const {store,profile,recoveryRuntime}=harness(t,async()=>{calls++;if(fail)throw new Error('通信失敗');return {...companyProfileDefaults(),companyName:`架空会社${calls}`}})
  const file=readFileSync(new URL('../app/components/CompanySettings.vue',import.meta.url),'utf8')
  const source=file.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*\n/gm,'')
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
  const scope=vue.effectScope()
  const env={ref:vue.ref,computed:vue.computed,watch:vue.watch,useCompanyProfile:()=>store,useSession:()=>({profile}),useAppSnackbar:()=>({showSnackbar(){},showValidationError(){}}),defineEmits:()=>()=>{},defineExpose:()=>{},onMounted:()=>{},onBeforeUnmount:()=>{},companyProfileDefaults,normalizeCompanyProfile,requiredRules:[],optionalRules:[],recoveryRuntime}
  const view=scope.run(()=>new Function(...Object.keys(env),code+'\nreturn {load,edit,error,editing};')(...Object.values(env)))
  t.after(()=>scope.stop())
  await view.load();await view.load();assert.equal(calls,1)
  fail=true;await view.edit();assert.equal(calls,2);assert.match(view.error.value,/通信失敗/);assert.equal(view.editing.value,false)
  // Execute the actual retry-button expression so template wiring is covered.
  const expression=file.match(/@click="([^"]+)">再取得/)[1]
  await new Function('load',`return ${expression}`)(view.load)
  assert.equal(calls,3);assert.match(view.error.value,/通信失敗/)
  fail=false;await new Function('load',`return ${expression}`)(view.load)
  assert.equal(calls,4);assert.equal(view.error.value,'');assert.equal(store.value.value.companyName,'架空会社4')
})

function contact(t, outcome) {
  const form=vue.ref({postalCode:'1234567',address1:'',address2:'建物',telephone:'',email:''})
  let lookups=0
  const scope=vue.effectScope()
  const source=readFileSync(new URL('../app/components/BusinessContactFields.vue',import.meta.url),'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*\n/gm,'')
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
  const env={ref:vue.ref,watch:vue.watch,defineProps:()=>({}),defineModel:()=>form,onBeforeUnmount:()=>{},postalRule,lengthRule,phoneRule,emailRule,propertyAddress,hostedPostalLookupProvider:{},createPostalLookupCoordinator:()=>({cancel(){},async lookup(){lookups++;return outcome()}})}
  const result=scope.run(()=>new Function(...Object.keys(env),code+'\nreturn {lookup,applyCandidate,candidates};')(...Object.values(env)))
  t.after(()=>scope.stop())
  return {...result,form,lookups:()=>lookups}
}
test('postal lookup never replaces an existing address or building',async t=>{
  const v=contact(t,()=>({state:'current',result:{status:'resolved',address:{prefecture:'架空県',municipality:'架空市',streetTownAndNumber:'架空町'}}}))
  v.form.value.address1='手入力の住所';await v.lookup();assert.equal(v.lookups(),0)
  v.form.value.address1='';await v.lookup();assert.equal(v.form.value.address1,'架空県架空市架空町');assert.equal(v.form.value.address2,'建物')
})
test('postal response after manual edit cannot overwrite address',async t=>{
  let resolve
  const v=contact(t,()=>new Promise(done=>resolve=done))
  const pending=v.lookup();v.form.value.address1='編集中の住所'
  resolve({state:'current',result:{status:'resolved',address:{prefecture:'架空県'}}});await pending
  assert.equal(v.form.value.address1,'編集中の住所')
})
