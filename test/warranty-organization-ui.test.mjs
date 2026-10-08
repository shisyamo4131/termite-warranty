import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as vue from 'vue'

function view() {
  const groups = [{ id: 'g1', name: '架空A', enabled: true }, { id: 'g2', name: '架空B', enabled: true }]
  const companies = Array.from({ length: 45 }, (_, i) => ({ id: `c${i}`, name: `架空工務店${i}`, defaultGroupId: 'g1', enabled: true }))
  companies.push({ id: 'other', name: '別の工務店', defaultGroupId: 'g2', enabled: true })
  const branches = Array.from({ length: 45 }, (_, i) => ({ id: `b${i}`, name: `架空本支店${i}`, constructionCompanyId: 'c0', enabled: true }))
  branches.push({ id: 'disabled', name: '無効本支店', constructionCompanyId: 'c0', enabled: false })
  const props = vue.reactive({ groups, companies, branches, groupId: '', companyId: '', busy: false })
  const events = [], scope = vue.effectScope()
  const source = readFileSync(new URL('../app/components/WarrantyOrganizationManagement.vue', import.meta.url), 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const env = { ...vue, defineProps: () => props, defineEmits: () => (...args) => {
    events.push(args)
    if (args[0] === 'selectGroup') { props.groupId = args[1]; props.companyId = '' }
    if (args[0] === 'selectCompany') props.companyId = args[1]
  } }
  const result = scope.run(() => new Function(...Object.keys(env), code + '\nreturn {level,title,showGroups,showCompanies,groupSearch,companySearch,branchSearch,groupPage,companyPage,branchPage,companyRows,branchRows,includeInactive,selectedCompany};')(...Object.values(env)))
  return { ...result, props, events, stop: () => scope.stop() }
}

test('hierarchy goes back one level without clearing the company parent; busy navigation is blocked', async t => {
  const v = view(); t.after(v.stop)
  assert.equal(v.level.value, 'groups')
  v.props.groupId = 'g1'; await vue.nextTick()
  assert.equal(v.level.value, 'companies'); assert.match(v.title.value, /架空A/)
  v.props.companyId = 'c0'; await vue.nextTick()
  assert.equal(v.level.value, 'branches')
  v.props.busy = true; v.showCompanies(); assert.equal(v.props.companyId, 'c0')
  v.props.busy = false; v.showCompanies(); await vue.nextTick()
  assert.equal(v.level.value, 'companies'); assert.equal(v.props.groupId, 'g1')
  v.showGroups(); await vue.nextTick()
  assert.equal(v.level.value, 'groups')
  assert.deepEqual(v.events, [['selectCompany', ''], ['selectGroup', '']])
})

test('return keeps parent filters and pages; a different parent resets only its children', async t => {
  const v = view(); t.after(v.stop)
  v.groupSearch.value = '架空'; v.props.groupId = 'g1'; await vue.nextTick()
  v.companySearch.value = '架空'; await vue.nextTick(); v.companyPage.value = 2
  v.props.companyId = 'c0'; await vue.nextTick()
  assert.equal(v.companyPage.value, 2)
  v.branchSearch.value = '架空'; await vue.nextTick(); v.branchPage.value = 2
  v.showCompanies(); await vue.nextTick()
  assert.equal(v.companyPage.value, 2); assert.equal(v.companySearch.value, '架空')
  v.props.companyId = 'c0'; await vue.nextTick()
  assert.equal(v.branchPage.value, 2); assert.equal(v.branchSearch.value, '架空')
  v.showGroups(); await vue.nextTick(); v.props.groupId = 'g1'; await vue.nextTick()
  assert.equal(v.companyPage.value, 2); assert.equal(v.companySearch.value, '架空')
  v.props.groupId = 'g2'; await vue.nextTick()
  assert.equal(v.companyPage.value, 1); assert.equal(v.companySearch.value, '')
  assert.equal(v.branchPage.value, 1); assert.equal(v.branchSearch.value, '')
  assert.equal(v.groupSearch.value, '架空'); assert.deepEqual(v.companyRows.value.map(x => x.id), ['other'])
})

test('removed rows clamp the current page and disabled rows remain opt-in', async t => {
  const v = view(); t.after(v.stop)
  v.props.groupId = 'g1'; v.props.companyId = 'c0'; await vue.nextTick()
  assert.equal(v.branchRows.value.length, 45)
  v.branchPage.value = 3
  v.props.branches.splice(20, 25); await vue.nextTick()
  assert.equal(v.branchPage.value, 1); assert.equal(v.branchRows.value.length, 20)
  v.includeInactive.value = true; await vue.nextTick()
  assert.equal(v.branchRows.value.length, 21)
  v.props.companyId = 'other'; await vue.nextTick()
  assert.equal(v.selectedCompany.value, undefined); assert.equal(v.branchRows.value.length, 0)
})

test('editing retains hierarchy while new group/company saves advance to their children', async () => {
  const source = readFileSync(new URL('../app/components/MeetingPrototype.vue', import.meta.url), 'utf8')
  const body = source.slice(source.indexOf('async function saveSetting()'), source.indexOf('const accountDialog=', source.indexOf('async function saveSetting()')))
  for (const action of ['saveGroup', 'saveCompany', 'saveBranch']) for (const existing of [true, false]) {
    const env = { settingReadOnly: vue.ref(false), settingForm: vue.ref(null), validate: async () => true, run: async fn => fn(), call: async () => ({ id: 'created' }), settingAction: vue.ref(action), setting: vue.ref({ ...(existing ? { id: 'edited' } : {}), defaultGroupId: 'g1' }), referenceCache: { clear() {} }, selectedGroupId: vue.ref('g1'), selectedCompanyId: vue.ref(''), loadCatalog: async () => {}, settingDialog: vue.ref(true), showSnackbar() {} }
    const save = new Function(...Object.keys(env), body + '; return saveSetting;')(...Object.values(env))
    await save()
    assert.equal(env.selectedGroupId.value, !existing && action === 'saveGroup' ? 'created' : 'g1')
    assert.equal(env.selectedCompanyId.value, !existing && action === 'saveCompany' ? 'created' : '')
    assert.equal(env.settingDialog.value, false)
  }
})
