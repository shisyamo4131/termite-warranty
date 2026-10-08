<template>
  <section class="organization-management" aria-label="保証グループ・工務店・本支店管理">
  <nav class="d-flex flex-wrap align-center ga-2 mb-3" aria-label="現在の階層">
    <v-btn v-if="level !== 'groups'" variant="text" size="small" :disabled="busy" @click="showGroups">保証グループ一覧</v-btn>
    <span v-else aria-current="page">保証グループ一覧</span>
    <template v-if="level !== 'groups'">
      <span aria-hidden="true">›</span>
      <v-btn v-if="level === 'branches'" class="organization-crumb" variant="text" size="small" :disabled="busy" @click="showCompanies">{{ selectedGroup?.name || '保証グループ' }}</v-btn>
      <span v-else aria-current="page">{{ selectedGroup?.name || '保証グループ' }}</span>
    </template>
    <template v-if="level === 'branches'"><span aria-hidden="true">›</span><span aria-current="page">{{ selectedCompany?.name || '工務店' }}</span></template>
  </nav>
  <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-3">
    <h1 ref="heading" tabindex="-1" class="text-h5 organization-heading">{{ title }}</h1>
    <v-btn v-if="level === 'companies'" variant="outlined" :disabled="busy" @click="showGroups">← 保証グループ一覧</v-btn>
    <v-btn v-if="level === 'branches'" variant="outlined" :disabled="busy" @click="showCompanies">← 工務店一覧</v-btn>
  </div>
  <p class="mb-4">登録後の工務店の所属保証グループ、本支店の所属工務店は変更できません。</p>
  <v-alert type="info" class="mb-4">
    接頭辞は保証グループ内で共通です。無効な工務店・本支店では新規物件の登録を停止しますが、HSは既存保証への対応を継続できます。
  </v-alert>
  <v-checkbox v-model="includeInactive" label="無効を含む" hide-details class="mb-3" />
  <v-row>
    <v-col v-if="level === 'groups'" cols="12">
      <v-card height="100%">
        <v-card-title class="d-flex flex-wrap ga-2 justify-space-between align-center">保証グループ<v-btn variant="flat" size="small" color="primary" :disabled="busy" @click="$emit('edit', 'saveGroup', {})">追加</v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="groupSearch" label="保証グループ名で絞り込み" clearable density="compact" />
          <p class="text-caption">{{ groupRows.length }}件{{ groupSearch ? '' : '（更新が新しい20件まで）' }}</p>
          <v-list>
            <v-list-item v-for="group in paged(groupRows, groupPage)" :key="group.id" :title="group.name">
              <template #subtitle>{{ group.enabled === false ? '無効／' : '' }}{{ group.prefix || '接頭辞なし' }}・{{ group.fiscalStartMonth }}月始まり</template>
              <template #append><div class="organization-actions"><v-btn size="small" variant="tonal" color="primary" :disabled="busy" :aria-label="`${group.name}の工務店を見る`" @click="$emit('selectGroup', group.id)">工務店を見る →</v-btn><v-btn size="small" variant="outlined" :disabled="busy" @click="$emit('edit', 'saveGroup', group)">{{ group.enabled === false ? '表示' : '編集' }}</v-btn><v-btn v-if="group.enabled === false" size="small" variant="outlined" :disabled="busy" @click="$emit('reenable', 'group', group)">有効化</v-btn></div></template>
            </v-list-item>
          </v-list>
          <p v-if="!groupRows.length" class="py-4">該当する保証グループはありません。</p>
          <v-pagination v-model="groupPage" :length="pageCount(groupRows)" :disabled="busy" :total-visible="3" />
        </v-card-text>
      </v-card>
    </v-col>
    <v-col v-else-if="level === 'companies'" cols="12">
      <v-card height="100%">
        <v-card-title class="d-flex flex-wrap ga-2 justify-space-between align-center">所属工務店<v-btn variant="flat" size="small" color="primary" :disabled="busy || !selectedGroup || selectedGroup.enabled === false" @click="$emit('edit', 'saveCompany', {})">追加</v-btn></v-card-title>
        <v-card-text>
          <p v-if="!selectedGroup" class="py-4">保証グループを確認できません。保証グループ一覧へ戻って確認してください。</p>
          <template v-else>
            <v-alert v-if="selectedGroup.enabled === false" type="warning" class="mb-4">保証グループが無効のため、所属工務店での新規本登録は停止しています。</v-alert>
            <v-text-field v-model="companySearch" label="所属工務店名で絞り込み" clearable density="compact" />
            <p class="text-caption">{{ companyRows.length }}件／{{ selectedGroup.name }}</p>
            <v-list>
              <v-list-item v-for="company in paged(companyRows, companyPage)" :key="company.id" :title="company.name" :subtitle="company.enabled === false ? '無効（新規登録停止）' : '有効'">
                <template #append><div class="organization-actions"><v-btn size="small" variant="tonal" color="primary" :disabled="busy" :aria-label="`${company.name}の本支店を見る`" @click="$emit('selectCompany', company.id)">本支店を見る →</v-btn><v-btn size="small" variant="outlined" :disabled="busy" @click="$emit('edit', 'saveCompany', company)">{{ company.enabled === false ? '表示' : '編集' }}</v-btn><v-btn v-if="company.enabled === false" size="small" variant="outlined" :disabled="busy" @click="$emit('reenable', 'company', company)">有効化</v-btn></div></template>
              </v-list-item>
            </v-list>
            <p v-if="!companyRows.length" class="py-4">該当する工務店はありません。</p>
            <v-pagination v-model="companyPage" :length="pageCount(companyRows)" :disabled="busy" :total-visible="3" />
          </template>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col v-else cols="12">
      <v-card height="100%">
        <v-card-title class="d-flex flex-wrap ga-2 justify-space-between align-center">所属本支店<v-btn variant="flat" size="small" color="primary" :disabled="busy || !selectedGroup || !selectedCompany" @click="$emit('edit', 'saveBranch', {})">追加</v-btn></v-card-title>
        <v-card-text>
          <p v-if="!selectedGroup || !selectedCompany" class="py-4">所属先を確認できません。工務店一覧へ戻って確認してください。</p>
          <template v-else>
            <v-alert v-if="selectedGroup.enabled === false" type="warning" class="mb-4">保証グループが無効のため、所属本支店での新規本登録は停止しています。</v-alert>
            <v-alert v-if="selectedCompany.enabled === false" type="warning" class="mb-4">工務店が無効のため、全本支店で新規登録を停止しています。</v-alert>
            <v-text-field v-model="branchSearch" label="所属本支店名で絞り込み" clearable density="compact" />
            <p class="text-caption">{{ branchRows.length }}件／{{ selectedCompany.name }}</p>
            <v-list>
              <v-list-item v-for="branch in paged(branchRows, branchPage)" :key="branch.id" :title="branch.branchCode ? `${branch.name}（${branch.branchCode}）` : branch.name" :subtitle="branch.enabled === false ? '本支店を無効化中' : selectedCompany.enabled === false ? '工務店の無効化により停止中' : selectedGroup.enabled === false ? '保証グループの無効化により停止中' : '有効'">
                <template #append><div class="organization-actions"><v-btn size="small" variant="outlined" :disabled="busy" @click="$emit('edit', 'saveBranch', branch)">{{ branch.enabled === false ? '表示' : '編集' }}</v-btn><v-btn v-if="branch.enabled === false" size="small" variant="outlined" :disabled="busy" @click="$emit('reenable', 'branch', branch)">有効化</v-btn></div></template>
              </v-list-item>
            </v-list>
            <p v-if="!branchRows.length" class="py-4">該当する本支店はありません。</p>
            <v-pagination v-model="branchPage" :length="pageCount(branchRows)" :disabled="busy" :total-visible="3" />
          </template>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
  </section>
</template>

<script setup lang="ts">
type Row = Record<string, any>
const props = defineProps<{ groups: Row[]; companies: Row[]; branches: Row[]; groupId: string; companyId: string; busy: boolean }>()
const emit = defineEmits<{ selectGroup: [id: string]; selectCompany: [id: string]; edit: [action: string, row: Row]; reenable: [kind: string, row: Row] }>()
const heading = ref<HTMLElement | null>(null)
const level = computed(() => !props.groupId ? 'groups' : !props.companyId ? 'companies' : 'branches')
const title = computed(() => level.value === 'groups' ? '保証グループ一覧' : level.value === 'companies' ? `${selectedGroup.value?.name || '保証グループ'} の工務店一覧` : `${selectedCompany.value?.name || '工務店'} の本支店一覧`)
const showGroups = () => { if (!props.busy) emit('selectGroup', '') }
const showCompanies = () => { if (!props.busy) emit('selectCompany', '') }
const includeInactive=ref(false)
const groupSearch = ref(''), companySearch = ref(''), branchSearch = ref('')
const groupPage = ref(1), companyPage = ref(1), branchPage = ref(1)
const selectedGroup = computed(() => props.groups.find(row => row.id === props.groupId))
const selectedCompany = computed(() => props.companies.find(row => row.id === props.companyId && row.defaultGroupId === props.groupId))
const match = (rows: Row[], term: string | null) => rows.filter(row => (includeInactive.value || row.enabled!==false) && row.name.includes((term || '').trim()))
const groupRows = computed(() => {
  const sorted = match([...props.groups], '').sort((a, b) => (b.updatedAt?._seconds ?? b.updatedAt?.seconds ?? 0) - (a.updatedAt?._seconds ?? a.updatedAt?.seconds ?? 0) || String(b.id).localeCompare(String(a.id)))
  return groupSearch.value?.trim() ? match(sorted, groupSearch.value) : sorted.slice(0, 20)
})
const companyRows = computed(() => match(props.companies.filter(row => row.defaultGroupId === props.groupId), companySearch.value))
const branchRows = computed(() => match(props.branches.filter(row => row.constructionCompanyId === props.companyId), branchSearch.value))
const paged = (rows: Row[], page: number) => rows.slice((page - 1) * 20, page * 20)
const pageCount = (rows: Row[]) => Math.max(1, Math.ceil(rows.length / 20))
let lastGroupId = props.groupId, lastCompanyId = props.companyId
watch([groupSearch, includeInactive], () => { groupPage.value = 1 })
watch([companySearch, includeInactive], () => { companyPage.value = 1 })
watch([branchSearch, includeInactive], () => { branchPage.value = 1 })
watch(groupRows, rows => { groupPage.value = Math.min(groupPage.value, pageCount(rows)) })
watch(companyRows, rows => { if (props.groupId) companyPage.value = Math.min(companyPage.value, pageCount(rows)) })
watch(branchRows, rows => { if (props.companyId) branchPage.value = Math.min(branchPage.value, pageCount(rows)) })
watch(() => props.groupId, id => {
  if (!id) return
  if (id !== lastGroupId) { companySearch.value = ''; branchSearch.value = ''; companyPage.value = 1; branchPage.value = 1; lastCompanyId = '' }
  lastGroupId = id
}, { flush: 'sync' })
watch(() => props.companyId, id => {
  if (!id) return
  if (id !== lastCompanyId) { branchSearch.value = ''; branchPage.value = 1 }
  lastCompanyId = id
}, { flush: 'sync' })
watch(level, async () => { await nextTick(); heading.value?.focus() })
</script>

<style scoped>
.organization-management { min-width: 0; overflow-wrap: anywhere; }
.organization-heading { min-width: 0; flex: 1 1 240px; }
.organization-actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 0; }
.organization-management :deep(.v-list-item-title),
.organization-management :deep(.v-list-item-subtitle) { white-space: normal; overflow-wrap: anywhere; -webkit-line-clamp: unset; }
.organization-crumb { max-width: 100%; height: auto !important; min-height: 32px; }
.organization-crumb :deep(.v-btn__content) { white-space: normal; overflow-wrap: anywhere; }
@media (max-width: 700px) {
  .organization-management :deep(.v-list-item) { grid-template-columns: minmax(0, 1fr); }
  .organization-management :deep(.v-list-item__content) { grid-column: 1; grid-row: 1; }
  .organization-management :deep(.v-list-item__append) { grid-column: 1; grid-row: 2; justify-self: start; max-width: 100%; }
}
@media (pointer: coarse) {
  .organization-management :deep(.v-btn) { min-height: 44px; }
}
</style>
