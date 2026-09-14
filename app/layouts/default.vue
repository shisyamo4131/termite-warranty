<template>
  <v-navigation-drawer v-model="drawer" color="surface">
    <v-list nav slim>
      <v-list-item
        v-for="item in primaryMenuItems"
        :key="item.to"
        :title="item.title"
        :to="item.to"
        :prepend-icon="item.icon"
        exact
      />
      <v-list-group value="company-portal">
        <template #activator="{ props }">
          <v-list-item v-bind="props" title="工務店管理ポータル" prepend-icon="mdi-briefcase-account-outline" />
        </template>
        <v-list-item
          v-for="item in companyPortalMenuItems"
          :key="item.to"
          :title="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          exact
        />
      </v-list-group>
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
const drawer = ref(false)
const route = useRoute()
const { profile, logout } = useSession()
const primaryMenuItems = computed(() => [
  { title: 'ダッシュボード', to: '/', icon: 'mdi-view-dashboard-outline' },
  { title: '案件一覧', to: '/cases', icon: 'mdi-clipboard-text-outline' },
  { title: '工務店', to: '/masters/construction-companies', icon: 'mdi-office-building-outline' },
  { title: '施主', to: '/masters/homeowners', icon: 'mdi-account-outline' },
  { title: '保証サービス', to: '/masters/warranty-services', icon: 'mdi-shield-check-outline' },
  { title: '物件', to: '/masters/properties', icon: 'mdi-home-city-outline' },
  ...(['developer_superuser', 'house_solution_administrator'].includes(profile.value?.role ?? '')
    ? [{ title: '担当者アカウント', to: '/staff-accounts', icon: 'mdi-account-key-outline' }]
    : []),
])
const companyPortalMenuItems = [
  { title: '通知管理', to: '/company-portal/notifications', icon: 'mdi-bell-outline' },
  { title: 'アカウント管理', to: '/company-portal/accounts', icon: 'mdi-account-cog-outline' },
]
</script>
