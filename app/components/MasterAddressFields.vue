<template>
  <PostalLookupDialog :active="lookupPending" />
  <v-text-field v-model="form.postalCode" label="郵便番号（7桁）" :rules="[...(!postalOptional && validateRequired!==false ? [requiredRule] : []), postalRule]" :required="!postalOptional" @blur="handlePostalBlur" />
  <v-alert v-if="lookupMessage" :type="lookupMessage.type" class="mb-4">
    {{ lookupMessage.text }}
  </v-alert>
  <v-select
    v-if="candidateOptions.length"
    v-model="selectedCandidate"
    :items="candidateOptions"
    item-title="label"
    item-value="value"
    label="町域候補を選択"
    return-object
    class="mb-3"
    @update:model-value="applyCandidate"
  />
  <v-text-field v-model="form.prefecture" :rules="[...(!addressOptional && validateRequired!==false ? [requiredRule] : []),lengthRule]" label="都道府県" :required="!addressOptional" @update:model-value="markFieldEdited('prefecture')" />
  <v-text-field v-model="form.municipality" :rules="[...(!addressOptional && validateRequired!==false ? [requiredRule] : []),lengthRule]" label="市区町村" :required="!addressOptional" @update:model-value="markFieldEdited('municipality')" />
  <v-text-field v-model="form.streetTownAndNumber" :rules="[...(!addressOptional && validateRequired!==false ? [requiredRule] : []),lengthRule]" label="町域・番地" :required="!addressOptional" @update:model-value="markFieldEdited('streetTownAndNumber')" />
  <v-text-field v-model="form.buildingName" :rules="[lengthRule]" label="建物名" />
</template>

<script setup lang="ts">
import { requiredRule, lengthRule, postalRule } from '../../src/domain/input-rules.mjs'
import { createPostalLookupCoordinator } from '../../src/domain/postal-lookup.mjs'
import type { MasterAddressDraft } from '../../src/domain/master-form.mjs'
import type { PostalLookupField, PostalLookupProvider, PostalLookupSubject } from '../../src/domain/postal-lookup.mjs'

const props = defineProps<{
  lookupSubject?: PostalLookupSubject
  postalLookupProvider?: PostalLookupProvider
  postalOptional?: boolean
  addressOptional?: boolean
  validateRequired?: boolean
}>()

const lookupPending = ref(false)
let pendingGeneration = 0
const form = defineModel<MasterAddressDraft>({ required: true })
const lookupMessage = ref<{ type: 'info' | 'error'; text: string } | null>(null)
const candidateOptions = ref<Array<{ label: string; value: { prefecture?: string; municipality?: string; streetTownAndNumber?: string } }>>([])
const selectedCandidate = ref<{ label: string; value: { prefecture?: string; municipality?: string; streetTownAndNumber?: string } } | null>(null)

const coordinator = createPostalLookupCoordinator({
  getSubject: () => props.lookupSubject,
  getAddress: () => form.value,
  getProvider: () => props.postalLookupProvider,
})

watch(
  () => [props.lookupSubject, props.postalLookupProvider] as const,
  () => cancelPostalLookup(),
  { flush: 'sync' },
)

function markFieldEdited(field: PostalLookupField) {
  coordinator.markFieldEdited(field)
  cancelPostalLookup()
}

watch(() => [form.value, form.value.postalCode] as const, cancelPostalLookup, { flush: 'sync' })

async function handlePostalBlur() {
  cancelPostalLookup()
  if (!props.lookupSubject || !props.postalLookupProvider) return
  lookupMessage.value = null
  candidateOptions.value = []
  selectedCandidate.value = null
  if (!form.value.postalCode?.trim() || postalRule(form.value.postalCode)!==true) return
  if ([form.value.prefecture, form.value.municipality, form.value.streetTownAndNumber].some(value => value?.trim())) {
    return
  }
  const requestGeneration = ++pendingGeneration
  lookupPending.value = true
  const outcome = await coordinator.lookup().finally(() => {
    if (requestGeneration === pendingGeneration) lookupPending.value = false
  })
  if (outcome.state !== 'current') return
  if (outcome.result.status === 'ambiguous') {
    candidateOptions.value = (outcome.result.candidates ?? []).map((candidate) => ({
      label: [candidate.prefecture, candidate.municipality, candidate.streetTownAndNumber].filter(Boolean).join(' '),
      value: candidate,
    }))
    lookupMessage.value = { type: 'info', text: '町域候補を選択してください。丁目・番地・建物名は入力または修正できます。' }
  } else if (outcome.result.status === 'not_found') {
    lookupMessage.value = { type: 'error', text: '住所が見つかりませんでした。手入力してください。' }
  } else if (outcome.result.status === 'unavailable') {
    lookupMessage.value = { type: 'error', text: '住所を自動入力できませんでした。手入力してください。' }
  }
}

function applyCandidate(option: { label: string; value: { prefecture?: string; municipality?: string; streetTownAndNumber?: string } } | null) {
  if (!option || !candidateOptions.value.includes(option)) return
  for (const field of ['prefecture', 'municipality', 'streetTownAndNumber'] as const) {
    const value = option.value[field]
    if (value) form.value[field] = value
    coordinator.markFieldEdited(field)
  }
  candidateOptions.value = []
  selectedCandidate.value = null
  lookupMessage.value = null
}

function cancelPostalLookup() {
  pendingGeneration++
  lookupPending.value = false
  coordinator.cancel()
  lookupMessage.value = null
  candidateOptions.value = []
  selectedCandidate.value = null
}

onBeforeUnmount(cancelPostalLookup)
defineExpose({ cancelPostalLookup })
</script>
