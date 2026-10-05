import { nextInsuranceReportLabel } from '../app/utils/insuranceReportDisplay.mjs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { coveragePeriods, fiscalYear, warrantyNumber, initialGroups, japanDate, reportRows, csvCell, normalizeProperty } from '../src/domain/property-warranty.mjs'

test('first insurance period skips elapsed uninsured periods without inventing reports', async () => {
  const {initialInsurancePeriodAt}=await import('../src/domain/property-warranty.mjs')
  const row={status:'active',handoverDate:'2016-10-06',expiryDate:'2026-10-05',insuranceReported:false}
  const before=structuredClone(row)
  assert.equal(initialInsurancePeriodAt(row,'2021-10-05').insuranceStartDate,'2016-10-06')
  const second=initialInsurancePeriodAt(row,'2021-10-06')
  assert.equal(second.insuranceStartDate,'2021-10-06')
  assert.equal(second.insuranceExpiryDate,'2026-10-05')
  assert.equal(second.insuranceReported,false)
  assert.equal(second.insuranceEverRenewed,false)
  assert.equal(second.insuranceLastReport,null)
  assert.equal(initialInsurancePeriodAt(row,'2023-10-01').insuranceStartDate,'2021-10-06')
  assert.equal(initialInsurancePeriodAt(row,'2026-10-05').insuranceExpiryDate,'2026-10-05')
  assert.equal(initialInsurancePeriodAt(row,'2026-10-06'),null)
  assert.equal(initialInsurancePeriodAt({...row,expiryDate:'2036-10-05'},'2026-10-06').insuranceStartDate,'2026-10-06')
  assert.equal(initialInsurancePeriodAt({...row,status:'cancelled'},'2023-10-01'),null)
  assert.equal(initialInsurancePeriodAt({...row,insuranceReported:true},'2023-10-01'),null)
  assert.equal(initialInsurancePeriodAt(row,'2016-10-05'),null)
  assert.throws(()=>initialInsurancePeriodAt(row,'2026-02-30'))
  const leap={...row,handoverDate:'2016-02-29',expiryDate:'2026-02-28'}
  assert.equal(initialInsurancePeriodAt(leap,'2021-02-28').insuranceExpiryDate,'2021-02-28')
  assert.equal(initialInsurancePeriodAt(leap,'2021-03-01').insuranceStartDate,'2021-03-01')
  assert.equal(initialInsurancePeriodAt(leap,'2026-03-01'),null)
  assert.deepEqual(row,before)
})

test('extension billing uses coverage start month, independent of procedure month and billing state', async () => {
  const {billingRows}=await import('../src/domain/property-warranty.mjs')
  const row={status:'active',years:20,handoverDate:'2026-10-06',applicationDate:'2026-09-01',history:[{kind:'extend',requestId:'e',date:'2027-03-01',before:{years:10}}],billingItems:[{id:'e',state:'billed'}]}
  assert.equal(billingRows([row],'2027-03').length,0)
  assert.equal(billingRows([row],'2026-09')[0].billingKind,'新規')
  const result=billingRows([row],'2036-10')
  assert.equal(result.length,1)
  assert.equal(result[0].billingDate,'2036-10-06')
  assert.equal(result[0].billingState,'billed')
  assert.equal(billingRows([{...row,status:'cancelled'}],'2036-10').length,0)
})

test('initial report follows selected month and keeps final-month candidates for HS selection', async () => {
  const {initialInsurance,insuranceReportKind,insuranceReportTarget}=await import('../src/domain/property-warranty.mjs')
  const row={status:'active',years:10,handoverDate:'2016-10-06',expiryDate:'2026-10-05',...initialInsurance('2016-10-06'),insuranceEvents:[]}
  const target=insuranceReportTarget(row,'2021-10','2040-01-01')
  assert.equal(target.startDate,'2021-10-06');assert.equal(target.expiryDate,'2026-10-05')
  assert.deepEqual(insuranceReportTarget(row,'2021-10','2021-11-01'),target)
  assert.equal(insuranceReportTarget(row,'2021-09').startDate,'2016-10-06')
  assert.equal(insuranceReportTarget(row,'2026-10').expiryDate,'2026-10-05')
  assert.equal(insuranceReportTarget(row,'2026-11'),null)
  assert.equal(insuranceReportKind({...row,insuranceHistoryIncomplete:true},'2021-10'),'review')
  const monthEnd={...row,handoverDate:'2020-10-01',expiryDate:'2030-09-30',...initialInsurance('2020-10-01')}
  assert.equal(insuranceReportTarget(monthEnd,'2030-09','2030-10-01').expiryDate,'2030-09-30')
  assert.equal(insuranceReportTarget(monthEnd,'2030-10'),null)
})

test('fiscal boundary and minimum three digit annual numbers', () => {
  assert.equal(fiscalYear('2027-03-31', 4), 2026)
  assert.equal(fiscalYear('2027-04-01', 4), 2027)
  assert.equal(warrantyNumber(initialGroups[1], '2027-03-31', 999), 'SHS-26-999')
  assert.equal(warrantyNumber(initialGroups[1], '2027-04-01', 1000), 'SHS-27-1000')
  assert.equal(warrantyNumber(initialGroups[2], '2026-10-01', 1), '26-001')
  assert.equal(japanDate(new Date('2026-09-30T15:00:00Z')), '2026-10-01')
})

test('confirmed property validation: optional postal, required handover, materials and area precision',()=>{
  const f={name:'架空',ownerName:'架空',prefecture:'東京都',municipality:'架空市',streetTownAndNumber:'1',buildingArea:10.12,applicationDate:'2026-10-01',handoverDate:'2026-10-01'}
  assert.equal(normalizeProperty(f,true).postalCode,'')
  assert.throws(()=>normalizeProperty({...f,handoverDate:''},true))
  assert.throws(()=>normalizeProperty({...f,buildingArea:10.123},true))
  assert.throws(()=>normalizeProperty({...f,postalCode:'123'},true))
  assert.throws(()=>normalizeProperty({...f,foundationInsulation:true},true))
  assert.equal(normalizeProperty({...f,foundationInsulation:true,insulationMaterials:'架空資材'},true).insulationMaterials,'架空資材')
})

test('insurance uses expiry month, pending categories, continuous renewal and legacy guard',async()=>{
  const { initialInsurance, insuranceReportKind, nextInsurancePeriod, billingRows }=await import('../src/domain/property-warranty.mjs')
  const row={status:'active',handoverDate:'2025-10-01',expiryDate:'2035-09-30',...initialInsurance('2025-10-01')}
  assert.equal(row.insuranceRenewalMonth,'203009')
  assert.equal(insuranceReportKind(row,'2025-10'),'new')
  assert.equal(insuranceReportKind(row,'2026-10'),'past-new')
  assert.equal(insuranceReportKind({...row,insuranceReported:true},'2026-10'),'')
  assert.equal(insuranceReportKind({...row,insuranceReported:true},'2030-09'),'renewal')
  assert.equal(insuranceReportKind({...row,insuranceReported:true},'2030-10'),'past-renewal')
  assert.equal(insuranceReportKind(row,'2030-10'),'past-new')
  assert.equal(insuranceReportKind(row,'2025-10','2030-10-01'),'new')
  assert.equal(insuranceReportKind({...row,status:'cancelled'},'2025-10'),'')
  assert.equal(nextInsurancePeriod(row).insuranceExpiryDate,'2035-09-30')
  assert.equal(insuranceReportKind({...row,insuranceReported:true,...nextInsurancePeriod(row)},'2035-09'),'')
  assert.equal(initialInsurance('2025-10-06').insuranceRenewalMonth,'203010')
  assert.equal(initialInsurance('2024-02-29').insuranceExpiryDate,'2029-02-28')
  assert.throws(()=>insuranceReportKind(row,'2030-13'))
  assert.equal(billingRows([{...row,years:20,applicationDate:'2025-10-03',history:[{kind:'extend',requestId:'extend',before:{years:10},date:'2026-10-02'}]}],'2035-10')[0].billingKind,'延長')
})
test('coverage uses consecutive ten-year periods including leap-day handover', () => {
  const periods = coveragePeriods('2024-02-29', 30)
  assert.equal(periods[0].expiryDate, '2034-02-28')
  assert.equal(periods[1].startDate, '2034-03-01')
  assert.equal(periods.at(-1).expiryDate, '2054-02-28')
  assert.throws(()=>coveragePeriods('2024-02-30', 10))
})

test('transactions expose distinct ten-year bills and explicit insurance target across same-month renewals',async()=>{
 const {warrantyTransactions,initialInsurance,insuranceReportTarget,nextInsurancePeriod,handoverChangeBlockers}=await import('../src/domain/property-warranty.mjs')
 const row={status:'active',years:30,handoverDate:'2026-10-06',applicationDate:'2026-10-04',expiryDate:'2056-10-05',...initialInsurance('2026-10-06'),history:[{kind:'extend',requestId:'e1',date:'2026-10-04',before:{years:10}},{kind:'extend',requestId:'e2',date:'2026-10-04',before:{years:20}}]}
 assert.deepEqual(warrantyTransactions(row).map(p=>[p.id,p.startDate,p.billingState]),[['initial','2026-10-06','unknown'],['e1','2036-10-06','unknown'],['e2','2046-10-06','unknown']])
 row.insuranceReported=true
 const first=insuranceReportTarget(row,'2036-10','2026-10-04')
 assert.equal(first.warrantyPeriodId,'initial');assert.equal(first.startDate,'2031-10-06')
 Object.assign(row,nextInsurancePeriod(row))
 const second=insuranceReportTarget(row,'2036-10','2026-10-04')
 assert.equal(second.warrantyPeriodId,'e1');assert.equal(second.startDate,'2036-10-06')
 assert.notDeepEqual(first,second)
 const reversed={...row,years:10,history:[],insuranceEvents:[],insuranceReported:false,insuranceEverRenewed:true,billingItems:[{id:'initial',state:'pending'}]}
 assert.deepEqual(handoverChangeBlockers(reversed),[])
 assert.ok(handoverChangeBlockers({...reversed,billingItems:[]}).some(x=>x.includes('未確認')))
})
test('insurance report uses inclusive handover dates regardless of registration or extension dates', () => {
  const row={id:'a', status:'active',handoverDate:'2026-09-01',history:[{kind:'register',date:'2026-10-02'}]}
  const input=[row,{...row,id:'end',handoverDate:'2026-09-30'},{...row,id:'cancel',status:'cancelled'},{...row,id:'draft',status:'draft'},{...row,id:'missing',handoverDate:''},{...row,id:'outside',handoverDate:'2026-10-01'}]
  assert.deepEqual(reportRows(input,'2026-09-01','2026-09-30').map(r=>r.id),['a','end'])
  assert.deepEqual(reportRows(input,'2026-09-01','2026-09-30',true).map(r=>r.id),['a','end','cancel'])
  assert.throws(()=>reportRows([],'2026-10-01','2026-09-01'))
  assert.throws(()=>reportRows([],'2026-02-30','2026-03-01'))
})
test('draft allows pending handover; formal registration requires complete property fields', () => {
  assert.equal(normalizeProperty({name:'架空物件'},false).maxYears,20)
  assert.throws(()=>normalizeProperty({name:'架空物件'},true))
  assert.throws(()=>normalizeProperty({name:'架空物件',buildingArea:-1},false))
  assert.throws(()=>normalizeProperty({name:'架空物件',applicationDate:'2026-02-30'},false))
  assert.equal(normalizeProperty({name:'架空物件',applicationDate:'2026-09-30'},false).applicationDate,'2026-09-30')
  assert.equal(csvCell('=1+1'),'"\'=1+1"')
  assert.equal(csvCell('a"b'),'"a""b"')
})


test('calendar-month alerts include boundary and overdue, excluding unknown dates and cancellation', async () => {
  const { alertStartDate, expiryAlertEligible, insuranceExpiryDate, normalizeAlertSettings, matchesProperty } = await import('../src/domain/property-warranty.mjs')
  assert.equal(alertStartDate('2027-04-30',2),'2027-02-28')
  assert.equal(alertStartDate('2028-04-30',2),'2028-02-29')
  const row={status:'active',expiryDate:'2027-04-30',insuranceExpiryDate:'2027-04-30'}
  assert.equal(expiryAlertEligible(row,'warranty','2027-02-27'),false)
  assert.equal(expiryAlertEligible(row,'warranty','2027-02-28'),true)
  assert.equal(expiryAlertEligible(row,'insurance','2027-05-01'),true)
  assert.equal(expiryAlertEligible({...row,status:'cancelled'},'insurance','2027-05-01'),false)
  assert.equal(expiryAlertEligible({status:'active'},'insurance','2027-05-01'),false)
  assert.equal(insuranceExpiryDate('2026-10-01'),'2031-09-30')
  assert.equal(insuranceExpiryDate(''),'')
  assert.deepEqual(normalizeAlertSettings(),{warrantyMonths:2,insuranceMonths:2})
  assert.throws(()=>normalizeAlertSettings({warrantyMonths:0}))
  assert.throws(()=>normalizeAlertSettings({insuranceMonths:1.5}))
  assert.equal(matchesProperty({handoverDate:''},{handoverMissing:'yes'}),true)
  assert.equal(matchesProperty({handoverDate:'2026-10-01'},{handoverMissing:'yes'}),false)
})
import { readFileSync } from 'node:fs'
import ts from 'typescript'

test('session read failure releases loading, retry works, stale login cannot replace a newer account',async()=>{
  const source=readFileSync(new URL('../app/composables/useSession.ts',import.meta.url),'utf8')
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  let authCallback, snapshotCallback, rejectReads=true, reads=[], auth={currentUser:{uid:'first'}}
  const api={browserSessionPersistence:{},onAuthStateChanged:(_,cb)=>{authCallback=cb},signOut:async()=>{},setPersistence:async()=>{},signInWithEmailAndPassword:async()=>{},sendPasswordResetEmail:async()=>{}}
  const firestore={doc:(_,collection,uid)=>({path:`${collection}/${uid}`}),getDoc:ref=>rejectReads ? Promise.reject(Error('offline')) : new Promise(resolve=>reads.push(()=>resolve({exists:()=>ref.path.startsWith('staffAccounts/')}))),onSnapshot:(ref,cb)=>{snapshotCallback=()=>cb({exists:()=>true,ref,data:()=>({enabled:true,role:'general_staff',displayName:ref.path})});return ()=>{}}}
  const exports={};new Function('require','exports','shallowRef','ref','useNuxtApp',compiled)(name=>name==='firebase/auth'?api:firestore,exports,value=>({value}),value=>({value}),()=>({$firebase:{auth,firestore:{}}}))
  const session=exports.useSession()
  await authCallback(auth.currentUser)
  assert.equal(session.loading.value,false);assert.match(session.errorMessage.value,/再試行/)
  rejectReads=false
  const stale=session.retryProfile();const staleReads=reads.splice(0)
  auth.currentUser={uid:'second'};const fresh=authCallback(auth.currentUser);reads.splice(0).forEach(r=>r());await fresh;snapshotCallback()
  assert.equal(session.profile.value.uid,'second')
  staleReads.forEach(r=>r());await stale;assert.equal(session.profile.value.uid,'second')
  await authCallback(null);assert.equal(session.profile.value,null);assert.equal(session.loading.value,false)
})


test('prefix separator is automatic, omitted when empty, compatible with legacy trailing hyphens',()=>{
  for(const prefix of ['HSC','HSC-','HSC--',' HSC- '])assert.equal(warrantyNumber({prefix,fiscalStartMonth:1},'2026-10-01',1),'HSC-26-001')
  assert.equal(warrantyNumber({prefix:'',fiscalStartMonth:1},'2026-10-01',1000),'26-1000')
  assert.equal(warrantyNumber({prefix:'AB-CD',fiscalStartMonth:4},'2026-03-31',1),'AB-CD-25-001')
})


async function prototypeViewForTest(invoke,sendMail=async()=>{}){
  const {readFile}=await import('node:fs/promises')
  const ts=(await import('typescript')).default
  const vue=await import('vue')
  const source=(await readFile(new URL('../app/components/MeetingPrototype.vue',import.meta.url),'utf8')).split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*$/gm,'')
  const inputRules=await import('../src/domain/input-rules.mjs')
  const notifications=[];const env={sendPasswordResetEmail:sendMail,window:{location:{origin:"http://fictional.invalid"}},nextInsuranceReportLabel,notifications,useAppSnackbar:()=>({showValidationError:()=>notifications.push("validation"),showSnackbar:(...args)=>notifications.push(args)}),...(await import('../src/domain/property-warranty.mjs')),...inputRules,nextTick:vue.nextTick,ref:vue.ref,reactive:vue.reactive,computed:vue.computed,watch:vue.watch,onMounted:()=>{},onUnmounted:()=>{},...(await import('../src/domain/reference-fetch-cache.mjs')),useNuxtApp:()=>({$firebase:{functions:{},auth:{}}}),useSession:()=>({profile:vue.ref({accountType:'staff',role:'house_solution_administrator'}),logout:()=>{}}),httpsCallable:()=>async data=>({data:await invoke(data)}),japanDate:()=> '2026-10-04',coveragePeriods,normalizeWarrantyPrefix:()=>'',hostedPostalLookupProvider:{}}
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
  return new Function(...Object.keys(env),code+';return {referenceCache,loadCatalog,profile,rows,reportKey,reportDirty,clearFilter,selectedKeys,selectedRows,reportConfirm,markReports,accountCreated,detailsOpen,searchForm,loadRows,appliedPropertyFilters,removePropertyFilter,current,maxYearsRule,maxYearsOptions,historyFields,tab,filter,fetchRows,insuranceRenewalLabel,companies,branches,dialogCompanies,dialogBranches,propertyDialog,form,notifications,catalogBusy,catalogError,busy,resetDialogCatalog,fetchCompanyOptions,choosePropertyCompany,selectPropertyCompany,confirmRegistration,confirmWarnings,registrationWarnings,openRegistrationConfirmation,propertyForm,settingForm,accountForm,errors,run,settingDialog,accountDialog,confirmation,saveSetting,saveProperty,createAccount};')(...Object.values(env))
}

test('dialog company search preserves background catalog and selected company; branch fetch has local loading',async()=>{
  let resolve
  const view=await prototypeViewForTest(()=>new Promise(r=>{resolve=r}))
  view.companies.value=[{id:'chosen',name:'選択中'}];view.branches.value=[{id:'background'}]
  view.resetDialogCatalog();view.propertyDialog.value=true;view.form.value.constructionCompanyId='chosen';view.form.value.branchId='old'
  const search=view.fetchCompanyOptions('検索')
  assert.equal(view.catalogBusy.value,false);assert.equal(view.busy.value,false)
  await Promise.resolve()
  resolve({groups:[{id:"g"}],companies:[{id:'found',name:'検索一致',defaultGroupId:'g'}],branches:[{id:'unrelated'}]});await search
  assert.deepEqual(view.companies.value.map(x=>x.id),['chosen'])
  assert.deepEqual(view.branches.value.map(x=>x.id),['background'])
  assert.deepEqual(view.dialogCompanies.value.map(x=>x.id),['chosen'])
  assert.equal(view.form.value.branchId,'old')
  view.choosePropertyCompany({id:'found',name:'検索一致'});assert.equal(view.catalogBusy.value,true);assert.equal(view.busy.value,false);assert.equal(view.form.value.branchId,'')
  await Promise.resolve()
  resolve({branches:[{id:'found-branch'}]});await new Promise(r=>setImmediate(r))
  assert.deepEqual(view.dialogBranches.value.map(x=>x.id),['found-branch']);assert.equal(view.catalogBusy.value,false)
})

test('reference cache integration reuses catalog, forces refresh, invalidates on master save and identity change; lists remain fresh', async()=>{
  const calls=[]
  const v=await prototypeViewForTest(async data=>{
    calls.push(data.action)
    if(data.action==='saveCompany')return {id:'new-company'}
    return {companies:[],branches:[],groups:[],rows:[],limited:true,warrantyMonths:2,insuranceMonths:2}
  })
  await v.loadCatalog();await v.loadCatalog()
  assert.equal(calls.filter(action=>action==='catalog').length,1)
  assert.equal(calls.filter(action=>action==='alertSettings').length,1)
  await v.fetchRows();await v.fetchRows()
  assert.equal(calls.filter(action=>action==='list').length,2)
  await v.referenceCache.get('other-condition',async()=>['stale'])
  await v.loadCatalog(true)
  assert.equal(v.referenceCache.size(),2)
  assert.equal(calls.filter(action=>action==='catalog').length,2)
  v.settingForm.value={validate:async()=>({valid:true})}
  await v.saveSetting()
  assert.equal(calls.filter(action=>action==='catalog').length,3)
  v.profile.value={accountType:'staff',uid:'another',role:'house_solution_administrator'}
  await v.loadCatalog()
  assert.equal(calls.filter(action=>action==='catalog').length,4)
  v.profile.value=null
  assert.equal(v.referenceCache.size(),0)
})

test('dialog lookup failure releases loading and registration confirmation never carries over',async()=>{
  let fail=true
  const view=await prototypeViewForTest(async()=>{if(fail)throw new Error('通信エラー');return {branches:[]}})
  view.selectPropertyCompany('chosen');await new Promise(r=>setImmediate(r));assert.equal(view.catalogBusy.value,false);assert.equal(view.busy.value,false);assert.equal(view.catalogError.value,'通信エラー')
  fail=false;view.selectPropertyCompany('chosen');await new Promise(r=>setImmediate(r));assert.equal(view.catalogError.value,'')
  view.confirmRegistration.value=true;view.confirmWarnings.value=true;view.registrationWarnings.value=['前の物件の注意']
  view.propertyForm.value={validate:async()=>({valid:true})};await view.openRegistrationConfirmation();assert.equal(view.confirmRegistration.value,false);assert.equal(view.confirmWarnings.value,false);assert.deepEqual(view.registrationWarnings.value,[])
})


test('field rules accept optional postal, normalize hyphens and reject eight digits, invalid dates and areas',async()=>{
 const r=await import('../src/domain/input-rules.mjs')
 for(const v of ['', '1000001','100-0001'])assert.equal(r.postalRule(v),true)
 for(const v of ['12345678','１２３４５６７','123'])assert.notEqual(r.postalRule(v),true)
 assert.equal(r.dateRule('2024-02-29'),true);assert.notEqual(r.dateRule('2026-02-29'),true)
 assert.equal(r.areaRule('100.25'),true);for(const v of ['0','-1','1.001'])assert.notEqual(r.areaRule(v),true)
 assert.equal(r.phoneRule('03-0000-0000'),true);assert.notEqual(r.phoneRule('(03)0000'),true)
 assert.notEqual(r.requiredRule(' '),true);assert.equal(r.emailRule('sample@example.invalid'),true)
})

test('dialog server errors stay in the originating surface even if another surface opens',async()=>{
 const view=await prototypeViewForTest(async()=>({}))
 view.settingDialog.value=true
 let reject;const task=view.run(()=>new Promise((_,r)=>{reject=r}))
 view.settingDialog.value=false;view.accountDialog.value=true
 reject(new Error('保存失敗'));await task
 assert.equal(view.errors.setting,'保存失敗');assert.equal(view.errors.page,'');assert.equal(view.errors.account,'')
 view.accountDialog.value=false;view.propertyDialog.value=true;view.confirmation.value='register'
 await new Promise(r=>setImmediate(r))
 await view.run(async()=>{throw new Error('本登録失敗')})
 assert.equal(view.errors.confirmation,'本登録失敗');assert.equal(view.errors.property,'');assert.equal(view.errors.page,'')
})

test('invalid component validation prevents master, property and account network writes',async()=>{
 let calls=0;const view=await prototypeViewForTest(async()=>{calls++;return {}})
 const invalid={validate:async()=>({valid:false})}
 view.settingForm.value=invalid;view.propertyForm.value=invalid;view.accountForm.value=invalid
 view.settingDialog.value=true;await view.saveSetting();assert.equal(view.notifications.length,1);view.settingDialog.value=false;view.propertyDialog.value=true;await view.saveProperty('save');assert.equal(view.notifications.length,2);view.propertyDialog.value=false;view.accountDialog.value=true;await view.createAccount();assert.equal(view.notifications.length,3);await view.openRegistrationConfirmation()
 assert.equal(calls,0);assert.equal(view.confirmation.value,'')
})

async function autocompleteForTest(fetchOptions){
 const vue=await import('vue'),props=vue.reactive({modelValue:'',items:[],active:true,disabled:false,fetchOptions}),events=[]
 let scheduled,dispose
 const env={...vue,requiredRules:[],defineProps:()=>props,defineEmits:()=> (event,value)=>{events.push([event,value]);if(event==='update:modelValue')props.modelValue=value},onBeforeUnmount:fn=>{dispose=fn},setTimeout:fn=>{scheduled=fn;return 1},clearTimeout:()=>{scheduled=undefined}}
 const source=readFileSync(new URL('../app/components/CompanyAutocomplete.vue',import.meta.url),'utf8').split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*$/gm,'')
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
 const state=new Function(...Object.keys(env),code+';return {search,rows,loading,problem,focus,compositionStart,compositionEnd,choose,clear,run};')(...Object.values(env))
 return {...state,props,events,tick:vue.nextTick,flush:async()=>{const fn=scheduled;scheduled=undefined;await fn?.()},dispose:()=>dispose()}
}
test('company autocomplete debounces, suppresses IME and short queries, rejects stale results',async()=>{
 const calls=[],pending=[]
 const v=await autocompleteForTest(q=>{calls.push(q);return new Promise(resolve=>pending.push(resolve))})
 v.focus(true);v.search.value='東';await v.tick();await v.flush();assert.deepEqual(calls,[])
 v.compositionStart();v.search.value='東京';await v.tick();await v.flush();assert.deepEqual(calls,[])
 v.compositionEnd();await v.tick();const old=v.flush();assert.deepEqual(calls,['東京'])
 v.search.value='大阪';await v.tick();const fresh=v.flush();pending[1]([{id:'new',name:'大阪'}]);await fresh
 pending[0]([{id:'old',name:'東京'}]);await old;assert.equal(v.rows.value[0].id,'new')
 v.props.active=false;await v.tick();assert.equal(v.loading.value,false);assert.deepEqual(v.rows.value,[]);v.dispose()
})
test('company autocomplete reports local failure, retries, selects and clears a company',async()=>{
 let fail=true;const v=await autocompleteForTest(async()=>{if(fail)throw Error('offline');return [{id:'a',name:'工務店A'}]})
 v.focus(true);await v.flush();assert.match(v.problem.value,/再試行/);assert.equal(v.loading.value,false)
 fail=false;await v.run();assert.equal(v.problem.value,'');v.choose(v.rows.value[0]);await v.tick();assert.equal(v.props.modelValue,'a')
 await v.clear();assert.equal(v.props.modelValue,'');assert.deepEqual(v.events.at(-1),['select',null]);v.dispose()
})

test('validation snackbar appears at the top and repeat attempts restart the notification',()=>{
 const source=readFileSync(new URL('../app/composables/useAppSnackbar.ts',import.meta.url),'utf8')
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const exports={};new Function('exports','useState',code)(exports,(_,init)=>({value:init()}))
 const s=exports.useAppSnackbar();s.showSnackbar('保存完了','success');assert.equal(s.state.value.location,'bottom center')
 s.showValidationError();const first=s.state.value.id;assert.equal(s.state.value.location,'top center');assert.equal(s.state.value.type,'error');assert.equal(s.state.value.timeout,8000)
 s.closeSnackbar();s.showValidationError();assert.equal(s.state.value.open,true);assert.ok(s.state.value.id>first)
})


test('insurance report sends only month; renewal label ends with warranty but returns after extension',async()=>{
 const calls=[];const v=await prototypeViewForTest(async data=>{calls.push(data);return {rows:[],limited:false,companies:[],branches:[],groups:[]}})
 v.tab.value='report';await new Promise(r=>setImmediate(r));calls.length=0
 v.filter.month='2026-10';v.filter.search='hidden';v.filter.companyId='hidden';await v.fetchRows()
 assert.deepEqual(calls.at(-1).filter,{reportMonth:'2026-10'})
 const row={insuranceReported:true,insuranceEvents:[],expiryDate:'2036-10-05',insuranceExpiryDate:'2036-10-05',insuranceRenewalMonth:'203610'}
 assert.equal(v.insuranceRenewalLabel(row),'次回報告不要（保証延長がなければ）')
 assert.equal(v.insuranceRenewalLabel({...row,insuranceExpiryDate:'2037-10-05'}),'次回報告不要（保証延長がなければ）')
 assert.equal(v.insuranceRenewalLabel({...row,expiryDate:'2046-10-05'}),'2036年10月分')
 assert.equal(v.insuranceRenewalLabel({}),'要確認')
})


test('saving a draft closes the dialog and delivers completion via snackbar',async()=>{
 const v=await prototypeViewForTest(async data=>data.action==='detail' ? {id:'test',name:'架空',status:'draft'} : {rows:[],limited:false})
 v.propertyDialog.value=true;v.propertyForm.value={validate:async()=>({valid:true})}
 await v.saveProperty('save')
 assert.deepEqual(v.notifications,[['保存しました。','success']])
 assert.equal(v.propertyDialog.value,false);assert.equal(v.errors.page,'');assert.equal(v.errors.property,'')
})


test('after thirty-year extension UI disallows a twenty-year cap and history labels are explicit',async()=>{
 const v=await prototypeViewForTest(async()=>({}))
 v.current.value={years:30,maxYears:30}
 assert.equal(v.maxYearsOptions.value[0].props.disabled,true)
 assert.notEqual(v.maxYearsRule(20),true);assert.equal(v.maxYearsRule(30),true)
 v.current.value={years:20,maxYears:30};assert.equal(v.maxYearsRule(20),true)
 assert.deepEqual(v.historyFields.filter(f=>['applicationDate','handoverDate','expiryDate'].includes(f.key)).map(f=>f.label),['申込日','引渡日','保証満了日'])
})


test('extension undo keeps auditable events and removes only reversed billing entries', async () => {
  const {activeExtensions, extensionUndoPreview, billingRows} = await import('../src/domain/property-warranty.mjs')
  const row = {status:'active', years:30, handoverDate:'2026-10-06', applicationDate:'2026-09-30', history:[
    {kind:'extend',requestId:'first',date:'2026-10-04',before:{years:10}},
    {kind:'extend',requestId:'second',date:'2026-10-04',before:{years:20}},
  ]}
  assert.equal(extensionUndoPreview(row).expiryDate,'2046-10-05')
  assert.equal(extensionUndoPreview(row).targetRequestId,'second')
  row.history.push({kind:'undoExtend',targetRequestId:'second',date:'2026-11-01'})
  row.years=20
  assert.equal(billingRows([row],'2036-10').length,1)
  assert.equal(activeExtensions(row)[0].requestId,'first')
  assert.equal(extensionUndoPreview(row).expiryDate,'2036-10-05')
  row.history.push({kind:'undoExtend',targetRequestId:'first',date:'2026-11-01'})
  row.years=10
  assert.equal(extensionUndoPreview(row),null)
  assert.equal(billingRows([row],'2036-10').length,0)
  assert.equal(billingRows([row],'2026-09').length,1)
  assert.equal(extensionUndoPreview({...row,years:20,history:[]}),null)
})
test('keyboard date entry formats complete digits and rejects impossible dates without repairing them', async () => {
 const { normalizeDateEntry: format } = await import('../src/domain/date-entry.mjs')
 const {dateRule,monthRule}=await import('../src/domain/input-rules.mjs')
 assert.equal(format('20261004'),'2026-10-04')
 assert.equal(format('2026/10/04'),'2026-10-04')
 assert.equal(format('202610','month'),'2026-10')
 assert.equal(format('2026/10','month'),'2026-10')
 assert.equal(format('2026'),'2026')
 assert.equal(format(''),'')
 assert.equal(dateRule(format('20240229')),true)
 assert.notEqual(dateRule(format('20260230')),true)
 assert.notEqual(monthRule(format('202613','month')),true)
})


 test('report display distinguishes unreported, renewal, final coverage and incomplete history without mutation',()=>{
 const row={status:'active',insuranceReported:false,insuranceEvents:[],expiryDate:'2035-09-30',insuranceExpiryDate:'2035-09-30',insuranceRenewalMonth:'203509'}
 const before=structuredClone(row)
 assert.equal(nextInsuranceReportLabel(row),'初回報告が必要')
 assert.equal(nextInsuranceReportLabel({...row,insuranceReported:true}),'次回報告不要（保証延長がなければ）')
 assert.equal(nextInsuranceReportLabel({...row,insuranceReported:true,expiryDate:'2045-09-30'}),'2035年09月分')
 assert.equal(nextInsuranceReportLabel({...row,insuranceHistoryIncomplete:true}),'要確認（記録不足）')
 assert.equal(nextInsuranceReportLabel({...row,status:'cancelled'}),'対象外（物件・保証取消）')
 assert.equal(nextInsuranceReportLabel({...row,status:'draft'}),'本登録前')
 assert.equal(nextInsuranceReportLabel({...row,insuranceReported:true,expiryDate:'2045-09-30',insuranceRenewalMonth:'203513'}),'要確認')
 assert.equal(nextInsuranceReportLabel({}),'要確認')
 assert.deepEqual(row,before)
})

test('warranty alerts always request pending notices despite hidden filters',async()=>{
 const calls=[];const v=await prototypeViewForTest(async data=>{calls.push(data);return {rows:[],limited:false,companies:[],branches:[],groups:[]}})
 v.tab.value='alerts';await new Promise(r=>setImmediate(r));
 Object.assign(v.filter,{search:'hidden',companyId:'hidden',fiscalYear:'2026',status:'cancelled',applicationFrom:'2026-01-01'});
 for(const notification of ['pending','done','all']){v.filter.notification=notification;await v.fetchRows();assert.deepEqual(calls.at(-1).filter,{alertKind:'warranty',notification:'pending'})}
})

test('insurance alerts ignore hidden filters and warranty notification state',async()=>{
 const calls=[];const v=await prototypeViewForTest(async data=>{calls.push(data);return {rows:[],limited:false,companies:[],branches:[],groups:[]}})
 v.tab.value='insuranceAlerts';await new Promise(r=>setImmediate(r));
 Object.assign(v.filter,{notification:'done',search:'hidden',fiscalYear:'2026',companyId:'hidden'});await v.fetchRows();assert.deepEqual(calls.at(-1).filter,{alertKind:'insurance'})
})

test('failed draft save keeps the dialog and entered values',async()=>{
 const v=await prototypeViewForTest(async()=>{throw new Error('save failed')});v.propertyDialog.value=true;v.propertyForm.value={validate:async()=>({valid:true})};v.form.value.name='架空入力';await v.saveProperty('save');assert.equal(v.propertyDialog.value,true);assert.equal(v.form.value.name,'架空入力');assert.equal(v.notifications.length,0)
})
test('successful registration closes both dialogs; active edit remains open',async()=>{
 for(const action of ['register','save']){const v=await prototypeViewForTest(async data=>data.action==='detail'?{id:'test',status:'active'}:{rows:[],limited:false});v.propertyDialog.value=true;v.propertyForm.value={validate:async()=>({valid:true})};v.confirmRegistration.value=true;v.confirmation.value=action==='register'?'register':'';await v.saveProperty(action);assert.equal(v.propertyDialog.value,action==='save');assert.equal(v.confirmation.value,'')}
})

test('property search folds after success, exposes applied conditions, and reopens on invalid input',async()=>{
 const calls=[];const v=await prototypeViewForTest(async data=>{calls.push(data);return {rows:[],limited:false}});v.tab.value='properties';v.searchForm.value={validate:async()=>({valid:true})};v.detailsOpen.value=true;v.filter.fiscalYear='2026';await v.loadRows();assert.equal(v.detailsOpen.value,false);assert.ok(v.appliedPropertyFilters.value.some(c=>c.key==='fiscalYear'));await v.removePropertyFilter('fiscalYear');assert.equal(calls.at(-1).filter.fiscalYear,'');assert.equal(v.appliedPropertyFilters.value.length,0);v.searchForm.value={validate:async()=>({valid:false})};const before=calls.length;await v.loadRows();assert.equal(v.detailsOpen.value,true);assert.equal(calls.length,before)
})


test('pending list results keep submitted filters and busy clear cannot erase them',async()=>{
 let resolve;const v=await prototypeViewForTest(()=>new Promise(r=>{resolve=r}))
 v.searchForm.value={validate:async()=>({valid:true})};v.filter.search='東京'
 const pending=v.loadRows();await new Promise(r=>setImmediate(r))
 await v.clearFilter();assert.equal(v.filter.search,'東京')
 v.filter.search='大阪';resolve({rows:[{id:'tokyo'}],limited:false});await pending
 assert.equal(v.rows.value[0].id,'tokyo');assert.equal(v.appliedPropertyFilters.value[0].label,'検索語：東京');assert.equal(v.reportDirty.value,true)
})

test('account creation sends setup mail despite list refresh failure and prevents duplicate creation',async()=>{
 const calls=[],mail=[];const v=await prototypeViewForTest(async data=>{calls.push(data.action);if(data.action==='createAccount')return {email:'fictional@example.invalid'};throw Error('refresh failed')},async(auth,email)=>mail.push(email))
 v.accountDialog.value=true;v.accountForm.value={validate:async()=>({valid:true})}
 await v.createAccount();assert.deepEqual(mail,['fictional@example.invalid']);assert.equal(v.accountCreated.value,true);assert.equal(v.accountDialog.value,false);assert.match(v.errors.page,/一覧を更新できません/);assert.equal(v.notifications.at(-1)[1],'success')
 await v.createAccount();assert.equal(calls.filter(a=>a==='createAccount').length,1)
})

test('account mail and refresh failures remain truthful without creation success',async()=>{
 const v=await prototypeViewForTest(async data=>{if(data.action==='createAccount')return {email:'fictional@example.invalid'};throw Error('refresh failed')},async()=>{throw Error('mail failed')})
 v.accountDialog.value=true;v.accountForm.value={validate:async()=>({valid:true})};await v.createAccount()
 assert.equal(v.accountCreated.value,true);assert.equal(v.accountDialog.value,true);assert.match(v.errors.account,/アカウントは作成済み/);assert.match(v.errors.account,/設定メールを送信できません/);assert.match(v.errors.account,/一覧を更新できません/);assert.equal(v.notifications.length,0)
})

const reportFixture=(id)=>({id,revision:1,reportKind:'new'})
async function prepareReports(v){v.rows.value=[reportFixture('A'),reportFixture('B')];v.selectedKeys.value=['A:::','B:::'];v.reportKey.value=JSON.stringify(v.filter);v.reportConfirm.value=true;await new Promise(r=>setImmediate(r))}

test('partial report failure retries only remaining selection with the original receipt',async()=>{
 const calls=[];let failed=true;const v=await prototypeViewForTest(async data=>{calls.push(data);if(data.action==='report'&&data.id==='B'&&failed)throw Error('B rejected');return data.action==='list'?{rows:failed?[reportFixture('B')]:[],limited:false}:{}})
 await prepareReports(v);await v.markReports();assert.deepEqual(v.selectedRows.value.map(r=>r.id),['B']);assert.match(v.errors.report,/B rejected/);assert.equal(v.reportConfirm.value,true);assert.equal(v.notifications.length,0)
 failed=false;await v.markReports();const reports=calls.filter(c=>c.action==='report');assert.deepEqual(reports.map(c=>c.id),['A','B','B']);assert.equal(reports[1].requestId,reports[2].requestId);assert.equal(v.reportConfirm.value,false);assert.equal(v.notifications.at(-1)[1],'success')
})

test('report primary error survives refresh error and successful rows stay unselected',async()=>{
 const v=await prototypeViewForTest(async data=>{if(data.action==='report'&&data.id==='B')throw Error('B rejected');if(data.action==='list')throw Error('refresh offline');return {}})
 await prepareReports(v);await v.markReports();assert.match(v.errors.report,/B rejected/);assert.match(v.errors.report,/一覧も更新できません/);assert.deepEqual(v.selectedRows.value.map(r=>r.id),['B']);assert.equal(v.notifications.length,0)
})

test('empty report confirmation cannot claim success or call the server',async()=>{
 let calls=0;const v=await prototypeViewForTest(async()=>{calls++;return {}});v.reportKey.value=JSON.stringify(v.filter);v.reportConfirm.value=true;await new Promise(r=>setImmediate(r));await v.markReports();assert.equal(calls,0);assert.equal(v.reportConfirm.value,true);assert.match(v.errors.report,/選択してください/);assert.equal(v.notifications.length,0)
})

test('successful report updates with failed refresh report completion and refresh warning separately',async()=>{
 const v=await prototypeViewForTest(async data=>{if(data.action==='list')throw Error('refresh offline');return {}})
 await prepareReports(v);await v.markReports();assert.equal(v.reportConfirm.value,false);assert.deepEqual(v.selectedKeys.value,[]);assert.equal(v.notifications.at(-1)[1],'success');assert.match(v.errors.page,/更新は完了しましたが/)
})

test('ambiguous report commit never reselects a refreshed next interval or changed revision',async()=>{
 const originalTarget={warrantyPeriodId:'initial',startDate:'2031-10-01',expiryDate:'2036-09-30'}
 const nextTarget={warrantyPeriodId:'initial',startDate:'2036-10-01',expiryDate:'2041-09-30'}
 for(const changed of [{revision:2,reportTarget:nextTarget},{revision:2,reportTarget:originalTarget},{revision:1,reportTarget:nextTarget}]){
  const calls=[];const v=await prototypeViewForTest(async data=>{calls.push(data);if(data.action==='report')throw Error('response lost');return {rows:[{...reportFixture('B'),...changed}],limited:false}})
  v.rows.value=[{...reportFixture('B'),reportTarget:{...originalTarget}}];v.selectedKeys.value=['B:::'];v.reportKey.value=JSON.stringify(v.filter);v.reportConfirm.value=true;await new Promise(r=>setImmediate(r))
  await v.markReports();assert.deepEqual(v.selectedKeys.value,[]);assert.match(v.errors.report,/response lost/);assert.match(v.errors.report,/選択し直してください/)
  await v.markReports();const reports=calls.filter(c=>c.action==='report');assert.equal(reports.length,1);assert.deepEqual(reports[0].reportTarget,originalTarget);assert.equal(v.notifications.length,0);assert.equal(v.reportConfirm.value,true)
 }
})
