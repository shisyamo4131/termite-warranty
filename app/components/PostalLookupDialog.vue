<template>
  <v-dialog :model-value="active" persistent no-click-animation max-width="320" aria-label="住所を検索中">
    <v-card tabindex="0" aria-busy="true">
      <v-card-text class="d-flex align-center ga-4" role="status" aria-live="polite">
        <v-progress-circular indeterminate color="primary" aria-hidden="true" />
        <span>住所を検索中…</span>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>
