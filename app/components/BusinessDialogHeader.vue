<template>
  <v-toolbar color="primary" density="comfortable" class="business-dialog-toolbar">
    <template #prepend><BusinessNavigationIcon :item="icon" /></template>
    <v-toolbar-title>{{ title }}</v-toolbar-title>
    <v-btn icon variant="text" :disabled="busy" aria-label="閉じる" @click="$emit('close')"><span aria-hidden="true" class="business-dialog-close">×</span></v-btn>
  </v-toolbar>
  <div v-if="subtitle || status" class="business-dialog-identity">
    <div class="business-dialog-subtitle">{{ subtitle }}</div>
    <v-chip v-if="status" size="small" variant="tonal">{{ status }}</v-chip>
  </div>
</template>
<script setup lang="ts">
withDefaults(defineProps<{ title: string; subtitle?: string; status?: string; icon?: string; busy?: boolean }>(), { icon: 'properties', busy: false })
defineEmits<{ close: [] }>()
</script>
