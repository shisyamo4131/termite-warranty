<template>
  <v-row justify="center">
    <v-col cols="12" sm="8" md="5">
      <v-card title="ログイン" subtitle="House Solutionスタッフ・工務店共通">
        <v-card-text>
            <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>
            <v-alert v-if="successMessage" type="success" class="mb-4">{{ successMessage }}</v-alert>
          <v-form @submit.prevent="submit">
            <v-text-field v-model="email" label="メールアドレス" type="email" autocomplete="username" required />
            <v-text-field v-model="password" label="パスワード" type="password" autocomplete="current-password" required />
            <v-btn type="submit" color="primary" block :loading="submitting">ログイン</v-btn>
            <v-btn class="mt-2" variant="text" block :disabled="submitting" @click="requestPasswordReset">
              パスワードを設定・再設定
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const email = ref('')
const password = ref('')
const submitting = ref(false)
const localError = ref('')
const successMessage = ref('')
const { login, resetPassword, errorMessage } = useSession()
const message = computed(() => localError.value || errorMessage.value)

const submit = async () => {
  submitting.value = true
  localError.value = ''
  try {
    await login(email.value, password.value)
    await navigateTo('/')
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'ログインに失敗しました。'
  } finally {
    submitting.value = false
  }
}

const requestPasswordReset = async () => {
  localError.value = ''
  successMessage.value = ''
  if (!email.value) {
    localError.value = 'メールアドレスを入力してください。'
    return
  }
  submitting.value = true
  try {
    await resetPassword(email.value)
    successMessage.value = 'パスワード設定・再設定メールを送信しました。メールをご確認ください。'
  } catch {
    localError.value = 'パスワード設定・再設定メールを送信できませんでした。'
  } finally {
    submitting.value = false
  }
}
</script>
