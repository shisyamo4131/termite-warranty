<template>
  <span aria-hidden="true" class="business-navigation-icon" :style="{ maskImage: `url(/icons/lucide/${icons[item]}.svg)` }" />
</template>

<script setup lang="ts">
defineProps<{ item: string }>()
const icons: Record<string, string> = {
  dashboard: 'network',
  properties: 'house',
  alerts: 'calendar-clock',
  insuranceAlerts: 'shield-alert',
  report: 'clipboard-list',
  billing: 'receipt-text',
  certificates: 'file-badge',
  settings: 'network',
  companySettings: 'building-2',
  organizationGroup: 'folder',
  organizationCompany: 'building-2',
  staff: 'users-round',
  alertSettings: 'bell-ring',
  recovery: 'database-backup',
}
</script>

<style scoped>
.business-navigation-icon {
  display: block;
  width: 20px;
  height: 20px;
  background-color: currentColor;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
}
</style>
