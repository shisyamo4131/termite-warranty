<script setup lang="ts">
import { normalizeDateEntry } from '../../src/domain/date-entry.mjs'
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{modelValue?: string | null; type?: 'date' | 'month'; disabled?: boolean; label?: string}>(), {type:'date'})
const emit = defineEmits<{'update:modelValue':[value:string]}>()
const pickerOpen = ref(false)
const pickerDate = computed(() => {
  const value=props.type==='month' ? `${props.modelValue}-01` : props.modelValue
  const date=new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
})
function update(value: unknown) { emit('update:modelValue', normalizeDateEntry(String(value ?? ''), props.type)) }
function choose(value: unknown) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return
  const date=`${String(value.getFullYear()).padStart(4,'0')}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`
  update(props.type==='month' ? date.slice(0,7) : date)
  pickerOpen.value=false
}
</script>

<template>
  <div class="business-date-input">
    <v-text-field v-bind="$attrs" :model-value="modelValue" :disabled="disabled" :label="label"
      type="text" autocomplete="off" validate-on="blur" :placeholder="type==='month' ? '2026-10 または 202610' : '2026-10-04 または 20261004'"
      :hint="String($attrs.hint || (type==='month' ? '西暦年月を入力（例：202610）' : '西暦年月日を入力（例：20261004）'))" persistent-hint
      @update:model-value="update">
      <template #append-inner>
        <v-menu v-model="pickerOpen" :close-on-content-click="false">
          <template #activator="{props: activator}"><v-btn v-bind="activator" icon="mdi-calendar" variant="text" size="small" :disabled="disabled" :aria-label="`${label || '日付'}のカレンダーを開く`" /></template>
          <v-card><v-card-text v-if="type==='month'" class="pb-0">対象月のいずれかの日を選択してください。</v-card-text><v-date-picker :model-value="pickerDate" hide-header @update:model-value="choose" /><v-card-actions><v-spacer /><v-btn @click="pickerOpen=false">閉じる</v-btn></v-card-actions></v-card>
        </v-menu>
      </template>
    </v-text-field>
  </div>
</template>

<style scoped>
.business-date-input { position: relative; }
</style>
