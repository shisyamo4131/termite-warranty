<template>
  <h1 class="text-h5 mb-3">保証グループ・工務店・支店</h1>
  <p class="mb-4">保証グループ → 工務店 → 支店の順に選択して管理します。工務店の所属変更は新規保証に適用し、発行済みの保証番号・グループは維持します。</p>
  <v-alert type="info" variant="tonal" class="mb-4">
    接頭辞は保証グループ内で共通です。無効な工務店・支店では新規物件の登録を停止しますが、HSは既存保証への対応を継続できます。
  </v-alert>
  <div class="d-flex flex-wrap align-center ga-2 mb-4">
    <v-chip color="primary">{{ selectedGroup?.name || '保証グループを選択' }}</v-chip>
    <span>→</span>
    <v-chip>{{ selectedCompany?.name || '工務店を選択' }}</v-chip>
    <v-btn variant="text" :disabled="busy" @click="$emit('selectGroup', '')">選択を解除</v-btn>
  </div>
  <v-checkbox v-model="includeInactive" label="無効を含む" hide-details class="mb-3" />
  <v-row>
    <v-col cols="12" md="4">
      <v-card height="100%">
        <v-card-title class="d-flex justify-space-between align-center">保証グループ<v-btn size="small" color="primary" :disabled="busy" @click="$emit('edit', 'saveGroup', {})">追加</v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="groupSearch" label="保証グループ名で絞り込み" clearable density="compact" />
          <p class="text-caption">{{ groupRows.length }}件{{ groupSearch ? '' : '（更新が新しい20件まで）' }}</p>
          <v-list>
            <v-list-item v-for="group in paged(groupRows, groupPage)" :key="group.id" :active="group.id === groupId" :title="group.name" :disabled="busy" @click="$emit('selectGroup', group.id)">
              <template #subtitle>{{ group.enabled === false ? '無効／' : '' }}{{ group.prefix || '接頭辞なし' }}・{{ group.fiscalStartMonth }}月始まり</template>
              <template #append><v-btn size="small" variant="text" :disabled="busy" @click.stop="$emit('edit', 'saveGroup', group)">編集</v-btn></template>
            </v-list-item>
          </v-list>
          <p v-if="!groupRows.length" class="py-4">該当する保証グループはありません。</p>
          <v-pagination v-model="groupPage" :length="pageCount(groupRows)" :disabled="busy" :total-visible="3" />
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card height="100%">
        <v-card-title class="d-flex justify-space-between align-center">所属工務店<v-btn size="small" color="primary" :disabled="busy || !selectedGroup || selectedGroup.enabled === false" @click="$emit('edit', 'saveCompany', {})">追加</v-btn></v-card-title>
        <v-card-text>
          <p v-if="!selectedGroup" class="py-4">保証グループを選択してください。</p>
          <template v-else>
            <v-alert v-if="selectedGroup.enabled === false" type="warning" density="compact" class="mb-3">保証グループが無効のため、所属工務店での新規本登録は停止しています。</v-alert>
            <v-text-field v-model="companySearch" label="所属工務店名で絞り込み" clearable density="compact" />
            <p class="text-caption">{{ companyRows.length }}件／{{ selectedGroup.name }}</p>
            <v-list>
              <v-list-item v-for="company in paged(companyRows, companyPage)" :key="company.id" :active="company.id === companyId" :title="company.name" :subtitle="company.enabled === false ? '無効（新規登録停止）' : '有効'" :disabled="busy" @click="$emit('selectCompany', company.id)">
                <template #append><v-btn size="small" variant="text" :disabled="busy" @click.stop="$emit('edit', 'saveCompany', company)">編集</v-btn></template>
              </v-list-item>
            </v-list>
            <p v-if="!companyRows.length" class="py-4">該当する工務店はありません。</p>
            <v-pagination v-model="companyPage" :length="pageCount(companyRows)" :disabled="busy" :total-visible="3" />
          </template>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card height="100%">
        <v-card-title class="d-flex justify-space-between align-center">所属支店<v-btn size="small" color="primary" :disabled="busy || !selectedCompany" @click="$emit('edit', 'saveBranch', {})">追加</v-btn></v-card-title>
        <v-card-text>
          <p v-if="!selectedCompany" class="py-4">工務店を選択してください。</p>
          <template v-else>
            <v-alert v-if="selectedCompany.enabled === false" type="warning" density="compact" class="mb-3">工務店が無効のため、全支店で新規登録を停止しています。</v-alert>
            <v-text-field v-model="branchSearch" label="所属支店名で絞り込み" clearable density="compact" />
            <p class="text-caption">{{ branchRows.length }}件／{{ selectedCompany.name }}</p>
            <v-list>
              <v-list-item v-for="branch in paged(branchRows, branchPage)" :key="branch.id" :title="branch.name" :subtitle="branch.enabled === false ? '支店を無効化中' : selectedCompany.enabled === false ? '工務店の無効化により停止中' : '有効'">
                <template #append><v-btn size="small" variant="text" :disabled="busy" @click="$emit('edit', 'saveBranch', branch)">編集</v-btn></template>
              </v-list-item>
            </v-list>
            <p v-if="!branchRows.length" class="py-4">該当する支店はありません。本店の物件は支店指定なしで登録します。</p>
            <v-pagination v-model="branchPage" :length="pageCount(branchRows)" :disabled="busy" :total-visible="3" />
          </template>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
type Row = Record<string, any>
const props = defineProps<{ groups: Row[]; companies: Row[]; branches: Row[]; groupId: string; companyId: string; busy: boolean }>()
defineEmits<{ selectGroup: [id: string]; selectCompany: [id: string]; edit: [action: string, row: Row] }>()
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
watch([groupRows, companyRows, branchRows], () => { groupPage.value = 1; companyPage.value = 1; branchPage.value = 1 })
watch(() => props.groupId, () => { companySearch.value = ''; branchSearch.value = '' })
watch(() => props.companyId, () => { branchSearch.value = '' })
</script>
