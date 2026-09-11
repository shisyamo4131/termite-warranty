<template>
  <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>
  <v-card v-if="row" :title="`案件 ${row.caseNumber}`"><v-card-text>
    <dl><dt>状態</dt><dd>{{ statusLabel(row.status) }}<span v-if="row.statusReason">（{{ row.statusReason }}）</span></dd><dt>施主</dt><dd>{{ row.homeownerName }}</dd><dt>物件</dt><dd>{{ row.propertyName }} {{ row.propertyAddress }}</dd><dt>工務店</dt><dd>{{ row.constructionCompanyName }}</dd><dt>担当支店</dt><dd>{{ row.branchName }}</dd><dt>申込日</dt><dd>{{ row.applicationDate || '—' }}</dd><dt>引渡日</dt><dd>{{ row.handoverDate || '—' }}</dd></dl>
    <v-btn v-if="row.status === 'active'" color="primary" @click="editOpen = true">編集</v-btn>
  </v-card-text></v-card>
  <v-card v-if="row" class="mt-4" title="適用保証"><v-table><thead><tr><th>サービス</th><th>期間</th><th>開始日</th><th>満了日</th><th>通知</th><th>状態</th></tr></thead><tbody><tr v-for="warranty in row.appliedWarranties" :key="warranty.id"><td>{{ warranty.warrantyServiceName }}</td><td>{{ warranty.periodYears }}年</td><td>{{ warranty.startDate }}</td><td>{{ warranty.expiryDate }}</td><td>{{ warranty.notificationStatus }}</td><td>{{ statusLabel(warranty.status) }}<span v-if="warranty.statusReason">（{{ warranty.statusReason }}）</span></td></tr></tbody></v-table></v-card>
  <v-alert v-else-if="loaded && !message" type="warning">指定された案件は見つかりません。<NuxtLink to="/">一覧へ戻る</NuxtLink></v-alert>
  <v-btn class="mt-4" to="/">一覧へ戻る</v-btn>
  <CaseEditDialog v-model="editOpen" :row="row" :all-masters="masters" :selectable-masters="selectableMasters" />
</template>
<script setup lang="ts">
import { type CaseRow, type MasterCatalog } from '../composables/usePrototypeData'
const route = useRoute(); const row = ref<CaseRow | null>(null); const message = ref(''); const loaded = ref(false); const editOpen = ref(false)
const emptyCatalog = (): MasterCatalog => ({ branches: [], constructionCompanies: [], homeowners: [], properties: [], warrantyServices: [] }); const masters = reactive(emptyCatalog())
const { activeMasters, subscribeCaseDetail } = usePrototypeData(); const selectableMasters = computed(() => activeMasters(masters)); const statusLabel = (value: string) => ({ active: '有効', cancelled: '取消', invalid: '無効' }[value] ?? value)
let unsubscribe: (() => void) | undefined
const start = (id: string) => { unsubscribe?.(); row.value = null; message.value = ''; loaded.value = false; Object.assign(masters, emptyCatalog()); unsubscribe = subscribeCaseDetail(id, value => { row.value = value; loaded.value = true }, () => { message.value = '案件データを読み込めませんでした。'; loaded.value = true }, value => Object.assign(masters, value)) }
onMounted(() => start(String(route.params.id))); watch(() => route.params.id, id => start(String(id))); onBeforeUnmount(() => unsubscribe?.())
</script>
