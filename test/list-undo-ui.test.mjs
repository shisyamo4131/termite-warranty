import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../app/components/MeetingPrototype.vue', import.meta.url), 'utf8')
const script = source.split('<script setup lang="ts">')[1].split('</script>')[0]
const parsed = ts.createSourceFile('MeetingPrototype.ts', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const save = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'saveProperty')?.getText(parsed)
assert.ok(save, 'production saveProperty function must be present')
const code = ts.transpileModule(save, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

test('each list admits only its own existing operations', async () => {
  for (const [mode, allowed] of Object.entries({report:['undoReport'],certificate:['undoCertificate'],billing:['bill','undoBill','confirmUnbilled'],insurance:[],warranty:['notify']})) {
    for (const action of ['undoReport','undoCertificate','bill','undoBill','confirmUnbilled','notify','extend','cancel','save']) {
      let entered = false
      const env={noticeMode:{value:mode},pendingProperty:{value:null},busy:{value:false},retryProperty:async()=>{entered=true},frozenPayload:value=>structuredClone(value),form:{value:{}},current:{value:null},propertyId:{value:'fixture'},requestId:{value:'request'},confirmDates:{value:false},confirmRegistration:{value:false},confirmWarnings:{value:false},undoExtension:{value:null},billingTarget:{value:null},insuranceTarget:{value:null},confirmCancellation:{value:false},reason:{value:''},extensionApplicationDate:{value:''},validateProperty:async()=>true}
      const invoke = new Function(...Object.keys(env),`${code}; return saveProperty;`)(...Object.values(env))
      await invoke(action)
      assert.equal(entered, allowed.includes(action), `${mode}/${action}`)
    }
  }
})
test('list undo controls require staff, active property, and writable recovery state', () => {
  const certificate = source.match(/:allow-certificate-undo="([^"]+)"/)[1]
  const insurance = source.match(/<template v-if="([^"]+)" #insurance-actions>/)[1]
  for (const [expression, target] of [[certificate,'certificate'],[insurance,'report']]) {
    const visible = new Function('noticeMode','recoveryReadOnly','staff','current',`return Boolean(${expression})`)
    for (const mode of ['',target,'billing','insurance','warranty']) {
      assert.equal(visible(mode,false,true,{status:'active',insuranceLastReport:{}}), mode==='' || mode===target)
    }
    assert.equal(visible(target,true,true,{status:'active',insuranceLastReport:{}}),false)
    assert.equal(visible(target,false,false,{status:'active',insuranceLastReport:{}}),false)
    assert.equal(visible(target,false,true,{status:'cancelled',insuranceLastReport:{}}),false)
  }
})

// Execute the production view logic with fictional rows; no Firebase or local data writes.
import * as vue from 'vue'
import { selectedMonthToBasisMonth } from '../src/domain/monthly-query.mjs'
const transpile = text => ts.transpileModule(text, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
const evaluate = (text, env, result) => new Function(...Object.keys(env),transpile(text)+`\nreturn ${result}`)(...Object.values(env))
const reportLogic = source.slice(source.indexOf('const rowKey='),source.indexOf('watch(confirmation,'))
function reportHarness(t, readOnly=false) {
  const scope=vue.effectScope();t.after(()=>scope.stop())
  const calls=[],rows=vue.ref([]),selectedKeys=vue.ref([]),reportConfirm=vue.ref(false),filter=vue.reactive({month:'2027-01',includeDone:true})
  const env={...vue,rows,selectedKeys,reportConfirm,filter,errors:{report:'',page:''},busy:vue.ref(false),reportDirty:vue.ref(false),recoveryReadOnly:vue.ref(readOnly),loadedReportMonth:vue.ref('2026-12'),crypto:globalThis.crypto,run:fn=>fn(),call:async(action,data)=>calls.push({action,data}),fetchRows:async()=>{},showSnackbar:()=>{}}
  const logic=scope.run(()=>evaluate(reportLogic,env,'{rowKey,selectedRows,pendingSelectedRows,markReports}'))
  return {...logic,...env,calls}
}
const reportRow=(state,id)=>({id:'fictional-property',revision:4,reportKind:'new',reportState:state,...(state==='reported'?{reportId:'saved-report'}:{}),reportTarget:{insurancePeriodId:id,warrantyPeriodId:'initial',startDate:'2026-12-01',expiryDate:'2031-11-30'}})
test('monthly report identities separate periods and update only pending with basis month',async t=>{
  const h=reportHarness(t),pending=reportRow('pending','initial:1:2'),done=reportRow('reported','initial:1:1')
  h.rows.value=[pending,done];h.selectedKeys.value=h.rows.value.map(h.rowKey)
  assert.notEqual(h.rowKey(pending),h.rowKey(done))
  assert.notEqual(h.rowKey(pending),h.rowKey({...pending,reportTarget:{...pending.reportTarget,insurancePeriodId:'initial:2:2'}}))
  assert.equal(h.selectedRows.value.length,2);assert.equal(h.pendingSelectedRows.value.length,1)
  await h.markReports();assert.equal(h.calls.length,1);assert.equal(h.calls[0].data.month,'2026-12');assert.deepEqual(h.calls[0].data.reportTarget,pending.reportTarget)
})
test('monthly report done-only and read-only do not update; condition changes clear selection',async t=>{
  const h=reportHarness(t),done=reportRow('reported','initial:1:1');h.rows.value=[done];h.selectedKeys.value=[h.rowKey(done)]
  await h.markReports();assert.equal(h.calls.length,0)
  h.reportConfirm.value=true;h.filter.includeDone=false;await vue.nextTick();assert.deepEqual(h.selectedKeys.value,[]);assert.equal(h.reportConfirm.value,false)
  const readonly=reportHarness(t,true),pending=reportRow('pending','initial:1:2');readonly.rows.value=[pending];readonly.selectedKeys.value=[readonly.rowKey(pending)];await readonly.markReports();assert.equal(readonly.calls.length,0)
})
const certificateSource=readFileSync(new URL('../app/components/WarrantyCertificateManagement.vue',import.meta.url),'utf8')
function certificateHarness(t,kind) {
  const scope=vue.effectScope();t.after(()=>scope.stop());const calls=[]
  const script=certificateSource.split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*\r?\n/gm,'')
  const props={kind,readOnly:false,call:async(action,data)=>{calls.push({action,data});return {rows:kind==='billing'?[{id:'fictional',billingEventId:'initial',billingState:'billed',billingDate:'2026-12-01'},{id:'fictional',billingEventId:'extended',billingState:'pending',billingDate:'2026-12-10'}]:[{id:'fictional',certificatePeriodId:'initial',certificateIdentifiable:true,certificateIssued:true},{id:'fictional',certificatePeriodId:'extended',certificateIdentifiable:true,certificateIssued:false}]}}}
  const env={...vue,defineProps:()=>props,defineEmits:()=>()=>{},useReferenceStore:()=>({status:vue.ref('ready'),groups:vue.ref([{id:'fictional-group',name:'架空'}]),ensureReady:async()=>{}}),onMounted:()=>{},onUnmounted:()=>{},japanDate:()=> '2027-01-01',selectedMonthToBasisMonth}
  const logic=scope.run(()=>evaluate(script,env,'{groupId,month,includeDone,loadedMonth,fetchRows,selectAll,selectedRows,pendingRows,dirty,confirm,selected}'))
  return {...logic,calls}
}
test('billing and certificate UI send prior month once and retain done CSV selection',async t=>{
  for(const kind of ['billing','certificates']) {
    const h=certificateHarness(t,kind);h.groupId.value='fictional-group';h.includeDone.value=true;await vue.nextTick();await h.fetchRows()
    assert.deepEqual(h.calls[0].data,{month:'2026-12',groupId:'fictional-group',includeDone:true});assert.equal(h.loadedMonth.value,'2026-12');assert.equal(h.dirty.value,false)
    h.selectAll(true);assert.equal(h.selectedRows.value.length,2);assert.equal(h.pendingRows.value.length,1)
    h.confirm.value=true;h.includeDone.value=false;await vue.nextTick();assert.equal(h.dirty.value,true);assert.deepEqual(h.selected.value,[]);assert.equal(h.confirm.value,false)
  }
})

test('insurance list passes basis month and includeDone and binds the exclusion warning to loaded mode',async()=>{
  const fetchSource=source.split('\n').find(line=>line.startsWith('async function fetchRows('))
  const calls=[],filter={month:'2027-01',includeDone:true},env={tab:{value:'report'},filter,selectedMonthToBasisMonth,call:async(action,data)=>{calls.push({action,data});return {rows:[],limited:false,unclassifiedCount:2}},rows:{value:[]},selectedKeys:{value:[]},page:{value:1},limited:{value:false},reportKey:{value:''},loadedReportMonth:{value:''},loadedReportSelectedMonth:{value:''},loadedReportIncludeDone:{value:false},reportUnclassifiedCount:{value:0}}
  const fetch=evaluate(fetchSource,env,'fetchRows');await fetch()
  assert.deepEqual(calls[0].data,{filter:{reportMonth:'2026-12',includeDone:true}})
  assert.equal(env.loadedReportMonth.value,'2026-12');assert.equal(env.loadedReportSelectedMonth.value,'2027-01');assert.equal(env.loadedReportIncludeDone.value,true)
  const expression=source.match(/v-if="([^"]*loadedReportIncludeDone[^"]*)"/)[1]
  const warning=new Function('tab','loadedReportIncludeDone','reportUnclassifiedCount',`return Boolean(${expression})`)
  assert.equal(warning('report',true,2),true);assert.equal(warning('report',false,2),false)
  filter.includeDone=false;await fetch();assert.equal(calls[1].data.filter.includeDone,false);assert.equal(env.loadedReportIncludeDone.value,false)
})
