<script setup lang="ts">
import { useDefaults, useDisplay } from 'vuetify'
import type { ManagedMaster } from '../composables/useMasterManagement'

interface TableHeader {
  title: string
  key: string
  align?: 'center'
  width?: number
}

const rawProps = withDefaults(defineProps<{
  hover?: boolean
  items: ManagedMaster[]
  loading?: boolean
  noDataText?: string
}>(), {
  hover: true,
  loading: false,
  noDataText: 'データがありません。',
})
const props = useDefaults(rawProps, 'PropertyTable')

const emit = defineEmits<{
  'change-active': [payload: { id: string; nextActive: boolean }]
  'show-detail': [payload: { id: string }]
}>()

defineOptions({ name: 'PropertyTable', inheritAttrs: false })

const { mdAndUp, lgAndUp } = useDisplay()

const columns: Record<'name' | 'address' | 'buildingAreaSquareMeters' | 'operation', TableHeader> = {
  name: { title: '名称', key: 'name' },
  address: { title: '住所', key: 'address' },
  buildingAreaSquareMeters: { title: '建築面積 (㎡)', key: 'buildingAreaSquareMeters' },
  operation: { title: '操作', key: 'operation', align: 'center', width: 120 },
}

const resolvedHeaders = computed<TableHeader[]>(() => {
  const result = [columns.name]
  if (mdAndUp.value) result.push(columns.address)
  if (lgAndUp.value) result.push(columns.buildingAreaSquareMeters)
  result.push(columns.operation)
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
    v-bind="$attrs"
    disable-sort
    :headers="resolvedHeaders"
    hide-default-footer
    :hover="props.hover"
    :items="props.items"
    :items-per-page="-1"
    :loading="props.loading"
    :no-data-text="props.noDataText"
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
