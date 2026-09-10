<template>
  <v-alert type="info" variant="tonal" class="mb-6">
    ローカルEmulator専用です。アカウント管理・郵便番号API・全検索条件・本番設定は未実装です。
  </v-alert>

  <v-row>
    <v-col cols="12" lg="4">
      <v-card title="案件登録" subtitle="物件から施主・工務店を反映し、初回保証を登録します">
        <v-card-text>
          <v-alert v-if="formMessage" :type="formMessageType" class="mb-4">{{ formMessage }}</v-alert>
          <v-select
            v-model="form.propertyId"
            :items="masters.properties"
            item-title="name"
            item-value="id"
            label="物件"
            @update:model-value="applyProperty"
          />
          <v-select
            v-model="form.constructionCompanyId"
            :items="masters.constructionCompanies"
            item-title="name"
            item-value="id"
            label="工務店（物件から自動反映）"
            disabled
          />
          <v-select v-model="form.branchId" :items="masters.branches" item-title="name" item-value="id" label="担当支店" />
          <v-select
            v-model="form.warrantyServiceId"
            :items="masters.warrantyServices"
            item-title="name"
            item-value="id"
            label="保証サービス"
          />
          <v-date-input v-model="warrantyStartDate" label="保証開始日" prepend-icon="" />
          <v-btn color="primary" block :loading="saving" @click="save">案件を登録</v-btn>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" lg="8">
      <v-card title="案件一覧・アラート">
        <v-table>
          <thead>
            <tr>
              <th>案件番号</th><th>施主</th><th>物件住所</th><th>工務店</th><th>担当支店</th><th>状態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" :class="{ 'alert-row': row.isAlertEligible }">
              <td>{{ row.caseNumber }}</td>
              <td>{{ row.homeownerName }}</td>
              <td>{{ row.propertyAddress }}</td>
              <td>{{ row.constructionCompanyName }}</td>
              <td>{{ row.branchName }}</td>
              <td>
                <v-chip v-if="row.isAlertEligible" color="warning" size="small" class="mr-1">期限30日以内</v-chip>
                <v-chip v-if="row.hasNotNotified" color="error" size="small">未通知</v-chip>
              </td>
            </tr>
            <tr v-if="rows.length === 0"><td colspan="6" class="text-center py-8">登録済み案件はありません。</td></tr>
          </tbody>
        </v-table>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import {
  currentLocalDate,
  formatCanonicalLocalDate,
  parseCanonicalLocalDate,
  type CaseRow,
  type MasterOption,
} from '../composables/usePrototypeData'

const emptyMasters = () => ({
  branches: [] as MasterOption[],
  constructionCompanies: [] as MasterOption[],
  homeowners: [] as MasterOption[],
  properties: [] as MasterOption[],
  warrantyServices: [] as MasterOption[],
})
const masters = reactive(emptyMasters())
const rows = ref<CaseRow[]>([])
const saving = ref(false)
const formMessage = ref('')
const formMessageType = ref<'success' | 'error'>('success')
const form = reactive({
  propertyId: '',
  constructionCompanyId: '',
  branchId: '',
  warrantyServiceId: '',
  startDate: currentLocalDate(),
})
const { loadActiveMasters, registerCase, subscribeCaseRows } = usePrototypeData()
const warrantyStartDate = computed<Date | null>({
  get: () => parseCanonicalLocalDate(form.startDate),
  set: (value) => { form.startDate = formatCanonicalLocalDate(value) },
})

const applyProperty = () => {
  const property = masters.properties.find((item) => item.id === form.propertyId)
  form.constructionCompanyId = String(property?.constructionCompanyId ?? '')
}

const save = async () => {
  formMessage.value = ''
  if (!form.propertyId || !form.constructionCompanyId || !form.branchId || !form.warrantyServiceId || !form.startDate) {
    formMessageType.value = 'error'
    formMessage.value = 'すべての必須項目を入力してください。'
    return
  }
  saving.value = true
  try {
    const result = await registerCase({
      propertyId: form.propertyId,
      branchId: form.branchId,
      warrantyServiceId: form.warrantyServiceId,
      startDate: form.startDate,
    })
    formMessageType.value = 'success'
    formMessage.value = `案件 ${result.caseNumber} を登録しました。`
  } catch (error) {
    formMessageType.value = 'error'
    formMessage.value = error instanceof Error ? error.message : '案件登録に失敗しました。'
  } finally {
    saving.value = false
  }
}

let unsubscribe: (() => void) | undefined
onMounted(async () => {
  Object.assign(masters, await loadActiveMasters())
  unsubscribe = subscribeCaseRows(
    (nextRows) => { rows.value = nextRows },
    () => {
      formMessageType.value = 'error'
      formMessage.value = 'データ参照権限を確認できません。再ログインしてください。'
    },
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
