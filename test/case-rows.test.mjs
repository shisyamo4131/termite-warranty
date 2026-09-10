import assert from 'node:assert/strict'
import { test } from 'node:test'
import { projectCaseRows } from '../src/domain/case-rows.mjs'

const timestamp = (value) => ({ toMillis: () => value })

test('projects one row per case using current masters and all applied warranties', () => {
  const cases = new Map([['case-1', {
    caseNumber: '000001', propertyId: 'property-1', homeownerId: 'homeowner-1',
    constructionCompanyId: 'company-1', responsibleBranchId: 'branch-1', status: 'active',
    updatedAt: timestamp(20), registeredAt: timestamp(10),
  }]])
  const warranties = new Map([['case-1', [
    { status: 'active', notificationStatus: 'notified', expiryDate: '2026-12-31' },
    { status: 'active', notificationStatus: 'not notified', expiryDate: '2026-10-10' },
  ]]])
  const masters = new Map([
    ['properties', new Map([['property-1', { active: false, address: {
      prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '千代田1-1', buildingName: '現行棟',
    } }]])],
    ['homeowners', new Map([['homeowner-1', { active: false, name: '現在の施主名' }]])],
    ['constructionCompanies', new Map([['company-1', { active: false, name: '現在の工務店名' }]])],
    ['branches', new Map([['branch-1', { active: false, name: '現在の支店名' }]])],
  ])

  const rows = projectCaseRows({ cases, warranties, masters, today: '2026-09-10' })
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0], {
    id: 'case-1', caseNumber: '000001', homeownerName: '現在の施主名',
    propertyAddress: '東京都千代田区千代田1-1現行棟', constructionCompanyName: '現在の工務店名',
    branchName: '現在の支店名', hasNotNotified: true, isAlertEligible: true,
  })
})

test('sorts by updatedAt descending and then registeredAt descending', () => {
  const base = { status: 'active' }
  const cases = new Map([
    ['older-update', { ...base, caseNumber: '000001', updatedAt: timestamp(10), registeredAt: timestamp(100) }],
    ['older-registration', { ...base, caseNumber: '000002', updatedAt: timestamp(20), registeredAt: timestamp(20) }],
    ['newer-registration', { ...base, caseNumber: '000003', updatedAt: timestamp(20), registeredAt: timestamp(30) }],
  ])
  const rows = projectCaseRows({ cases, warranties: new Map(), masters: new Map(), today: '2026-09-10' })
  assert.deepEqual(rows.map(({ id }) => id), ['newer-registration', 'older-registration', 'older-update'])
})
