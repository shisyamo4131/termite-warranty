<template>
  <v-row justify="center">
    <v-col cols="12" sm="8" md="5">
      <v-card title="スタッフログイン" subtitle="Firebase Emulator Suite 専用プロトタイプ">
        <v-card-text>
          <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>
          <v-form @submit.prevent="submit">
            <v-text-field v-model="email" label="メールアドレス" type="email" autocomplete="username" required />
            <v-text-field v-model="password" label="パスワード" type="password" autocomplete="current-password" required />
            <v-btn type="submit" color="primary" block :loading="submitting">ログイン</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const email = ref('demo.admin@example.invalid')
const password = ref('Demo-only-password-123')
const submitting = ref(false)
const localError = ref('')
const { login, errorMessage } = useSession()
const message = computed(() => localError.value || errorMessage.value)

const submit = async () => {
  submitting.value = true
  localError.value = ''
  try {
    await login(email.value, password.value)
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'ログインに失敗しました。'
  } finally {
    submitting.value = false
  }
}
</script>
