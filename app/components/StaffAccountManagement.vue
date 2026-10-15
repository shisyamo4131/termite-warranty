<template>
  <section>
    <div class="d-flex align-center justify-space-between ga-4 mb-6">
      <div>
        <h1 class="text-h4 mb-2 business-page-title"><BusinessNavigationIcon item="staff" /><span>担当者アカウント管理</span></h1>
        <p class="text-body-2 text-medium-emphasis mb-0">ハウスソリューション側の担当者アカウントを発行・編集・無効化します。</p>
      </div>
      <v-btn variant="flat" v-if="canManage" color="primary" @click="openCreate">新規発行</v-btn>
    </div>

    <v-alert v-if="!canManage" type="warning">
      担当者アカウント管理は管理者のみ利用できます。
    </v-alert>
    <v-card v-else>
      <v-card-text>
        <v-alert type="info" class="mb-4">
          {{ targetDescription }}。パスワードは本人が設定・再設定します。
        </v-alert>
        <v-alert v-if="loadError" type="error" class="mb-4">{{ loadError }}</v-alert>
        <v-table>
          <thead><tr><th>表示名</th><th>メールアドレス</th><th>権限</th><th>状態</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="account in visibleAccounts" :key="account.uid">
              <td>{{ account.displayName }}</td>
              <td>{{ account.email }}</td>
              <td>{{ roleLabel(account.role) }}</td>
              <td><v-chip :color="account.enabled ? 'success' : 'error'" size="small">{{ account.creationPending ? '発行確認中' : account.enabled ? '有効' : '無効' }}</v-chip></td>
              <td>
                <v-btn v-if="account.enabled && !account.creationPending" size="small" variant="outlined" @click="openEdit(account)">編集</v-btn>
                <v-btn
                  size="small"
                  variant="outlined"
                  :color="account.enabled ? 'error' : 'success'"
                  :loading="busyId === account.uid"
                  :disabled="account.creationPending"
                  @click="toggle(account)"
                >{{ account.enabled ? '無効化' : '再有効化' }}</v-btn>
              </td>
            </tr>
            <tr v-if="!loading && accounts.length === 0"><td colspan="5" class="text-center py-8">管理対象のアカウントはありません。</td></tr>
          </tbody>
        </v-table>
        <div class="list-pagination-bar">
          <span class="text-body-2 text-medium-emphasis">{{ accounts.length }}件</span>
          <v-pagination v-model="page" :length="pageCount" density="comfortable" />
        </div>
        <v-progress-linear v-if="loading" indeterminate color="primary" />
      </v-card-text>
    </v-card>
  </section>

  <v-dialog v-model="dialogOpen" max-width="560" persistent scrollable>
    <v-card :border="false" class="business-dialog"><BusinessDialogHeader :title="editingUid ? '担当者アカウントを編集' : '担当者アカウントを発行'" :subtitle="form.displayName || '新規発行'" icon="staff" :busy="saving" @close="dialogOpen=false" />
      <v-card-text><v-form ref="editForm" @submit.prevent="save"><v-alert v-if="saveError" type="error" class="mb-4">{{ saveError }}</v-alert>
        <v-alert v-if="!editingUid" type="info" class="mb-4">
          発行後、入力したメールアドレスへパスワード設定メールを送信します。
        </v-alert>
        <h2 class="business-section-title">担当者情報</h2><v-text-field v-model="form.displayName" :disabled="!editingUid && !!creationDraft" :rules="requiredRules" label="表示名" required />
        <v-text-field v-model="form.email" :disabled="!editingUid && !!creationDraft" :rules="[requiredRule,emailRule]" label="メールアドレス" type="email" required />
        <h2 class="business-section-title">権限</h2><div class="text-caption">付与する権限: {{ roleLabel(targetRole) }}</div>
      </v-form></v-card-text>
      <v-card-actions class="flex-wrap">
        <v-spacer />
        <v-btn variant="outlined" :disabled="saving" @click="dialogOpen = false">キャンセル</v-btn>
        <v-btn variant="flat" color="primary" :loading="saving" @click="save">{{ editingUid ? '更新' : '発行' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import {requiredRules,requiredRule,emailRule} from '../../src/domain/input-rules.mjs'
const editForm=ref<{validate:()=>Promise<{valid:boolean}>}|null>(null)
const saveError=ref('')
import type { StaffAccountRow, StaffRole } from '../gateways/staffAccountGateway.ts'

const PAGE_SIZE = 20
const { profile } = useSession()
const gateway = useStaffAccountManagement()
const { showSnackbar, showValidationError } = useAppSnackbar()
const accounts = ref<StaffAccountRow[]>([])
const targetRole = ref<StaffRole>('general_staff')
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const busyId = ref('')
const dialogOpen = ref(false)
const editingUid = ref('')
const creationRequestId = ref('')
const creationDraft = ref<{ email: string; displayName: string } | null>(null)
const page = ref(1)
const form = reactive({ displayName: '', email: '' })

const canManage = computed(() => profile.value?.accountType === 'staff'
  && ['developer_superuser', 'house_solution_administrator'].includes(profile.value.role))
const targetDescription = computed(() => profile.value?.role === 'developer_superuser'
  ? '開発者スーパーユーザーはハウスソリューション管理者を管理できます'
  : 'ハウスソリューション管理者は一般担当者を管理できます')
const pageCount = computed(() => Math.max(1, Math.ceil(accounts.value.length / PAGE_SIZE)))
const visibleAccounts = computed(() => accounts.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const roleLabel = (role: StaffRole) => role === 'house_solution_administrator' ? '管理者' : '一般担当者'

const load = async () => {
  if (!canManage.value) return
  loading.value = true
  loadError.value = ''
  try {
    const result = await gateway.list()
    accounts.value = result.accounts
    targetRole.value = result.targetRole
    if (page.value > pageCount.value) page.value = pageCount.value
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '担当者アカウントを読み込めませんでした。'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  saveError.value='';
  editingUid.value = ''
  if (!creationRequestId.value) creationRequestId.value = crypto.randomUUID()
  Object.assign(form, creationDraft.value ?? { displayName: '', email: '' })
  dialogOpen.value = true
}
const openEdit = (account: StaffAccountRow) => {
  if (!account.enabled) return
  saveError.value='';
  editingUid.value = account.uid
  Object.assign(form, { displayName: account.displayName, email: account.email })
  dialogOpen.value = true
}
const save = async () => {
  if(saving.value)return
  
  if(!(await editForm.value?.validate())?.valid){showValidationError('入力内容に誤りがあります。赤字の項目を確認してください。');return}
  saveError.value=''
  saving.value = true
  try {
    if (editingUid.value) {
      await gateway.update({ uid: editingUid.value, ...form })
      showSnackbar('担当者アカウントを更新しました。', 'success')
    } else {
      creationDraft.value ??= { ...form }
      const created = await gateway.create({ ...creationDraft.value, requestId: creationRequestId.value })
      creationRequestId.value = ''
      creationDraft.value = null
      try {
        if (!created.replayed) await gateway.sendPasswordSetupEmail(created.email)
        showSnackbar(created.replayed ? '発行済みアカウントを確認しました。設定メールが届いていない場合はログイン画面から再送してください。' : '担当者アカウントを発行し、パスワード設定メールを送信しました。', 'success')
      } catch {
        showSnackbar('アカウントは発行しましたが、パスワード設定メールを送信できませんでした。ログイン画面から再送してください。', 'warning')
      }
    }
    dialogOpen.value = false
    await load()
  } catch (error) {
    if (!editingUid.value && error && typeof error === 'object' && 'code' in error && ['functions/already-exists', 'functions/invalid-argument'].includes(String(error.code))) {
      creationRequestId.value = crypto.randomUUID()
      creationDraft.value = null
    }
    saveError.value=error instanceof Error ? error.message : '担当者アカウントを保存できませんでした。'
  } finally {
    saving.value = false
  }
}
const toggle = async (account: StaffAccountRow) => {
  busyId.value = account.uid
  try {
    await gateway.setEnabled({ uid: account.uid, enabled: !account.enabled })
    showSnackbar(account.enabled ? '担当者アカウントを無効化しました。' : '担当者アカウントを再有効化しました。', 'success')
    await load()
  } catch (error) {
    loadError.value=error instanceof Error ? error.message : 'アカウント状態を変更できませんでした。'
  } finally {
    busyId.value = ''
  }
}

onMounted(load)
</script>
