<template>
  <slot name="activator" :open="open">
    <v-btn size="small" variant="text" @click="open">{{ buttonLabel }}</v-btn>
  </slot>
  <v-dialog v-model="dialogOpen" max-width="720" persistent>
    <v-card :title="`${title}を新規登録`">
      <v-card-text>
        <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>
        <MasterFormFields
          ref="masterFormFields"
          v-model="form"
          :homeowners="references.homeowners"
          :companies="references.companies"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" @click="cancel">キャンセル</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">登録</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { ManagedMaster, MasterType } from '../composables/useMasterManagement'
import { createMasterFormDraft, type MasterFormDraft } from '../../src/domain/master-form.mjs'
import { submitMasterCreate } from '../utils/masterFormSubmission.mjs'

const props = defineProps<{
  masterType: MasterType
  title: string
  buttonLabel: string
}>()
const emit = defineEmits<{ created: [payload: { masterType: MasterType; id: string }] }>()
const manager = useMasterManagement(props.masterType)
const { showSnackbar } = useAppSnackbar()
const dialogOpen = ref(false)
const saving = ref(false)
const message = ref('')
const references = reactive({ homeowners: [] as ManagedMaster[], companies: [] as ManagedMaster[] })
const form = ref<MasterFormDraft>(createMasterFormDraft(props.masterType))
type MasterFormFieldsHandle = { cancelPostalLookup: () => void }
const masterFormFields = ref<MasterFormFieldsHandle | null>(null)

const cancelPostalLookup = () => masterFormFields.value?.cancelPostalLookup()

const open = async () => {
  cancelPostalLookup()
  form.value = createMasterFormDraft(props.masterType)
  message.value = ''
  if (props.masterType === 'property') Object.assign(references, await manager.loadPropertyReferences())
  dialogOpen.value = true
}
const cancel = () => {
  cancelPostalLookup()
  dialogOpen.value = false
  message.value = ''
  form.value = createMasterFormDraft(props.masterType)
}
const save = async () => {
  cancelPostalLookup()
  saving.value = true
  message.value = ''
  try {
    await submitMasterCreate({
      form: form.value,
      createMaster: manager.createMaster,
      afterSuccess: (payload) => {
        cancelPostalLookup()
        dialogOpen.value = false
        emit('created', payload)
        showSnackbar(`${props.title}を登録しました。`, 'success')
        form.value = createMasterFormDraft(props.masterType)
      },
    })
  } catch (error) {
    message.value = error instanceof Error ? error.message : '登録できませんでした。'
  } finally {
    saving.value = false
  }
}
onBeforeUnmount(cancelPostalLookup)
</script>
