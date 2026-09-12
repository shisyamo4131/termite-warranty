<template>
  <section class="list-page">
    <h1 class="text-h4 mb-6">案件一覧</h1>
    <v-alert v-if="pageMessage" :type="pageMessageType" class="mb-4">{{ pageMessage }}</v-alert>

    <div class="d-flex justify-end mb-4">
      <v-btn color="primary" @click="openRegistration">案件を登録</v-btn>
    </div>

    <case-filter-panel v-model="filters" :masters="allMasters" />

    <v-alert type="info" density="compact" variant="tonal" class="mb-4">
      更新日時が新しい20件を表示しています。現在の検索条件は、この20件の中を絞り込みます。
    </v-alert>

    <v-card class="list-data-card" title="案件一覧・アラート">
      <v-table class="list-data-table" fixed-header>
      <thead><tr><th>案件番号</th><th>施主</th><th>物件住所</th><th>工務店</th><th>担当支店</th><th>状態</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="row in filteredRows" :key="row.id" :class="{ 'alert-row': row.isAlertEligible }">
          <td><NuxtLink :to="`/cases/${row.id}`">{{ row.caseNumber }}</NuxtLink></td><td>{{ row.homeownerName }}</td><td>{{ row.propertyAddress }}</td>
          <td>{{ row.constructionCompanyName }}</td><td>{{ row.branchName }}</td>
          <td>
            <v-chip v-if="row.isAlertEligible" color="warning" size="small" class="mr-1">期限30日以内</v-chip>
            <v-chip v-if="row.hasNotNotified" color="error" size="small" class="mr-1">未通知</v-chip>
            <v-chip v-if="row.status !== 'active'" size="small">{{ row.status === 'cancelled' ? '取消' : '無効' }}</v-chip>
          </td>
          <td><v-btn size="small" variant="text" :to="`/cases/${row.id}`">詳細</v-btn></td>
        </tr>
        <tr v-if="filteredRows.length === 0"><td colspan="7" class="text-center py-8">条件に一致する案件はありません。</td></tr>
      </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="registrationDialog" max-width="720" persistent>
    <v-card title="案件登録" subtitle="物件から施主・工務店を反映し、初回保証を登録します">
      <v-card-text>
        <v-alert v-if="registrationMessage" type="error" class="mb-4">{{ registrationMessage }}</v-alert>
        <v-select v-model="registrationForm.propertyId" :items="selectableMasters.properties" item-title="name" item-value="id" label="物件" required @update:model-value="applyProperty"><template #append><quick-create-master-dialog master-type="property" title="物件" button-label="物件を追加" @created="handleQuickCreated"><template #activator="{ open }"><v-btn icon="mdi-plus" size="x-small" variant="text" aria-label="物件を追加" @click.stop="open" /></template></quick-create-master-dialog></template></v-select>
        <v-select v-model="registrationForm.homeownerId" :items="selectableMasters.homeowners" item-title="name" item-value="id" label="施主（物件から自動選択）" required @update:model-value="registrationForm.homeownerOverridden = true"><template #append><quick-create-master-dialog master-type="homeowner" title="施主" button-label="施主を追加" @created="handleQuickCreated"><template #activator="{ open }"><v-btn icon="mdi-plus" size="x-small" variant="text" aria-label="施主を追加" @click.stop="open" /></template></quick-create-master-dialog></template></v-select>
        <v-select v-model="registrationForm.constructionCompanyId" :items="selectableMasters.constructionCompanies" item-title="name" item-value="id" label="工務店（物件から自動選択）" required @update:model-value="registrationForm.constructionCompanyOverridden = true"><template #append><quick-create-master-dialog master-type="constructionCompany" title="工務店" button-label="工務店を追加" @created="handleQuickCreated"><template #activator="{ open }"><v-btn icon="mdi-plus" size="x-small" variant="text" aria-label="工務店を追加" @click.stop="open" /></template></quick-create-master-dialog></template></v-select>
        <v-select v-model="registrationForm.branchId" :items="selectableMasters.branches" item-title="name" item-value="id" label="担当支店" required />
        <v-date-input v-model="applicationDate" label="申込日" prepend-icon="" required />
        <v-date-input v-model="handoverDate" label="引渡日" prepend-icon="" required />
        <div class="text-subtitle-2 mt-4 mb-2">初回保証</div>
        <v-select v-model="registrationForm.warrantyServiceId" :items="selectableMasters.warrantyServices" item-title="name" item-value="id" label="保証サービス" required><template #append><quick-create-master-dialog master-type="warrantyService" title="保証サービス" button-label="保証サービスを追加" @created="handleQuickCreated"><template #activator="{ open }"><v-btn icon="mdi-plus" size="x-small" variant="text" aria-label="保証サービスを追加" @click.stop="open" /></template></quick-create-master-dialog></template></v-select>
        <v-date-input v-model="warrantyStartDate" label="保証開始日" prepend-icon="" required />
        <div class="text-caption">各選択欄の末尾にある追加アイコンから、入力内容を保ったままマスターを登録できます。</div>
      </v-card-text>
      <v-card-actions><v-spacer /><v-btn :disabled="saving" @click="cancelRegistration">キャンセル</v-btn><v-btn color="primary" :loading="saving" @click="saveRegistration">案件を登録</v-btn></v-card-actions>
    </v-card>
    </v-dialog>

  </section>
</template>

<script setup lang="ts">
import { filterCaseRows } from '../../src/domain/case-filters.mjs'
import type { CaseFilters, CaseRow, MasterCatalog } from '../types/prototype-data'
import { currentLocalDate, formatCanonicalLocalDate, parseCanonicalLocalDate } from '../utils/canonicalLocalDate'
import type { MasterType } from '../composables/useMasterManagement'

const masterCatalog = useMasterCatalog()
const allMasters = reactive<MasterCatalog>(masterCatalog.emptyMasterCatalog())
const registrationMasters = reactive<MasterCatalog>(masterCatalog.emptyMasterCatalog())
const rows = ref<CaseRow[]>([])
const saving = ref(false)
const registrationDialog = ref(false)
const registrationMessage = ref('')
const pageMessage = ref('')
const pageMessageType = ref<'success' | 'error'>('success')
const registrationForm = reactive({
  propertyId: '', homeownerId: '', constructionCompanyId: '', branchId: '', warrantyServiceId: '', startDate: currentLocalDate(),
  applicationDate: '', handoverDate: '',
  homeownerOverridden: false, constructionCompanyOverridden: false,
})
const filters = reactive<CaseFilters>({
  caseNumber: null, homeownerId: null, propertyId: null, constructionCompanyId: null,
  responsibleBranchId: null, warrantyServiceId: null, prefecture: null, municipality: null,
  notificationStatus: null, expiryDate: null,
})
const { registerCase } = useCaseCommands()
const { state: caseListState, start: startCaseList } = useCaseList()
const selectableMasters = computed(() => masterCatalog.activeMasters(registrationMasters))
const filteredRows = computed(() => filterCaseRows(rows.value, filters))
const warrantyStartDate = computed<Date | null>({
  get: () => parseCanonicalLocalDate(registrationForm.startDate),
  set: (value) => { registrationForm.startDate = formatCanonicalLocalDate(value) },
})
const applicationDate = computed<Date | null>({
  get: () => parseCanonicalLocalDate(registrationForm.applicationDate),
  set: (value) => { registrationForm.applicationDate = formatCanonicalLocalDate(value) },
})
const handoverDate = computed<Date | null>({
  get: () => parseCanonicalLocalDate(registrationForm.handoverDate),
  set: (value) => { registrationForm.handoverDate = formatCanonicalLocalDate(value) },
})

const applyProperty = () => {
  const property = selectableMasters.value.properties.find((item) => item.id === registrationForm.propertyId)
  registrationForm.homeownerId = String(property?.homeownerId ?? '')
  registrationForm.constructionCompanyId = String(property?.constructionCompanyId ?? '')
  registrationForm.homeownerOverridden = false
  registrationForm.constructionCompanyOverridden = false
}
const resetRegistration = () => {
  Object.assign(registrationForm, {
    propertyId: '', homeownerId: '', constructionCompanyId: '', branchId: '', warrantyServiceId: '',
    startDate: currentLocalDate(),
    applicationDate: '', handoverDate: '',
    homeownerOverridden: false, constructionCompanyOverridden: false,
  })
  registrationMessage.value = ''
}
const openRegistration = async () => {
  resetRegistration()
  try {
    await refreshRegistrationMasters()
    registrationDialog.value = true
  } catch (error) {
    pageMessageType.value = 'error'
    pageMessage.value = error instanceof Error ? error.message : '登録用マスターを読み込めませんでした。'
  }
}
const cancelRegistration = () => {
  registrationDialog.value = false
  resetRegistration()
}
const refreshRegistrationMasters = async () => Object.assign(registrationMasters, await masterCatalog.loadAllMasters())
const handleQuickCreated = async ({ masterType, id }: { masterType: MasterType; id: string }) => {
  await refreshRegistrationMasters()
  if (masterType === 'property') {
    registrationForm.propertyId = id
    applyProperty()
  }
  if (masterType === 'warrantyService') registrationForm.warrantyServiceId = id
}
const saveRegistration = async () => {
  registrationMessage.value = ''
  if (!registrationForm.propertyId || !registrationForm.homeownerId || !registrationForm.constructionCompanyId || !registrationForm.branchId
    || !registrationForm.warrantyServiceId || !registrationForm.startDate
    || !registrationForm.applicationDate || !registrationForm.handoverDate) {
    registrationMessage.value = 'すべての必須項目を入力してください。'
    return
  }
  saving.value = true
  try {
    const result = await registerCase({
      propertyId: registrationForm.propertyId, homeownerId: registrationForm.homeownerId,
      constructionCompanyId: registrationForm.constructionCompanyId, branchId: registrationForm.branchId,
      homeownerOverridden: registrationForm.homeownerOverridden,
      constructionCompanyOverridden: registrationForm.constructionCompanyOverridden,
      warrantyServiceId: registrationForm.warrantyServiceId, startDate: registrationForm.startDate,
      applicationDate: registrationForm.applicationDate, handoverDate: registrationForm.handoverDate,
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
watch(caseListState, (next) => {
  rows.value = next.rows
  Object.assign(allMasters, next.masters)
  if (next.status === 'error') {
    pageMessageType.value = 'error'
    pageMessage.value = 'データ参照権限を確認できません。再ログインしてください。'
  }
})
onMounted(startCaseList)
</script>

<style scoped>
.alert-row {
  background: var(--clear-sky-warning-soft);
  border-inline-start: 4px solid var(--clear-sky-warning);
}
</style>
