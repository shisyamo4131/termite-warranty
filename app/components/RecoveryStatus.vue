<template>
  <h1 class="text-h5 mb-4">バックアップ・復旧状況</h1>
  <v-alert v-if="problem" type="error" class="mb-4">{{ problem }}</v-alert>
  <v-alert v-if="status && !status.configured" type="warning" class="mb-4">自動バックアップと復旧制御は、この環境でまだ有効化されていません。</v-alert>
  <v-alert type="info" class="mb-4">復元とメンテナンスの操作は開発側で行います。復旧に関する連絡・了承はシステム外で行います。</v-alert>
  <v-alert v-if="status?.monitoring==='paused'" type="info" class="mb-4">スキーマ改修中のため、自動バックアップとPITRは停止しています。過去の成功記録は取得履歴であり、現在復元できるバックアップを示しません。Prod提供前に取得を開始します。</v-alert>
  <v-btn variant="outlined" :loading="busy" class="mb-4" @click="load">最新の状態を取得</v-btn>
  <v-card v-if="status"><v-card-text>
    <dl class="recovery-status"><dt>システム状態</dt><dd>{{ phaseLabel }}</dd><dt>バックアップ監視</dt><dd>{{ health(status.monitoring) }}</dd><dt>業務データの最終成功時点</dt><dd>{{ date(status.lastFirestoreSuccess) }}</dd><dt>アカウントのバックアップ</dt><dd>{{ health(status.authBackup) }}</dd><dt>アカウントの最終成功時点</dt><dd>{{ date(status.lastAuthSuccess) }}</dd></dl>
    <v-table class="mt-4"><thead><tr><th>種類</th><th>結果</th><th>バックアップ時点</th><th>確認日時</th></tr></thead><tbody><tr v-for="row in status.backups" :key="row.id"><td>{{ row.type==='auth' ? 'アカウント' : '業務データ' }}</td><td>{{ health(row.status) }}</td><td>{{ date(row.backupTime) }}</td><td>{{ date(row.checkedAt) }}</td></tr><tr v-if="!status.backups.length"><td colspan="4">取得結果はまだ記録されていません。</td></tr></tbody></v-table>
  </v-card-text></v-card>
</template>
<script setup lang="ts">
import { httpsCallable } from 'firebase/functions'
type Status = { configured:boolean; runtime:{phase:string}|null; monitoring:string; authBackup:string; lastFirestoreSuccess:string|null; lastAuthSuccess:string|null; backups:{id:string;type:string;status:string;checkedAt:string|null;backupTime:string|null}[] }
const { $firebase } = useNuxtApp()
const status=ref<Status|null>(null), problem=ref(''), busy=ref(false)
const phaseLabel=computed(()=>({normal:'通常稼働',recovering:'復旧処理中',verification:'HS確認待ち'}[status.value?.runtime?.phase || ''] || '未設定'))
const health=(value:string)=>({success:'成功',failed:'失敗',missing:'未取得',unconfigured:'未設定',unavailable:'確認できません',paused:'停止中'}[value] || '確認できません')
const date=(value:string|null)=>value ? new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}) : '—'
async function load(){busy.value=true;problem.value='';try{status.value=(await httpsCallable<Record<string,never>,Status>($firebase.functions,'recoveryStatus')({})).data}catch{problem.value='バックアップの状態を取得できませんでした。'}finally{busy.value=false}}
onMounted(load)
</script>
<style scoped>
.recovery-status{display:grid;grid-template-columns:auto 1fr;gap:12px 24px}.recovery-status dd{margin:0}
</style>
