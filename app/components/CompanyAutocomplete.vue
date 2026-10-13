<script setup lang="ts">
import { requiredRules } from '../../src/domain/input-rules.mjs'
type Company = {id:string;name:string;[key:string]:any}
const props=defineProps<{modelValue:string;items:Company[];fetchOptions:(text:string)=>Promise<Company[]>;disabled?:boolean;required?:boolean;active?:boolean}>()
const emit=defineEmits<{'update:modelValue':[value:string];select:[value:Company|null]}>()
const rows=ref<Company[]>([]),loading=ref(false),problem=ref('')
const available=computed(()=>{const selected=props.items.find(row=>row.id===props.modelValue);return selected && !rows.value.some(row=>row.id===selected.id) ? [...rows.value,selected] : rows.value})
let request=0
async function load(){const epoch=++request;if(props.active===false)return;loading.value=true;problem.value='';try{const result=await props.fetchOptions('');if(epoch===request)rows.value=result}catch{if(epoch===request)problem.value='工務店の候補を取得できませんでした。'}finally{if(epoch===request)loading.value=false}}
watch(()=>props.active,()=>{rows.value=[];void load()},{immediate:true})
watch(()=>props.items,values=>{rows.value=values})
onBeforeUnmount(()=>request++)
function choose(id:string|null){emit('update:modelValue',id || '');emit('select',available.value.find(row=>row.id===id) ?? null)}
</script>
<template>
 <v-autocomplete :model-value="modelValue" :items="available" item-title="name" item-value="id" label="工務店" :rules="required ? requiredRules : []" :required="required" :disabled="disabled" :loading="loading" :error-messages="problem" clearable @update:model-value="choose">
  <template #no-data><div class="pa-3">{{ loading ? '取得中…' : problem || '該当する工務店はありません。' }}<v-btn v-if="problem" variant="text" @click="load">再取得</v-btn></div></template>
 </v-autocomplete>
</template>
