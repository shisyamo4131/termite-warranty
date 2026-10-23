<template>
  <h1 class="text-h5 mb-4 business-page-title"><BusinessNavigationIcon item="companySettings" /><span>設定</span></h1>
  <section class="company-settings-display">
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
      <h2 class="business-section-title mb-0">自社情報</h2>
      <v-btn v-if="store.value.value && store.canEdit()" color="primary" variant="flat" :disabled="working" @click="edit">編集</v-btn>
    </div>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}<v-btn v-if="!editing" variant="text" :disabled="working" @click="load(true)">再取得</v-btn></v-alert>
    <v-progress-linear v-if="working" indeterminate class="mb-4" />
    <div v-if="store.value.value" class="company-settings-grid">
      <v-card v-for="section in displaySections" :key="section.title" border :elevation="0" class="company-settings-card" :class="{ 'company-settings-wide': section.title === '振込先' }">
        <v-card-text>
          <h3 class="business-section-title">{{ section.title }}</h3>
          <dl class="company-settings-fields">
            <div v-for="item in section.fields" :key="item.key" :class="{ 'company-settings-wide': fullWidthFields.includes(item.key) }">
              <dt class="text-caption text-medium-emphasis mb-1">{{ item.label }}</dt>
              <dd class="text-body-1">{{ store.value.value[item.key] || '未設定' }}</dd>
            </div>
          </dl>
        </v-card-text>
      </v-card>
    </div>
    <p v-if="store.value.value" class="text-caption mt-4">最終更新：{{ updatedLabel }} ／ {{ store.value.value.updatedByName || '—' }}</p>
  </section>
  <v-dialog :model-value="editing" max-width="900" scrollable persistent>
    <v-card :border="false">
      <BusinessDialogHeader title="自社情報の編集" icon="companySettings" :busy="working" @close="cancel" />
      <v-card-text>
        <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
        <v-progress-linear v-if="working" indeterminate class="mb-4" />
        <v-form ref="form" :disabled="working" @submit.prevent="save">
          <v-card border :elevation="0" class="dialog-layout-card mb-4"><v-card-text>
            <h3 class="business-section-title">基本情報</h3>
            <v-text-field v-model="draft.companyName" label="会社名" required :rules="requiredRules" />
            <v-text-field v-model="draft.invoiceRegistrationNumber" label="適格請求書発行事業者番号" hint="Tと13桁の数字。登録の有効性を確認する機能ではありません。" persistent-hint :rules="[...optionalRules, registrationRule]" />
          </v-card-text></v-card>
          <v-card border :elevation="0" class="dialog-layout-card mb-4"><v-card-text>
            <h3 class="business-section-title">所在地・連絡先</h3>
            <BusinessContactFields v-model="draft" show-fax />
          </v-card-text></v-card>
          <v-card border :elevation="0" class="dialog-layout-card mb-4"><v-card-text>
            <h3 class="business-section-title">代表者</h3>
            <v-text-field v-model="draft.representativeTitle" label="代表者肩書" :rules="optionalRules" />
            <v-text-field v-model="draft.representativeName" label="代表者名" :rules="optionalRules" />
          </v-card-text></v-card>
          <v-card border :elevation="0" class="dialog-layout-card"><v-card-text>
            <h3 class="business-section-title">振込先</h3>
            <v-text-field v-model="draft.bankName" label="金融機関名" :rules="optionalRules" />
            <v-text-field v-model="draft.bankBranchName" label="支店名" :rules="optionalRules" />
            <v-text-field v-model="draft.bankAccountType" label="預金種別" hint="例：普通" persistent-hint :rules="optionalRules" />
            <v-text-field v-model="draft.bankAccountNumber" label="口座番号" inputmode="numeric" hint="半角数字で入力してください。先頭の0も保存されます。" persistent-hint :rules="[...optionalRules, accountNumberRule]" />
            <v-text-field v-model="draft.bankAccountHolder" label="口座名義" :rules="optionalRules" />
          </v-card-text></v-card>
        </v-form>
        <p class="text-caption mt-4">最終更新：{{ updatedLabel }} ／ {{ store.value.value?.updatedByName || '—' }}</p>
      </v-card-text>
      <v-card-actions><v-spacer /><v-btn variant="outlined" :disabled="working" @click="cancel">閉じる</v-btn><v-btn color="primary" variant="flat" :disabled="working" @click="save">保存</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
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
const displaySections = [
  {title:'会社・代表者',fields:[
    {key:'companyName',label:'会社名'}, {key:'invoiceRegistrationNumber',label:'適格請求書発行事業者番号'},
    {key:'representativeTitle',label:'代表者肩書'}, {key:'representativeName',label:'代表者名'},
  ]},
  {title:'所在地・連絡先',fields:[
    {key:'postalCode',label:'郵便番号'}, {key:'address1',label:'住所1'}, {key:'address2',label:'住所2'},
    {key:'telephone',label:'電話番号'}, {key:'fax',label:'FAX番号'}, {key:'email',label:'メールアドレス'},
  ]},
  {title:'振込先',fields:[
    {key:'bankName',label:'金融機関名'}, {key:'bankBranchName',label:'支店名'},
    {key:'bankAccountType',label:'預金種別'}, {key:'bankAccountNumber',label:'口座番号'}, {key:'bankAccountHolder',label:'口座名義'},
  ]},
] as const
const fullWidthFields: readonly string[] = ['companyName','invoiceRegistrationNumber','address1','address2','email','bankAccountHolder']
const dirty = computed(() => editing.value && baseline !== JSON.stringify(draft.value))
const updatedLabel = computed(() => store.value.value?.updatedAt ? new Date(store.value.value.updatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '未保存')
const registrationRule = (value: string) => !value.trim() || /^T\d{13}$/.test(value.trim()) || 'Tと13桁の数字で入力してください。'
const accountNumberRule = (value: string) => !value.trim() || /^[0-9]+$/.test(value.trim()) || '口座番号は半角数字で入力してください。'
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
  const token = generation
  if (!(await form.value?.validate())?.valid) { showValidationError(); return }
  if (token !== generation || !editing.value || !store.canEdit()) return
  await run(async () => { await store.save(draft.value); if (token !== generation) return; editing.value = false; showSnackbar('自社情報を保存しました。', 'success') })
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
watch(() => JSON.stringify([profile.value,recoveryRuntime.value]), () => { generation++; editing.value=false; draft.value=companyProfileDefaults(); error.value=''; working.value=false; emit('busy',false) }, {flush:'sync'})
onMounted(() => { window.addEventListener('beforeunload', beforeUnload); void load() })
onBeforeUnmount(() => { generation++; window.removeEventListener('beforeunload', beforeUnload) })
defineExpose({ canLeave })
</script>

<style scoped>
.company-settings-display { max-width: 900px; width: 100%; min-width: 0; }
.company-settings-grid,
.company-settings-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.company-settings-card,
.company-settings-fields > div { min-width: 0; }
.company-settings-fields dd { margin: 0; overflow-wrap: anywhere; }
.company-settings-wide { grid-column: 1 / -1; }
@media (max-width: 600px) {
  .company-settings-grid,
  .company-settings-fields { grid-template-columns: minmax(0, 1fr); }
}
</style>
