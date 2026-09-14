import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterCaseRows, selectActiveMasterCatalog, validateCaseFilterRanges } from '../src/domain/case-filters.mjs'

const row = (overrides = {}) => ({
  id: 'case-1', caseNumber: '000001', homeownerId: 'homeowner-1', propertyId: 'property-1',
  constructionCompanyId: 'company-1', responsibleBranchId: 'branch-1',
  applicationDate: '2026-09-10', handoverDate: '2026-09-20',
  propertyPrefecture: '東京都', propertyMunicipality: '千代田区',
  appliedWarranties: [{
    id: 'warranty-1', warrantyServiceId: 'service-1',
    warrantyServiceType: 'warranty', notificationStatus: 'not notified', expiryDate: '2031-09-09', status: 'active',
  }],
  ...overrides,
})

test('search catalog keeps inactive masters while registration catalog excludes inactive and unusable properties', () => {
  const all = {
    branches: [{ id: 'branch-active', active: true }, { id: 'branch-inactive', active: false }],
    constructionCompanies: [{ id: 'company-active', active: true }, { id: 'company-inactive', active: false }],
    homeowners: [{ id: 'homeowner-active', active: true }, { id: 'homeowner-inactive', active: false }],
    warrantyServices: [{ id: 'service-active', active: true }, { id: 'service-inactive', active: false }],
    properties: [
      { id: 'property-usable', active: true, homeownerId: 'homeowner-active', constructionCompanyId: 'company-active' },
      { id: 'property-inactive', active: false, homeownerId: 'homeowner-active', constructionCompanyId: 'company-active' },
      { id: 'property-bad-homeowner', active: true, homeownerId: 'homeowner-inactive', constructionCompanyId: 'company-active' },
      { id: 'property-bad-company', active: true, homeownerId: 'homeowner-active', constructionCompanyId: 'company-inactive' },
    ],
  }
  const active = selectActiveMasterCatalog(all)
  assert.equal(all.properties.length, 4)
  assert.deepEqual(active.properties.map(({ id }) => id), ['property-usable'])
  assert.deepEqual(active.homeowners.map(({ id }) => id), ['homeowner-active'])
  assert.deepEqual(active.constructionCompanies.map(({ id }) => id), ['company-active'])
  assert.deepEqual(active.branches.map(({ id }) => id), ['branch-active'])
  assert.deepEqual(active.warrantyServices.map(({ id }) => id), ['service-active'])
})

test('each case filter is exact and clearing all filters preserves order', () => {
  const rows = [row(), row({
    id: 'case-2', caseNumber: '000002', homeownerId: 'homeowner-2', propertyId: 'property-2',
    constructionCompanyId: 'company-2', responsibleBranchId: 'branch-2',
    propertyPrefecture: '大阪府', propertyMunicipality: '大阪市',
    appliedWarranties: [{
      id: 'warranty-2', warrantyServiceId: 'service-2',
      warrantyServiceType: 'insurance', notificationStatus: 'notified', expiryDate: '2031-09-08', status: 'active',
    }],
  })]
  assert.deepEqual(filterCaseRows(rows, {}).map(({ id }) => id), ['case-1', 'case-2'])
  const filters = {
    caseNumber: ['000001', '00001'], homeownerId: ['homeowner-1', 'homeowner-x'],
    propertyId: ['property-1', 'property-x'], constructionCompanyId: ['company-1', 'company-x'],
    responsibleBranchId: ['branch-1', 'branch-x'], prefecture: ['東京都', '福岡県'],
    municipality: ['千代田区', '福岡市'], warrantyServiceId: ['service-1', 'service-x'], warrantyServiceType: ['warranty', 'other'],
    notificationStatus: ['not notified', 'not required'], expiryDate: ['2031-09-09', '2031-09-07'],
  }
  for (const [name, [matching, missing]] of Object.entries(filters)) {
    assert.deepEqual(filterCaseRows(rows, { [name]: matching }).map(({ id }) => id), ['case-1'])
    assert.deepEqual(filterCaseRows(rows, { [name]: missing }), [])
  }
})

test('all filled case filters are ANDed', () => {
  const rows = [row(), row({ id: 'case-2', homeownerId: 'homeowner-2' })]
  assert.deepEqual(filterCaseRows(rows, {
    caseNumber: '000001', homeownerId: 'homeowner-1', propertyId: 'property-1',
    constructionCompanyId: 'company-1', responsibleBranchId: 'branch-1',
    prefecture: '東京都', municipality: '千代田区', warrantyServiceId: 'service-1', warrantyServiceType: 'warranty',
    notificationStatus: 'not notified', expiryDate: '2031-09-09',
  }).map(({ id }) => id), ['case-1'])
})

test('service, notification, and expiry must match the same applied warranty', () => {
  const split = row({ appliedWarranties: [
    { id: 'w-1', warrantyServiceId: 'service-1', warrantyServiceType: 'warranty', notificationStatus: 'notified', expiryDate: '2031-09-09' },
    { id: 'w-2', warrantyServiceId: 'service-2', warrantyServiceType: 'insurance', notificationStatus: 'not notified', expiryDate: '2031-09-09' },
  ] })
  assert.deepEqual(filterCaseRows([split], {
    warrantyServiceId: 'service-1', notificationStatus: 'not notified', expiryDate: '2031-09-09',
  }), [])
  assert.deepEqual(filterCaseRows([split], {
    warrantyServiceId: 'service-2', warrantyServiceType: 'insurance', notificationStatus: 'not notified', expiryDate: '2031-09-09',
  }).map(({ id }) => id), ['case-1'])
})

test('application and handover date ranges are inclusive, one-sided, and ANDed', () => {
  const rows = [
    row(),
    row({ id: 'case-2', applicationDate: '2026-09-01', handoverDate: '2026-09-30' }),
    row({ id: 'case-3', applicationDate: '2026-09-30', handoverDate: '2026-09-01' }),
  ]
  assert.deepEqual(filterCaseRows(rows, { applicationDateFrom: '2026-09-10' }).map(({ id }) => id), ['case-1', 'case-3'])
  assert.deepEqual(filterCaseRows(rows, { applicationDateTo: '2026-09-10' }).map(({ id }) => id), ['case-1', 'case-2'])
  assert.deepEqual(filterCaseRows(rows, {
    applicationDateFrom: '2026-09-10', applicationDateTo: '2026-09-10',
    handoverDateFrom: '2026-09-20', handoverDateTo: '2026-09-20',
  }).map(({ id }) => id), ['case-1'])
})

test('date range validation rejects reversed bounds', () => {
  assert.equal(validateCaseFilterRanges({
    applicationDateFrom: '2026-09-11', applicationDateTo: '2026-09-10',
  }), '申込日の開始日は終了日以前にしてください。')
  assert.equal(validateCaseFilterRanges({
    handoverDateFrom: '2026-09-21', handoverDateTo: '2026-09-20',
  }), '引渡日の開始日は終了日以前にしてください。')
  assert.equal(validateCaseFilterRanges({
    applicationDateFrom: '2026-09-10', applicationDateTo: '2026-09-10', handoverDateFrom: '2026-09-20',
  }), null)
})
