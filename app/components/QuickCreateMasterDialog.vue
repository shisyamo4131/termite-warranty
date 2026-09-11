<template>
  <v-btn size="small" variant="text" @click="open">{{ buttonLabel }}</v-btn>
  <v-dialog v-model="dialogOpen" max-width="720" persistent>
    <v-card :title="`${title}を新規登録`">
      <v-card-text>
        <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>
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

const props = defineProps<{
  masterType: MasterType
  title: string
  buttonLabel: string
}>()
const emit = defineEmits<{ created: [payload: { masterType: MasterType; id: string }] }>()
const manager = useMasterManagement(props.masterType)
const dialogOpen = ref(false)
const saving = ref(false)
const message = ref('')
const references = reactive({ homeowners: [] as ManagedMaster[], companies: [] as ManagedMaster[] })
const emptyForm = () => ({
  name: '', defaultPeriodYears: 1, homeownerId: '', constructionCompanyId: '', postalCode: '',
  prefecture: '', municipality: '', streetTownAndNumber: '', buildingName: '',
  telephone: '', fax: '', contactPerson: '', contactDetails: '', email: '', notes: '',
})
const form = reactive(emptyForm())

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

const open = async () => {
  Object.assign(form, emptyForm())
  message.value = ''
  if (props.masterType === 'property') Object.assign(references, await manager.loadPropertyReferences())
  dialogOpen.value = true
}
const cancel = () => {
  dialogOpen.value = false
  message.value = ''
  Object.assign(form, emptyForm())
}
const save = async () => {
  saving.value = true
  message.value = ''
  try {
    const result = await manager.createMaster(fields())
    dialogOpen.value = false
    emit('created', { masterType: props.masterType, id: result.id })
    Object.assign(form, emptyForm())
  } catch (error) {
    message.value = error instanceof Error ? error.message : '登録できませんでした。'
  } finally {
    saving.value = false
  }
}
</script>
