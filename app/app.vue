<template>
  <v-app>
    <v-app-bar color="primary" elevation="1">
      <v-app-bar-title>白蟻保証 業務管理</v-app-bar-title>
      <template v-if="profile" #append>
        <span class="mr-4">{{ profile.displayName }}</span>
        <v-btn variant="outlined" @click="logout">ログアウト</v-btn>
      </template>
    </v-app-bar>
    <v-main>
      <v-container class="py-8">
        <v-progress-linear v-if="loading" indeterminate color="primary" />
        <LoginPanel v-else-if="!profile" />
        <PrototypeDashboard v-else />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
const { profile, loading, logout } = useSession()
</script>
