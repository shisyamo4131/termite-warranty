<template>
  <h1 class="text-h5 mb-4 business-page-title"><BusinessNavigationIcon item="companySettings" /><span>設定</span></h1>
  <v-card max-width="900"><v-card-text>
    <h2 class="business-section-title">自社情報</h2>
    <v-alert type="info" class="mb-4">Wordテンプレートに直接記載した会社情報は自動更新されません。変更後はWordの記載も確認してください。</v-alert>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}<v-btn v-if="!editing" variant="text" :disabled="working" @click="load(true)">再取得</v-btn></v-alert>
    <v-progress-linear v-if="working" indeterminate class="mb-4" />
    <v-form v-if="editing" ref="form" :disabled="working" @submit.prevent="save">
      <h3 class="business-section-title">基本情報</h3>
      <v-text-field v-model="draft.companyName" label="会社名" required :rules="requiredRules" />
      <v-text-field v-model="draft.invoiceRegistrationNumber" label="適格請求書発行事業者番号" hint="Tと13桁の数字。登録の有効性を確認する機能ではありません。" persistent-hint :rules="[registrationRule]" />
      <h3 class="business-section-title">所在地・連絡先</h3>
      <BusinessContactFields v-model="draft" show-fax />
      <h3 class="business-section-title">代表者</h3>
      <v-text-field v-model="draft.representativeTitle" label="代表者肩書" :rules="optionalRules" />
      <v-text-field v-model="draft.representativeName" label="代表者名" :rules="optionalRules" />
      <div class="d-flex flex-wrap ga-3"><v-btn variant="outlined" :disabled="working" @click="cancel">変更を取り消す</v-btn><v-btn type="submit" color="primary" variant="flat" :disabled="working">保存</v-btn></div>
    </v-form>
    <template v-else-if="store.value.value">
      <dl><div v-for="item in fields" :key="item.key" class="mb-4"><dt class="text-caption text-medium-emphasis">{{ item.label }}</dt><dd class="text-body-1 text-break">{{ store.value.value[item.key] || '未設定' }}</dd></div></dl>
      <v-btn v-if="store.canEdit()" color="primary" variant="flat" :disabled="working" @click="edit">編集</v-btn>
    </template>
    <p v-if="store.value.value" class="text-caption mt-4">最終更新：{{ updatedLabel }} ／ {{ store.value.value.updatedByName || '—' }}</p>
  </v-card-text></v-card>
</template>

<script setup lang="ts">
import { companyProfileDefaults, normalizeCompanyProfile } from '../../src/domain/company-settings.mjs'
import { requiredRules, optionalRules } from '../../src/domain/input-rules.mjs'
import { recoveryRuntime } from '../utils/recoveryClient'
const store = useCompanyProfile()
const { profile } = useSession()
const { showSnackbar, showValidationError } = useAppSnackbar()
const emit = defineEmits<{ busy: [value: boolean] }>()
const draft = ref(companyProfileDefaults())
const editing = ref(false), working = ref(false), error = ref('')
const form = ref<{validate: () => Promise<{valid: boolean}>} | null>(null)
let baseline = '', generation = 0
const fields = [
  {key:'companyName',label:'会社名'}, {key:'invoiceRegistrationNumber',label:'適格請求書発行事業者番号'},
  {key:'postalCode',label:'郵便番号'}, {key:'address1',label:'住所1'}, {key:'address2',label:'住所2'},
  {key:'telephone',label:'電話番号'}, {key:'fax',label:'FAX番号'}, {key:'email',label:'メールアドレス'},
  {key:'representativeTitle',label:'代表者肩書'}, {key:'representativeName',label:'代表者名'},
] as const
const dirty = computed(() => editing.value && baseline !== JSON.stringify(draft.value))
const updatedLabel = computed(() => store.value.value?.updatedAt ? new Date(store.value.value.updatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '未保存')
const registrationRule = (value: string) => !value.trim() || /^T\d{13}$/.test(value.trim()) || 'Tと13桁の数字で入力してください。'
async function run(action: () => Promise<void>) {
  if (working.value) return
  const token = generation; working.value = true; error.value = ''; emit('busy', true)
  try { await action() } catch (cause) { if (token === generation) error.value = cause instanceof Error ? cause.message : '操作に失敗しました。' }
  finally { if (token === generation) { working.value = false; emit('busy', false) } }
}
function load(force = false) { return run(async () => { await store.load(force) }) }
function edit() { return run(async () => {
  const token = generation
  const latest = await store.load(true)
  if (token !== generation || !store.canEdit()) return
  draft.value = normalizeCompanyProfile(latest, { requireName: false }); baseline = JSON.stringify(draft.value); editing.value = true
}) }
function canLeave() { return !working.value && (!dirty.value || window.confirm('保存していない変更を破棄しますか？')) }
function cancel() { if (canLeave()) { editing.value = false; draft.value = companyProfileDefaults(); error.value = '' } }
async function save() {
  if (!store.canEdit() || working.value) return
  if (!(await form.value?.validate())?.valid) { showValidationError(); return }
  await run(async () => { await store.save(draft.value); editing.value = false; showSnackbar('自社情報を保存しました。', 'success') })
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
watch(() => JSON.stringify([profile.value,recoveryRuntime.value]), () => { generation++; editing.value=false; draft.value=companyProfileDefaults(); error.value=''; working.value=false; emit('busy',false) }, {flush:'sync'})
onMounted(() => { window.addEventListener('beforeunload', beforeUnload); void load() })
onBeforeUnmount(() => { generation++; window.removeEventListener('beforeunload', beforeUnload) })
defineExpose({ canLeave })
</script>
