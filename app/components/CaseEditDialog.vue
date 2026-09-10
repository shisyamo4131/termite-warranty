<template>
  <v-dialog v-model="dialogOpen" max-width="720" persistent>
    <v-card title="案件を編集">
      <v-card-text>
        <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>
        <v-text-field :model-value="row?.caseNumber" label="案件番号" disabled />
        <v-select v-model="form.propertyId" :items="propertyOptions" item-title="name" item-value="id" label="物件" required @update:model-value="applyProperty" />
        <v-text-field :model-value="homeownerName" label="施主（物件から反映）" disabled />
        <v-select v-model="form.constructionCompanyId" :items="companyOptions" item-title="name" item-value="id" label="工務店" :disabled="propertyChanged" required />
        <v-select v-model="form.responsibleBranchId" :items="branchOptions" item-title="name" item-value="id" label="担当支店" required />
        <v-select v-model="form.status" :items="statuses" item-title="title" item-value="value" label="状態" required />
        <v-textarea v-if="form.status !== 'active'" v-model="form.statusReason" label="取消・無効理由" required />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" @click="cancel">キャンセル</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">更新</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { CaseRow, MasterCatalog, MasterOption } from '../composables/usePrototypeData'

const props = defineProps<{
  row: CaseRow | null
  allMasters: MasterCatalog
  selectableMasters: MasterCatalog
}>()
const emit = defineEmits<{ saved: [] }>()
const dialogOpen = defineModel<boolean>({ required: true })
const { updateCase } = usePrototypeData()
const saving = ref(false)
const message = ref('')
const baselineUpdatedAt = ref<CaseRow['updatedAtBaseline']>(null)
const form = reactive({
  propertyId: '', constructionCompanyId: '', responsibleBranchId: '',
  status: 'active' as 'active' | 'cancelled' | 'invalid', statusReason: '',
})
const statuses = [
  { title: '有効', value: 'active' },
  { title: '取消', value: 'cancelled' },
  { title: '無効', value: 'invalid' },
]
const withCurrent = (active: MasterOption[], all: MasterOption[], currentId: string | undefined) => {
  if (!currentId || active.some(({ id }) => id === currentId)) return active
  const current = all.find(({ id }) => id === currentId)
  return current ? [...active, { ...current, name: `${current.name}（無効）` }] : active
}
const propertyOptions = computed(() => withCurrent(
  props.selectableMasters.properties, props.allMasters.properties, props.row?.propertyId,
))
const companyOptions = computed(() => withCurrent(
  props.selectableMasters.constructionCompanies,
  props.allMasters.constructionCompanies,
  props.row?.constructionCompanyId,
))
const branchOptions = computed(() => withCurrent(
  props.selectableMasters.branches, props.allMasters.branches, props.row?.responsibleBranchId,
))
const propertyChanged = computed(() => Boolean(props.row && form.propertyId !== props.row.propertyId))
const selectedProperty = computed(() => props.allMasters.properties.find(({ id }) => id === form.propertyId))
const homeownerName = computed(() => {
  const homeownerId = propertyChanged.value
    ? String(selectedProperty.value?.homeownerId ?? '')
    : props.row?.homeownerId
  return props.allMasters.homeowners.find(({ id }) => id === homeownerId)?.name ?? '—'
})

const applyProperty = () => {
  if (!props.row) return
  form.constructionCompanyId = propertyChanged.value
    ? String(selectedProperty.value?.constructionCompanyId ?? '')
    : props.row.constructionCompanyId
}
const initialize = () => {
  if (!props.row) return
  baselineUpdatedAt.value = props.row.updatedAtBaseline
  Object.assign(form, {
    propertyId: props.row.propertyId,
    constructionCompanyId: props.row.constructionCompanyId,
    responsibleBranchId: props.row.responsibleBranchId,
    status: props.row.status as 'active' | 'cancelled' | 'invalid',
    statusReason: props.row.statusReason ?? '',
  })
  message.value = ''
}
watch(dialogOpen, (open) => { if (open) initialize() })
const cancel = () => {
  dialogOpen.value = false
  message.value = ''
}
const save = async () => {
  if (!props.row || !baselineUpdatedAt.value) {
    message.value = '案件の更新時刻を確認できません。'
    return
  }
  saving.value = true
  message.value = ''
  try {
    await updateCase({
      id: props.row.id,
      baselineUpdatedAt: baselineUpdatedAt.value,
      propertyId: form.propertyId,
      constructionCompanyId: form.constructionCompanyId,
      responsibleBranchId: form.responsibleBranchId,
      status: form.status,
      statusReason: form.statusReason,
    })
    dialogOpen.value = false
    emit('saved')
  } catch (error) {
    message.value = error instanceof Error ? error.message : '案件を更新できませんでした。'
  } finally {
    saving.value = false
  }
}
</script>
