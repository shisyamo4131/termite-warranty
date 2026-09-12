<template>
  <v-dialog v-model="open" max-width="720" persistent>
    <v-card :title="`${title}を編集`"><v-card-text>
      <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>
      <MasterFormFields
        v-model="form"
        :homeowners="references.homeowners"
        :companies="references.companies"
      />
    </v-card-text><v-card-actions><v-spacer /><v-btn :disabled="saving" @click="open = false">キャンセル</v-btn><v-btn color="primary" :loading="saving" @click="save">更新</v-btn></v-card-actions></v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import type { ManagedMaster, MasterType } from '../composables/useMasterManagement'
import { createMasterFormDraft, type MasterFormDraft } from '../../src/domain/master-form.mjs'
import { submitMasterUpdate } from '../utils/masterFormSubmission.mjs'

const props = defineProps<{ masterType: MasterType; title: string; row: ManagedMaster | null }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>({ required: true })
const { updateMaster, loadPropertyReferences } = useMasterManagement(props.masterType)
const saving = ref(false); const message = ref('')
const references = reactive({ homeowners: [] as ManagedMaster[], companies: [] as ManagedMaster[] })
const form = ref<MasterFormDraft>(createMasterFormDraft(props.masterType))
const initialize = async () => {
  const row = props.row
  if (!row) return
  form.value = createMasterFormDraft(props.masterType, row)
  if (props.masterType === 'property') Object.assign(references, await loadPropertyReferences(row))
  message.value = ''
}
watch(open, value => { if (value) void initialize() })
const save = async () => {
  if (!props.row) return
  saving.value = true
  try {
    await submitMasterUpdate({
      id: props.row.id,
      form: form.value,
      updateMaster,
      afterSuccess: () => {
        open.value = false
        emit('saved')
      },
    })
  } catch (error) {
    message.value = error instanceof Error ? error.message : '保存できませんでした。'
  } finally {
    saving.value = false
  }
}
</script>
