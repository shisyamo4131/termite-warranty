<template>
  <v-text-field v-model="form.postalCode" label="郵便番号" :rules="[postalRule]" @blur="lookup" />
  <v-alert v-if="message" :type="message.type" class="mb-4">{{ message.text }}</v-alert>
  <v-select v-if="candidates.length" :items="candidates" label="住所候補を選択" @update:model-value="applyCandidate" />
  <v-text-field v-model="form.address1" label="住所1" hint="都道府県から番地まで" persistent-hint :rules="[lengthRule]" />
  <v-text-field v-model="form.address2" label="住所2" hint="建物名・階・部屋番号など" persistent-hint :rules="[lengthRule]" />
  <v-text-field v-model="form.telephone" label="電話番号" :rules="[phoneRule]" />
  <v-text-field v-if="showFax" v-model="form.fax" label="FAX番号" :rules="[phoneRule]" />
  <v-text-field v-model="form.email" label="メールアドレス" type="email" :rules="[emailRule]" />
</template>

<script setup lang="ts">
import { postalRule, lengthRule, phoneRule, emailRule } from '../../src/domain/input-rules.mjs'
import { hostedPostalLookupProvider } from '../../src/domain/hosted-postal-lookup.mjs'
import { createPostalLookupCoordinator } from '../../src/domain/postal-lookup.mjs'
import { propertyAddress } from '../../src/domain/property-warranty.mjs'
defineProps<{ showFax?: boolean }>()
const form = defineModel<{ postalCode: string; address1: string; address2: string; telephone: string; email: string; fax?: string }>({ required: true })
const candidates = ref<string[]>([])
const message = ref<{type: 'info' | 'error'; text: string} | null>(null)
let version = 0
const address = { postalCode: '', prefecture: '', municipality: '', streetTownAndNumber: '', buildingName: '' }
const coordinator = createPostalLookupCoordinator({ subject: 'constructionCompany', getAddress: () => address, getProvider: () => hostedPostalLookupProvider })
function cancel() { version++; coordinator.cancel(); candidates.value = []; message.value = null }
watch(() => [form.value, form.value.postalCode, form.value.address1], cancel, { flush: 'sync' })
async function lookup() {
  cancel()
  // Never replace a manually entered address, including a selection made earlier.
  if (form.value.address1.trim() || !form.value.postalCode.trim() || postalRule(form.value.postalCode) !== true) return
  const token = version
  Object.assign(address, { postalCode: form.value.postalCode, prefecture: '', municipality: '', streetTownAndNumber: '' })
  const outcome = await coordinator.lookup()
  if (token !== version || outcome.state !== 'current') return
  if (outcome.result.status === 'resolved') form.value.address1 = propertyAddress(outcome.result.address)
  else if (outcome.result.status === 'ambiguous') {
    candidates.value = (outcome.result.candidates ?? []).map(item => propertyAddress(item))
    message.value = { type: 'info', text: '町域候補を選択し、番地を追記してください。' }
  } else message.value = { type: 'error', text: '住所を取得できませんでした。手入力してください。' }
}
function applyCandidate(candidate: string | null) {
  if (candidate && !form.value.address1.trim() && candidates.value.includes(candidate)) form.value.address1 = candidate
  cancel()
}
onBeforeUnmount(cancel)
</script>
