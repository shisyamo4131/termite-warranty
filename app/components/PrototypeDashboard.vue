<template>
  <v-alert type="info" variant="tonal" class="mb-6">
    ローカルEmulator専用です。アカウント管理・郵便番号API・本番設定は未実装です。
  </v-alert>
  <v-alert v-if="pageMessage" :type="pageMessageType" class="mb-4">{{ pageMessage }}</v-alert>

  <div class="d-flex justify-end mb-4">
    <v-btn color="primary" @click="openRegistration">案件を登録</v-btn>
  </div>

  <case-filter-panel v-model="filters" :masters="allMasters" />

  <v-card title="案件一覧・アラート">
    <v-table>
      <thead><tr><th>案件番号</th><th>施主</th><th>物件住所</th><th>工務店</th><th>担当支店</th><th>状態</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="row in filteredRows" :key="row.id" :class="{ 'alert-row': row.isAlertEligible }">
          <td>{{ row.caseNumber }}</td><td>{{ row.homeownerName }}</td><td>{{ row.propertyAddress }}</td>
          <td>{{ row.constructionCompanyName }}</td><td>{{ row.branchName }}</td>
          <td>
            <v-chip v-if="row.isAlertEligible" color="warning" size="small" class="mr-1">期限30日以内</v-chip>
            <v-chip v-if="row.hasNotNotified" color="error" size="small" class="mr-1">未通知</v-chip>
            <v-chip v-if="row.status !== 'active'" size="small">{{ row.status === 'cancelled' ? '取消' : '無効' }}</v-chip>
          </td>
          <td><v-btn v-if="row.status === 'active'" size="small" variant="text" @click="openEdit(row)">編集</v-btn></td>
        </tr>
        <tr v-if="filteredRows.length === 0"><td colspan="7" class="text-center py-8">条件に一致する案件はありません。</td></tr>
      </tbody>
    </v-table>
  </v-card>

  <v-dialog v-model="registrationDialog" max-width="720" persistent>
    <v-card title="案件登録" subtitle="物件から施主・工務店を反映し、初回保証を登録します">
      <v-card-text>
        <v-alert v-if="registrationMessage" type="error" class="mb-4">{{ registrationMessage }}</v-alert>
        <v-select v-model="registrationForm.propertyId" :items="selectableMasters.properties" item-title="name" item-value="id" label="物件" @update:model-value="applyProperty" />
        <v-select v-model="registrationForm.constructionCompanyId" :items="selectableMasters.constructionCompanies" item-title="name" item-value="id" label="工務店（物件から自動反映）" disabled />
        <v-select v-model="registrationForm.branchId" :items="selectableMasters.branches" item-title="name" item-value="id" label="担当支店" />
        <v-select v-model="registrationForm.warrantyServiceId" :items="selectableMasters.warrantyServices" item-title="name" item-value="id" label="保証サービス" />
        <v-date-input v-model="warrantyStartDate" label="保証開始日" prepend-icon="" />
        <div class="text-caption mb-1">必要なマスターをこの入力内容を保ったまま追加できます。</div>
        <div class="d-flex flex-wrap ga-1">
          <quick-create-master-dialog master-type="constructionCompany" title="工務店" button-label="工務店を追加" @created="handleQuickCreated" />
          <quick-create-master-dialog master-type="homeowner" title="施主" button-label="施主を追加" @created="handleQuickCreated" />
          <quick-create-master-dialog master-type="property" title="物件" button-label="物件を追加" @created="handleQuickCreated" />
          <quick-create-master-dialog master-type="warrantyService" title="保証サービス" button-label="保証サービスを追加" @created="handleQuickCreated" />
        </div>
      </v-card-text>
      <v-card-actions><v-spacer /><v-btn :disabled="saving" @click="cancelRegistration">キャンセル</v-btn><v-btn color="primary" :loading="saving" @click="saveRegistration">案件を登録</v-btn></v-card-actions>
    </v-card>
  </v-dialog>

  <case-edit-dialog
    v-model="editDialog"
    :row="editingRow"
    :all-masters="allMasters"
    :selectable-masters="selectableMasters"
    @saved="handleCaseSaved"
  />
</template>

<script setup lang="ts">
import { filterCaseRows } from '../../src/domain/case-filters.mjs'
import {
  currentLocalDate, formatCanonicalLocalDate, parseCanonicalLocalDate,
  type CaseFilters, type CaseRow, type MasterCatalog,
} from '../composables/usePrototypeData'
import type { MasterType } from '../composables/useMasterManagement'

const emptyCatalog = (): MasterCatalog => ({
  branches: [], constructionCompanies: [], homeowners: [], properties: [], warrantyServices: [],
})
const allMasters = reactive(emptyCatalog())
const rows = ref<CaseRow[]>([])
const saving = ref(false)
const registrationDialog = ref(false)
const editDialog = ref(false)
const editingCaseId = ref<string | null>(null)
const registrationMessage = ref('')
const pageMessage = ref('')
const pageMessageType = ref<'success' | 'error'>('success')
const registrationForm = reactive({
  propertyId: '', constructionCompanyId: '', branchId: '', warrantyServiceId: '', startDate: currentLocalDate(),
})
const filters = reactive<CaseFilters>({
  caseNumber: null, homeownerId: null, propertyId: null, constructionCompanyId: null,
  responsibleBranchId: null, warrantyServiceId: null, prefecture: null, municipality: null,
  notificationStatus: null, expiryDate: null,
})
const { activeMasters, loadAllMasters, registerCase, subscribeCaseRows } = usePrototypeData()
const selectableMasters = computed(() => activeMasters(allMasters))
const filteredRows = computed(() => filterCaseRows(rows.value, filters))
const editingRow = computed(() => rows.value.find(({ id }) => id === editingCaseId.value) ?? null)
const warrantyStartDate = computed<Date | null>({
  get: () => parseCanonicalLocalDate(registrationForm.startDate),
  set: (value) => { registrationForm.startDate = formatCanonicalLocalDate(value) },
})

const applyProperty = () => {
  const property = selectableMasters.value.properties.find((item) => item.id === registrationForm.propertyId)
  registrationForm.constructionCompanyId = String(property?.constructionCompanyId ?? '')
}
const resetRegistration = () => {
  Object.assign(registrationForm, {
    propertyId: '', constructionCompanyId: '', branchId: '', warrantyServiceId: '',
    startDate: currentLocalDate(),
  })
  registrationMessage.value = ''
}
const openRegistration = () => {
  resetRegistration()
  registrationDialog.value = true
}
const cancelRegistration = () => {
  registrationDialog.value = false
  resetRegistration()
}
const refreshMasters = async () => Object.assign(allMasters, await loadAllMasters())
const handleQuickCreated = async ({ masterType, id }: { masterType: MasterType; id: string }) => {
  await refreshMasters()
  if (masterType === 'property') {
    registrationForm.propertyId = id
    applyProperty()
  }
  if (masterType === 'warrantyService') registrationForm.warrantyServiceId = id
}
const saveRegistration = async () => {
  registrationMessage.value = ''
  if (!registrationForm.propertyId || !registrationForm.constructionCompanyId || !registrationForm.branchId
    || !registrationForm.warrantyServiceId || !registrationForm.startDate) {
    registrationMessage.value = 'すべての必須項目を入力してください。'
    return
  }
  saving.value = true
  try {
    const result = await registerCase({
      propertyId: registrationForm.propertyId, branchId: registrationForm.branchId,
      warrantyServiceId: registrationForm.warrantyServiceId, startDate: registrationForm.startDate,
    })
    registrationDialog.value = false
    resetRegistration()
    pageMessageType.value = 'success'
    pageMessage.value = `案件 ${result.caseNumber} を登録しました。`
  } catch (error) {
    registrationMessage.value = error instanceof Error ? error.message : '案件登録に失敗しました。'
  } finally {
    saving.value = false
  }
}
const openEdit = (row: CaseRow) => {
  editingCaseId.value = row.id
  editDialog.value = true
}
const handleCaseSaved = () => {
  editingCaseId.value = null
  pageMessage.value = '案件を更新しました。'
  pageMessageType.value = 'success'
}

let unsubscribe: (() => void) | undefined
onMounted(async () => {
  await refreshMasters()
  unsubscribe = subscribeCaseRows(
    (nextRows) => { rows.value = nextRows },
    () => {
      pageMessageType.value = 'error'
      pageMessage.value = 'データ参照権限を確認できません。再ログインしてください。'
    },
    (nextMasters) => Object.assign(allMasters, nextMasters),
  )
})
onBeforeUnmount(() => unsubscribe?.())
</script>

<style scoped>
.alert-row {
  background: #fff3df;
  border-inline-start: 4px solid #a65f00;
}
</style>
