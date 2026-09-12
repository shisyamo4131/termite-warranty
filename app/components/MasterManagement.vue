<template>
  <section class="list-page">
    <v-row class="list-page-row">
      <v-col cols="12" class="list-page-column">
      <v-alert v-if="message" :type="messageType" class="mb-4">{{ message }}</v-alert>
      <v-card class="list-data-card" :title="`${title}一覧`">
        <v-card-text>
          <v-alert type="info" density="compact" variant="tonal" class="mb-4">
            更新日時が新しい20件を表示しています。名称検索は、この20件の中を絞り込みます。
          </v-alert>
          <div class="d-flex justify-end mb-4">
            <v-btn color="primary" @click="openCreate">新規登録</v-btn>
          </div>
          <v-text-field
            v-model="filter"
            label="名称で絞り込み"
            clearable
            :hint="searchHint"
            :persistent-hint="Boolean(searchHint)"
          />
        </v-card-text>
        <v-table class="list-data-table" fixed-header>
          <thead><tr><th>名称</th><th v-if="hasAddress">住所</th><th>状態</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>{{ row.name }}<div v-if="masterType === 'warrantyService'" class="text-caption">{{ row.defaultPeriodYears }}年</div></td>
              <td v-if="hasAddress">{{ formatAddress(row) }}</td>
              <td><v-chip :color="row.active ? 'success' : 'default'" size="small">{{ row.active ? '有効' : '無効' }}</v-chip></td>
              <td>
                <v-btn size="small" variant="text" :to="`/masters/${routeSegment}/${row.id}`">詳細</v-btn>
                <v-btn size="small" variant="text" :aria-label="row.active ? `${row.name}を無効化` : `${row.name}を再有効化`" @click="toggle(row)">
                  {{ row.active ? '無効化' : '再有効化' }}
                </v-btn>
              </td>
            </tr>
            <tr v-if="filteredRows.length === 0"><td :colspan="hasAddress ? 4 : 3" class="text-center py-8">該当するマスターはありません。</td></tr>
          </tbody>
        </v-table>
      </v-card>
    </v-col>
    </v-row>

    <v-dialog v-model="dialogOpen" max-width="720" persistent>
    <v-card :title="`${title}を登録`">
      <v-card-text>
        <v-alert v-if="dialogMessage" type="error" class="mb-4">{{ dialogMessage }}</v-alert>
        <v-form @submit.prevent="save">
          <MasterFormFields
            v-model="form"
            :homeowners="references.homeowners"
            :companies="references.companies"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" @click="cancelDialog">キャンセル</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">登録</v-btn>
      </v-card-actions>
    </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import { matchesManagedMasterName, type ManagedMaster, type MasterType } from '../composables/useMasterManagement'
import { normalizeSearchText } from '../../src/domain/search-tokens.mjs'
import { createMasterFormDraft, type MasterFormDraft } from '../../src/domain/master-form.mjs'
import { submitMasterCreate } from '../utils/masterFormSubmission.mjs'

const props = defineProps<{ masterType: MasterType; title: string }>()
const rows = ref<ManagedMaster[]>([])
const filter = ref<string | null>('')
const saving = ref(false)
const dialogOpen = ref(false)
const dialogMessage = ref('')
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const references = reactive({ homeowners: [] as ManagedMaster[], companies: [] as ManagedMaster[] })

const form = ref<MasterFormDraft>(createMasterFormDraft(props.masterType))
const manager = useMasterManagement(props.masterType)
const hasAddress = computed(() => props.masterType === 'property' || props.masterType === 'constructionCompany' || props.masterType === 'homeowner')
const routeSegment = computed(() => ({ constructionCompany: 'construction-companies', homeowner: 'homeowners', property: 'properties', warrantyService: 'warranty-services' }[props.masterType]))
const usesIndexedSearch = computed(() => props.masterType !== 'warrantyService')
const normalizedFilter = computed(() => normalizeSearchText(filter.value ?? ''))
const searchHint = computed(() =>
  usesIndexedSearch.value && (filter.value?.length ?? 0) > 0 && normalizedFilter.value.length < 2
    ? '正規化後2文字以上を入力すると検索します。'
    : '',
)
const filteredRows = computed(() => {
  const needle = normalizedFilter.value
  if (!needle) return rows.value
  if (usesIndexedSearch.value) {
    if (needle.length < 2) return rows.value
    return rows.value.filter((row) => matchesManagedMasterName(row, filter.value ?? ''))
  }
  return rows.value.filter((row) => normalizeSearchText(row.name).includes(needle))
})

const resetForm = () => {
  form.value = createMasterFormDraft(props.masterType)
}

const openCreate = async () => {
  resetForm()
  dialogMessage.value = ''
  await refreshReferences()
  dialogOpen.value = true
}

const cancelDialog = () => {
  dialogOpen.value = false
  dialogMessage.value = ''
  resetForm()
}

const refreshReferences = async (include: { homeownerId?: string; constructionCompanyId?: string } = {}) => {
  if (props.masterType === 'property') Object.assign(references, await manager.loadPropertyReferences(include))
}

const save = async () => {
  saving.value = true
  message.value = ''
  try {
    await submitMasterCreate({
      form: form.value,
      createMaster: manager.createMaster,
      afterSuccess: async () => {
        messageType.value = 'success'
        message.value = '登録しました。'
        dialogOpen.value = false
        dialogMessage.value = ''
        resetForm()
        await refreshReferences()
      },
    })
  } catch (error) {
    dialogMessage.value = error instanceof Error ? error.message : '保存できませんでした。'
  } finally {
    saving.value = false
  }
}

const toggle = async (row: ManagedMaster) => {
  message.value = ''
  try {
    await manager.setMasterActive(row.id, !row.active)
    messageType.value = 'success'
    message.value = row.active ? '無効化しました。' : '再有効化しました。'
    await refreshReferences()
  } catch (error) {
    messageType.value = 'error'
    message.value = error instanceof Error ? error.message : '状態を変更できませんでした。'
  }
}

const formatAddress = (row: ManagedMaster) => [
  row.address?.prefecture,
  row.address?.municipality,
  row.address?.streetTownAndNumber,
  row.address?.buildingName,
].filter(Boolean).join('')

let unsubscribe: (() => void) | undefined
onMounted(async () => {
  unsubscribe = manager.subscribe(
    (nextRows) => { rows.value = nextRows },
    (error) => { messageType.value = 'error'; message.value = error },
  )
  await refreshReferences()
})
onBeforeUnmount(() => unsubscribe?.())
</script>
