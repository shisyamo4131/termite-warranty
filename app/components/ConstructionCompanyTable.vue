<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { ManagedMaster } from '../composables/useMasterManagement'

interface TableHeader {
  title: string
  key: string
  align?: 'center'
  width?: number
}

const props = withDefaults(defineProps<{
  items: ManagedMaster[]
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  'show-detail': [payload: { id: string }]
  'change-active': [payload: { id: string; nextActive: boolean }]
}>()

defineOptions({ name: 'ConstructionCompanyTable', inheritAttrs: false })

const { smAndUp, mdAndUp, lgAndUp } = useDisplay()

const columns: Record<'name' | 'address' | 'telephone' | 'contactPerson' | 'operation', TableHeader> = {
  name: { title: '名称', key: 'name' },
  address: { title: '住所', key: 'address' },
  telephone: { title: '電話番号', key: 'telephone' },
  contactPerson: { title: '担当者', key: 'contactPerson' },
  operation: { title: '操作', key: 'operation', align: 'center', width: 120 },
}

const resolvedHeaders = computed<TableHeader[]>(() => {
  const result = [columns.name]
  if (mdAndUp.value) result.push(columns.address)
  if (lgAndUp.value) result.push(columns.telephone, columns.contactPerson)
  result.push({ ...columns.operation, width: smAndUp.value ? 120 : 72 })
  return result
})

const resolvedAddress = (item: ManagedMaster) => [
  item.address?.prefecture,
  item.address?.municipality,
  item.address?.streetTownAndNumber,
].filter(Boolean).join('')

const resolvedBuildingName = (item: ManagedMaster) => item.address?.buildingName ?? ''

const activationStatus = (item: ManagedMaster) => ({
  color: item.active ? 'success' : 'error',
  text: item.active ? '有効' : '無効',
})

const emitActiveChange = (item: ManagedMaster) => emit('change-active', {
  id: item.id,
  nextActive: !item.active,
})
</script>

<template>
  <v-data-table
    disable-sort
    :headers="resolvedHeaders"
    hide-default-footer
    hover
    :items="props.items"
    :items-per-page="-1"
    :loading="props.loading"
    no-data-text="データがありません。"
  >
    <template #[`item.name`]="{ item }">
      <div class="d-flex align-center">
        <v-chip
          :color="activationStatus(item).color"
          class="me-2 flex-shrink-0"
          size="small"
        >
          {{ activationStatus(item).text }}
        </v-chip>
        <div>{{ item.name }}</div>
      </div>
    </template>

    <template #[`item.address`]="{ item }">
      <div class="d-flex flex-column">
        <div>{{ resolvedAddress(item) }}</div>
        <div v-if="resolvedBuildingName(item)">{{ resolvedBuildingName(item) }}</div>
      </div>
    </template>

    <template #[`item.operation`]="{ item }">
      <div class="d-flex flex-column flex-sm-row">
        <v-btn
          :aria-label="`${item.name}の詳細を表示します`"
          color="primary"
          size="small"
          variant="text"
          @click="emit('show-detail', { id: item.id })"
        >
          詳細
        </v-btn>
        <v-btn
          :aria-label="`${item.name}の状態を${item.active ? '無効化' : '有効化'}します`"
          :color="item.active ? 'error' : 'success'"
          size="small"
          variant="text"
          @click="emitActiveChange(item)"
        >
          {{ item.active ? '無効化' : '有効化' }}
        </v-btn>
      </div>
    </template>
  </v-data-table>
</template>
