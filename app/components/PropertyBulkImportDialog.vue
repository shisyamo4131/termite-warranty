<template>
  <v-dialog v-model="open" max-width="1100" persistent scrollable>
    <v-card :border="false" class="business-dialog">
      <BusinessDialogHeader title="物件・保証の一括取込み" :busy="busy || locked && !result" @close="open=false" />
      <v-card-text>
        <v-alert type="info" class="mb-4">毎月届く増分の初回保証を登録します。外部キー必須の保証グループだけで利用できます。外部キーの重複や未登録の本支店コードなどが1件でもあれば全件を登録しません。登録後の訂正は通常の編集画面で行います。</v-alert>
        <v-alert v-if="props.referenceReady===false" type="warning" class="mb-4">参照マスタの最新状態を確認できません。保証グループ・工務店の選択は再取得後に行ってください。</v-alert>
        <v-alert v-if="problem" type="error" class="mb-4">{{ problem }}</v-alert>
        <v-alert v-if="locked && !result" type="warning" class="mb-4">{{ rejected ? '今回の登録はサーバーで拒否されました。修正する場合は、下の「入力を見直す」から確認してください。' : '以前の登録結果が未確認です。「登録結果を確認」で確認してください。結果がまだ確認できない場合は同じCSVを選択し、同じ取込みとして再送できます。新しい取込みとして送信し直さないでください。' }}</v-alert>
        <v-alert v-if="result" type="success" class="mb-4">{{ result.count }}件を本登録しました。{{ result.replayed ? '前回の登録結果を確認しました。追加の登録は行っていません。' : '' }}</v-alert>
        <h2 class="business-section-title">取込み対象・CSV</h2><v-form ref="importForm" @submit.prevent="previewFile" :disabled="props.referenceReady===false || busy || locked || !!result">
          <v-row>
            <v-col cols="12" md="6"><v-select v-model="groupId" :items="activeGroups" item-title="name" item-value="id" :rules="requiredRules" label="保証グループ" required /></v-col>
            <v-col cols="12" md="6"><CompanyAutocomplete :key="groupId" v-model="companyId" :items="props.companies.filter(company=>company.defaultGroupId===groupId)" :fetch-options="searchCompanies" :active="open" :disabled="props.referenceReady===false || !groupId || busy || locked || !!result" required @select="chooseCompany" /></v-col>
            <v-col cols="12" md="6"><v-text-field :model-value="'共通CSV・増分の初回10年登録'" label="取込みルール" readonly /></v-col>
            <v-col v-if="!locked" cols="12" md="6"><v-file-input v-model="file" prepend-icon="" append-inner-icon="$file" accept=".csv,text/csv" label="CSVファイル（UTF-8・1MBまで）" :rules="[fileRule]" show-size required @update:model-value="readFile" /></v-col>
          </v-row>
        </v-form>
        <v-file-input v-if="locked && pendingRecord && !csv && !result && !rejected" v-model="file" prepend-icon="" append-inner-icon="$file" accept=".csv,text/csv" label="前回と同じCSVファイルを選択" :rules="[fileRule]" :disabled="busy" show-size @update:model-value="readFile" />
        <v-btn variant="outlined" class="mb-3" @click="$emit('downloadTemplate')">共通テンプレートをダウンロード</v-btn>
        <v-progress-linear v-if="busy" indeterminate class="mb-3" />
        <template v-if="preview"><h2 class="business-section-title">検証結果</h2>
          <p class="mb-3">検証対象：{{ preview.count }}件（上限300件）。全件の保証番号を新規採番します。</p>
          <v-alert v-if="preview.errors.length" type="error" class="mb-4">{{ preview.errors.length }}件の問題があるため全件を登録できません。ファイルを修正して再検証してください。</v-alert>
          <v-table v-if="preview.errors.length" density="compact"><thead><tr><th>行</th><th>項目</th><th>理由</th></tr></thead><tbody><tr v-for="(item,index) in preview.errors" :key="index"><td>{{ item.line || '全体' }}</td><td>{{ item.field }}</td><td>{{ item.message }}</td></tr></tbody></v-table>
          <v-pagination v-if="preview.rows.length" v-model="page" :length="Math.max(1,Math.ceil(preview.rows.length/20))" :disabled="busy" />
          <v-table ref="previewTable" v-if="preview.rows.length" density="compact"><thead><tr><th>行／{{ preview.externalKeyLabel || keyLabel }}</th><th>物件名</th><th>本支店コード</th><th>保証番号</th><th>住所</th><th>申込日／引渡日</th><th>資材名</th><th>報告不要にする期間</th></tr></thead><tbody><tr v-for="row in preview.rows.slice((page-1)*20,page*20)" :key="row.line"><td>{{ row.line }}<br>{{ row.externalKey }}</td><td>{{ row.name }}</td><td>{{ row.branchCode ?? '—' }}</td><td>{{ row.warrantyNumber || '登録時に採番' }}</td><td>{{ row.address }}</td><td>{{ row.applicationDate }}<br>{{ row.handoverDate }}</td><td>{{ row.insulationMaterials || '—' }}</td><td>{{ row.waivedPeriodCount ?? 0 }}件</td></tr></tbody></v-table>
          <v-checkbox v-if="!preview.errors.length && !locked && !result" v-model="confirmed" label="所属・本支店・日付・補完内容を確認し、全件を本登録します。" :disabled="busy" />
        </template>
        <v-alert v-if="discardConfirmation" type="warning" class="mt-4">登録が拒否された今回の取込みを破棄し、入力を見直します。<div class="d-flex flex-wrap ga-2 mt-3"><v-btn variant="outlined" @click="discardConfirmation=false">戻る</v-btn><v-btn variant="outlined" @click="discardRejected">入力を見直す</v-btn></div></v-alert>
      </v-card-text>
      <v-card-actions class="flex-wrap">
        <v-btn variant="outlined" :disabled="busy || locked && !result" @click="open=false">閉じる</v-btn><v-spacer />
        <v-btn v-if="rejected && !result" variant="outlined" :disabled="busy" @click="discardConfirmation=true">入力を見直す</v-btn>
        <v-btn v-if="locked && pendingRecord && !result" variant="outlined" :disabled="busy" @click="checkStatus">登録結果を確認</v-btn>
        <v-btn v-if="!locked && !result" variant="outlined" :disabled="busy || !csv || !groupId || !companyId" @click="previewFile">内容を検証</v-btn>
        <v-btn v-if="!result && !rejected" variant="flat" color="primary" :disabled="busy || locked && (!csv || !pendingRecord) || !locked && (!confirmed || !preview?.previewHash || !!preview?.errors.length)" @click="commitFile">{{ locked ? '同じ取込みを再送' : '全件を本登録' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { requiredRules } from '../../src/domain/input-rules.mjs'
import { BULK_IMPORT_MAX_BYTES } from '../../src/domain/property-bulk-import.mjs'
import { loadPendingImport, savePendingImport, clearPendingImport, hashImportCsv, type PendingImport } from '../../src/domain/property-bulk-import-pending.mjs'
type Company = { id: string; name: string; defaultGroupId?: string; enabled?: boolean; [key:string]: any }
type PreviewRow = { line:number; externalKey:string; branchCode?:string; branchId:string; branchLabel:string; warrantyNumber:string; name:string; address:string; applicationDate:string; handoverDate:string; insulationMaterials:string; waivedPeriodCount?:number }
type Preview = { count:number; externalKeyLabel?:string; rows:PreviewRow[]; errors:Array<{line:number;field:string;message:string}>; previewHash:string }
type CommitResult = { count:number; ids:string[]; replayed?:boolean }
const props = defineProps<{ projectId:string; actorUid:string; referenceReady?:boolean; companies:Company[]; groups:Array<{id:string;name:string;enabled?:boolean;externalKeyRequired?:boolean;externalKeyLabel?:string;addressRequired?:boolean;insulationMaterialsRequired?:boolean}>; fetchCompanies:(groupId:string,search:string)=>Promise<Company[]>; invoke:(data:Record<string,unknown>)=>Promise<Record<string,any>> }>()
const emit = defineEmits<{ completed:[result:CommitResult]; downloadTemplate:[] }>()
const open = defineModel<boolean>({ required:true })
const groupId=ref(''), companyId=ref(''), companyOptions=ref<Company[]>([])
const format=ref('common'), file=ref<File | File[] | null>(null), csv=ref('')
const importForm=ref<{validate:()=>Promise<{valid:boolean}>}|null>(null)
const busy=ref(false), problem=ref(''), preview=ref<Preview|null>(null), confirmed=ref(false), page=ref(1)
const previewTable=usePaginationScroll(page)
const locked=ref(false), rejected=ref(false), result=ref<CommitResult|null>(null), discardConfirmation=ref(false)
const requestId=ref('')
const pendingRecord=ref<PendingImport|null>(null)
let version=0, fileVersion=0, scopeVersion=0, committedPayload:Record<string,unknown>|null=null
const storageScope=()=>({projectId:props.projectId,actorUid:props.actorUid})
const activeGroups=computed(()=>props.groups.filter(group=>group.enabled!==false && group.externalKeyRequired===true))
const selectedGroup=computed(()=>props.groups.find(group=>group.id===groupId.value))
const keyLabel=computed(()=>props.groups.find(group=>group.id===groupId.value)?.externalKeyLabel || '外部キー')
function invalidatePreview() { if(locked.value)return;version++;preview.value=null;confirmed.value=false;problem.value='';page.value=1;requestId.value=crypto.randomUUID() }
watch([groupId,companyId,format,csv],invalidatePreview,{flush:'sync'})
watch(groupId,()=>{if(!locked.value){companyId.value='';companyOptions.value=[];format.value='common'}},{flush:'sync'})
watch(activeGroups,available=>{if(!locked.value && groupId.value && !available.some(group=>group.id===groupId.value))groupId.value=''},{flush:'sync'})
function restorePending() {
  try {
    const saved=loadPendingImport(window.sessionStorage,storageScope())
    if(!saved)return false
    locked.value=true;pendingRecord.value=saved;committedPayload=null;requestId.value=saved.requestId;groupId.value=saved.groupId;companyId.value=saved.companyId;format.value=saved.format;csv.value='';file.value=null;preview.value=null;result.value=null;rejected.value=false
    return true
  } catch(error) {locked.value=true;problem.value=error instanceof Error ? error.message : '取込状態を確認できません。';return true}
}
function resetView() {locked.value=false;pendingRecord.value=null;committedPayload=null;groupId.value='';companyId.value='';format.value='common';file.value=null;csv.value='';companyOptions.value=[];result.value=null;rejected.value=false;discardConfirmation.value=false;invalidatePreview()}
watch(open,value=>{if(value && (!locked.value || result.value)){if(restorePending()){if(pendingRecord.value)void checkStatus()}else resetView()}})
watch(()=>[props.projectId,props.actorUid] as const,()=>{scopeVersion++;fileVersion++;version++;busy.value=false;resetView();if(restorePending()){open.value=true;if(pendingRecord.value)void checkStatus()}else open.value=false},{flush:'sync'})
async function searchCompanies(search:string) { const group=groupId.value;const values=await props.fetchCompanies(group,search);return group===groupId.value ? values.filter(value=>value.defaultGroupId===group && value.enabled!==false) : [] }
function chooseCompany(company:Company|null) { if(company && !companyOptions.value.some(value=>value.id===company.id))companyOptions.value=[...companyOptions.value,company] }
const selectedFile=(value:File|File[]|null)=>Array.isArray(value) ? value[0] : value
function fileRule(value:File|File[]|null) { const item=selectedFile(value);return !!item && item.size<=BULK_IMPORT_MAX_BYTES || 'CSVファイルを選択してください（1MBまで）。' }
async function readFile(value:File|File[]|null) {
  if(busy.value || locked.value && (!pendingRecord.value || !!csv.value || !!result.value || rejected.value))return
  const token=++fileVersion, scope=scopeVersion;csv.value='';invalidatePreview()
  const item=selectedFile(value)
  if(!item){busy.value=false;return}
  if(item.size>BULK_IMPORT_MAX_BYTES){problem.value='ファイルが1MBを超えています。分割してください。';return}
  busy.value=true
  try{const content=new TextDecoder('utf-8',{fatal:true}).decode(await item.arrayBuffer());if(token!==fileVersion || scope!==scopeVersion)return;if(locked.value){if(await hashImportCsv(content)!==pendingRecord.value?.csvHash){problem.value='前回のCSVと内容が一致しません。同じファイルを選択してください。';return}if(token!==fileVersion || scope!==scopeVersion)return;const saved=pendingRecord.value!;committedPayload={action:'commit',groupId:saved.groupId,companyId:saved.companyId,format:saved.format,requestId:saved.requestId,previewHash:saved.previewHash,confirmed:true,csv:content}}csv.value=content;problem.value=''}
  catch{if(token===fileVersion)problem.value='UTF-8のCSVとして読み取れませんでした。文字コードを確認してください。'}
  finally{if(token===fileVersion)busy.value=false}
}
async function previewFile() {
  if(busy.value || locked.value || !csv.value || !(await importForm.value?.validate())?.valid)return
  const token=version;busy.value=true;problem.value='';confirmed.value=false;preview.value=null;page.value=1
  try{const value=await props.invoke({action:'preview',groupId:groupId.value,companyId:companyId.value,csv:csv.value,format:format.value,requestId:requestId.value});if(version===token)preview.value=value as Preview}
  catch(error){if(version===token)problem.value=error instanceof Error ? error.message : '検証に失敗しました。'}
  finally{if(token===version)busy.value=false}
}
async function commitFile() {
  if(busy.value || result.value || rejected.value)return
  if(!locked.value && (!confirmed.value || !preview.value?.previewHash || preview.value.errors.length))return
  const scope=scopeVersion, identity=storageScope(), token=version
  busy.value=true;problem.value=''
  try {
    if(!locked.value){
      const payload={action:'commit',groupId:groupId.value,companyId:companyId.value,csv:csv.value,format:format.value,requestId:requestId.value,confirmed:true,previewHash:preview.value!.previewHash}
      const csvHash=await hashImportCsv(payload.csv)
      if(scope!==scopeVersion || token!==version)return
      pendingRecord.value=savePendingImport(window.sessionStorage,identity,{requestId:payload.requestId,groupId:payload.groupId,companyId:payload.companyId,format:payload.format as 'common'|'uh',previewHash:payload.previewHash,csvHash})
      committedPayload=payload;locked.value=true
    } else if(pendingRecord.value)savePendingImport(window.sessionStorage,identity,pendingRecord.value)
    if(!committedPayload)return
    const value=await props.invoke({...committedPayload})
    if(scope!==scopeVersion)return
    result.value=value as CommitResult
    clearPendingImport(window.sessionStorage,identity,requestId.value)
    emit('completed',result.value)
  } catch(error){if(scope!==scopeVersion)return;const details=(error as {details?:{safeToDiscard?:boolean;errors?:Preview['errors']}})?.details;rejected.value=locked.value && details?.safeToDiscard===true;if(Array.isArray(details?.errors) && preview.value)preview.value={...preview.value,errors:details.errors};problem.value=error instanceof Error ? error.message : '登録結果を確認できませんでした。'}
  finally{if(scope===scopeVersion)busy.value=false}
}
async function checkStatus() {
  if(busy.value || !pendingRecord.value || result.value)return
  const scope=scopeVersion, identity=storageScope(), saved=pendingRecord.value
  busy.value=true;problem.value=''
  try{const value=await props.invoke({action:'status',requestId:saved.requestId});if(scope!==scopeVersion)return;if(value.pending===true){problem.value='登録完了はまだ確認できません。同じCSVを選択して同じ取込みを再送できます。';return}if(!Number.isInteger(value.count) || !Array.isArray(value.ids))throw new Error('登録結果の形式を確認できません。');result.value={count:value.count,ids:value.ids,replayed:true};clearPendingImport(window.sessionStorage,identity,saved.requestId);emit('completed',result.value)}
  catch(error){if(scope===scopeVersion)problem.value=error instanceof Error ? error.message : '登録結果を確認できませんでした。'}
  finally{if(scope===scopeVersion)busy.value=false}
}
function discardRejected() { if(busy.value || !rejected.value || !discardConfirmation.value)return;try{clearPendingImport(window.sessionStorage,storageScope(),requestId.value)}catch(error){problem.value=error instanceof Error ? error.message : '取込状態を消去できません。';return}const obsolete=format.value==='uh';locked.value=false;pendingRecord.value=null;rejected.value=false;committedPayload=null;discardConfirmation.value=false;format.value='common';if(obsolete){csv.value='';file.value=null}invalidatePreview() }
function guardUnconfirmedExit(event:BeforeUnloadEvent) { if(locked.value && !result.value && !rejected.value){event.preventDefault();event.returnValue=''} }
onMounted(()=>{window.addEventListener('beforeunload',guardUnconfirmedExit);if(restorePending()){open.value=true;if(pendingRecord.value)void checkStatus()}})
onBeforeUnmount(()=>{scopeVersion++;fileVersion++;version++;committedPayload=null;csv.value='';window.removeEventListener('beforeunload',guardUnconfirmedExit)})
</script>
