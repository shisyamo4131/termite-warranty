<template>
  <v-row>
    <v-col cols="12">
      <v-alert v-if="message" :type="messageType" class="mb-4">{{ message }}</v-alert>
      <v-card :title="`${title}一覧`">
        <v-card-text>
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
        <v-table>
          <thead><tr><th>名称</th><th v-if="hasAddress">住所</th><th>状態</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td><NuxtLink :to="`/masters/${routeSegment}/${row.id}`">{{ row.name }}</NuxtLink><div v-if="masterType === 'warrantyService'" class="text-caption">{{ row.defaultPeriodYears }}年</div></td>
              <td v-if="hasAddress">{{ formatAddress(row) }}</td>
              <td><v-chip :color="row.active ? 'success' : 'default'" size="small">{{ row.active ? '有効' : '無効' }}</v-chip></td>
              <td>
                <v-btn size="small" variant="text" @click="beginEdit(row)">編集</v-btn>
                <v-btn size="small" variant="text" :color="row.active ? 'warning' : 'success'" @click="toggle(row)">
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
          <v-text-field v-model="form.name" label="名称" required />
          <v-text-field
            v-if="masterType === 'warrantyService'"
            v-model.number="form.defaultPeriodYears"
            label="標準保証期間（年）"
            type="number"
            min="1"
            step="1"
            required
          />
          <template v-if="masterType === 'property'">
            <v-select v-model="form.homeownerId" :items="references.homeowners" item-title="name" item-value="id" label="施主" required />
            <v-select v-model="form.constructionCompanyId" :items="references.companies" item-title="name" item-value="id" label="工務店" required />
            <v-text-field v-model="form.postalCode" label="郵便番号（7桁）" required />
            <v-text-field v-model="form.prefecture" label="都道府県" required />
            <v-text-field v-model="form.municipality" label="市区町村" required />
            <v-text-field v-model="form.streetTownAndNumber" label="町域・番地" required />
            <v-text-field v-model="form.buildingName" label="建物名（任意）" />
          </template>
          <template v-if="masterType === 'constructionCompany'">
            <v-text-field v-model="form.postalCode" label="郵便番号（7桁）" required />
            <v-text-field v-model="form.prefecture" label="都道府県" required />
            <v-text-field v-model="form.municipality" label="市区町村" required />
            <v-text-field v-model="form.streetTownAndNumber" label="町域・番地" required />
            <v-text-field v-model="form.buildingName" label="建物名（任意）" />
            <v-text-field v-model="form.telephone" label="TEL（任意）" />
            <v-text-field v-model="form.fax" label="FAX（任意）" />
            <v-text-field v-model="form.contactPerson" label="担当者（任意）" />
            <v-textarea v-model="form.contactDetails" label="連絡先（任意）" />
            <v-text-field v-model="form.email" label="メールアドレス（任意）" />
            <v-textarea v-model="form.notes" label="備考（任意）" />
          </template>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" @click="cancelDialog">キャンセル</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">{{ editingId ? '更新' : '登録' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <MasterEditDialog v-model="editDialog" :master-type="masterType" :title="title" :row="editingRow" @saved="message = '更新しました。'; messageType = 'success'" />
</template>

<script setup lang="ts">
import { matchesManagedMasterName, type ManagedMaster, type MasterType } from '../composables/useMasterManagement'
import { normalizeSearchText } from '../../src/domain/search-tokens.mjs'

const props = defineProps<{ masterType: MasterType; title: string }>()
const rows = ref<ManagedMaster[]>([])
const filter = ref<string | null>('')
const saving = ref(false)
const dialogOpen = ref(false)
const editDialog = ref(false)
const dialogMessage = ref('')
const editingId = ref('')
const editingRevision = ref(0)
const editingRow = ref<ManagedMaster | null>(null)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const references = reactive({ homeowners: [] as ManagedMaster[], companies: [] as ManagedMaster[] })

const emptyForm = () => ({
  name: '',
  defaultPeriodYears: 1,
  homeownerId: '',
  constructionCompanyId: '',
  postalCode: '',
  prefecture: '',
  municipality: '',
  streetTownAndNumber: '',
  buildingName: '',
  telephone: '',
  fax: '',
  contactPerson: '',
  contactDetails: '',
  email: '',
  notes: '',
})
const form = reactive(emptyForm())
const manager = useMasterManagement(props.masterType)
const hasAddress = computed(() => props.masterType === 'property' || props.masterType === 'constructionCompany')
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

const fields = () => {
  if (props.masterType === 'warrantyService') {
    return { name: form.name, defaultPeriodYears: form.defaultPeriodYears }
  }
  if (props.masterType === 'property') {
    return {
      name: form.name,
      homeownerId: form.homeownerId,
      constructionCompanyId: form.constructionCompanyId,
      address: {
        postalCode: form.postalCode,
        prefecture: form.prefecture,
        municipality: form.municipality,
        streetTownAndNumber: form.streetTownAndNumber,
        buildingName: form.buildingName || null,
      },
    }
  }
  if (props.masterType === 'constructionCompany') {
    return {
      name: form.name,
      address: {
        postalCode: form.postalCode,
        prefecture: form.prefecture,
        municipality: form.municipality,
        streetTownAndNumber: form.streetTownAndNumber,
        buildingName: form.buildingName || null,
      },
      telephone: form.telephone || null,
      fax: form.fax || null,
      contactPerson: form.contactPerson || null,
      contactDetails: form.contactDetails || null,
      email: form.email || null,
      notes: form.notes || null,
    }
  }
  return { name: form.name }
}

const resetForm = () => {
  Object.assign(form, emptyForm())
  editingId.value = ''
  editingRevision.value = 0
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

const beginEdit = (row: ManagedMaster) => {
  editingRow.value = row
  editDialog.value = true
}

const refreshReferences = async (include: { homeownerId?: string; constructionCompanyId?: string } = {}) => {
  if (props.masterType === 'property') Object.assign(references, await manager.loadPropertyReferences(include))
}

const save = async () => {
  saving.value = true
  message.value = ''
  try {
    if (editingId.value) await manager.updateMaster(editingId.value, editingRevision.value, fields())
    else await manager.createMaster(fields())
    messageType.value = 'success'
    message.value = editingId.value ? '更新しました。' : '登録しました。'
    dialogOpen.value = false
    dialogMessage.value = ''
    resetForm()
    await refreshReferences()
  } catch (error) {
    dialogMessage.value = error instanceof Error ? error.message : '保存できませんでした。'
  } finally {
    saving.value = false
  }
}

const toggle = async (row: ManagedMaster) => {
  message.value = ''
  try {
    await manager.setMasterActive(row.id, row.revision, !row.active)
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
