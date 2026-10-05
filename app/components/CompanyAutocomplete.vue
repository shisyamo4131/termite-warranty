<script setup lang="ts">
import { requiredRules } from '../../src/domain/input-rules.mjs'
type Company = {id:string;name:string;[key:string]:any}
const props=defineProps<{modelValue:string;items:Company[];fetchOptions:(text:string)=>Promise<Company[]>;disabled?:boolean;required?:boolean;active?:boolean}>()
const emit=defineEmits<{'update:modelValue':[value:string];select:[value:Company|null]}>()
const search=ref(''),rows=ref<Company[]>([]),selected=ref<Company|null>(null),loading=ref(false),menu=ref(false),focused=ref(false),problem=ref(''),hint=ref(''),composing=ref(false)
const input=ref<{focus:()=>void}|null>(null)
let timer:ReturnType<typeof setTimeout>|undefined,request=0,alive=true
function invalidate(){clearTimeout(timer);request++;loading.value=false}
const available=()=>alive && props.active!==false && !props.disabled
async function run(){
 invalidate();if(!available() || props.modelValue || composing.value || !focused.value)return
 const text=search.value.trim();if(text && Array.from(text).length<2){hint.value='2文字以上入力してください。';return}
 const id=request;loading.value=true;problem.value='';rows.value=[]
 try{const result=await props.fetchOptions(text);if(id===request && available())rows.value=result}
 catch{if(id===request && available())problem.value='工務店の候補を取得できませんでした。再試行してください。'}
 finally{if(id===request)loading.value=false}
}
function schedule(){
 invalidate();if(props.modelValue)return
 rows.value=[];problem.value='';hint.value=''
 if(!available() || composing.value || !focused.value)return
 if(search.value.trim() && Array.from(search.value.trim()).length<2){hint.value='2文字以上入力してください。';return}
 loading.value=true;timer=setTimeout(run,300)
}
function choose(row:Company|null){if(!row || !available())return;invalidate();selected.value=row;menu.value=false;emit('update:modelValue',row.id);emit('select',row)}
async function clear(){if(!available())return;invalidate();selected.value=null;search.value='';emit('update:modelValue','');emit('select',null);await nextTick();input.value?.focus()}
function focus(value:boolean){focused.value=value;if(value){menu.value=true;schedule()}else invalidate()}
function compositionStart(){composing.value=true;invalidate();rows.value=[]}
function compositionEnd(){composing.value=false;nextTick(schedule)}
watch(search,schedule)
watch(()=>props.modelValue,()=>{invalidate();rows.value=[];problem.value='';hint.value='';selected.value=props.items.find(c=>c.id===props.modelValue) || (selected.value?.id===props.modelValue ? selected.value : null);if(!props.modelValue)search.value=''}, {immediate:true})
watch(()=>props.items,()=>{selected.value=props.items.find(c=>c.id===props.modelValue) || selected.value})
watch(()=>[props.disabled,props.active],()=>{invalidate();menu.value=false;if(props.active===false){rows.value=[];search.value='';problem.value='';focused.value=false}})
onBeforeUnmount(()=>{alive=false;invalidate()})
</script>

<template>
 <v-select v-if="modelValue" :model-value="modelValue" :items="[{id:modelValue,name:selected?.name || items.find(c=>c.id===modelValue)?.name || '選択済み工務店'}]" item-title="name" item-value="id" label="工務店" :rules="required ? requiredRules : []" :required="required" :disabled="disabled" clearable hide-selected hide-no-data menu-icon="" hint="変更する場合は×で選択を解除してください。" :persistent-hint="!disabled" @update:model-value="value=>{if(value==null)clear()}" />
 <v-autocomplete v-else ref="input" v-model:search="search" v-model:menu="menu" :model-value="null" :items="rows" item-title="name" item-value="id" return-object no-filter :auto-select-first="false" label="工務店" :rules="required ? requiredRules : []" :required="required" :disabled="disabled" :loading="loading" :menu-props="{maxHeight:360}" hint="工務店名を2文字以上で検索。未入力では更新が新しい20件が対象です。" persistent-hint @update:model-value="choose" @update:focused="focus" @compositionstart="compositionStart" @compositionend="compositionEnd">
  <template #no-data><div class="pa-3" role="status">{{ loading ? '検索中…' : problem || hint || '該当する工務店はありません。' }}<v-btn v-if="problem" variant="text" @mousedown.prevent @click="run">再試行</v-btn></div></template>
 </v-autocomplete>
</template>
