import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const readProjectFile = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('staff account management uses four trusted callables and keeps role assignment server-owned', async () => {
  const [gateway, component, functions, rules, layout] = await Promise.all([
    readProjectFile('app/gateways/staffAccountGateway.ts'),
    readProjectFile('app/components/StaffAccountManagement.vue'),
    readProjectFile('functions/staff-account-management.js'),
    readProjectFile('firestore.rules'),
    readProjectFile('app/layouts/default.vue'),
  ])
  for (const callable of ['listManageableStaffAccounts', 'createStaffAccount', 'updateStaffAccount', 'setStaffAccountEnabled']) {
    assert.match(gateway, new RegExp(`'${callable}'`))
  }
  assert.match(functions, /role === 'developer_superuser'.*'house_solution_administrator'/s)
  assert.match(functions, /role === 'house_solution_administrator'.*'general_staff'/s)
  assert.doesNotMatch(component, /v-model=.*role/)
  assert.match(component, /sendPasswordSetupEmail/)
  assert.match(rules, /match \/staffAccounts\/\{uid\}[\s\S]*allow write: if false;/)
  assert.match(layout, /title: '担当者アカウント'/)
  assert.match(layout, /developer_superuser.*house_solution_administrator/)
})
