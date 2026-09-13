<template>
  <v-snackbar
    :key="state.id"
    v-model="open"
    :color="state.type"
    :timeout="state.timeout"
    location="bottom center"
    multi-line
  >
    {{ state.text }}
    <template #actions>
      <v-btn variant="text" aria-label="メッセージを閉じる" @click="closeSnackbar">閉じる</v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
const { state, closeSnackbar } = useAppSnackbar()
const open = computed({
  get: () => state.value.open,
  set: (value: boolean) => {
    if (!value) closeSnackbar()
  },
})
</script>
