<template>
  <v-app-bar color="primary" elevation="1">
    <v-app-bar-title>工務店専用ポータル</v-app-bar-title>
    <template #append>
      <span class="d-none d-sm-inline mr-4">{{ companyProfile?.companyName }}</span>
      <v-btn variant="outlined" @click="logout">ログアウト</v-btn>
    </template>
  </v-app-bar>
  <v-main>
    <v-container class="py-8">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
        <div>
          <h1 class="text-h4">対応案件</h1>
          <p class="text-body-2 text-medium-emphasis mt-1">自社に割り当てられた案件だけが表示されます。</p>
        </div>
        <v-btn color="primary" @click="openNewRequest">新規案件を申請</v-btn>
      </div>

      <v-alert type="info" variant="tonal" class="mb-4">
        このプロトタイプでは、メール通知は送信待ちキューの記録までを行います。実メールは送信しません。
      </v-alert>
      <v-alert v-if="loadError" type="error" class="mb-4">{{ loadError }}</v-alert>

      <v-row>
        <v-col v-for="item in sortedItems" :key="item.id" cols="12" md="6">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between ga-2">
              <span>{{ item.kind === 'renewal' ? `保証更改 ${item.caseNumber ?? ''}` : '新規案件申請' }}</span>
              <v-chip :color="statusColor(item.status)" size="small">{{ statusLabel(item.status) }}</v-chip>
            </v-card-title>
            <v-card-text>
              <dl class="portal-summary">
                <dt>物件</dt><dd>{{ item.propertyName || '未入力' }}</dd>
                <dt>施主</dt><dd>{{ item.homeownerName || '未入力' }}</dd>
                <template v-if="item.currentExpiryDate"><dt>現在の満了日</dt><dd>{{ item.currentExpiryDate }}</dd></template>
                <template v-if="item.response"><dt>今回の担当者</dt><dd>{{ item.response.contactName }}</dd></template>
              </dl>
              <v-alert v-if="item.reviewComment" type="warning" variant="tonal" class="mt-4">
                差戻し内容：{{ item.reviewComment }}
              </v-alert>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                v-if="editable(item)"
                color="primary"
                variant="text"
                @click="openExisting(item)"
              >入力・確認</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
        <v-col v-if="!loading && sortedItems.length === 0" cols="12">
          <v-card><v-card-text class="text-center py-10">現在、対応が必要な案件はありません。</v-card-text></v-card>
        </v-col>
      </v-row>
      <v-progress-linear v-if="loading" indeterminate color="primary" />
    </v-container>
  </v-main>

  <v-dialog v-model="dialog" max-width="760" persistent>
    <v-card :title="editingItem?.kind === 'renewal' ? '保証更改の回答' : '新規案件の申請'">
      <v-card-text>
        <v-alert v-if="dialogMessage" type="error" class="mb-4">{{ dialogMessage }}</v-alert>
        <v-text-field v-model="form.contactName" label="今回の担当者名" required />
        <v-text-field v-model="form.contactEmail" label="連絡先メールアドレス" type="email" required />

        <template v-if="editingItem?.kind === 'renewal'">
          <v-radio-group v-model="form.renewalDecision" label="更改のご意向" inline>
            <v-radio label="更改する" value="renew" />
            <v-radio label="更改しない" value="decline" />
          </v-radio-group>
        </template>

        <template v-if="editingItem?.kind !== 'renewal'">
          <v-text-field v-model="form.homeownerName" label="施主名" required />
          <v-text-field v-model="form.propertyName" label="物件名" required />
          <v-text-field v-model="form.postalCode" label="郵便番号" required />
          <v-text-field v-model="form.prefecture" label="都道府県" required />
          <v-text-field v-model="form.municipality" label="市区町村" required />
          <v-text-field v-model="form.streetTownAndNumber" label="町名番地" required />
          <v-text-field v-model="form.buildingName" label="建物名（任意）" />
          <v-text-field v-model="form.applicationDate" label="申込日（YYYY-MM-DD）" required />
          <v-text-field v-model="form.handoverDate" label="引渡日（YYYY-MM-DD）" required />
        </template>

        <template v-if="editingItem?.kind !== 'renewal' || form.renewalDecision === 'renew'">
          <v-select v-model="form.requestedPeriodYears" :items="[5, 10]" label="希望保証期間（年）" required />
          <v-text-field v-model="form.warrantyStartDate" label="保証開始日（YYYY-MM-DD）" required />
        </template>
        <v-textarea v-model="form.notes" label="連絡事項（任意）" rows="3" />
      </v-card-text>
      <v-card-actions>
        <v-btn :disabled="saving" @click="dialog = false">キャンセル</v-btn>
        <v-spacer />
        <v-btn :loading="saving" variant="outlined" @click="save(false)">下書き保存</v-btn>
        <v-btn color="primary" :loading="saving" @click="save(true)">提出</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { collection, documentId, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import type { CompanyAccountProfile, CompanyCaseWorkItem, NewCaseWorkItemInput, WorkItemResponse } from '../types/company-portal.ts'

const { $firebase } = useNuxtApp()
const { profile, logout } = useSession()
const gateway = useCompanyPortal()
const items = ref<CompanyCaseWorkItem[]>([])
const loading = ref(true)
const loadError = ref('')
const { showSnackbar } = useAppSnackbar()
const dialog = ref(false)
const dialogMessage = ref('')
const saving = ref(false)
const editingItem = ref<CompanyCaseWorkItem | null>(null)
let unsubscribe: (() => void) | undefined

const companyProfile = computed(() => profile.value?.accountType === 'construction_company'
  ? profile.value as CompanyAccountProfile
  : null)
const sortedItems = computed(() => [...items.value].sort((left, right) =>
  (right.updatedAt?.toMillis?.() ?? 0) - (left.updatedAt?.toMillis?.() ?? 0)))

const emptyForm = () => ({
  contactName: '', contactEmail: companyProfile.value?.email ?? '', requestedPeriodYears: 5 as 5 | 10,
  notes: '', renewalDecision: 'renew' as 'renew' | 'decline', warrantyStartDate: '',
  applicationDate: '', handoverDate: '', homeownerName: '', propertyName: '',
  postalCode: '', prefecture: '', municipality: '', streetTownAndNumber: '', buildingName: '',
})
const form = reactive(emptyForm())

const statusLabel = (status: CompanyCaseWorkItem['status']) => ({
  awaiting_response: '回答待ち', draft: '下書き', submitted: '確認待ち',
  needs_correction: '差戻し', approved: '本登録済み',
}[status])
const statusColor = (status: CompanyCaseWorkItem['status']) => ({
  awaiting_response: 'warning', draft: 'info', submitted: 'primary',
  needs_correction: 'error', approved: 'success',
}[status])
const editable = (item: CompanyCaseWorkItem) => ['awaiting_response', 'draft', 'needs_correction'].includes(item.status)

const startSubscription = () => {
  if (!companyProfile.value) return
  unsubscribe?.()
  loading.value = true
  unsubscribe = onSnapshot(
    query(
      collection($firebase.firestore, 'constructionCompanyCaseWorkItems'),
      where('constructionCompanyId', '==', companyProfile.value.constructionCompanyId),
      orderBy('updatedAt', 'desc'),
      orderBy(documentId(), 'desc'),
      limit(20),
    ),
    snapshot => {
      items.value = snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as CompanyCaseWorkItem)
      loadError.value = ''
      loading.value = false
    },
    () => {
      loadError.value = '対応案件を読み込めませんでした。再ログインしてください。'
      loading.value = false
    },
  )
}

const openNewRequest = () => {
  editingItem.value = null
  Object.assign(form, emptyForm())
  dialogMessage.value = ''
  dialog.value = true
}

const openExisting = (item: CompanyCaseWorkItem) => {
  editingItem.value = item
  Object.assign(form, emptyForm(), {
    ...item.response,
    notes: item.response?.notes ?? '',
    warrantyStartDate: item.response?.warrantyStartDate ?? '',
    postalCode: item.response?.propertyAddress?.postalCode ?? '',
    prefecture: item.response?.propertyAddress?.prefecture ?? '',
    municipality: item.response?.propertyAddress?.municipality ?? '',
    streetTownAndNumber: item.response?.propertyAddress?.streetTownAndNumber ?? '',
    buildingName: item.response?.propertyAddress?.buildingName ?? '',
  })
  dialogMessage.value = ''
  dialog.value = true
}

const responseFromForm = (): WorkItemResponse => {
  const common = {
    contactName: form.contactName,
    contactEmail: form.contactEmail,
    requestedPeriodYears: form.requestedPeriodYears,
    notes: form.notes || null,
  }
  if (editingItem.value?.kind === 'renewal') return {
    ...common,
    renewalDecision: form.renewalDecision,
    warrantyStartDate: form.renewalDecision === 'renew' ? form.warrantyStartDate : null,
  }
  return {
    ...common,
    applicationDate: form.applicationDate,
    handoverDate: form.handoverDate,
    warrantyStartDate: form.warrantyStartDate,
    homeownerName: form.homeownerName,
    propertyName: form.propertyName,
    propertyAddress: {
      postalCode: form.postalCode, prefecture: form.prefecture, municipality: form.municipality,
      streetTownAndNumber: form.streetTownAndNumber, buildingName: form.buildingName || null,
    },
  }
}

const save = async (submit: boolean) => {
  saving.value = true
  dialogMessage.value = ''
  try {
    const response = responseFromForm()
    if (editingItem.value) {
      await gateway.updateWorkItem({ id: editingItem.value.id, expectedRevision: editingItem.value.revision, response, submit })
    } else {
      await gateway.createNewCaseWorkItem(response as NewCaseWorkItemInput, submit)
    }
    dialog.value = false
    showSnackbar(submit ? '回答を提出しました。' : '下書きを保存しました。', 'success')
  } catch (error) {
    dialogMessage.value = error instanceof Error ? error.message : '保存できませんでした。'
  } finally {
    saving.value = false
  }
}

watch(companyProfile, startSubscription, { immediate: true })
onBeforeUnmount(() => unsubscribe?.())
</script>

<style scoped>
.portal-summary {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.4rem 1rem;
}
.portal-summary dt { color: rgba(var(--v-theme-on-surface), 0.65); }
.portal-summary dd { margin: 0; }
</style>
