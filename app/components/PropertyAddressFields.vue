<template>
  <PostalLookupDialog :active="lookupPending" />
  <v-text-field v-model="form.postalCode" label="郵便番号（7桁・任意）" :rules="[postalRule]" @blur="handlePostalBlur" />
  <v-alert v-if="lookupMessage" :type="lookupMessage.type" class="mb-4">{{ lookupMessage.text }}</v-alert>
  <v-select v-if="candidateOptions.length" v-model="selectedCandidate" :items="candidateOptions" item-title="label" item-value="value" label="町域候補を選択" return-object class="mb-3" @update:model-value="applyCandidate" />
  <v-text-field v-model="form.address" :rules="[...(validateRequired ? [requiredRule] : []),lengthRule]" label="住所" :required="validateRequired" />
  <v-text-field v-model="form.buildingName" :rules="[lengthRule]" label="建物名" />
</template>

<script setup lang="ts">
import { requiredRule, lengthRule, postalRule } from '../../src/domain/input-rules.mjs'
import { createPostalLookupCoordinator } from '../../src/domain/postal-lookup.mjs'
import { propertyAddress } from '../../src/domain/property-warranty.mjs'
import type { PostalLookupAddress, PostalLookupProvider } from '../../src/domain/postal-lookup.mjs'

const props = defineProps<{ postalLookupProvider?: PostalLookupProvider; validateRequired?: boolean }>()
const lookupPending = ref(false)
let pendingGeneration = 0
const form = defineModel<{ postalCode: string; address: string; buildingName: string }>({ required: true })
type Candidate = { label: string; value: Partial<PostalLookupAddress> }
const lookupMessage = ref<{ type: 'info' | 'error'; text: string } | null>(null)
const candidateOptions = ref<Candidate[]>([])
const selectedCandidate = ref<Candidate | null>(null)
// The provider still returns split postal data; only the property form combines it.
const lookupDraft = { postalCode: '', prefecture: '', municipality: '', streetTownAndNumber: '', buildingName: '' }
let editVersion = 0
const coordinator = createPostalLookupCoordinator({
  subject: 'property', getAddress: () => lookupDraft, getProvider: () => props.postalLookupProvider,
})

function cancelPostalLookup() {
  pendingGeneration++
  lookupPending.value = false
  coordinator.cancel()
  editVersion += 1
  lookupMessage.value = null
  candidateOptions.value = []
  selectedCandidate.value = null
}
watch(() => [form.value, form.value.postalCode, form.value.address, props.postalLookupProvider] as const, cancelPostalLookup, { flush: 'sync' })

async function handlePostalBlur() {
  cancelPostalLookup()
  if (!props.postalLookupProvider || !form.value.postalCode?.trim() || postalRule(form.value.postalCode) !== true) return
  if (form.value.address.trim()) {
    return
  }
  const version = editVersion
  Object.assign(lookupDraft, { postalCode: form.value.postalCode, prefecture: '', municipality: '', streetTownAndNumber: '' })
  const requestGeneration = ++pendingGeneration
  lookupPending.value = true
  const outcome = await coordinator.lookup().finally(() => {
    if (requestGeneration === pendingGeneration) lookupPending.value = false
  })
  // Includes edits changed back to the original value, postal edits and a replaced form.
  if (outcome.state !== 'current' || editVersion !== version) return
  if (outcome.result.status === 'resolved') {
    form.value.address = propertyAddress(outcome.result.address)
  } else if (outcome.result.status === 'ambiguous') {
    candidateOptions.value = (outcome.result.candidates ?? []).map(value => ({ label: propertyAddress(value), value }))
    lookupMessage.value = { type: 'info', text: '町域候補を選択してください。丁目・番地・建物名は入力または修正できます。' }
  } else {
    lookupMessage.value = { type: 'error', text: outcome.result.status === 'not_found' ? '住所が見つかりませんでした。手入力してください。' : '住所を自動入力できませんでした。手入力してください。' }
  }
}
function applyCandidate(option: Candidate | null) {
  // A pending option is invalidated synchronously when the postal code/address changes.
  if (!option || !candidateOptions.value.includes(option)) return
  form.value.address = propertyAddress(option.value)
  cancelPostalLookup()
}
onBeforeUnmount(cancelPostalLookup)
defineExpose({ cancelPostalLookup })
</script>
