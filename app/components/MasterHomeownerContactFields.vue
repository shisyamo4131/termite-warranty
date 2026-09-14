<template>
  <v-text-field v-model="telephone" label="TEL（任意）" :rules="[telephoneOrFaxRule]" />
  <v-text-field v-model="fax" label="FAX（任意）" :rules="[telephoneOrFaxRule]" />
  <v-textarea v-model="notes" label="備考（任意）" />
</template>

<script setup lang="ts">
import { isTelephoneOrFaxValue } from '../../src/domain/master-data.mjs'

const telephone = defineModel<string>('telephone', { required: true })
const fax = defineModel<string>('fax', { required: true })
const notes = defineModel<string>('notes', { required: true })
const telephoneOrFaxRule = (value: unknown) => isTelephoneOrFaxValue(value) || '数字とハイフンのみで入力してください。'
</script>
