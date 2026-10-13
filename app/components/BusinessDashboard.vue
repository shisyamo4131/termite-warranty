<template>
  <section class="dashboard" aria-label="ダッシュボード">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4"><h1 class="text-h5 business-page-title"><BusinessNavigationIcon item="dashboard" /><span>ダッシュボード</span></h1><v-btn color="primary" variant="flat" :loading="state.loading" :disabled="state.loading" @click="store.refresh">件数を更新</v-btn></div>
    <p class="text-body-2 mb-4">全保証グループの合計<span v-if="state.value"> ／ 基準日：{{ state.value.basisDate }} ／ 請求基準月：{{ state.value.basisMonth }}<br>最終更新：{{ updatedAt }}</span></p>
    <v-alert v-if="state.error" type="error" class="mb-4">{{ state.error }}<span v-if="state.value"> 前回取得した件数を表示しています。</span></v-alert>
    <v-alert v-else-if="state.stale" type="warning" class="mb-4">変更または日付の切替があります。「件数を更新」で最新の件数を確認してください。</v-alert>
    <v-progress-linear v-if="state.loading" indeterminate class="mb-4" aria-label="件数を取得中" />
    <div class="dashboard-active"><v-card class="pa-5"><div class="text-body-1">現在有効な物件・保証</div><div class="dashboard-count" aria-live="polite">{{ count('active') }}</div><p class="text-body-2">基準日が保証期間内にある物件</p></v-card></div>
    <div class="dashboard-actions mt-4"><v-card v-for="item in cards" :key="item.key" class="pa-5"><h2 class="text-h6 d-flex align-center ga-3"><BusinessNavigationIcon :item="item.target" />{{ item.title }}</h2><button type="button" class="dashboard-count dashboard-count-link" :aria-label="`${item.title}：${count(item.key)}。${item.link}`" @click="$emit('navigate',item.target)">{{ count(item.key) }}</button><p class="text-body-2 mb-4">{{ item.help }}</p><v-btn variant="outlined" color="primary" @click="$emit('navigate',item.target)">{{ item.link }}</v-btn></v-card></div>
  </section>
</template>
<script setup lang="ts">
import type { DashboardValue } from '../utils/dashboardSession.mjs'
defineEmits<{navigate:[target:string]}>()
const store=useDashboardStore(), state=store.state
const cards:Array<{key:keyof DashboardValue['counts'];target:string;title:string;help:string;link:string}>=[
  {key:'insurancePending',target:'report',title:'保険未報告',help:'基準日を含む保険期間が未報告の物件',link:'保険報告用一覧へ'},
  {key:'warrantyNoticePending',target:'alerts',title:'保証満了案内待ち',help:'延長可能・未案内。期限を過ぎた物件も含みます。',link:'保証満了案内へ'},
  {key:'billingPending',target:'billing',title:'未請求',help:'基準月以前に未請求のある物件。請求一覧では保証グループを指定します。',link:'請求用一覧へ'},
]
const count=(key:keyof DashboardValue['counts'])=>state.value.value ? `${state.value.value.counts[key].toLocaleString()}件` : state.value.loading ? '取得中…' : '取得できません'
const updatedAt=computed(()=>state.value.value ? new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'medium'}).format(new Date(state.value.value.completedAt)) : '')
let timer:ReturnType<typeof setInterval>
onMounted(()=>{void store.ensure();timer=setInterval(store.checkDate,30000);window.addEventListener('focus',store.checkDate);document.addEventListener('visibilitychange',store.checkDate)})
onUnmounted(()=>{clearInterval(timer);window.removeEventListener('focus',store.checkDate);document.removeEventListener('visibilitychange',store.checkDate)})
</script>
<style scoped>
.dashboard { min-height:0; overflow:auto; }
.dashboard-count { font-size:2rem; font-weight:700; margin-block:12px; }
.dashboard-count-link { text-align:left; color:rgb(var(--v-theme-primary)); }
.dashboard-actions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
.dashboard-actions .v-card { display:flex; flex-direction:column; align-items:flex-start; }
.dashboard-actions p { flex:1; }
@media(max-width:850px) { .dashboard-actions { grid-template-columns:1fr; } }
</style>
