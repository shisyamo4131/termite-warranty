<template>
  <v-app>
    <AppSnackbar />
    <template v-if="isAuthenticationAction">
      <v-app-bar color="primary" elevation="1"><v-app-bar-title>白蟻保証 業務管理</v-app-bar-title></v-app-bar>
      <v-main>
        <v-container class="py-8">
          <NuxtPage />
        </v-container>
      </v-main>
    </template>
    <template v-else-if="loading">
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
    <MeetingPrototype v-else />
  </v-app>
</template>

<script setup lang="ts">
const route = useRoute()
const { profile, loading } = useSession()
const isAuthenticationAction = computed(() => route.path === '/auth/action' || route.path === '/auth/action/')
</script>
