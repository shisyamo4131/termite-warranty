<template>
  <v-text-field v-model="form.postalCode" label="郵便番号（7桁）" required />
  <v-text-field v-model="form.prefecture" label="都道府県" required />
  <v-text-field v-model="form.municipality" label="市区町村" required />
  <v-text-field v-model="form.streetTownAndNumber" label="町域・番地" required />
  <v-text-field v-model="form.buildingName" label="建物名（任意）" />
</template>

<script setup lang="ts">
import type { MasterAddressDraft } from '../../src/domain/master-form.mjs'

const form = defineModel<MasterAddressDraft>({ required: true })
</script>
