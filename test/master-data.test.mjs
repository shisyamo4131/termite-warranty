import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MasterDataError,
  createNameSearch,
  normalizeMasterFields,
  parseCreateMasterRequest,
  parseSetMasterActiveRequest,
  parseUpdateMasterRequest,
} from '../src/domain/master-data.mjs'

test('name search uses fixed normalization and token-map oracles', () => {
  assert.deepEqual(createNameSearch(' Ａあ.あ '), {
    normalized: 'aアア',
    one: { a: true, ア: true },
    two: { aア: true, アア: true },
  })
})

test('supported master fields normalize into the trusted write shape', () => {
  const table = [
    ['homeowner', { name: ' 施主 ', address: { postalCode: '100-0001', prefecture: ' 東京都 ', municipality: ' 千代田区 ', streetTownAndNumber: ' 1-1 ', buildingName: '' }, telephone: ' 03-0000-0000 ', fax: '', notes: ' ' }, { name: '施主', address: { postalCode: '1000001', prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '1-1', buildingName: null }, telephone: '03-0000-0000', fax: null, notes: null, nameSearch: createNameSearch('施主') }],
    ['warrantyService', { name: ' 保証 ', defaultPeriodYears: 5 }, { name: '保証', defaultPeriodYears: 5 }],
  ]
  for (const [masterType, input, expected] of table) {
    assert.deepEqual(normalizeMasterFields(masterType, input), expected)
  }
})

test('construction-company address and optional contact fields normalize into the strict write shape', () => {
  const result = normalizeMasterFields('constructionCompany', {
    name: ' 工務店 ',
    address: {
      postalCode: '100-0001', prefecture: ' 東京都 ', municipality: ' 千代田区 ',
      streetTownAndNumber: ' 千代田1-1 ', buildingName: ' ',
    },
    telephone: ' 03-1234-5678 ', fax: '', contactPerson: null,
    contactDetails: ' 営業時間内 ', email: ' info@example.invalid ', notes: ' ',
  })
  assert.deepEqual(result, {
    name: '工務店',
    address: {
      postalCode: '1000001', prefecture: '東京都', municipality: '千代田区',
      streetTownAndNumber: '千代田1-1', buildingName: null,
    },
    telephone: '03-1234-5678', fax: null, contactPerson: null,
    contactDetails: '営業時間内', email: 'info@example.invalid', notes: null,
    nameSearch: createNameSearch('工務店'),
  })
})

test('property fields normalize postal code and nullable building name', () => {
  const result = normalizeMasterFields('property', {
    name: ' 住宅 ', homeownerId: ' homeowner-1 ', constructionCompanyId: ' company-1 ',
    address: {
      postalCode: '100-0001', prefecture: ' 東京都 ', municipality: ' 千代田区 ',
      streetTownAndNumber: ' 千代田1-1 ', buildingName: '',
    },
  })
  assert.equal(result.address.postalCode, '1000001')
  assert.equal(result.address.buildingName, null)
  assert.equal(result.homeownerId, 'homeowner-1')
  assert.equal(result.nameSearch.normalized, '住宅')
})

test('homeowner requires a complete address and normalizes optional contact fields', () => {
  assert.throws(() => normalizeMasterFields('homeowner', { name: '施主' }), MasterDataError)
  const result = normalizeMasterFields('homeowner', {
    name: '施主', address: { postalCode: '100-0001', prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '1-1', buildingName: null },
    telephone: '', fax: ' 03-0000-0001 ', notes: ' demo ',
  })
  assert.equal(result.address.postalCode, '1000001')
  assert.equal(result.telephone, null)
  assert.equal(result.fax, '03-0000-0001')
  assert.equal(result.notes, 'demo')
})

test('request parsers enforce exact action field allowlists', () => {
  assert.throws(
    () => parseCreateMasterRequest({ masterType: 'homeowner', fields: { name: 'A' }, active: true }),
    (error) => error instanceof MasterDataError && error.code === 'invalid-argument',
  )
  assert.deepEqual(
    parseUpdateMasterRequest({ masterType: 'warrantyService', id: 'a', fields: { name: 'A', defaultPeriodYears: 1 } }),
    { masterType: 'warrantyService', id: 'a', fields: { name: 'A', defaultPeriodYears: 1 } },
  )
  assert.deepEqual(
    parseSetMasterActiveRequest({ masterType: 'homeowner', id: 'a', active: false }),
    { masterType: 'homeowner', id: 'a', active: false },
  )
  for (const request of [
    { masterType: 'warrantyService', id: 'a', expectedRevision: 1, fields: { name: 'A', defaultPeriodYears: 1 } },
    { masterType: 'homeowner', id: 'a', expectedRevision: 1, active: false },
  ]) {
    assert.throws(
      () => ('fields' in request ? parseUpdateMasterRequest(request) : parseSetMasterActiveRequest(request)),
      (error) => error instanceof MasterDataError && error.code === 'invalid-argument',
    )
  }
  assert.throws(
    () => parseSetMasterActiveRequest({ masterType: 'branch', id: 'a', active: false }),
    /Unsupported master type/,
  )
})

test('invalid required values are rejected table-wise', () => {
  const invalidFields = [
    ['constructionCompany', { name: '  ' }],
    ['homeowner', { name: '***' }],
    ['warrantyService', { name: 'Warranty', defaultPeriodYears: 1.5 }],
    ['property', {
      name: 'House', homeownerId: 'h', constructionCompanyId: 'c',
      address: { postalCode: '123', prefecture: 'P', municipality: 'M', streetTownAndNumber: 'S', buildingName: null },
    }],
  ]
  for (const [masterType, fields] of invalidFields) {
    assert.throws(() => normalizeMasterFields(masterType, fields), MasterDataError)
  }
})

test('construction-company payload requires the complete declared shape', () => {
  assert.throws(() => normalizeMasterFields('constructionCompany', { name: '工務店' }), MasterDataError)
  assert.throws(() => normalizeMasterFields('constructionCompany', {
    name: '工務店',
    address: { postalCode: '1000001', prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '1', buildingName: null },
    telephone: null, fax: null, contactPerson: null, contactDetails: null, email: null, notes: null,
    unsupported: null,
  }), MasterDataError)
})
