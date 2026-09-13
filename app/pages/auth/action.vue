<template>
  <v-row justify="center">
    <v-col cols="12" sm="8" md="5">
      <v-card title="パスワードを設定・再設定" subtitle="白蟻保証 業務管理">
        <v-card-text>
          <div v-if="state === 'loading'" class="py-8 text-center">
            <v-progress-circular indeterminate color="primary" />
            <p class="mt-4 mb-0">リンクを確認しています。</p>
          </div>

          <v-alert v-else-if="state === 'error'" type="error" variant="tonal">
            {{ errorMessage }}
          </v-alert>

          <template v-else-if="state === 'success'">
            <v-alert type="success" variant="tonal">
              パスワードを設定しました。新しいパスワードでログインしてください。
            </v-alert>
            <v-btn class="mt-6" color="primary" block @click="goToLogin">ログイン画面へ</v-btn>
          </template>

          <v-form v-else @submit.prevent="submit">
            <p class="mb-4">
              <strong>{{ email }}</strong> の新しいパスワードを入力してください。
            </p>
            <v-text-field
              v-model="password"
              label="新しいパスワード"
              type="password"
              autocomplete="new-password"
              required
            />
            <v-text-field
              v-model="passwordConfirmation"
              label="新しいパスワード（確認）"
              type="password"
              autocomplete="new-password"
              required
            />
            <v-alert v-if="formError" type="error" variant="tonal" class="mb-4">
              {{ formError }}
            </v-alert>
            <v-btn type="submit" color="primary" block :loading="submitting">パスワードを設定</v-btn>
          </v-form>
        </v-card-text>
        <v-card-actions v-if="state === 'error'">
          <v-btn variant="text" block @click="goToLogin">ログイン画面へ戻る</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'

type PageState = 'loading' | 'ready' | 'success' | 'error'

definePageMeta({ layout: false })

const route = useRoute()
const { $firebase } = useNuxtApp()
const state = ref<PageState>('loading')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const formError = ref('')
const errorMessage = ref('')
const submitting = ref(false)
const actionCode = computed(() => typeof route.query.oobCode === 'string' ? route.query.oobCode : '')

const actionErrorMessage = (error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : ''
  if (code === 'auth/expired-action-code') return 'このリンクの有効期限が切れています。ログイン画面からもう一度メールを送信してください。'
  if (code === 'auth/invalid-action-code') return 'このリンクは無効か、すでに使用されています。ログイン画面からもう一度メールを送信してください。'
  if (code === 'auth/weak-password') return 'パスワードが要件を満たしていません。より長く推測されにくいパスワードを入力してください。'
  return 'リンクを確認できませんでした。ログイン画面からもう一度メールを送信してください。'
}

onMounted(async () => {
  if (route.query.mode !== 'resetPassword' || !actionCode.value) {
    errorMessage.value = 'パスワード設定・再設定用のリンクではありません。'
    state.value = 'error'
    return
  }

  try {
    email.value = await verifyPasswordResetCode($firebase.auth, actionCode.value)
    state.value = 'ready'
  } catch (error) {
    errorMessage.value = actionErrorMessage(error)
    state.value = 'error'
  }
})

const submit = async () => {
  formError.value = ''
  if (!password.value) {
    formError.value = '新しいパスワードを入力してください。'
    return
  }
  if (password.value !== passwordConfirmation.value) {
    formError.value = '確認用パスワードが一致していません。'
    return
  }

  submitting.value = true
  try {
    await confirmPasswordReset($firebase.auth, actionCode.value, password.value)
    password.value = ''
    passwordConfirmation.value = ''
    state.value = 'success'
  } catch (error) {
    formError.value = actionErrorMessage(error)
  } finally {
    submitting.value = false
  }
}

const goToLogin = () => navigateTo('/')
</script>
