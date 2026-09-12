<template>
  <h1 class="text-h4 mb-6">ダッシュボード</h1>
  <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>
  <v-row>
    <v-col cols="12" sm="4"><v-card title="全案件"><v-card-text class="text-h3">{{ rows.length }}</v-card-text></v-card></v-col>
    <v-col cols="12" sm="4"><v-card title="期限30日以内"><v-card-text class="text-h3">{{ alerts.length }}</v-card-text></v-card></v-col>
    <v-col cols="12" sm="4"><v-card title="未通知"><v-card-text class="text-h3">{{ notNotified.length }}</v-card-text></v-card></v-col>
  </v-row>
  <v-card class="mt-6" title="対応が必要な案件">
    <v-table><thead><tr><th>案件番号</th><th>施主</th><th>状態</th></tr></thead><tbody>
      <tr v-for="row in attentionRows" :key="row.id"><td><NuxtLink :to="`/cases/${row.id}`">{{ row.caseNumber }}</NuxtLink></td><td>{{ row.homeownerName }}</td><td><v-chip v-if="row.isAlertEligible" color="warning" size="small" class="mr-1">期限30日以内</v-chip><v-chip v-if="row.hasNotNotified" color="error" size="small">未通知</v-chip></td></tr>
      <tr v-if="attentionRows.length === 0"><td colspan="3" class="text-center py-8">対応が必要な案件はありません。</td></tr>
    </tbody></v-table>
    <v-card-actions><v-spacer /><v-btn to="/cases" color="primary">案件一覧へ</v-btn></v-card-actions>
  </v-card>
</template>
<script setup lang="ts">
import type { CaseRow } from '../types/prototype-data'
const rows = ref<CaseRow[]>([]); const message = ref('')
const { state, start } = useCaseList()
const alerts = computed(() => rows.value.filter((row) => row.isAlertEligible))
const notNotified = computed(() => rows.value.filter((row) => row.hasNotNotified))
const attentionRows = computed(() => rows.value.filter((row) => row.isAlertEligible || row.hasNotNotified))
watch(state, (next) => {
  rows.value = next.rows
  if (next.status === 'error') message.value = 'データ参照権限を確認できません。再ログインしてください。'
})
onMounted(start)
</script>
