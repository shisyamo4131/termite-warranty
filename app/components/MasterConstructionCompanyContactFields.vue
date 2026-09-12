<template>
  <v-text-field v-model="telephone" label="TEL（任意）" />
  <v-text-field v-model="fax" label="FAX（任意）" />
  <v-text-field v-model="contactPerson" label="担当者（任意）" />
  <v-textarea v-model="contactDetails" label="連絡先（任意）" />
  <v-text-field v-model="email" label="メールアドレス（任意）" />
  <v-textarea v-model="notes" label="備考（任意）" />
</template>

<script setup lang="ts">
const telephone = defineModel<string>('telephone', { required: true })
const fax = defineModel<string>('fax', { required: true })
const contactPerson = defineModel<string>('contactPerson', { required: true })
const contactDetails = defineModel<string>('contactDetails', { required: true })
const email = defineModel<string>('email', { required: true })
const notes = defineModel<string>('notes', { required: true })
</script>
