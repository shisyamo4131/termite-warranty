<template>
  <v-app>
    <template v-if="loading">
      <v-main><v-progress-linear indeterminate color="primary" /></v-main>
    </template>
    <template v-else-if="!profile">
      <v-app-bar color="primary" elevation="1"><v-app-bar-title>白蟻保証 業務管理</v-app-bar-title></v-app-bar>
      <v-main>
      <v-container class="py-8">
        <LoginPanel />
      </v-container>
      </v-main>
    </template>
    <ConstructionCompanyPortal v-else-if="profile.accountType === 'construction_company'" />
    <NuxtLayout v-else>
      <NuxtPage />
    </NuxtLayout>
  </v-app>
</template>

<script setup lang="ts">
const { profile, loading } = useSession()
</script>
