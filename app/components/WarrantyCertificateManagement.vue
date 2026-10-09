<template>
  <h1 class="text-h5 mb-4">{{ billing ? '請求用一覧' : '保証書CSV・発行管理' }}</h1>
  <v-alert v-if="!billing" type="info" class="mb-4">初回は引渡月、延長分はその保証開始月で抽出します。指定月より前の未発行分も含みます。CSV出力後、実際に保証書を発行した期間を別操作で「発行済み」にしてください。</v-alert>
  <v-alert v-if="billing" type="info" class="mb-4">指定した保証グループの、対象年月以前（指定月を含む）の未請求分を表示します。初回は申込月、延長は保証開始月が基準です。請求状況が不明な過去データは、物件・保証の編集画面で確認してください。</v-alert>
  <v-alert v-else type="warning" class="mb-4">CSVは仮の出力項目です。保証書そのものの作成・印刷には対応していません。</v-alert>
  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
  <v-alert v-if="message" type="success" class="mb-4">{{ message }}</v-alert>
  <v-card class="mb-4"><v-card-text>
    <v-form @submit.prevent="load"><div class="d-flex flex-wrap ga-3 align-start">
      <v-autocomplete v-model="groupId" :items="groups" item-title="name" item-value="id" label="保証グループ" :disabled="working" :rules="[groupRule]" style="min-width:240px;max-width:400px" />
      <BusinessDateInput v-model="month" label="対象年月" type="month" :disabled="working" :rules="[monthRule]" style="max-width:240px" />
      <v-btn color="primary" variant="flat" type="submit" :disabled="working">検索・更新</v-btn>
    </div></v-form>
    <div class="d-flex flex-wrap ga-2">
      <v-btn variant="outlined" :disabled="!selectedRows.length || working || dirty || !referencesReady" @click="download">選択した行をCSV出力</v-btn>
      <v-btn v-if="!readOnly" variant="outlined" :disabled="!pendingRows.length || working || dirty" @click="confirm=true">選択分を{{ doneLabel }}にする</v-btn>
    </div>
  </v-card-text></v-card>
  <v-alert v-if="dirty && loadedMonth" type="warning" class="mb-4">検索条件が変わりました。「検索・更新」を押してください。</v-alert>
  <v-card><v-card-text>
    <p class="mb-2">{{ loadedMonth }}分：{{ rows.length }}期間／選択 {{ selectedRows.length }}期間（{{ pendingLabel }} {{ pendingRows.length }}期間）</p>
    <v-checkbox :model-value="allSelected" label="全ページの対象を選択" :disabled="working || dirty || !rows.length" hide-details @update:model-value="selectAll" />
    <v-table><thead><tr><th>選択</th><th>保証書No／物件名</th><th>担当工務店・本支店</th><th>保証期間</th><th>{{ billing ? '請求' : '保証書' }}</th><th>詳細</th></tr></thead>
      <tbody><tr v-for="row in visibleRows" :key="key(row)">
        <td><v-checkbox v-model="selected" :value="key(row)" :aria-label="`${row.warrantyNumber} ${row.certificatePeriodLabel}を選択`" :disabled="working || dirty || !row.certificateIdentifiable" hide-details /></td>
        <td>{{ row.warrantyNumber }}<div>{{ row.name }}</div><div class="text-caption">引渡日：{{ row.handoverDate }}</div></td>
        <td>{{ references.name('companies',row.constructionCompanyId) }}<div>{{ references.name('branches',row.branchId) }}</div></td>
        <td>{{ row.certificatePeriodLabel }}<div>{{ row.certificateStartDate }} ～ {{ row.certificateExpiryDate }}</div><v-chip v-if="row.certificateMonth<loadedMonth && !row.certificateIssued" size="small" color="warning">過去の{{ pendingLabel }}</v-chip></td>
        <td><v-chip size="small" :color="row.certificateIssued ? 'success' : 'default'">{{ row.certificateIdentifiable ? row.certificateIssued ? doneLabel : pendingLabel : '要確認（期間記録不足）' }}</v-chip></td>
        <td><v-btn variant="text" :disabled="working" @click="emit('open',row.id)">表示</v-btn></td>
      </tr><tr v-if="!rows.length"><td colspan="6">{{ working ? '取得中です。' : '対象はありません。' }}</td></tr></tbody>
    </v-table>
    <v-pagination v-if="rows.length>20" v-model="page" :length="Math.ceil(rows.length/20)" :disabled="working" />
  </v-card-text></v-card>
  <v-dialog v-model="confirm" max-width="700" persistent scrollable><v-card :title="`${doneLabel}にする期間の確認`"><v-card-text>
    <p>次の{{ pendingRows.length }}期間を{{ doneLabel }}にします。<template v-if="!billing">CSVを出力しただけでは発行済みにしないでください。</template><template v-else>請求書の作成・送信や入金登録は行いません。</template></p>
    <p v-for="row in pendingRows" :key="key(row)" class="mt-3">{{ row.warrantyNumber }}／{{ row.name }} — {{ row.certificatePeriodLabel }}：{{ row.certificateStartDate }} ～ {{ row.certificateExpiryDate }}</p>
    <v-alert v-if="error" type="error" class="mt-4">{{ error }}</v-alert>
  </v-card-text><v-card-actions><v-btn variant="outlined" :disabled="working" @click="confirm=false">戻る</v-btn><v-spacer/><v-btn color="primary" variant="flat" :disabled="working || dirty || readOnly || !pendingRows.length" @click="issue">{{ doneLabel }}にする</v-btn></v-card-actions></v-card></v-dialog>
</template>
<script setup lang="ts">
import { billingCsv } from '../../src/domain/billing-output.mjs'
import { certificateCsv } from '../../src/domain/warranty-certificate.mjs'
import { japanDate } from '../../src/domain/property-warranty.mjs'
type Row=Record<string,any>
const props=defineProps<{call:(action:string,data?:Row)=>Promise<Row>;readOnly:boolean;kind?:string;refresh?:number}>()
const billing=computed(()=>props.kind==='billing')
const doneLabel=computed(()=>billing.value?'請求済み':'発行済み')
const pendingLabel=computed(()=>billing.value?'未請求':'未発行')
const emit=defineEmits<{open:[id:string];busy:[value:boolean]}>()
const references=useReferenceStore()
const referencesReady=computed(()=>references.status.value==='ready')
const groupId=ref(''),loadedGroup=ref('')
const groups=computed(()=>references.groups.value.filter(group=>group.enabled!==false))
const groupRule=(value:string)=>groups.value.some(group=>group.id===value)||'有効な保証グループを選択してください。'
const month=ref(japanDate().slice(0,7)),loadedMonth=ref(''),rows=ref<Row[]>([]),selected=ref<string[]>([]),page=ref(1)
const working=ref(false),error=ref(''),message=ref(''),confirm=ref(false)
let active=true
onUnmounted(()=>{active=false;emit('busy',false)})
const monthRule=(value:string)=>/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value) || '対象年月を指定してください。'
const dirty=computed(()=>month.value!==loadedMonth.value || groupId.value!==loadedGroup.value)
const key=(row:Row)=>JSON.stringify([row.id,row.certificatePeriodId])
const selectedRows=computed(()=>rows.value.filter(r=>selected.value.includes(key(r)) && r.certificateIdentifiable))
const pendingRows=computed(()=>selectedRows.value.filter(r=>!r.certificateIssued))
const visibleRows=computed(()=>rows.value.slice((page.value-1)*20,page.value*20))
const allSelected=computed(()=>rows.value.some(r=>r.certificateIdentifiable) && rows.value.filter(r=>r.certificateIdentifiable).every(r=>selected.value.includes(key(r))))
function selectAll(value:boolean|null){selected.value=value?rows.value.filter(r=>r.certificateIdentifiable).map(key):[]}
watch([month,groupId],()=>{selected.value=[];confirm.value=false;message.value=''})
async function fetchRows(){requests.clear();const target=month.value,targetGroup=groupId.value;await references.ensureReady();const result=await props.call(billing.value?'billingList':'certificateList',{month:target,groupId:targetGroup});if(!active)return;rows.value=billing.value?result.rows.map((r:Row)=>({...r,certificatePeriodId:r.billingEventId,certificatePeriodLabel:r.billingPeriodLabel,certificateStartDate:r.billingStartDate,certificateExpiryDate:r.billingExpiryDate,certificateIssued:false,certificateIdentifiable:true,certificateMonth:r.billingDate.slice(0,7)})):result.rows;loadedMonth.value=target;loadedGroup.value=targetGroup;selected.value=[];page.value=1}
async function execute(work:()=>Promise<void>){if(working.value)return;working.value=true;emit('busy',true);error.value='';message.value='';try{await work()}catch(e){if(active)error.value=e instanceof Error?e.message:'操作に失敗しました。'}finally{if(active){working.value=false;emit('busy',false)}}}
async function load(){if(groupRule(groupId.value)!==true){error.value='有効な保証グループを選択してください。';return}if(monthRule(month.value)!==true){error.value='対象年月を指定してください。';return}await execute(fetchRows)}
function download(){if(dirty.value || !referencesReady.value || !selectedRows.value.length)return;const content=(billing.value?billingCsv:certificateCsv)(selectedRows.value.map(r=>({...r,companyLabel:references.name('companies',r.constructionCompanyId),branchLabel:references.name('branches',r.branchId)})));const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${billing.value?'請求':'保証書'}_${references.name('groups',loadedGroup.value).replace(/[\\/:*?"<>|]/g,'_')}_${loadedMonth.value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message.value='CSVを出力しました。状態は変更していません。'}
// Preserve request IDs after an unknown response, until a fresh list is fetched.
const requests=new Map<string,string>()
async function issue(){if(props.readOnly || dirty.value || !pendingRows.value.length)return;await execute(async()=>{
  const grouped=new Map<string,Row[]>()
  for(const row of pendingRows.value)grouped.set(row.id,[...(grouped.get(row.id)??[]),row])
  let completed=0
  try{for(const [id,periods] of grouped){const signature=JSON.stringify([id,periods[0]!.revision,periods.map(key)]);if(!requests.has(signature))requests.set(signature,crypto.randomUUID());await props.call(billing.value?'billPeriods':'issueCertificate',{groupId:loadedGroup.value,id,revision:periods[0]!.revision,requestId:requests.get(signature),month:loadedMonth.value,periods:periods.map(p=>({id:p.certificatePeriodId,startDate:p.certificateStartDate,expiryDate:p.certificateExpiryDate}))});if(!active)return;completed+=periods.length;for(const row of periods){row.certificateIssued=true;if(billing.value)row.billingState='billed'};if(billing.value){rows.value=rows.value.filter(row=>!periods.some(p=>key(p)===key(row)));page.value=Math.min(page.value,Math.max(1,Math.ceil(rows.value.length/20)))}}
    confirm.value=false;await fetchRows();requests.clear();message.value=`${completed}期間を${doneLabel.value}にしました。`
  }catch(e){throw new Error(`${completed}期間の更新を確認済みです。${e instanceof Error?e.message:'更新に失敗しました。'} 通信結果が不明な場合は同じ操作を再試行できます。対象が変更されている場合は「戻る」から一覧を更新してください。`)}
})}
watch(()=>props.refresh,()=>{if(loadedGroup.value && !dirty.value)void load()})
onMounted(()=>execute(async()=>{await references.ensureReady()}))
</script>
