<template>
  <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>
  <v-card v-if="row" :title="row.name"><v-card-text>
    <v-chip :color="row.active ? 'success' : 'default'">{{ row.active ? '有効' : '無効' }}</v-chip>
    <dl class="mt-4"><template v-if="row.address"><dt>郵便番号</dt><dd>{{ row.address.postalCode }}</dd><dt>住所</dt><dd>{{ address }}</dd></template><template v-if="masterType === 'warrantyService'"><dt>標準保証期間</dt><dd>{{ row.defaultPeriodYears }}年</dd></template><template v-if="masterType === 'property'"><dt>施主</dt><dd><NuxtLink v-if="references.homeowner" :to="`/masters/homeowners/${references.homeowner.id}`">{{ references.homeowner.name }}</NuxtLink><span v-else>施主情報を解決できません。</span></dd><dt>工務店</dt><dd><NuxtLink v-if="references.company" :to="`/masters/construction-companies/${references.company.id}`">{{ references.company.name }}</NuxtLink><span v-else>工務店情報を解決できません。</span></dd></template><template v-if="masterType === 'constructionCompany'"><dt>TEL</dt><dd>{{ row.telephone || '—' }}</dd><dt>FAX</dt><dd>{{ row.fax || '—' }}</dd><dt>担当者</dt><dd>{{ row.contactPerson || '—' }}</dd><dt>連絡先</dt><dd>{{ row.contactDetails || '—' }}</dd><dt>メール</dt><dd>{{ row.email || '—' }}</dd><dt>備考</dt><dd>{{ row.notes || '—' }}</dd></template></dl>
    <v-btn color="primary" class="mt-4" @click="editOpen = true">編集</v-btn>
  </v-card-text></v-card>
  <v-card v-if="masterType === 'constructionCompany' && row" class="mt-4" title="紐づく物件"><v-table><tbody><tr v-for="property in properties" :key="property.id"><td><NuxtLink :to="`/masters/properties/${property.id}`">{{ property.name }}</NuxtLink></td><td>{{ property.active ? '有効' : '無効' }}</td></tr><tr v-if="!properties.length"><td>紐づく物件はありません。</td></tr></tbody></v-table></v-card>
  <v-alert v-else-if="loaded && !row" type="warning">指定されたマスターは見つかりません。<NuxtLink :to="listPath">一覧へ戻る</NuxtLink></v-alert>
  <v-btn class="mt-4" :to="listPath">一覧へ戻る</v-btn>
  <MasterEditDialog v-model="editOpen" :master-type="masterType" :title="title" :row="row" />
</template>
<script setup lang="ts">
import type { ManagedMaster, MasterType } from '../composables/useMasterManagement'
const props = defineProps<{ masterType: MasterType; title: string }>(); const route = useRoute()
const row = ref<ManagedMaster | null>(null); const properties = ref<ManagedMaster[]>([]); const message = ref(''); const loaded = ref(false); const editOpen = ref(false); const references = reactive<{ homeowner: ManagedMaster | null; company: ManagedMaster | null }>({ homeowner: null, company: null })
const { subscribeById, subscribeCompanyProperties, subscribePropertyReferences } = useMasterManagement(props.masterType)
const segments = { constructionCompany: 'construction-companies', homeowner: 'homeowners', property: 'properties', warrantyService: 'warranty-services' }; const listPath = `/masters/${segments[props.masterType]}`
const address = computed(() => [row.value?.address?.prefecture, row.value?.address?.municipality, row.value?.address?.streetTownAndNumber, row.value?.address?.buildingName].filter(Boolean).join(''))
let unsub: (() => void) | undefined; let propertyUnsub: (() => void) | undefined; let referenceUnsubscribes: Array<() => void> = []
const stop = () => { unsub?.(); propertyUnsub?.(); referenceUnsubscribes.forEach(unsubscribe => unsubscribe()); unsub = undefined; propertyUnsub = undefined; referenceUnsubscribes = [] }
const start = (id: string) => { stop(); row.value = null; properties.value = []; references.homeowner = null; references.company = null; message.value = ''; loaded.value = false; unsub = subscribeById(id, value => { row.value = value; loaded.value = true; if (props.masterType === 'property' && value) { referenceUnsubscribes.forEach(unsubscribe => unsubscribe()); referenceUnsubscribes = []; if (value.homeownerId && value.constructionCompanyId) referenceUnsubscribes = subscribePropertyReferences(value.homeownerId, value.constructionCompanyId, value => Object.assign(references, value), error => { message.value = error }) } }, error => { message.value = error; loaded.value = true }); if (props.masterType === 'constructionCompany') propertyUnsub = subscribeCompanyProperties(id, value => { properties.value = value }, error => { message.value = error }) }
onMounted(() => start(String(route.params.id))); watch(() => route.params.id, id => start(String(id))); onBeforeUnmount(stop)
</script>
