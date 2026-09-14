<template>
  <section class="list-page">
    <v-row class="list-page-row">
      <v-col cols="12" class="list-page-column">
      <v-card class="list-data-card">
        <v-card-title class="d-flex align-center justify-space-between ga-4">
          <span>{{ title }}一覧</span>
          <v-btn color="primary" @click="openCreate">新規登録</v-btn>
        </v-card-title>
        <v-card-text>
          <v-alert v-if="loadError" type="error" class="mb-4">{{ loadError }}</v-alert>
          <v-alert type="info" density="compact" variant="tonal" class="mb-4">
            {{ hasSearchCondition ? '名称に一致するデータを全件から表示しています。' : '更新日時が新しい20件を表示しています。' }}
          </v-alert>
          <v-text-field
            v-model="filter"
            label="名称で絞り込み"
            clearable
          />
        </v-card-text>
        <ConstructionCompanyTable
          v-if="masterType === 'constructionCompany'"
          :items="filteredRows"
          :loading="loading"
          @show-detail="handleTableDetail"
          @change-active="handleTableActiveChange"
        />
        <HomeOwnerTable
          v-else-if="masterType === 'homeowner'"
          :items="filteredRows"
          :loading="loading"
          @show-detail="handleTableDetail"
          @change-active="handleTableActiveChange"
        />
        <v-table v-else class="list-data-table" fixed-header>
          <thead><tr><th>名称</th><th v-if="hasAddress">住所</th><th>状態</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>
                {{ row.name }}
                <div v-if="masterType === 'warrantyService'" class="text-caption">
                  {{ row.shortName }} / {{ row.defaultPeriodYears }}年
                </div>
              </td>
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
            ref="masterFormFields"
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
const loading = ref(true)
const filter = ref<string | null>('')
const saving = ref(false)
const dialogOpen = ref(false)
const dialogMessage = ref('')
const loadError = ref('')
const { showSnackbar } = useAppSnackbar()
const references = reactive({ homeowners: [] as ManagedMaster[], companies: [] as ManagedMaster[] })
type MasterFormFieldsHandle = { cancelPostalLookup: () => void }
const masterFormFields = ref<MasterFormFieldsHandle | null>(null)

const cancelPostalLookup = () => masterFormFields.value?.cancelPostalLookup()

const form = ref<MasterFormDraft>(createMasterFormDraft(props.masterType))
const manager = useMasterManagement(props.masterType)
const hasAddress = computed(() => props.masterType === 'property' || props.masterType === 'constructionCompany' || props.masterType === 'homeowner')
const routeSegment = computed(() => ({ constructionCompany: 'construction-companies', homeowner: 'homeowners', property: 'properties', warrantyService: 'warranty-services' }[props.masterType]))
const usesIndexedSearch = computed(() => props.masterType !== 'warrantyService')
const normalizedFilter = computed(() => normalizeSearchText(filter.value ?? ''))
const hasSearchCondition = computed(() => normalizedFilter.value.length > 0)
const filteredRows = computed(() => {
  const needle = normalizedFilter.value
  if (!needle) return rows.value
  if (usesIndexedSearch.value) {
    return rows.value.filter((row) => matchesManagedMasterName(row, filter.value ?? ''))
  }
  return rows.value.filter((row) => normalizeSearchText(row.name).includes(needle))
})

const resetForm = () => {
  cancelPostalLookup()
  form.value = createMasterFormDraft(props.masterType)
}

const openCreate = async () => {
  resetForm()
  dialogMessage.value = ''
  await refreshReferences()
  dialogOpen.value = true
}

const cancelDialog = () => {
  cancelPostalLookup()
  dialogOpen.value = false
  dialogMessage.value = ''
  resetForm()
}

const refreshReferences = async (include: { homeownerId?: string; constructionCompanyId?: string } = {}) => {
  if (props.masterType === 'property') Object.assign(references, await manager.loadPropertyReferences(include))
}

const save = async () => {
  cancelPostalLookup()
  saving.value = true
  try {
    await submitMasterCreate({
      form: form.value,
      createMaster: manager.createMaster,
      afterSuccess: async () => {
        cancelPostalLookup()
        showSnackbar('登録しました。', 'success')
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
  try {
    await manager.setMasterActive(row.id, !row.active)
    showSnackbar(row.active ? '無効化しました。' : '再有効化しました。', 'success')
    await refreshReferences()
  } catch (error) {
    showSnackbar(error instanceof Error ? error.message : '状態を変更できませんでした。', 'error')
  }
}

const handleTableDetail = ({ id }: { id: string }) => navigateTo(`/masters/${routeSegment.value}/${id}`)

const handleTableActiveChange = async ({ id, nextActive }: { id: string; nextActive: boolean }) => {
  const row = rows.value.find((candidate) => candidate.id === id)
  if (!row || row.active === nextActive) return
  await toggle(row)
}

const formatAddress = (row: ManagedMaster) => [
  row.address?.prefecture,
  row.address?.municipality,
  row.address?.streetTownAndNumber,
  row.address?.buildingName,
].filter(Boolean).join('')

let unsubscribe: (() => void) | undefined
let subscriptionTimer: ReturnType<typeof setTimeout> | undefined
let mounted = false
const restartSubscription = (complete: boolean) => {
  unsubscribe?.()
  loading.value = true
  loadError.value = ''
  unsubscribe = manager.subscribe(
    (nextRows) => { rows.value = nextRows; loading.value = false },
    (error) => { loadError.value = error; loading.value = false },
    undefined,
    complete,
  )
}

watch(hasSearchCondition, (complete) => {
  if (!mounted) return
  if (subscriptionTimer) clearTimeout(subscriptionTimer)
  subscriptionTimer = setTimeout(() => restartSubscription(complete), 250)
})

onMounted(async () => {
  mounted = true
  restartSubscription(hasSearchCondition.value)
  await refreshReferences()
})
onBeforeUnmount(() => {
  mounted = false
  if (subscriptionTimer) clearTimeout(subscriptionTimer)
  cancelPostalLookup()
  unsubscribe?.()
})
</script>
