<template>
  <v-row justify="center">
    <v-col cols="12" sm="8" md="5">
      <v-card title="ログイン" subtitle="House Solutionスタッフ・工務店共通">
        <v-card-text>
            <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>
          <v-btn v-if="currentUser && errorMessage" class="mb-3" block @click="retryProfile">アカウント情報の取得を再試行</v-btn>
          <v-form ref="loginForm" @submit.prevent="submit">
            <v-text-field ref="emailField" v-model="email" :rules="[requiredRule,emailRule]" label="メールアドレス" type="email" autocomplete="off" required />
            <v-text-field v-model="password" :rules="[requiredRule]" label="パスワード" type="password" autocomplete="off" required />
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
import { requiredRule,emailRule } from '../../src/domain/input-rules.mjs'
const loginForm=ref<{validate:()=>Promise<{valid:boolean}>}|null>(null)
const emailField=ref<{validate:()=>Promise<string[]>}|null>(null)
const email = ref('')
const password = ref('')
const submitting = ref(false)
const localError = ref('')
const { showSnackbar, showValidationError } = useAppSnackbar()
const { login, resetPassword, errorMessage, currentUser, retryProfile } = useSession()
const message = computed(() => localError.value || errorMessage.value)

const submit = async () => {
  if(submitting.value)return
  
  if(!(await loginForm.value?.validate())?.valid){showValidationError('入力内容に誤りがあります。赤字の項目を確認してください。');return}
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
  if(submitting.value)return
  
  if(!emailField.value || (await emailField.value.validate()).length){showValidationError('メールアドレスの入力内容を確認してください。');return}
  submitting.value = true
  try {
    await resetPassword(email.value)
    showSnackbar('パスワード設定・再設定メールを送信しました。メールをご確認ください。', 'success')
  } catch {
    localError.value = 'パスワード設定・再設定メールを送信できませんでした。'
  } finally {
    submitting.value = false
  }
}
</script>
