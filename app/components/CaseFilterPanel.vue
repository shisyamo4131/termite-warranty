<template>
  <v-expansion-panels class="mb-4">
    <v-expansion-panel title="案件を絞り込む">
      <v-expansion-panel-text>
        <v-row dense>
          <v-col cols="12" md="3"><v-text-field v-model="filters.caseNumber" label="案件番号（完全一致）" clearable /></v-col>
          <v-col cols="12" md="3"><v-autocomplete v-model="filters.homeownerId" :items="masters.homeowners" :item-title="masterTitle" item-value="id" :custom-filter="indexedFilter" label="施主" clearable /></v-col>
          <v-col cols="12" md="3"><v-autocomplete v-model="filters.propertyId" :items="masters.properties" :item-title="masterTitle" item-value="id" :custom-filter="indexedFilter" label="物件" clearable /></v-col>
          <v-col cols="12" md="3"><v-autocomplete v-model="filters.constructionCompanyId" :items="masters.constructionCompanies" :item-title="masterTitle" item-value="id" :custom-filter="indexedFilter" label="工務店" clearable /></v-col>
          <v-col cols="12" md="3"><v-autocomplete v-model="filters.responsibleBranchId" :items="masters.branches" :item-title="masterTitle" item-value="id" label="担当支店" clearable /></v-col>
          <v-col cols="12" md="3"><v-autocomplete v-model="filters.warrantyServiceId" :items="masters.warrantyServices" :item-title="masterTitle" item-value="id" :custom-filter="serviceFilter" label="保証サービス" clearable /></v-col>
          <v-col cols="12" md="3"><v-select v-model="filters.prefecture" :items="prefectures" label="都道府県" clearable /></v-col>
          <v-col cols="12" md="3"><v-select v-model="filters.municipality" :items="municipalities" label="市区町村" clearable /></v-col>
          <v-col cols="12" md="3"><v-select v-model="filters.notificationStatus" :items="notificationStatuses" item-title="title" item-value="value" label="通知状態" clearable /></v-col>
          <v-col cols="12" md="3"><v-date-input v-model="expiryDate" label="満了日（完全一致）" prepend-icon="" clearable /></v-col>
          <v-col cols="12" class="d-flex justify-end"><v-btn variant="text" @click="clear">条件をクリア</v-btn></v-col>
        </v-row>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import { matchesSearchTokenMap, normalizeSearchText } from '../../src/domain/search-tokens.mjs'
import {
  formatCanonicalLocalDate,
  parseCanonicalLocalDate,
  type CaseFilters,
  type MasterCatalog,
  type MasterOption,
} from '../composables/usePrototypeData'

const props = defineProps<{ masters: MasterCatalog }>()
const filters = defineModel<CaseFilters>({ required: true })
type FilterItem = { raw?: MasterOption }
const item = (candidate?: FilterItem) => candidate?.raw
const indexedFilter = (_value: string, query: string, candidate?: FilterItem) => {
  const normalized = normalizeSearchText(query ?? '')
  if (!normalized || normalized.length < 2) return true
  return matchesSearchTokenMap(
    item(candidate)?.nameSearch as { two: Record<string, true> } | undefined,
    query,
  )
}
const serviceFilter = (_value: string, query: string, candidate?: FilterItem) =>
  normalizeSearchText(String(item(candidate)?.name ?? '')).includes(normalizeSearchText(query ?? ''))
const masterTitle = (master: MasterOption) => master.active === false ? `${master.name}（無効）` : master.name
const prefectures = computed(() => [...new Set(props.masters.properties
  .map((property) => String((property.address as { prefecture?: string } | undefined)?.prefecture ?? ''))
  .filter(Boolean))])
const municipalities = computed(() => [...new Set(props.masters.properties
  .map((property) => String((property.address as { municipality?: string } | undefined)?.municipality ?? ''))
  .filter(Boolean))])
const notificationStatuses = [
  { title: '未通知', value: 'not notified' },
  { title: '通知済み', value: 'notified' },
  { title: '通知不要', value: 'not required' },
]
const expiryDate = computed<Date | null>({
  get: () => parseCanonicalLocalDate(filters.value.expiryDate ?? ''),
  set: (date) => { filters.value.expiryDate = formatCanonicalLocalDate(date) || null },
})
const clear = () => Object.assign(filters.value, {
  caseNumber: null, homeownerId: null, propertyId: null, constructionCompanyId: null,
  responsibleBranchId: null, warrantyServiceId: null, prefecture: null, municipality: null,
  notificationStatus: null, expiryDate: null,
})
</script>
