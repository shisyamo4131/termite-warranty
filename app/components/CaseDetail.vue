<template>
  <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>

  <template v-if="row">
    <div class="detail-page-breadcrumbs mb-3">案件一覧　/　案件詳細</div>
    <div class="detail-page-header mb-6">
      <div><h1 class="text-h4 detail-page-title">{{ row.propertyName }}</h1><div class="detail-page-subtitle">案件番号：{{ row.caseNumber }}</div></div>
      <v-btn v-if="row.status === 'active'" color="primary" prepend-icon="mdi-pencil" @click="openEdit">編集</v-btn>
    </div>

    <v-row class="detail-summary pa-2 mb-6" no-gutters>
      <v-col cols="12" sm="4" class="pa-3"><div class="detail-summary-label">施主</div><div class="detail-summary-value">{{ row.homeownerName }}</div></v-col>
      <v-col cols="12" sm="4" class="pa-3"><div class="detail-summary-label">工務店</div><div class="detail-summary-value">{{ row.constructionCompanyName }}</div></v-col>
      <v-col cols="12" sm="4" class="pa-3"><div class="detail-summary-label">案件状態</div><div class="detail-summary-value"><v-chip :color="row.status === 'active' ? 'success' : 'default'" size="small">{{ statusLabel(row.status) }}</v-chip><span v-if="row.statusReason" class="ml-2 text-body-2">{{ row.statusReason }}</span></div></v-col>
    </v-row>

    <section>
      <h2 class="detail-section-title mb-2">案件情報</h2>
      <v-row class="detail-fields" no-gutters>
        <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">物件</div><div class="detail-field-value">{{ row.propertyName }}</div></v-col>
        <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">物件住所</div><div class="detail-field-value">{{ row.propertyAddress }}</div></v-col>
        <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">担当支店</div><div class="detail-field-value">{{ row.branchName }}</div></v-col>
        <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">申込日</div><div class="detail-field-value">{{ row.applicationDate || '—' }}</div></v-col>
        <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">引渡日</div><div class="detail-field-value">{{ row.handoverDate || '—' }}</div></v-col>
      </v-row>
    </section>

    <section class="mt-6">
      <div class="d-flex align-center justify-space-between mb-2"><h2 class="detail-section-title mb-0">適用保証</h2><v-btn v-if="row.status === 'active'" color="primary" size="small" @click="openWarranty(null)">適用保証を追加</v-btn></div>
      <v-table><thead><tr><th>サービス</th><th>期間</th><th>開始日</th><th>満了日</th><th>通知</th><th>状態</th><th>操作</th></tr></thead><tbody><tr v-for="warranty in visibleWarranties" :key="warranty.id"><td>{{ warranty.warrantyServiceName }}</td><td>{{ warranty.periodYears }}年</td><td>{{ warranty.startDate }}</td><td>{{ warranty.expiryDate }}</td><td>{{ warranty.notificationStatus }}</td><td>{{ statusLabel(warranty.status) }}<span v-if="warranty.statusReason">（{{ warranty.statusReason }}）</span></td><td><v-btn v-if="row.status === 'active' && warranty.status === 'active'" size="small" variant="text" @click="openWarranty(warranty)">編集</v-btn></td></tr></tbody></v-table>
      <div v-if="row.appliedWarranties.length" class="list-pagination-bar">
        <span class="text-body-2 text-medium-emphasis">{{ row.appliedWarranties.length }}件</span>
        <v-pagination v-if="warrantyPageCount > 1" v-model="warrantyPage" :length="warrantyPageCount" density="comfortable" />
      </div>
    </section>
  </template>

  <v-alert v-else-if="loaded && !message" type="warning">指定された案件は見つかりません。</v-alert>
  <v-btn class="mt-6" variant="outlined" to="/cases">一覧へ戻る</v-btn>
  <CaseEditDialog v-model="editOpen" :row="row" :all-masters="dialogMasters" :selectable-masters="selectableMasters" @saved="showSnackbar('案件を更新しました。', 'success')" />
  <AppliedWarrantyDialog v-if="row" v-model="warrantyOpen" :row="row" :warranty="selectedWarranty" :masters="dialogMasters" @saved="handleWarrantySaved" />
</template>

<script setup lang="ts">
import type { CaseRow, MasterCatalog } from '../types/prototype-data'

const PAGE_SIZE = 5
const route = useRoute()
const { showSnackbar } = useAppSnackbar()
const editOpen = ref(false)
const warrantyOpen = ref(false)
const selectedWarranty = ref<CaseRow['appliedWarranties'][number] | null>(null)
const warrantyPage = ref(1)
const { state, start } = useCaseDetail()
const masterCatalog = useMasterCatalog()
const dialogMasters = reactive<MasterCatalog>(masterCatalog.emptyMasterCatalog())
const dialogLoadError = ref('')
const row = computed(() => state.value.row)
const message = computed(() => dialogLoadError.value || (state.value.status === 'error' ? '案件データを読み込めませんでした。' : ''))
const loaded = computed(() => state.value.status !== 'loading')
const selectableMasters = computed(() => masterCatalog.activeMasters(dialogMasters))
const warrantyPageCount = computed(() => Math.max(1, Math.ceil((row.value?.appliedWarranties.length ?? 0) / PAGE_SIZE)))
const visibleWarranties = computed(() => row.value?.appliedWarranties.slice((warrantyPage.value - 1) * PAGE_SIZE, warrantyPage.value * PAGE_SIZE) ?? [])
const statusLabel = (value: string) => ({ active: '有効', cancelled: '取消', invalid: '無効' }[value] ?? value)
const loadDialogMasters = async () => {
  dialogLoadError.value = ''
  try {
    Object.assign(dialogMasters, await masterCatalog.loadAllMasters())
    return true
  } catch (error) {
    dialogLoadError.value = error instanceof Error ? error.message : '編集用マスターを読み込めませんでした。'
    return false
  }
}
const openEdit = async () => {
  if (await loadDialogMasters()) editOpen.value = true
}
const openWarranty = async (warranty: CaseRow['appliedWarranties'][number] | null) => {
  if (!await loadDialogMasters()) return
  selectedWarranty.value = warranty
  warrantyOpen.value = true
}
const handleWarrantySaved = () => showSnackbar(selectedWarranty.value ? '適用保証を更新しました。' : '適用保証を追加しました。', 'success')
onMounted(() => start(String(route.params.id)))
watch(() => route.params.id, id => { warrantyPage.value = 1; start(String(id)) })
watch(() => row.value?.appliedWarranties.length ?? 0, () => {
  if (warrantyPage.value > warrantyPageCount.value) warrantyPage.value = warrantyPageCount.value
})
</script>
