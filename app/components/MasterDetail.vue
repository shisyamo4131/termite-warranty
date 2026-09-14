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
        <template v-if="masterType === 'warrantyService'">
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">略称</div><div class="detail-field-value">{{ row.shortName }}</div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">種別</div><div class="detail-field-value">{{ row.type === 'insurance' ? '保険' : '保証' }}</div></v-col>
          <v-col cols="12" class="detail-field px-1"><div class="detail-field-label">備考</div><div class="detail-field-value">{{ row.notes || '—' }}</div></v-col>
        </template>
        <v-col v-if="row.address" cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">郵便番号</div><div class="detail-field-value">{{ row.address.postalCode }}</div></v-col>
        <v-col v-if="row.address" cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">住所</div><div class="detail-field-value">{{ address }}</div></v-col>
        <template v-if="masterType === 'property'">
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">建築面積</div><div class="detail-field-value">{{ row.buildingAreaSquareMeters != null ? `${row.buildingAreaSquareMeters} ㎡` : '未登録' }}</div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">施主</div><div class="detail-field-value"><NuxtLink v-if="references.homeowner" :to="`/masters/homeowners/${references.homeowner.id}`">{{ references.homeowner.name }}</NuxtLink><span v-else>施主情報を解決できません。</span></div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">工務店</div><div class="detail-field-value"><NuxtLink v-if="references.company" :to="`/masters/construction-companies/${references.company.id}`">{{ references.company.name }}</NuxtLink><span v-else>工務店情報を解決できません。</span></div></v-col>
          <v-col cols="12" class="detail-field px-1"><div class="detail-field-label">備考</div><div class="detail-field-value">{{ row.notes || '—' }}</div></v-col>
        </template>
        <template v-if="masterType === 'constructionCompany'">
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">TEL</div><div class="detail-field-value">{{ row.telephone || '—' }}</div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">FAX</div><div class="detail-field-value">{{ row.fax || '—' }}</div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">担当者</div><div class="detail-field-value">{{ row.contactPerson || '—' }}</div></v-col>
          <v-col cols="12" md="6" class="detail-field px-1"><div class="detail-field-label">アカウントのメールアドレス</div><div class="detail-field-value">{{ companyAccount?.email || 'アカウント未発行' }}</div></v-col>
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

    <section v-if="propertySectionTitle" class="mt-6">
      <h2 class="detail-section-title mb-2">{{ propertySectionTitle }}</h2>
      <div class="text-caption mb-2">{{ propertySectionCaption }}</div>
      <v-table><tbody><tr v-for="property in visibleProperties" :key="property.id"><td><NuxtLink :to="`/masters/properties/${property.id}`">{{ property.name }}</NuxtLink></td><td class="text-right">{{ property.active ? '有効' : '無効' }}</td></tr><tr v-if="!properties.length"><td colspan="2">{{ propertySectionTitle }}はありません。</td></tr></tbody></v-table>
      <div v-if="properties.length" class="list-pagination-bar">
        <span class="text-body-2 text-medium-emphasis">{{ properties.length }}件</span>
        <v-pagination v-if="propertyPageCount > 1" v-model="propertyPage" :length="propertyPageCount" density="comfortable" />
      </div>
    </section>
  </template>

  <v-alert v-else-if="loaded && !message" type="warning">指定されたマスターは見つかりません。</v-alert>
  <v-btn class="mt-6" variant="outlined" :to="listPath">一覧へ戻る</v-btn>
  <MasterEditDialog v-model="editOpen" :master-type="masterType" :title="title" :row="row" @saved="showSnackbar('更新しました。', 'success')" />
</template>

<script setup lang="ts">
import type { ConstructionCompanyAccountSummary, ManagedMaster, MasterType } from '../composables/useMasterManagement'

const props = defineProps<{ masterType: MasterType; title: string }>()
const PAGE_SIZE = 5
const { showSnackbar } = useAppSnackbar()
const route = useRoute()
const row = ref<ManagedMaster | null>(null)
const properties = ref<ManagedMaster[]>([])
const message = ref('')
const loaded = ref(false)
const editOpen = ref(false)
const companyAccount = ref<ConstructionCompanyAccountSummary | null>(null)
const references = reactive<{ homeowner: ManagedMaster | null; company: ManagedMaster | null }>({ homeowner: null, company: null })
const propertyPage = ref(1)
const {
  subscribeById,
  subscribeCompanyProperties,
  subscribeHomeownerProperties,
  subscribeConstructionCompanyAccount,
  subscribeWarrantyServiceProperties,
  subscribePropertyReferences,
} = useMasterManagement(props.masterType)
const segments = { constructionCompany: 'construction-companies', homeowner: 'homeowners', property: 'properties', warrantyService: 'warranty-services' }
const listPath = `/masters/${segments[props.masterType]}`
const address = computed(() => [row.value?.address?.prefecture, row.value?.address?.municipality, row.value?.address?.streetTownAndNumber, row.value?.address?.buildingName].filter(Boolean).join(''))
const propertySectionLabels: Record<MasterType, string> = { constructionCompany: '担当物件', homeowner: '所有物件', warrantyService: '対象物件', property: '' }
const propertySectionTitle = computed(() => propertySectionLabels[props.masterType])
const propertySectionCaption = computed(() => props.masterType === 'warrantyService'
  ? '現在有効な案件・適用保証・物件のうち、更新日時が新しい20件まで表示します。'
  : '更新日時が新しい20件まで表示します。')
const propertyPageCount = computed(() => Math.max(1, Math.ceil(properties.value.length / PAGE_SIZE)))
const visibleProperties = computed(() => properties.value.slice((propertyPage.value - 1) * PAGE_SIZE, propertyPage.value * PAGE_SIZE))

let unsub: (() => void) | undefined
let propertyUnsub: (() => void) | undefined
let accountUnsub: (() => void) | undefined
let referenceUnsubscribes: Array<() => void> = []
const stop = () => { unsub?.(); propertyUnsub?.(); accountUnsub?.(); referenceUnsubscribes.forEach(unsubscribe => unsubscribe()); unsub = undefined; propertyUnsub = undefined; accountUnsub = undefined; referenceUnsubscribes = [] }
const start = (id: string) => {
  stop(); row.value = null; properties.value = []; propertyPage.value = 1; companyAccount.value = null; references.homeowner = null; references.company = null; message.value = ''; loaded.value = false
  unsub = subscribeById(id, value => {
    row.value = value; loaded.value = true
    if (props.masterType === 'property' && value) {
      referenceUnsubscribes.forEach(unsubscribe => unsubscribe()); referenceUnsubscribes = []
      if (value.homeownerId && value.constructionCompanyId) referenceUnsubscribes = subscribePropertyReferences(value.homeownerId, value.constructionCompanyId, value => Object.assign(references, value), error => { message.value = error })
    }
  }, error => { message.value = error; loaded.value = true })
  if (props.masterType === 'constructionCompany') {
    propertyUnsub = subscribeCompanyProperties(id, value => { properties.value = value; if (propertyPage.value > propertyPageCount.value) propertyPage.value = propertyPageCount.value }, error => { message.value = error })
    accountUnsub = subscribeConstructionCompanyAccount(id, value => { companyAccount.value = value }, error => { message.value = error })
  }
  if (props.masterType === 'homeowner') propertyUnsub = subscribeHomeownerProperties(id, value => { properties.value = value; if (propertyPage.value > propertyPageCount.value) propertyPage.value = propertyPageCount.value }, error => { message.value = error })
  if (props.masterType === 'warrantyService') propertyUnsub = subscribeWarrantyServiceProperties(id, value => { properties.value = value; if (propertyPage.value > propertyPageCount.value) propertyPage.value = propertyPageCount.value }, error => { message.value = error })
}
onMounted(() => start(String(route.params.id)))
watch(() => route.params.id, id => start(String(id)))
onBeforeUnmount(stop)
</script>
