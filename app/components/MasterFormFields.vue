<template>
  <v-alert v-if="postalDataStale" type="warning" variant="tonal" class="mb-3">
    郵便番号データの最終確認から60日以上経過しています。必要に応じて管理者へ確認してください。
  </v-alert>
  <v-text-field v-model="form.name" label="名称" required />
  <v-text-field
    v-if="form.masterType === 'warrantyService'"
    v-model="form.shortName"
    label="略称"
    :rules="[shortNameRule]"
    hint="6文字以内"
    persistent-hint
    required
  />
  <v-select
    v-if="form.masterType === 'warrantyService'"
    v-model="form.type"
    :items="warrantyTypes"
    item-title="title"
    item-value="value"
    label="種別"
    required
  />
  <v-text-field
    v-if="form.masterType === 'warrantyService'"
    v-model.number="form.defaultPeriodYears"
    label="標準保証期間（年）"
    type="number"
    min="1"
    step="1"
    required
  />
  <v-textarea
    v-if="form.masterType === 'warrantyService'"
    v-model="form.notes"
    label="備考（任意）"
  />
  <template v-if="form.masterType === 'property'">
    <MasterAddressFields
      ref="propertyAddressFields"
      v-model="form.address"
      lookup-subject="property"
      :postal-lookup-provider="effectivePostalLookupProvider"
    />
    <MasterPropertyReferenceFields
      v-model:homeowner-id="form.homeownerId"
      v-model:construction-company-id="form.constructionCompanyId"
      :homeowners="props.homeowners"
      :companies="props.companies"
    />
    <v-text-field
      v-model.number="form.buildingAreaSquareMeters"
      label="建築面積（㎡）"
      type="number"
      min="0.01"
      step="0.01"
      :rules="[buildingAreaRule]"
      required
    />
    <v-textarea v-model="form.notes" label="備考（任意）" />
  </template>
  <template v-if="form.masterType === 'constructionCompany'">
    <MasterAddressFields
      ref="companyAddressFields"
      v-model="form.address"
      lookup-subject="constructionCompany"
      :postal-lookup-provider="effectivePostalLookupProvider"
    />
    <MasterConstructionCompanyContactFields
      v-model:telephone="form.telephone"
      v-model:fax="form.fax"
      v-model:contact-person="form.contactPerson"
      v-model:contact-details="form.contactDetails"
      v-model:notes="form.notes"
    />
  </template>
  <template v-if="form.masterType === 'homeowner'">
    <MasterAddressFields
      ref="homeownerAddressFields"
      v-model="form.address"
      lookup-subject="homeowner"
      :postal-lookup-provider="effectivePostalLookupProvider"
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
import { hostedPostalLookupProvider } from '../../src/domain/hosted-postal-lookup.mjs'
import type { ManagedMaster } from '../composables/useMasterManagement'
import { countDisplayCharacters } from '../../src/domain/master-data.mjs'

const props = withDefaults(defineProps<{
  homeowners?: ManagedMaster[]
  companies?: ManagedMaster[]
  postalLookupProvider?: PostalLookupProvider
}>(), {
  homeowners: () => [],
  companies: () => [],
})
const effectivePostalLookupProvider = computed(() => props.postalLookupProvider ?? hostedPostalLookupProvider)
const postalDataLastCheckedAt = ref<string | null>(null)
const postalDataStale = computed(() => {
  if (!postalDataLastCheckedAt.value) return false
  const checkedAt = Date.parse(postalDataLastCheckedAt.value)
  return Number.isFinite(checkedAt) && Date.now() - checkedAt >= 60 * 24 * 60 * 60 * 1000
})
onMounted(async () => {
  try {
    const response = await fetch('/postal-data/manifest.json')
    if (response.ok) postalDataLastCheckedAt.value = (await response.json()).lastCheckedAt ?? null
  } catch { /* manual entry remains available when freshness metadata is unavailable */ }
})
const form = defineModel<MasterFormDraft>({ required: true })
const shortNameRule = (value: unknown) => countDisplayCharacters(String(value ?? '').trim()) <= 6 || '略称は6文字以内で入力してください。'
const warrantyTypes = [
  { title: '保証', value: 'warranty' },
  { title: '保険', value: 'insurance' },
]
const buildingAreaRule = (value: unknown) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '建築面積を入力してください。'
  return Math.abs(number * 100 - Math.round(number * 100)) <= 1e-8 || '小数点以下2桁までで入力してください。'
}

type AddressFieldsHandle = { cancelPostalLookup: () => void }
const propertyAddressFields = ref<AddressFieldsHandle | null>(null)
const companyAddressFields = ref<AddressFieldsHandle | null>(null)
const homeownerAddressFields = ref<AddressFieldsHandle | null>(null)

function cancelPostalLookup() {
  propertyAddressFields.value?.cancelPostalLookup()
  companyAddressFields.value?.cancelPostalLookup()
  homeownerAddressFields.value?.cancelPostalLookup()
}

defineExpose({ cancelPostalLookup })
</script>
