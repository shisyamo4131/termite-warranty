import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import * as vue from 'vue'
import ts from 'typescript'
import * as rules from '../src/domain/input-rules.mjs'
import { propertyAddress } from '../src/domain/property-warranty.mjs'
import { createPostalLookupCoordinator } from '../src/domain/postal-lookup.mjs'
import { createZipcloudPostalLookupProvider } from '../src/domain/zipcloud-postal-lookup.mjs'

const row = (town = '架空町') => ({ zipcode: '1000001', address1: '東京都', address2: '架空市', address3: town })
const response = data => ({ ok: true, json: async () => data })
const lookup = (data, options = {}) => createZipcloudPostalLookupProvider({ fetcher: async () => response(data), ...options }).lookup({ postalCode: '100-0001' })

test('zipcloud sends only normalized postal code and bounded limit without cookies or referrer', async () => {
  const provider = createZipcloudPostalLookupProvider({ fetcher: async (url, options) => {
    assert.equal(url, 'https://zipcloud.ibsnet.co.jp/api/search?zipcode=1000001&limit=1000')
    assert.equal(options.credentials, 'omit')
    assert.equal(options.referrerPolicy, 'no-referrer')
    assert.equal(options.redirect, 'error')
    return response({ status: 200, results: [row()] })
  } })
  assert.equal((await provider.lookup({ postalCode: '100-0001' })).status, 'resolved')
})

test('zipcloud returns all distinct candidates including more than the default twenty', async () => {
  const result = await lookup({ status: 200, results: Array.from({ length: 66 }, (_, i) => row(`架空町${i}`)) })
  assert.equal(result.status, 'ambiguous')
  assert.equal(result.candidates.length, 66)
  assert.deepEqual(result.address, {})
  assert.equal((await lookup({ status: 200, results: [row(), row()] })).status, 'resolved')
})

test('zipcloud rejects capped, mismatched, invalid and API error replies; null/empty is no match', async () => {
  for (const results of [null, []]) assert.equal((await lookup({ status: 200, results })).status, 'not_found')
  for (const data of [
    { status: 500, results: null }, {}, { status: 200, results: {} },
    { status: 200, results: [{ ...row(), zipcode: '9999999' }] },
    { status: 200, results: [{ ...row(), address2: null }] },
    { status: 200, results: Array.from({ length: 1000 }, () => row()) },
  ]) assert.equal((await lookup(data)).status, 'unavailable')
})

test('network, HTTP, JSON failures and timeout resolve to unavailable and can retry', async () => {
  for (const fetcher of [
    async () => { throw Error('network') },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => { throw Error('JSON') } }),
    () => new Promise(() => {}),
  ]) assert.equal((await lookup(null, { fetcher, timeoutMs: 10 })).status, 'unavailable')
  let count = 0
  const provider = createZipcloudPostalLookupProvider({ fetcher: async () => {
    if (++count === 1) throw Error('temporary')
    return response({ status: 200, results: [row('')] })
  } })
  assert.equal((await provider.lookup({ postalCode: '1000001' })).status, 'unavailable')
  assert.equal((await provider.lookup({ postalCode: '1000001' })).status, 'resolved')
  assert.equal((await provider.lookup({ postalCode: 'bad' })).status, 'not_found')
  assert.equal(count, 2)
})

async function component(kind, provider, initial = {}) {
  const filename = kind === 'property' ? 'PropertyAddressFields' : kind === 'business' ? 'BusinessContactFields' : 'MasterAddressFields'
  const source = (await readFile(new URL(`../app/components/${filename}.vue`, import.meta.url), 'utf8'))
    .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const form = vue.ref({ postalCode: '1000001', address: '', address1: '', address2: '', prefecture: '', municipality: '', streetTownAndNumber: '', buildingName: '手入力の建物', ...initial })
  const props = { postalLookupProvider: provider, lookupSubject: 'constructionCompany' }
  const env = { ...vue, ...rules, propertyAddress, createPostalLookupCoordinator, zipcloudPostalLookupProvider: provider, defineProps: () => props,
    defineModel: () => form, defineExpose: () => {}, onBeforeUnmount: () => {} }
  delete env.version
  const scope = vue.effectScope()
  const view = scope.run(() => new Function(...Object.keys(env), code +
    (kind === 'business' ? ';return {handlePostalBlur:lookup,applyCandidate,cancelPostalLookup:cancel,candidateOptions:candidates,lookupMessage:message,lookupPending' : ';return {handlePostalBlur,applyCandidate,cancelPostalLookup,candidateOptions,lookupMessage,lookupPending') +
    (kind === 'master' ? ',markFieldEdited' : '') + '};')(...Object.values(env)))
  return { form, view, stop: () => scope.stop() }
}

for (const kind of ['property', 'master']) {
  test(`${kind}: actual component selects candidates, keeps building and invalidates stale selection`, async () => {
    const provider = createZipcloudPostalLookupProvider({ fetcher: async () => response({ status: 200, results: [row('候補A'), row('候補B')] }) })
    const { form, view, stop } = await component(kind, provider)
    try {
      await view.handlePostalBlur()
      assert.equal(view.candidateOptions.value.length, 2)
      view.applyCandidate(view.candidateOptions.value[1])
      assert.equal(kind === 'property' ? form.value.address : form.value.streetTownAndNumber, kind === 'property' ? '東京都架空市候補B' : '候補B')
      assert.equal(form.value.buildingName, '手入力の建物')
      const snapshot = JSON.stringify(form.value)
      await view.handlePostalBlur()
      assert.equal(JSON.stringify(form.value), snapshot)
      assert.equal(view.lookupMessage.value, null)
    } finally { stop() }
  })

  test(`${kind}: no match and communication failure leave form editable and unchanged`, async () => {
    for (const status of ['not_found', 'unavailable']) {
      const { form, view, stop } = await component(kind, { lookup: async () => ({ status }) })
      try {
        const before = JSON.stringify(form.value)
        await view.handlePostalBlur()
        assert.equal(view.lookupPending.value, false)
        assert.equal(JSON.stringify(form.value), before)
        assert.match(view.lookupMessage.value.text, /手入力/)
        form.value[kind === 'property' ? 'address' : 'streetTownAndNumber'] = '手入力1-2'
        await view.handlePostalBlur()
        assert.equal(form.value[kind === 'property' ? 'address' : 'streetTownAndNumber'], '手入力1-2')
      } finally { stop() }
    }
  })

  test(`${kind}: edit during request or after candidates prevents late overwrite`, async () => {
    let resolve
    const { form, view, stop } = await component(kind, { lookup: () => new Promise(done => { resolve = done }) })
    try {
      const pending = view.handlePostalBlur()
      assert.equal(view.lookupPending.value, true)
      form.value[kind === 'property' ? 'address' : 'streetTownAndNumber'] = '手入力'
      if (kind === 'master') view.markFieldEdited('streetTownAndNumber')
      resolve({ status: 'resolved', address: { prefecture: '東京都', municipality: '架空市', streetTownAndNumber: '遅延' } })
      await pending
      assert.equal(view.lookupPending.value, false)
      assert.equal(form.value[kind === 'property' ? 'address' : 'streetTownAndNumber'], '手入力')
      assert.equal(view.candidateOptions.value.length, 0)
    } finally { stop() }
    const next = await component(kind, { lookup: async () => ({ status: 'ambiguous', address: {}, candidates: [{ prefecture: '東京都', municipality: '候補市' }] }) })
    try {
      await next.view.handlePostalBlur()
      const stale = next.view.candidateOptions.value[0]
      next.form.value.postalCode = '9999999'
      next.view.applyCandidate(stale)
      assert.equal(next.form.value.municipality, '')
      assert.equal(next.form.value.address, '')
    } finally { next.stop() }
  })
}

for (const kind of ['property', 'master', 'business']) {
  test(`${kind}: dialog waits for current response only and releases on success/failure/cancel`, async () => {
    const replies = []
    const { view, stop } = await component(kind, { lookup: () => new Promise(resolve => replies.push(resolve)) })
    try {
      const first = view.handlePostalBlur()
      assert.equal(view.lookupPending.value, true)
      view.cancelPostalLookup()
      assert.equal(view.lookupPending.value, false)
      const second = view.handlePostalBlur()
      replies[0]({ status: 'not_found' })
      await first
      assert.equal(view.lookupPending.value, true)
      replies[1]({ status: 'resolved', address: { prefecture: '東京都', municipality: '架空市' } })
      await second
      assert.equal(view.lookupPending.value, false)
    } finally { stop() }
    const failed = await component(kind, { lookup: async () => { throw Error('network') } })
    try {
      await failed.view.handlePostalBlur()
      assert.equal(failed.view.lookupPending.value, false)
      assert.equal(failed.view.lookupMessage.value.type, 'error')
    } finally { failed.stop() }
  })
}
