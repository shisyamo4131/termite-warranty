<template>
  <v-select v-model="homeownerId" :items="homeowners" item-title="name" item-value="id" label="施主" required />
  <v-select v-model="constructionCompanyId" :items="companies" item-title="name" item-value="id" label="工務店" required />
</template>

<script setup lang="ts">
import type { ManagedMaster } from '../composables/useMasterManagement'

defineProps<{ homeowners: ManagedMaster[]; companies: ManagedMaster[] }>()
const homeownerId = defineModel<string>('homeownerId', { required: true })
const constructionCompanyId = defineModel<string>('constructionCompanyId', { required: true })
</script>
