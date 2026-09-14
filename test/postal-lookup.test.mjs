import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  createPostalLookupCoordinator,
  normalizePostalLookupCode,
  supportsPostalLookupSubject,
  unavailablePostalLookupProvider,
} from '../src/domain/postal-lookup.mjs'

const createAddress = (overrides = {}) => ({
  postalCode: '100-0001',
  prefecture: '旧都道府県',
  municipality: '旧市区町村',
  streetTownAndNumber: '旧町域1-1',
  buildingName: '既存建物',
  ...overrides,
})

const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

test('postal lookup normalization accepts only seven digits with an optional hyphen', () => {
  assert.equal(normalizePostalLookupCode('1000001'), '1000001')
  assert.equal(normalizePostalLookupCode(' 100-0001 '), '1000001')
  for (const value of ['', '100-001', '1000-001', '１００-０００１', null, 1000001]) {
    assert.equal(normalizePostalLookupCode(value), null)
  }
})

test('invalid input never calls the provider and all three address masters support lookup', async () => {
  let calls = 0
  const provider = { lookup: async () => { calls += 1; return { status: 'not_found' } } }
  const invalidAddress = createAddress({ postalCode: '100-' })
  const invalid = createPostalLookupCoordinator({ subject: 'property', getAddress: () => invalidAddress, provider })
  assert.deepEqual(await invalid.lookup(), { state: 'skipped' })

  assert.equal(calls, 0)
  assert.equal(supportsPostalLookupSubject('property'), true)
  assert.equal(supportsPostalLookupSubject('homeowner'), true)
  assert.equal(supportsPostalLookupSubject('constructionCompany'), true)
  assert.equal(supportsPostalLookupSubject('warrantyService'), false)
})

test('resolved results update only provider-neutral address fields', async () => {
  const address = createAddress()
  const provider = { lookup: async (request) => {
    assert.deepEqual(request, { postalCode: '1000001' })
    return {
      status: 'resolved',
      address: {
        prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '千代田1-1',
        buildingName: '上書き禁止', extra: '無視',
      },
    }
  } }
  const coordinator = createPostalLookupCoordinator({ subject: 'homeowner', getAddress: () => address, provider })
  const outcome = await coordinator.lookup()
  assert.deepEqual(outcome.appliedFields, ['prefecture', 'municipality', 'streetTownAndNumber'])
  assert.deepEqual(address, createAddress({ prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '千代田1-1' }))
})

test('provider values are trimmed, inherited and extra keys are ignored, and mixed valid fields survive', async () => {
  const inherited = { streetTownAndNumber: '継承値', buildingName: '上書き禁止' }
  const providerAddress = Object.assign(Object.create(inherited), {
    prefecture: '  東京都  ',
    municipality: '   ',
    extra: '無視',
  })
  const address = createAddress()
  const coordinator = createPostalLookupCoordinator({
    subject: 'property',
    getAddress: () => address,
    provider: { lookup: async () => ({ status: 'resolved', address: providerAddress }) },
  })
  const outcome = await coordinator.lookup()
  assert.deepEqual(outcome.result, { status: 'resolved', address: { prefecture: '東京都' } })
  assert.deepEqual(outcome.appliedFields, ['prefecture'])
  assert.equal(address.municipality, '旧市区町村')
  assert.equal(address.streetTownAndNumber, '旧町域1-1')
  assert.equal(address.buildingName, '既存建物')
})

test('resolved and ambiguous responses without usable own fields become unavailable', async () => {
  for (const result of [
    { status: 'resolved', address: { prefecture: ' ', municipality: '', extra: 'x' } },
    { status: 'ambiguous', address: Object.create({ prefecture: '継承値' }) },
  ]) {
    const address = createAddress()
    const coordinator = createPostalLookupCoordinator({
      subject: 'homeowner',
      getAddress: () => address,
      provider: { lookup: async () => result },
    })
    const outcome = await coordinator.lookup()
    assert.deepEqual(outcome.result, { status: 'unavailable' })
    assert.deepEqual(outcome.appliedFields, [])
    assert.deepEqual(address, createAddress())
  }
})

test('ambiguous results never update street/town and number or building name', async () => {
  const address = createAddress()
  const provider = { lookup: async () => ({
    status: 'ambiguous',
    address: {
      prefecture: '東京都', municipality: '千代田区',
      streetTownAndNumber: '上書き禁止', buildingName: '上書き禁止',
    },
  }) }
  const coordinator = createPostalLookupCoordinator({ subject: 'property', getAddress: () => address, provider })
  const outcome = await coordinator.lookup()
  assert.deepEqual(outcome.appliedFields, ['prefecture', 'municipality'])
  assert.equal(address.streetTownAndNumber, '旧町域1-1')
  assert.equal(address.buildingName, '既存建物')
})

test('not-found, unavailable, provider rejection, and missing providers retain manual values', async () => {
  for (const provider of [
    { lookup: async () => ({ status: 'not_found' }) },
    { lookup: async () => ({ status: 'unavailable' }) },
    unavailablePostalLookupProvider,
    { lookup: async () => { throw new Error('provider detail must not escape') } },
    undefined,
  ]) {
    const address = createAddress()
    const coordinator = createPostalLookupCoordinator({ subject: 'property', getAddress: () => address, provider })
    const outcome = await coordinator.lookup()
    assert.deepEqual(address, createAddress())
    if (provider) assert.equal(outcome.state, 'current')
    else assert.deepEqual(outcome, { state: 'skipped' })
  }
})

test('each field edited during lookup is protected even when reverted to its baseline value', async () => {
  const pending = deferred()
  const address = createAddress()
  const coordinator = createPostalLookupCoordinator({
    subject: 'property',
    getAddress: () => address,
    provider: { lookup: () => pending.promise },
  })
  const lookup = coordinator.lookup()
  coordinator.markFieldEdited('prefecture')
  address.prefecture = '手入力'
  coordinator.markFieldEdited('streetTownAndNumber')
  address.streetTownAndNumber = '一時編集'
  address.streetTownAndNumber = '旧町域1-1'
  pending.resolve({
    status: 'resolved',
    address: { prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '千代田1-1' },
  })
  const outcome = await lookup
  assert.deepEqual(outcome.appliedFields, ['municipality'])
  assert.equal(address.prefecture, '手入力')
  assert.equal(address.municipality, '千代田区')
  assert.equal(address.streetTownAndNumber, '旧町域1-1')
})

test('a later request makes an earlier out-of-order response stale', async () => {
  const first = deferred()
  const second = deferred()
  const address = createAddress()
  let call = 0
  const coordinator = createPostalLookupCoordinator({
    subject: 'homeowner',
    getAddress: () => address,
    provider: { lookup: () => (++call === 1 ? first.promise : second.promise) },
  })
  const firstLookup = coordinator.lookup()
  address.postalCode = '150-0001'
  const secondLookup = coordinator.lookup()
  second.resolve({ status: 'resolved', address: { prefecture: '東京都', municipality: '渋谷区', streetTownAndNumber: '神宮前' } })
  assert.equal((await secondLookup).state, 'current')
  first.resolve({ status: 'resolved', address: { prefecture: '古い県', municipality: '古い市', streetTownAndNumber: '古い町' } })
  assert.equal((await firstLookup).state, 'stale')
  assert.equal(address.municipality, '渋谷区')
})

test('provider resolution supports undefined to A and invalidates A to B or A to undefined in flight', async () => {
  const pendingA = deferred()
  const pendingB = deferred()
  const address = createAddress()
  const providerA = { lookup: () => pendingA.promise }
  const providerB = { lookup: () => pendingB.promise }
  let provider
  const coordinator = createPostalLookupCoordinator({
    subject: 'property',
    getAddress: () => address,
    getProvider: () => provider,
  })

  assert.deepEqual(await coordinator.lookup(), { state: 'skipped' })
  provider = providerA
  const lookupA = coordinator.lookup()
  provider = providerB
  pendingA.resolve({ status: 'resolved', address: { prefecture: 'A県' } })
  assert.equal((await lookupA).state, 'stale')
  assert.equal(address.prefecture, '旧都道府県')

  const lookupB = coordinator.lookup()
  pendingB.resolve({ status: 'resolved', address: { prefecture: 'B県' } })
  assert.equal((await lookupB).state, 'current')
  assert.equal(address.prefecture, 'B県')

  const pendingRemoval = deferred()
  provider = { lookup: () => pendingRemoval.promise }
  const removedLookup = coordinator.lookup()
  provider = undefined
  pendingRemoval.resolve({ status: 'resolved', address: { prefecture: '削除後' } })
  assert.equal((await removedLookup).state, 'stale')
  assert.equal(address.prefecture, 'B県')
})

test('cancellation invalidates an in-flight response without changing manual values', async () => {
  const pending = deferred()
  const address = createAddress()
  const coordinator = createPostalLookupCoordinator({
    subject: 'property',
    getAddress: () => address,
    provider: { lookup: () => pending.promise },
  })
  const lookup = coordinator.lookup()
  coordinator.cancel()
  pending.resolve({ status: 'resolved', address: { prefecture: '東京都' } })
  assert.equal((await lookup).state, 'stale')
  assert.deepEqual(address, createAddress())
})

test('cancel then reset and reopen cannot receive a delayed response from the prior form', async () => {
  const first = deferred()
  const second = deferred()
  let address = createAddress()
  let call = 0
  const coordinator = createPostalLookupCoordinator({
    subject: 'property',
    getAddress: () => address,
    provider: { lookup: () => (++call === 1 ? first.promise : second.promise) },
  })
  const closedLookup = coordinator.lookup()
  coordinator.cancel()
  address = createAddress({ postalCode: '150-0001' })
  const reopenedLookup = coordinator.lookup()
  first.resolve({ status: 'resolved', address: { municipality: '閉じたフォーム' } })
  assert.equal((await closedLookup).state, 'stale')
  assert.equal(address.municipality, '旧市区町村')
  second.resolve({ status: 'resolved', address: { municipality: '渋谷区' } })
  assert.equal((await reopenedLookup).state, 'current')
  assert.equal(address.municipality, '渋谷区')
})

test('UI contract wires property, homeowner, and construction company and retains the manual-entry path', async () => {
  const formSource = await readFile(new URL('../app/components/MasterFormFields.vue', import.meta.url), 'utf8')
  const addressSource = await readFile(new URL('../app/components/MasterAddressFields.vue', import.meta.url), 'utf8')
  const propertySection = formSource.match(/<template v-if="form\.masterType === 'property'">([\s\S]*?)<\/template>/)?.[1]
  const companySection = formSource.match(/<template v-if="form\.masterType === 'constructionCompany'">([\s\S]*?)<\/template>/)?.[1]
  const homeownerSection = formSource.match(/<template v-if="form\.masterType === 'homeowner'">([\s\S]*?)<\/template>/)?.[1]

  assert.match(propertySection, /lookup-subject="property"/)
  assert.match(homeownerSection, /lookup-subject="homeowner"/)
  assert.match(companySection, /lookup-subject="constructionCompany"/)
  assert.match(companySection, /postal-lookup-provider/)
  assert.match(homeownerSection, /住所の自動入力は未接続です。郵便番号を含め手入力してください。/)
  assert.match(companySection, /住所の自動入力は未接続です。郵便番号を含め手入力してください。/)
  assert.match(addressSource, /onBeforeUnmount\(cancelPostalLookup\)/)
  assert.match(addressSource, /defineExpose\(\{ cancelPostalLookup \}\)/)
  assert.match(addressSource, /watch\([\s\S]*props\.lookupSubject[\s\S]*props\.postalLookupProvider[\s\S]*cancelPostalLookup\(\)[\s\S]*flush: 'sync'/)
  assert.doesNotMatch(addressSource, /fetch\(|https?:|google|firebase|credential|secret/i)
})

test('all master form hosts cancel lookup before save submission, close, and reset paths', async () => {
  for (const path of [
    '../app/components/MasterManagement.vue',
    '../app/components/QuickCreateMasterDialog.vue',
    '../app/components/MasterEditDialog.vue',
  ]) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8')
    assert.match(source, /<MasterFormFields\s+ref="masterFormFields"/)
    assert.match(source, /type MasterFormFieldsHandle = \{ cancelPostalLookup: \(\) => void \}/)
    const saveBody = source.slice(source.indexOf('const save = async'), source.indexOf('const save = async') + 1200)
    assert.ok(saveBody.indexOf('cancelPostalLookup()') < saveBody.indexOf('submitMaster'))
    assert.match(source, /onBeforeUnmount\([^)]*cancelPostalLookup|onBeforeUnmount\(\(\) => \{[\s\S]*cancelPostalLookup\(\)/)
  }

  const management = await readFile(new URL('../app/components/MasterManagement.vue', import.meta.url), 'utf8')
  assert.match(management, /const resetForm = \(\) => \{\s*cancelPostalLookup\(\)/)
  assert.match(management, /const cancelDialog = \(\) => \{\s*cancelPostalLookup\(\)\s*dialogOpen\.value = false/)

  const quick = await readFile(new URL('../app/components/QuickCreateMasterDialog.vue', import.meta.url), 'utf8')
  assert.match(quick, /const open = async \(\) => \{\s*cancelPostalLookup\(\)/)
  assert.match(quick, /const cancel = \(\) => \{\s*cancelPostalLookup\(\)\s*dialogOpen\.value = false/)

  const edit = await readFile(new URL('../app/components/MasterEditDialog.vue', import.meta.url), 'utf8')
  assert.match(edit, /@click="cancel"/)
  assert.match(edit, /const cancel = \(\) => \{\s*cancelPostalLookup\(\)\s*open\.value = false/)
  assert.match(edit, /watch\(open,[\s\S]*else cancelPostalLookup\(\)[\s\S]*flush: 'sync'/)
})
