<template>
  <v-navigation-drawer v-model="drawer" color="surface">
    <v-list nav>
      <v-list-item
        v-for="item in menuItems"
        :key="item.to"
        :title="item.title"
        :to="item.to"
        exact
      />
    </v-list>
  </v-navigation-drawer>
  <v-app-bar color="primary" elevation="1" class="app-header">
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-app-bar-title>白蟻保証 業務管理</v-app-bar-title>
    <template #append>
      <span class="app-header-profile d-none d-sm-inline mr-4 text-truncate">{{ profile?.displayName }}</span>
      <v-btn class="logout-button" variant="outlined" aria-label="ログアウト" @click="logout">ログアウト</v-btn>
    </template>
  </v-app-bar>
  <v-main>
    <v-container :class="['py-8', { 'app-list-viewport': route.meta.listViewport === true }]">
      <slot />
    </v-container>
  </v-main>
</template>

<script setup lang="ts">
const drawer = ref(true)
const route = useRoute()
const { profile, logout } = useSession()
const menuItems = computed(() => [
  { title: 'ダッシュボード', to: '/' },
  { title: '案件一覧', to: '/cases' },
  { title: '工務店', to: '/masters/construction-companies' },
  { title: '施主', to: '/masters/homeowners' },
  { title: '保証サービス', to: '/masters/warranty-services' },
  { title: '物件', to: '/masters/properties' },
  { title: '工務店ポータル管理', to: '/company-portal' },
])
</script>
