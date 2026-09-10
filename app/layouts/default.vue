<template>
  <v-navigation-drawer v-model="drawer">
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
  <v-app-bar color="primary" elevation="1">
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-app-bar-title>白蟻保証 業務管理</v-app-bar-title>
    <template #append>
      <span class="mr-4">{{ profile?.displayName }}</span>
      <v-btn variant="outlined" @click="logout">ログアウト</v-btn>
    </template>
  </v-app-bar>
  <v-main>
    <v-container class="py-8"><slot /></v-container>
  </v-main>
</template>

<script setup lang="ts">
const drawer = ref(true)
const { profile, logout } = useSession()
const menuItems = [
  { title: 'ダッシュボード', to: '/' },
  { title: '工務店', to: '/masters/construction-companies' },
  { title: '施主', to: '/masters/homeowners' },
  { title: '保証サービス', to: '/masters/warranty-services' },
  { title: '物件', to: '/masters/properties' },
]
</script>
