import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchesCaseUpdateBaseline, projectCaseRows } from '../src/domain/case-rows.mjs'

const timestamp = (value) => ({ toMillis: () => value })

test('stale baseline comparison uses full timestamp equality rather than milliseconds', () => {
  const firestoreTimestamp = (seconds, nanoseconds) => ({
    seconds,
    nanoseconds,
    isEqual: (other) => seconds === other?.seconds && nanoseconds === other?.nanoseconds,
  })
  const baseline = firestoreTimestamp(10, 100)
  assert.equal(matchesCaseUpdateBaseline(firestoreTimestamp(10, 100), baseline), true)
  assert.equal(matchesCaseUpdateBaseline(firestoreTimestamp(10, 101), baseline), false)
  assert.equal(matchesCaseUpdateBaseline(null, baseline), false)
})

test('projects one row per case using current masters and all applied warranties', () => {
  const cases = new Map([['case-1', {
    caseNumber: '000001', propertyId: 'property-1', homeownerId: 'homeowner-1',
    constructionCompanyId: 'company-1', responsibleBranchId: 'branch-1', status: 'active',
    applicationDate: '2026-09-01', handoverDate: '2026-09-02',
    updatedAt: timestamp(20), registeredAt: timestamp(10),
  }]])
  const warranties = new Map([['case-1', [
    { id: 'warranty-1', warrantyServiceId: 'service-1', status: 'active', notificationStatus: 'notified', expiryDate: '2026-12-31', startDate: '2021-01-01', periodYears: 5 },
    { id: 'warranty-2', warrantyServiceId: 'service-2', status: 'active', notificationStatus: 'not notified', expiryDate: '2026-10-10', startDate: '2021-10-11', periodYears: 5 },
  ]]])
  const masters = new Map([
    ['properties', new Map([['property-1', { active: false, name: '現在の物件名', address: {
      prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '千代田1-1', buildingName: '現行棟',
    } }]])],
    ['homeowners', new Map([['homeowner-1', { active: false, name: '現在の施主名' }]])],
    ['constructionCompanies', new Map([['company-1', { active: false, name: '現在の工務店名' }]])],
    ['branches', new Map([['branch-1', { active: false, name: '現在の支店名' }]])],
    ['warrantyServices', new Map([['service-1', { name: '現行サービス1' }], ['service-2', { name: '現行サービス2' }]])],
  ])

  const rows = projectCaseRows({ cases, warranties, masters, today: '2026-09-10' })
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0], {
    id: 'case-1', caseNumber: '000001', homeownerName: '現在の施主名',
    propertyId: 'property-1', homeownerId: 'homeowner-1', constructionCompanyId: 'company-1',
    responsibleBranchId: 'branch-1', status: 'active', statusReason: null,
    applicationDate: '2026-09-01', handoverDate: '2026-09-02',
    updatedAtBaseline: cases.get('case-1').updatedAt,
    propertyName: '現在の物件名', propertyPrefecture: '東京都', propertyMunicipality: '千代田区',
    propertyAddress: '東京都千代田区千代田1-1現行棟', constructionCompanyName: '現在の工務店名',
    appliedWarranties: [
      { id: 'warranty-1', warrantyServiceId: 'service-1', expiryDate: '2026-12-31', notificationStatus: 'notified', status: 'active', statusReason: null, periodYears: 5, startDate: '2021-01-01', warrantyServiceName: '現行サービス1' },
      { id: 'warranty-2', warrantyServiceId: 'service-2', expiryDate: '2026-10-10', notificationStatus: 'not notified', status: 'active', statusReason: null, periodYears: 5, startDate: '2021-10-11', warrantyServiceName: '現行サービス2' },
    ],
    branchName: '現在の支店名', hasNotNotified: true, isAlertEligible: true,
  })
})

test('legacy cases without business dates remain readable with empty projected values', () => {
  const rows = projectCaseRows({
    cases: new Map([['legacy', { status: 'active' }]]), warranties: new Map(), masters: new Map(), today: '2026-09-10',
  })
  assert.equal(rows[0].applicationDate, '')
  assert.equal(rows[0].handoverDate, '')
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
