<template>
  <section class="list-page">
    <h1 class="text-h4 mb-2">通知管理</h1>
    <p class="text-body-2 text-medium-emphasis mb-6">保証更改の通知と、工務店から提出された仮データを管理します。</p>
    <v-alert v-if="loadError" type="error" class="mb-4">{{ loadError }}</v-alert>
    <v-alert type="info" density="compact" variant="tonal" class="mb-6 flex-grow-0">
      メール通知は送信待ちキューへ記録する模擬実装です。メール配送サービスには接続していません。
    </v-alert>

    <v-card title="仮申請・更改回答">
      <v-card-text>
        <div class="d-flex justify-end mb-4">
          <v-btn color="primary" @click="renewalDialog = true">更改依頼を作成</v-btn>
        </div>
        <v-table>
          <thead><tr><th>種別</th><th>案件番号</th><th>工務店</th><th>物件／施主</th><th>状態</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in workItems" :key="item.id">
              <td>{{ item.kind === 'renewal' ? '保証更改' : '新規案件' }}</td>
              <td>{{ item.caseNumber ?? '本登録前' }}</td>
              <td>{{ companyName(item.constructionCompanyId) }}</td>
              <td>{{ item.propertyName }} / {{ item.homeownerName }}</td>
              <td><v-chip :color="statusColor(item.status)" size="small">{{ statusLabel(item.status) }}</v-chip></td>
              <td><v-btn size="small" variant="text" @click="openReview(item)">確認</v-btn></td>
            </tr>
            <tr v-if="workItems.length === 0"><td colspan="6" class="text-center py-6">仮データはありません。</td></tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </section>

  <v-dialog v-model="renewalDialog" max-width="640">
    <v-card title="保証更改依頼を作成">
      <v-card-text>
        <v-select v-model="renewalCaseId" :items="renewalCandidates" item-title="label" item-value="id" label="案件" />
      </v-card-text>
      <v-card-actions>
        <v-spacer /><v-btn @click="renewalDialog = false">キャンセル</v-btn>
        <v-btn color="primary" :loading="saving" @click="createRenewal">作成して通知待ちにする</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="reviewDialog" max-width="720">
    <v-card title="仮データを確認">
      <v-card-text v-if="reviewItem">
        <v-alert v-if="reviewItem.status !== 'submitted'" type="info" variant="tonal" class="mb-4">
          現在は工務店からの提出待ちです。
        </v-alert>
        <v-list density="compact">
          <v-list-item title="種別" :subtitle="reviewItem.kind === 'renewal' ? '保証更改' : '新規案件'" />
          <v-list-item title="工務店" :subtitle="companyName(reviewItem.constructionCompanyId)" />
          <v-list-item title="物件・施主" :subtitle="`${reviewItem.propertyName} / ${reviewItem.homeownerName}`" />
          <v-list-item v-if="reviewItem.response" title="今回の担当者" :subtitle="`${reviewItem.response.contactName} / ${reviewItem.response.contactEmail || 'アカウントメール'}`" />
          <v-list-item v-if="reviewItem.withdrawalReason" title="取下げ理由" :subtitle="reviewItem.withdrawalReason" />
          <v-list-item v-if="reviewItem.response" title="希望保証期間" :subtitle="`${reviewItem.response.requestedPeriodYears}年`" />
          <v-list-item v-if="reviewItem.response?.notes" title="連絡事項" :subtitle="reviewItem.response.notes" />
        </v-list>
        <template v-if="reviewItem.status === 'submitted'">
          <v-select
            v-if="reviewItem.response?.renewalDecision !== 'decline'"
            v-model="reviewForm.warrantyServiceId"
            :items="matchingServices"
            item-title="name"
            item-value="id"
            label="本登録する保証サービス"
          />
          <v-select
            v-if="reviewItem.kind === 'new_case'"
            v-model="reviewForm.branchId"
            :items="branches"
            item-title="name"
            item-value="id"
            label="担当支店"
          />
          <v-textarea v-model="reviewForm.comment" label="確認コメント／要修正理由" rows="3" />
        </template>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="reviewDialog = false">閉じる</v-btn><v-spacer />
        <template v-if="reviewItem?.status === 'submitted'">
          <v-btn color="error" variant="outlined" :loading="saving" @click="review('return')">要修正</v-btn>
          <v-btn color="primary" :loading="saving" @click="review('approve')">本登録</v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { collection, documentId, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import type { CompanyCaseWorkItem } from '../types/company-portal.ts'

interface CompanyRow { id: string; name: string; active: boolean }
interface CaseOption { id: string; caseNumber: string; constructionCompanyId: string; status: string }
interface NamedOption { id: string; name: string; active: boolean; defaultPeriodYears?: number }

const { $firebase } = useNuxtApp()
const gateway = useCompanyPortal()
const companies = ref<CompanyRow[]>([])
const cases = ref<CaseOption[]>([])
const workItems = ref<CompanyCaseWorkItem[]>([])
const branches = ref<NamedOption[]>([])
const services = ref<NamedOption[]>([])
const loadError = ref('')
const { showSnackbar } = useAppSnackbar()
const saving = ref(false)
const renewalDialog = ref(false)
const reviewDialog = ref(false)
const renewalCaseId = ref('')
const reviewItem = ref<CompanyCaseWorkItem | null>(null)
const reviewForm = reactive({ branchId: '', warrantyServiceId: '', comment: '' })
const unsubscribes: Array<() => void> = []

const renewalCandidates = computed(() => cases.value
  .filter(item => item.status === 'active'
    && !workItems.value.some(workItem => workItem.id === item.id && workItem.status !== 'approved'))
  .map(item => ({ id: item.id, label: `${item.caseNumber} / ${companyName(item.constructionCompanyId)}` })))
const matchingServices = computed(() => services.value.filter(service => service.active
  && service.defaultPeriodYears === reviewItem.value?.response?.requestedPeriodYears))

const companyName = (id: string) => companies.value.find(item => item.id === id)?.name ?? id
const statusLabel = (status: CompanyCaseWorkItem['status']) => ({
  awaiting_response: '工務店回答待ち', draft: '工務店下書き', submitted: '確認待ち',
  needs_correction: '要修正', approved: '本登録済み',
  withdrawn: '取下げ',
}[status])
const statusColor = (status: CompanyCaseWorkItem['status']) => ({
  awaiting_response: 'warning', draft: 'info', submitted: 'primary',
  needs_correction: 'error', approved: 'success',
  withdrawn: 'default',
}[status])

const subscribe = <T>(path: string, assign: (rows: T[]) => void) => {
  unsubscribes.push(onSnapshot(
    query(collection($firebase.firestore, path), orderBy('updatedAt', 'desc'), orderBy(documentId(), 'desc'), limit(20)),
    snapshot => assign(snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as T)),
    () => { loadError.value = '通知管理データを読み込めませんでした。' },
  ))
}

const createRenewal = async () => {
  saving.value = true
  try {
    await gateway.createRenewalWorkItem({ caseId: renewalCaseId.value })
    renewalDialog.value = false
    renewalCaseId.value = ''
    showSnackbar('更改依頼を作成し、メール通知を送信待ちにしました。', 'success')
  } catch (error) {
    showSnackbar(error instanceof Error ? error.message : '更改依頼を作成できませんでした。', 'error')
  } finally { saving.value = false }
}

const openReview = (item: CompanyCaseWorkItem) => {
  reviewItem.value = item
  Object.assign(reviewForm, { branchId: '', warrantyServiceId: '', comment: item.reviewComment ?? '' })
  reviewDialog.value = true
}

const review = async (action: 'approve' | 'return') => {
  if (!reviewItem.value) return
  saving.value = true
  try {
    await gateway.reviewWorkItem({
      id: reviewItem.value.id, expectedRevision: reviewItem.value.revision, action,
      reviewComment: reviewForm.comment,
      branchId: reviewForm.branchId || undefined,
      warrantyServiceId: reviewForm.warrantyServiceId || undefined,
    })
    reviewDialog.value = false
    showSnackbar(action === 'approve' ? '本データへ反映しました。' : '工務店へ要修正として返しました。', 'success')
  } catch (error) {
    showSnackbar(error instanceof Error ? error.message : '確認結果を保存できませんでした。', 'error')
  } finally { saving.value = false }
}

onMounted(() => {
  subscribe<CompanyRow>('constructionCompanies', rows => { companies.value = rows })
  subscribe<CaseOption>('cases', rows => { cases.value = rows })
  subscribe<CompanyCaseWorkItem>('constructionCompanyCaseWorkItems', rows => { workItems.value = rows })
  unsubscribes.push(onSnapshot(
    query(collection($firebase.firestore, 'branches'), limit(20)),
    snapshot => {
      branches.value = snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as NamedOption)
    },
    () => { loadError.value = '通知管理データを読み込めませんでした。' },
  ))
  subscribe<NamedOption>('warrantyServices', rows => { services.value = rows })
})
onBeforeUnmount(() => unsubscribes.forEach(unsubscribe => unsubscribe()))
</script>
