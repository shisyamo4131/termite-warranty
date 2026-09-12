<template>
  <v-dialog v-model="open" max-width="600" persistent><v-card :title="warranty ? '適用保証を編集' : '適用保証を追加'"><v-card-text>
    <v-alert v-if="message" type="error" class="mb-3">{{ message }}</v-alert>
    <v-select v-if="!warranty" v-model="form.warrantyServiceId" :items="services" item-title="name" item-value="id" label="保証サービス" required />
    <v-date-input v-model="startDate" label="保証開始日" prepend-icon="" required />
    <v-date-input v-if="warranty" v-model="expiryDate" label="満了日（手動補正可）" prepend-icon="" required />
    <v-select v-if="warranty" v-model="form.notificationStatus" :items="notifications" label="通知状態" required />
    <v-select v-if="warranty" v-model="form.status" :items="statuses" item-title="title" item-value="value" label="状態" required />
    <v-textarea v-if="warranty && form.status !== 'active'" v-model="form.statusReason" label="取消・無効理由" required />
  </v-card-text><v-card-actions><v-spacer/><v-btn :disabled="saving" @click="close">キャンセル</v-btn><v-btn color="primary" :loading="saving" @click="save">保存</v-btn></v-card-actions></v-card></v-dialog>
</template>
<script setup lang="ts">
import type { CaseRow, MasterCatalog } from '../types/prototype-data'
import { hydrateAppliedWarrantyDraft, recalculatedAppliedWarrantyExpiry } from '../utils/appliedWarrantyDraft'
import { formatCanonicalLocalDate, parseCanonicalLocalDate } from '../utils/canonicalLocalDate'
const props = defineProps<{ modelValue: boolean; row: CaseRow; warranty?: CaseRow['appliedWarranties'][number] | null; masters: MasterCatalog }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>()
const { addAppliedWarranty, updateAppliedWarranty } = useCaseCommands()
const { activeMasters } = useMasterCatalog()
const open = computed({ get: () => props.modelValue, set: (value) => emit('update:modelValue', value) })
const saving = ref(false); const message = ref('')
const openedCaseBaseline = ref<CaseRow['updatedAtBaseline']>(null)
const hydrating = ref(false)
const form = reactive({ warrantyServiceId: '', startDate: '', expiryDate: '', notificationStatus: 'not notified' as const, status: 'active' as 'active' | 'cancelled' | 'invalid', statusReason: '' })
const services = computed(() => activeMasters(props.masters).warrantyServices)
const notifications = ['not notified', 'notified', 'not required']; const statuses = [{ title: '有効', value: 'active' }, { title: '取消', value: 'cancelled' }, { title: '無効', value: 'invalid' }]
const startDate = computed<Date | null>({ get: () => parseCanonicalLocalDate(form.startDate), set: value => { form.startDate = formatCanonicalLocalDate(value) } })
const expiryDate = computed<Date | null>({ get: () => parseCanonicalLocalDate(form.expiryDate), set: value => { form.expiryDate = formatCanonicalLocalDate(value) } })
watch(() => [props.modelValue, props.warranty?.id] as const, () => { if (!props.modelValue) return; hydrating.value = true; const { baseline, ...draft } = hydrateAppliedWarrantyDraft(props.row, props.warranty); openedCaseBaseline.value = baseline; Object.assign(form, draft); message.value = ''; nextTick(() => { hydrating.value = false }) }, { immediate: true })
watch(() => form.startDate, (value, previous) => {
  if (!props.warranty || hydrating.value || !value || value === previous) return
  try { form.expiryDate = recalculatedAppliedWarrantyExpiry(value, props.warranty.periodYears) } catch { /* callable reports invalid dates */ }
})
const close = () => { open.value = false; message.value = '' }
const save = async () => { saving.value = true; message.value = ''; try { if (!openedCaseBaseline.value) throw new Error('案件の更新時刻を確認できません。最新データを読み直してください。'); if (props.warranty) await updateAppliedWarranty({ caseId: props.row.id, warrantyId: props.warranty.id, expectedCaseUpdatedAt: openedCaseBaseline.value, startDate: form.startDate, expiryDate: form.expiryDate, notificationStatus: form.notificationStatus, status: form.status, statusReason: form.statusReason }); else await addAppliedWarranty({ caseId: props.row.id, expectedCaseUpdatedAt: openedCaseBaseline.value, warrantyServiceId: form.warrantyServiceId, startDate: form.startDate || undefined }); emit('saved'); close() } catch (error) { message.value = error instanceof Error ? error.message : '保存できませんでした。' } finally { saving.value = false } }
</script>
