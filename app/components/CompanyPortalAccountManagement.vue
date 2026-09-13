<template>
  <section class="list-page">
    <h1 class="text-h4 mb-2">アカウント管理</h1>
    <p class="text-body-2 text-medium-emphasis mb-6">工務店ごとの共通アカウントを発行・無効化します。</p>
    <v-alert v-if="loadError" type="error" class="mb-4">{{ loadError }}</v-alert>
    <v-alert v-if="!canManageAccounts" type="warning" variant="tonal">
      アカウント管理はHouse Solution管理者のみ利用できます。
    </v-alert>

    <v-card v-else title="工務店アカウント">
      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          パスワードの設定・再設定は、工務店側が共通ログイン画面から行います。
        </v-alert>
        <div class="d-flex justify-end mb-4">
          <v-btn color="primary" @click="accountDialog = true">アカウントを発行</v-btn>
        </div>
        <v-table>
          <thead><tr><th>工務店</th><th>メールアドレス</th><th>状態</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="account in accounts" :key="account.id">
              <td>{{ account.companyName }}</td>
              <td>{{ account.email }}</td>
              <td><v-chip :color="account.enabled ? 'success' : 'error'" size="small">{{ account.enabled ? '有効' : '無効' }}</v-chip></td>
              <td>
                <v-btn
                  size="small"
                  variant="text"
                  :color="account.enabled ? 'error' : 'success'"
                  :loading="busyId === account.id"
                  @click="toggleAccount(account)"
                >{{ account.enabled ? '無効化' : '再有効化' }}</v-btn>
              </td>
            </tr>
            <tr v-if="accounts.length === 0"><td colspan="4" class="text-center py-6">アカウントはありません。</td></tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </section>

  <v-dialog v-model="accountDialog" max-width="560">
    <v-card title="工務店アカウントを発行">
      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          発行後、工務店側がログイン画面の「パスワードを設定・再設定」からパスワードを設定します。
        </v-alert>
        <v-select v-model="accountForm.constructionCompanyId" :items="availableCompanies" item-title="name" item-value="id" label="工務店" />
        <v-text-field v-model="accountForm.email" label="共通メールアドレス" type="email" />
      </v-card-text>
      <v-card-actions>
        <v-spacer /><v-btn @click="accountDialog = false">キャンセル</v-btn>
        <v-btn color="primary" :loading="saving" @click="createAccount">発行</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { collection, documentId, limit, onSnapshot, orderBy, query } from 'firebase/firestore'

interface AccountRow { id: string; constructionCompanyId: string; companyName: string; email: string; enabled: boolean }
interface CompanyRow { id: string; name: string; active: boolean }

const { $firebase } = useNuxtApp()
const { profile } = useSession()
const gateway = useCompanyPortal()
const accounts = ref<AccountRow[]>([])
const companies = ref<CompanyRow[]>([])
const loadError = ref('')
const { showSnackbar } = useAppSnackbar()
const saving = ref(false)
const busyId = ref('')
const accountDialog = ref(false)
const accountForm = reactive({ constructionCompanyId: '', email: '' })
const unsubscribes: Array<() => void> = []

const canManageAccounts = computed(() => profile.value?.accountType === 'staff'
  && ['developer_superuser', 'house_solution_administrator'].includes(profile.value.role))
const availableCompanies = computed(() => companies.value.filter(company => company.active
  && !accounts.value.some(account => account.constructionCompanyId === company.id)))

const subscribe = <T>(path: string, assign: (rows: T[]) => void) => {
  unsubscribes.push(onSnapshot(
    query(collection($firebase.firestore, path), orderBy('updatedAt', 'desc'), orderBy(documentId(), 'desc'), limit(20)),
    snapshot => assign(snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as T)),
    () => { loadError.value = '工務店アカウントを読み込めませんでした。' },
  ))
}

const createAccount = async () => {
  saving.value = true
  try {
    await gateway.createAccount(accountForm)
    accountDialog.value = false
    Object.assign(accountForm, { constructionCompanyId: '', email: '' })
    showSnackbar('工務店アカウントを発行しました。工務店側でパスワードを設定してください。', 'success')
  } catch (error) {
    showSnackbar(error instanceof Error ? error.message : 'アカウントを発行できませんでした。', 'error')
  } finally { saving.value = false }
}

const toggleAccount = async (account: AccountRow) => {
  busyId.value = account.id
  try {
    await gateway.setAccountEnabled({ uid: account.id, enabled: !account.enabled })
    showSnackbar(account.enabled ? 'アカウントを無効化しました。' : 'アカウントを再有効化しました。', 'success')
  } catch (error) {
    showSnackbar(error instanceof Error ? error.message : 'アカウント状態を変更できませんでした。', 'error')
  } finally { busyId.value = '' }
}

onMounted(() => {
  if (!canManageAccounts.value) return
  subscribe<AccountRow>('constructionCompanyAccounts', rows => { accounts.value = rows })
  subscribe<CompanyRow>('constructionCompanies', rows => { companies.value = rows })
})
onBeforeUnmount(() => unsubscribes.forEach(unsubscribe => unsubscribe()))
</script>
