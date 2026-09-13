<template>
  <v-text-field v-model="form.name" label="名称" required />
  <v-text-field
    v-if="form.masterType === 'warrantyService'"
    v-model.number="form.defaultPeriodYears"
    label="標準保証期間（年）"
    type="number"
    min="1"
    step="1"
    required
  />
  <template v-if="form.masterType === 'property'">
    <MasterPropertyReferenceFields
      v-model:homeowner-id="form.homeownerId"
      v-model:construction-company-id="form.constructionCompanyId"
      :homeowners="props.homeowners"
      :companies="props.companies"
    />
    <MasterAddressFields
      ref="propertyAddressFields"
      v-model="form.address"
      lookup-subject="property"
      :postal-lookup-provider="props.postalLookupProvider"
    />
  </template>
  <template v-if="form.masterType === 'constructionCompany'">
    <MasterAddressFields v-model="form.address" />
    <MasterConstructionCompanyContactFields
      v-model:telephone="form.telephone"
      v-model:fax="form.fax"
      v-model:contact-person="form.contactPerson"
      v-model:contact-details="form.contactDetails"
      v-model:notes="form.notes"
    />
  </template>
  <template v-if="form.masterType === 'homeowner'">
    <v-alert v-if="!props.postalLookupProvider" type="info" variant="tonal" class="mb-3">住所の自動入力は未接続です。郵便番号を含め手入力してください。</v-alert>
    <MasterAddressFields
      ref="homeownerAddressFields"
      v-model="form.address"
      lookup-subject="homeowner"
      :postal-lookup-provider="props.postalLookupProvider"
    />
    <MasterHomeownerContactFields
      v-model:telephone="form.telephone"
      v-model:fax="form.fax"
      v-model:notes="form.notes"
    />
  </template>
</template>

<script setup lang="ts">
import type { MasterFormDraft } from '../../src/domain/master-form.mjs'
import type { PostalLookupProvider } from '../../src/domain/postal-lookup.mjs'
import type { ManagedMaster } from '../composables/useMasterManagement'

const props = withDefaults(defineProps<{
  homeowners?: ManagedMaster[]
  companies?: ManagedMaster[]
  postalLookupProvider?: PostalLookupProvider
}>(), {
  homeowners: () => [],
  companies: () => [],
})
const form = defineModel<MasterFormDraft>({ required: true })

type AddressFieldsHandle = { cancelPostalLookup: () => void }
const propertyAddressFields = ref<AddressFieldsHandle | null>(null)
const homeownerAddressFields = ref<AddressFieldsHandle | null>(null)

function cancelPostalLookup() {
  propertyAddressFields.value?.cancelPostalLookup()
  homeownerAddressFields.value?.cancelPostalLookup()
}

defineExpose({ cancelPostalLookup })
</script>
