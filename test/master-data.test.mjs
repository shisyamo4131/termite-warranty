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
    ['constructionCompany', { name: ' 工務店 ' }, { name: '工務店', nameSearch: createNameSearch('工務店') }],
    ['homeowner', { name: ' 施主 ' }, { name: '施主', nameSearch: createNameSearch('施主') }],
    ['warrantyService', { name: ' 保証 ', defaultPeriodYears: 5 }, { name: '保証', defaultPeriodYears: 5 }],
  ]
  for (const [masterType, input, expected] of table) {
    assert.deepEqual(normalizeMasterFields(masterType, input), expected)
  }
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

test('request parsers enforce exact action field allowlists', () => {
  assert.throws(
    () => parseCreateMasterRequest({ masterType: 'homeowner', fields: { name: 'A' }, active: true }),
    (error) => error instanceof MasterDataError && error.code === 'invalid-argument',
  )
  assert.throws(
    () => parseUpdateMasterRequest({ masterType: 'homeowner', id: 'a', expectedRevision: 0, fields: { name: 'A' } }),
    /positive integer/,
  )
  assert.throws(
    () => parseSetMasterActiveRequest({ masterType: 'branch', id: 'a', expectedRevision: 1, active: false }),
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
