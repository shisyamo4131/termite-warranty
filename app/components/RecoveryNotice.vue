<template>
  <v-app-bar color="primary"><v-app-bar-title>白蟻保証 業務管理</v-app-bar-title></v-app-bar>
  <v-main><v-container class="py-8" style="max-width:960px">
    <h1 class="text-h5 mb-4">メンテナンス中</h1>
    <v-alert type="info" class="mb-4">{{ recoveryProblem || '現在、復旧作業を行っています。業務を再開できるようになるまでお待ちください。' }}</v-alert>
    <p class="text-body-2 mb-4">復旧に関する連絡・確認は、システム外の連絡手段で行います。</p>
    <div class="d-flex ga-3"><v-btn variant="outlined" @click="reload">再読込</v-btn><v-btn v-if="currentUser" variant="text" @click="logout">ログアウト</v-btn></div>
  </v-container></v-main>
</template>
<script setup lang="ts">
import { recoveryProblem } from '../utils/recoveryClient'
const { currentUser, logout } = useSession()
const reload = () => window.location.reload()
</script>
