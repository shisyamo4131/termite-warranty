<template>
  <v-text-field v-model="form.postalCode" label="郵便番号（7桁）" required @blur="handlePostalBlur" />
  <v-alert v-if="lookupMessage" :type="lookupMessage.type" variant="tonal" class="mb-3">
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
  <v-text-field v-model="form.prefecture" label="都道府県" required @update:model-value="markFieldEdited('prefecture')" />
  <v-text-field v-model="form.municipality" label="市区町村" required @update:model-value="markFieldEdited('municipality')" />
  <v-text-field v-model="form.streetTownAndNumber" label="町域・番地" required @update:model-value="markFieldEdited('streetTownAndNumber')" />
  <v-text-field v-model="form.buildingName" label="建物名（任意）" />
</template>

<script setup lang="ts">
import { createPostalLookupCoordinator } from '../../src/domain/postal-lookup.mjs'
import type { MasterAddressDraft } from '../../src/domain/master-form.mjs'
import type { PostalLookupField, PostalLookupProvider, PostalLookupSubject } from '../../src/domain/postal-lookup.mjs'

const props = defineProps<{
  lookupSubject?: PostalLookupSubject
  postalLookupProvider?: PostalLookupProvider
}>()

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
}

async function handlePostalBlur() {
  if (!props.lookupSubject || !props.postalLookupProvider) return
  lookupMessage.value = null
  candidateOptions.value = []
  selectedCandidate.value = null
  const outcome = await coordinator.lookup()
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
  if (!option) return
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
  coordinator.cancel()
  lookupMessage.value = null
  candidateOptions.value = []
  selectedCandidate.value = null
}

onBeforeUnmount(cancelPostalLookup)
defineExpose({ cancelPostalLookup })
</script>
