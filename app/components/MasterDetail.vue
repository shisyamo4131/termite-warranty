<template>
  <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>

  <template v-if="row">
    <div class="detail-page-breadcrumbs mb-3">{{ title }}一覧　/　詳細</div>
    <div class="detail-page-header mb-6">
      <div>
        <h1 class="text-h4 detail-page-title">{{ row.name }}</h1>
        <div class="detail-page-subtitle">{{ title }}詳細</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-pencil" @click="editOpen = true">編集</v-btn>
    </div>

    <v-row class="detail-summary pa-2 mb-6" no-gutters>
      <v-col cols="12" sm="6" class="pa-3">
        <div class="detail-summary-label">状態</div>
        <div class="detail-summary-value"><v-chip :color="row.active ? 'success' : 'default'" size="small">{{ row.active ? '有効' : '無効' }}</v-chip></div>
      </v-col>
      <v-col v-if="masterType === 'warrantyService'" cols="12" sm="6" class="pa-3">
        <div class="detail-summary-label">標準保証期間</div>
        <div class="detail-summary-value">{{ row.defaultPeriodYears }}年</div>
      </v-col>
      <v-col v-else cols="12" sm="6" class="pa-3">
        <div class="detail-summary-label">区分</div>
        <div class="detail-summary-value">{{ title }}</div>
      </v-col>
    </v-row>

    <section>
      <h2 class="detail-section-title mb-2">基本情報</h2>
      <v-row class="detail-fields" no-gutters>
        <v-col v-if="row.address" cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">郵便番号</div><div class="detail-field-value">{{ row.address.postalCode }}</div></v-col>
        <v-col v-if="row.address" cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">住所</div><div class="detail-field-value">{{ address }}</div></v-col>
        <template v-if="masterType === 'property'">
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">施主</div><div class="detail-field-value"><NuxtLink v-if="references.homeowner" :to="`/masters/homeowners/${references.homeowner.id}`">{{ references.homeowner.name }}</NuxtLink><span v-else>施主情報を解決できません。</span></div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">工務店</div><div class="detail-field-value"><NuxtLink v-if="references.company" :to="`/masters/construction-companies/${references.company.id}`">{{ references.company.name }}</NuxtLink><span v-else>工務店情報を解決できません。</span></div></v-col>
        </template>
        <template v-if="masterType === 'constructionCompany'">
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">TEL</div><div class="detail-field-value">{{ row.telephone || '—' }}</div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">FAX</div><div class="detail-field-value">{{ row.fax || '—' }}</div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">担当者</div><div class="detail-field-value">{{ row.contactPerson || '—' }}</div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">メール</div><div class="detail-field-value">{{ row.email || '—' }}</div></v-col>
          <v-col cols="12" class="detail-field px-1"><div class="detail-field-label">連絡先</div><div class="detail-field-value">{{ row.contactDetails || '—' }}</div></v-col>
          <v-col cols="12" class="detail-field px-1"><div class="detail-field-label">備考</div><div class="detail-field-value">{{ row.notes || '—' }}</div></v-col>
        </template>
        <template v-if="masterType === 'homeowner'">
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">TEL</div><div class="detail-field-value">{{ row.telephone || '—' }}</div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">FAX</div><div class="detail-field-value">{{ row.fax || '—' }}</div></v-col>
          <v-col cols="12" class="detail-field px-1"><div class="detail-field-label">備考</div><div class="detail-field-value">{{ row.notes || '—' }}</div></v-col>
        </template>
      </v-row>
    </section>

    <section v-if="masterType === 'constructionCompany'" class="mt-6">
      <h2 class="detail-section-title mb-2">紐づく物件</h2>
      <v-table><tbody><tr v-for="property in properties" :key="property.id"><td><NuxtLink :to="`/masters/properties/${property.id}`">{{ property.name }}</NuxtLink></td><td class="text-right">{{ property.active ? '有効' : '無効' }}</td></tr><tr v-if="!properties.length"><td colspan="2">紐づく物件はありません。</td></tr></tbody></v-table>
    </section>
  </template>

  <v-alert v-else-if="loaded && !message" type="warning">指定されたマスターは見つかりません。</v-alert>
  <v-btn class="mt-6" variant="outlined" :to="listPath">一覧へ戻る</v-btn>
  <MasterEditDialog v-model="editOpen" :master-type="masterType" :title="title" :row="row" />
</template>

<script setup lang="ts">
import type { ManagedMaster, MasterType } from '../composables/useMasterManagement'

const props = defineProps<{ masterType: MasterType; title: string }>()
const route = useRoute()
const row = ref<ManagedMaster | null>(null)
const properties = ref<ManagedMaster[]>([])
const message = ref('')
const loaded = ref(false)
const editOpen = ref(false)
const references = reactive<{ homeowner: ManagedMaster | null; company: ManagedMaster | null }>({ homeowner: null, company: null })
const { subscribeById, subscribeCompanyProperties, subscribePropertyReferences } = useMasterManagement(props.masterType)
const segments = { constructionCompany: 'construction-companies', homeowner: 'homeowners', property: 'properties', warrantyService: 'warranty-services' }
const listPath = `/masters/${segments[props.masterType]}`
const address = computed(() => [row.value?.address?.prefecture, row.value?.address?.municipality, row.value?.address?.streetTownAndNumber, row.value?.address?.buildingName].filter(Boolean).join(''))

let unsub: (() => void) | undefined
let propertyUnsub: (() => void) | undefined
let referenceUnsubscribes: Array<() => void> = []
const stop = () => { unsub?.(); propertyUnsub?.(); referenceUnsubscribes.forEach(unsubscribe => unsubscribe()); unsub = undefined; propertyUnsub = undefined; referenceUnsubscribes = [] }
const start = (id: string) => {
  stop(); row.value = null; properties.value = []; references.homeowner = null; references.company = null; message.value = ''; loaded.value = false
  unsub = subscribeById(id, value => {
    row.value = value; loaded.value = true
    if (props.masterType === 'property' && value) {
      referenceUnsubscribes.forEach(unsubscribe => unsubscribe()); referenceUnsubscribes = []
      if (value.homeownerId && value.constructionCompanyId) referenceUnsubscribes = subscribePropertyReferences(value.homeownerId, value.constructionCompanyId, value => Object.assign(references, value), error => { message.value = error })
    }
  }, error => { message.value = error; loaded.value = true })
  if (props.masterType === 'constructionCompany') propertyUnsub = subscribeCompanyProperties(id, value => { properties.value = value }, error => { message.value = error })
}
onMounted(() => start(String(route.params.id)))
watch(() => route.params.id, id => start(String(id)))
onBeforeUnmount(stop)
</script>
