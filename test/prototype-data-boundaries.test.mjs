import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createCaseCommandGateway } from '../app/gateways/caseCommandGateway.ts'
import { subscribeCaseDetail } from '../app/repositories/caseDetailRepository.ts'
import { subscribeCaseList } from '../app/repositories/caseListRepository.ts'
import {
  emptyMasterCatalog,
  loadAllMasterCatalog,
  masterCollections,
  selectActiveMasters,
} from '../app/repositories/masterCatalogRepository.ts'
import {
  hydrateAppliedWarrantyDraft,
  initialAppliedWarrantyStartDate,
  recalculatedAppliedWarrantyExpiry,
  toTimestampBaseline,
} from '../app/utils/appliedWarrantyDraft.ts'
import { formatCanonicalLocalDate, parseCanonicalLocalDate } from '../app/utils/canonicalLocalDate.ts'

const document = (id, data = {}) => ({ id, data })
const readProjectFile = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8')

class FakeCaseQuerySource {
  constructor() {
    this.masters = new Map(masterCollections.map(name => [name, []]))
    this.cases = []
    this.caseDetails = new Map()
    this.warranties = new Map()
  }

  record(target, next, error) {
    const entry = { next, error, unsubscribeCount: 0 }
    target.push(entry)
    return () => { entry.unsubscribeCount += 1 }
  }

  subscribeMaster(name, next, error) {
    return this.record(this.masters.get(name), next, error)
  }

  subscribeCases(next, error) {
    return this.record(this.cases, next, error)
  }

  subscribeCase(caseId, next, error) {
    const target = this.caseDetails.get(caseId) ?? []
    this.caseDetails.set(caseId, target)
    return this.record(target, next, error)
  }

  subscribeWarranties(caseId, next, error) {
    const target = this.warranties.get(caseId) ?? []
    this.warranties.set(caseId, target)
    return this.record(target, next, error)
  }

  latest(target) {
    assert.ok(target?.length)
    return target.at(-1)
  }

  emitMaster(name, documents) {
    this.latest(this.masters.get(name)).next(documents)
  }

  emitCases(documents, index = -1) {
    this.cases.at(index).next(documents)
  }

  emitCase(caseId, value, index = -1) {
    this.caseDetails.get(caseId).at(index).next(value)
  }

  emitWarranties(caseId, documents, index = -1) {
    this.warranties.get(caseId).at(index).next(documents)
  }
}

const caseData = (caseNumber = '000001') => ({
  caseNumber,
  propertyId: 'property-1',
  homeownerId: 'homeowner-1',
  constructionCompanyId: 'company-1',
  responsibleBranchId: 'branch-1',
  status: 'active',
  applicationDate: '2026-09-01',
  handoverDate: '2026-09-02',
})

const warrantyData = {
  warrantyServiceId: 'service-1',
  status: 'active',
  notificationStatus: 'notified',
  expiryDate: '2031-09-01',
  startDate: '2026-09-02',
  periodYears: 5,
}

const masterDocuments = {
  branches: [document('branch-1', { name: '東京支店', active: true })],
  constructionCompanies: [document('company-1', { name: '工務店', active: true })],
  homeowners: [document('homeowner-1', { name: '施主', active: true })],
  properties: [document('property-1', {
    name: '物件', active: true, homeownerId: 'homeowner-1', constructionCompanyId: 'company-1',
    address: { prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '1-1' },
  })],
  warrantyServices: [document('service-1', { name: '保証', active: true, defaultPeriodYears: 5 })],
}

const emitAllMasters = (source, order = masterCollections) => {
  for (const name of order) source.emitMaster(name, masterDocuments[name])
}

test('canonical dates and applied-warranty drafts stay Firebase-free and deterministic', () => {
  assert.equal(formatCanonicalLocalDate(new Date(2026, 8, 2)), '2026-09-02')
  assert.equal(formatCanonicalLocalDate(null), '')
  assert.ok(parseCanonicalLocalDate('2024-02-29'))
  assert.equal(parseCanonicalLocalDate('2025-02-29'), null)
  assert.equal(parseCanonicalLocalDate('2026-9-2'), null)
  assert.equal(initialAppliedWarrantyStartDate([
    { expiryDate: 'invalid' },
    { expiryDate: '2031-09-01' },
    { expiryDate: '2032-03-31' },
  ], '2026-01-01'), '2032-04-01')
  assert.equal(initialAppliedWarrantyStartDate([], '2026-01-01'), '2026-01-01')
  assert.equal(recalculatedAppliedWarrantyExpiry('2026-09-02', 5), '2031-09-01')

  const baseline = { seconds: 10, nanoseconds: 123, isEqual: () => true, toDate: () => new Date(), toMillis: () => 0, valueOf: () => '' }
  const warranty = { id: 'w1', ...warrantyData, statusReason: null, warrantyServiceName: '保証' }
  const draft = hydrateAppliedWarrantyDraft({ updatedAtBaseline: baseline, appliedWarranties: [warranty] }, warranty)
  assert.equal(draft.baseline, baseline)
  assert.equal(draft.expiryDate, '2031-09-01')
  assert.deepEqual(toTimestampBaseline(baseline), { seconds: 10, nanoseconds: 123 })
  assert.equal(toTimestampBaseline(undefined), null)
  assert.equal(toTimestampBaseline({ ...baseline, nanoseconds: 1.5 }), null)
})

test('case command gateway delegates exact command names, DTOs, results, and errors', async () => {
  const calls = []
  const invoker = {
    async invoke(name, input) {
      calls.push({ name, input })
      if (name === 'registerCase') return { id: 'case-1', caseNumber: '000001' }
      if (name === 'addAppliedWarranty') return { id: 'warranty-1', startDate: '2026-09-02' }
      return { id: 'warranty-1' }
    },
    async updateCase(input) { calls.push({ name: 'updateCase', input }); return 'updated' },
  }
  const gateway = createCaseCommandGateway(invoker)
  const registration = {
    applicationDate: '2026-09-01', handoverDate: '2026-09-02', propertyId: 'property-1',
    homeownerId: 'homeowner-1', constructionCompanyId: 'company-1', homeownerOverridden: false,
    constructionCompanyOverridden: false, branchId: 'branch-1', warrantyServiceId: 'service-1', startDate: '2026-09-02',
  }
  assert.deepEqual(await gateway.registerCase(registration), { id: 'case-1', caseNumber: '000001' })
  const baseline = { seconds: 10, nanoseconds: 123, isEqual: () => true, toDate: () => new Date(), toMillis: () => 0, valueOf: () => '' }
  await gateway.addAppliedWarranty({ caseId: 'case-1', warrantyServiceId: 'service-1', expectedCaseUpdatedAt: baseline })
  await gateway.updateAppliedWarranty({ caseId: 'case-1', warrantyId: 'warranty-1', expectedCaseUpdatedAt: baseline, status: 'active' })
  const update = { id: 'case-1', baselineUpdatedAt: baseline, ...registration, responsibleBranchId: registration.branchId, propertyDefaultsApplied: false, status: 'active', statusReason: null }
  delete update.branchId
  delete update.warrantyServiceId
  delete update.startDate
  assert.equal(await gateway.updateCase(update), 'updated')
  assert.deepEqual(calls.map(call => call.name), ['registerCase', 'addAppliedWarranty', 'updateAppliedWarranty', 'updateCase'])
  assert.deepEqual(calls[1].input.expectedCaseUpdatedAt, { seconds: 10, nanoseconds: 123 })
  assert.deepEqual(calls[2].input.expectedCaseUpdatedAt, { seconds: 10, nanoseconds: 123 })

  const expected = new Error('callable failed')
  const failing = createCaseCommandGateway({ invoke: async () => { throw expected }, updateCase: invoker.updateCase })
  await assert.rejects(failing.registerCase(registration), error => error === expected)
})

test('master catalog repository loads each collection once and keeps active selection explicit', async () => {
  const requested = []
  const all = await loadAllMasterCatalog({
    async getCollection(name) { requested.push(name); return masterDocuments[name] },
  })
  assert.deepEqual(requested, masterCollections)
  assert.equal(all.properties[0].name, '物件')
  const withInactive = { ...all, homeowners: [...all.homeowners, { id: 'inactive', name: '無効施主', active: false }] }
  assert.deepEqual(selectActiveMasters(withInactive).homeowners.map(item => item.id), ['homeowner-1'])
  assert.deepEqual(emptyMasterCatalog(), {
    branches: [], constructionCompanies: [], homeowners: [], properties: [], warrantyServices: [],
  })

  const expected = new Error('master load failed')
  await assert.rejects(loadAllMasterCatalog({ getCollection: async () => { throw expected } }), error => error === expected)
})

test('case list converges across delivery order and owns dynamic listener cleanup', () => {
  const source = new FakeCaseQuerySource()
  const states = []
  const stop = subscribeCaseList(source, state => states.push(state), () => '2026-09-01')
  source.emitCases([document('case-1', caseData())])
  emitAllMasters(source, [...masterCollections].reverse())
  assert.equal(states.at(-1).status, 'loading')
  source.emitWarranties('case-1', [document('warranty-1', warrantyData)])
  assert.equal(states.at(-1).status, 'ready')
  assert.equal(states.at(-1).rows[0].propertyName, '物件')
  assert.equal(states.at(-1).rows[0].appliedWarranties[0].warrantyServiceName, '保証')

  source.emitCases([
    document('case-1', caseData()),
    document('case-2', caseData('000002')),
  ])
  assert.equal(source.warranties.get('case-2').length, 1)
  source.emitWarranties('case-2', [])
  assert.equal(states.at(-1).status, 'ready')
  source.emitCases([document('case-1', caseData())])
  assert.equal(source.warranties.get('case-2')[0].unsubscribeCount, 1)
  source.emitCases([document('case-1', caseData())])
  assert.equal(source.warranties.get('case-1').length, 1)

  const beforeStop = states.length
  stop()
  stop()
  assert.ok([...source.masters.values()].every(records => records[0].unsubscribeCount === 1))
  assert.equal(source.cases[0].unsubscribeCount, 1)
  assert.equal(source.warranties.get('case-1')[0].unsubscribeCount, 1)
  source.emitCases([document('late', caseData())], 0)
  assert.equal(states.length, beforeStop)
})

test('case list readiness is independent of master and child delivery order', () => {
  const source = new FakeCaseQuerySource()
  const states = []
  const stop = subscribeCaseList(source, state => states.push(state), () => '2026-09-01')
  emitAllMasters(source)
  source.emitCases([
    document('case-1', caseData()),
    document('case-2', caseData('000002')),
  ])
  source.emitWarranties('case-2', [])
  assert.equal(states.at(-1).status, 'loading')
  source.emitWarranties('case-1', [document('warranty-1', warrantyData)])
  assert.equal(states.at(-1).status, 'ready')
  assert.deepEqual(states.at(-1).rows.map(row => row.id).sort(), ['case-1', 'case-2'])
  stop()
})

test('case list error clears rows, and a stopped generation cannot overwrite a retry', () => {
  const source = new FakeCaseQuerySource()
  const firstStates = []
  const stopFirst = subscribeCaseList(source, state => firstStates.push(state), () => '2026-09-01')
  emitAllMasters(source)
  source.emitCases([document('case-1', caseData())])
  source.emitWarranties('case-1', [])
  assert.equal(firstStates.at(-1).status, 'ready')
  const expected = new Error('list failed')
  source.cases[0].error(expected)
  assert.equal(firstStates.at(-1).status, 'error')
  assert.equal(firstStates.at(-1).error, expected)
  assert.deepEqual(firstStates.at(-1).rows, [])
  assert.equal(firstStates.at(-1).masters.properties[0].id, 'property-1')
  source.emitCases([document('case-1', caseData())])
  source.emitWarranties('case-1', [])
  assert.equal(firstStates.at(-1).status, 'error')
  assert.equal(firstStates.at(-1).rows[0].id, 'case-1')
  stopFirst()

  const secondStates = []
  const stopSecond = subscribeCaseList(source, state => secondStates.push(state), () => '2026-09-01')
  source.emitCases([document('old-generation', caseData())], 0)
  assert.deepEqual(secondStates.at(-1).rows, [])
  for (const name of masterCollections) source.masters.get(name).at(-1).next(masterDocuments[name])
  source.emitCases([document('case-2', caseData('000002'))])
  source.emitWarranties('case-2', [])
  assert.equal(secondStates.at(-1).rows[0].id, 'case-2')
  stopSecond()
})

test('case list ignores late callbacks from a removed warranty subscription', () => {
  const source = new FakeCaseQuerySource()
  const states = []
  const stop = subscribeCaseList(source, state => states.push(state), () => '2026-09-01')
  emitAllMasters(source)
  source.emitCases([
    document('case-1', caseData()),
    document('case-2', caseData('000002')),
  ])
  source.emitWarranties('case-1', [document('old-warranty', warrantyData)])
  source.emitWarranties('case-2', [])
  const oldSubscription = source.warranties.get('case-1')[0]

  source.emitCases([document('case-2', caseData('000002'))])
  const beforeLateError = states.at(-1)
  oldSubscription.error(new Error('late removed-listener error'))
  assert.equal(states.at(-1), beforeLateError)
  assert.equal(states.at(-1).status, 'ready')
  assert.deepEqual(states.at(-1).rows.map(row => row.id), ['case-2'])

  source.emitCases([
    document('case-1', caseData()),
    document('case-2', caseData('000002')),
  ])
  const newSubscription = source.warranties.get('case-1')[1]
  newSubscription.next([document('new-warranty', { ...warrantyData, expiryDate: '2032-09-01' })])
  oldSubscription.next([document('stale-warranty', { ...warrantyData, expiryDate: '2030-09-01' })])
  oldSubscription.error(new Error('late replaced-listener error'))
  assert.equal(states.at(-1).status, 'ready')
  assert.equal(states.at(-1).rows.find(row => row.id === 'case-1').appliedWarranties[0].id, 'new-warranty')
  stop()
})

test('case detail avoids false ready, retains warranties on parent updates, and cleans up once', () => {
  const source = new FakeCaseQuerySource()
  const states = []
  const stop = subscribeCaseDetail(source, 'case-1', state => states.push(state), () => '2026-09-01')
  emitAllMasters(source)
  assert.equal(states.at(-1).status, 'loading')
  assert.equal(states.at(-1).row, null)
  source.emitCase('case-1', document('case-1', caseData()))
  assert.equal(states.at(-1).status, 'loading')
  source.emitWarranties('case-1', [document('warranty-1', warrantyData)])
  assert.equal(states.at(-1).status, 'ready')
  assert.equal(states.at(-1).row.appliedWarranties.length, 1)
  assert.equal(source.warranties.get('case-1').length, 1)

  source.emitCase('case-1', document('case-1', { ...caseData(), handoverDate: '2026-09-03' }))
  assert.equal(source.warranties.get('case-1').length, 1)
  assert.equal(states.at(-1).row.appliedWarranties.length, 1)
  assert.equal(states.at(-1).row.handoverDate, '2026-09-03')

  const expected = new Error('detail failed')
  source.caseDetails.get('case-1')[0].error(expected)
  assert.equal(states.at(-1).status, 'error')
  assert.equal(states.at(-1).row.id, 'case-1')
  source.emitCase('case-1', null)
  assert.equal(source.warranties.get('case-1')[0].unsubscribeCount, 1)
  assert.equal(states.at(-1).row, null)

  stop()
  stop()
  assert.ok([...source.masters.values()].every(records => records[0].unsubscribeCount === 1))
  assert.equal(source.caseDetails.get('case-1')[0].unsubscribeCount, 1)
})

test('missing detail becomes ready only after its case snapshot', () => {
  const source = new FakeCaseQuerySource()
  const states = []
  const stop = subscribeCaseDetail(source, 'missing', state => states.push(state), () => '2026-09-01')
  emitAllMasters(source)
  assert.equal(states.at(-1).status, 'loading')
  source.emitCase('missing', null)
  assert.equal(states.at(-1).status, 'ready')
  assert.equal(states.at(-1).row, null)
  stop()
})

test('case detail ignores late callbacks from a removed or replaced warranty subscription', () => {
  const source = new FakeCaseQuerySource()
  const states = []
  const stop = subscribeCaseDetail(source, 'case-1', state => states.push(state), () => '2026-09-01')
  emitAllMasters(source)
  source.emitCase('case-1', document('case-1', caseData()))
  source.emitWarranties('case-1', [document('old-warranty', warrantyData)])
  const oldSubscription = source.warranties.get('case-1')[0]

  source.emitCase('case-1', null)
  const beforeLateError = states.at(-1)
  oldSubscription.error(new Error('late removed-detail error'))
  assert.equal(states.at(-1), beforeLateError)
  assert.equal(states.at(-1).status, 'ready')
  assert.equal(states.at(-1).row, null)

  source.emitCase('case-1', document('case-1', caseData()))
  const newSubscription = source.warranties.get('case-1')[1]
  newSubscription.next([document('new-warranty', { ...warrantyData, expiryDate: '2032-09-01' })])
  oldSubscription.next([document('stale-warranty', { ...warrantyData, expiryDate: '2030-09-01' })])
  oldSubscription.error(new Error('late replaced-detail error'))
  assert.equal(states.at(-1).status, 'ready')
  assert.equal(states.at(-1).row.appliedWarranties[0].id, 'new-warranty')
  stop()
})

test('case detail can receive the case and warranty before masters without becoming ready early', () => {
  const source = new FakeCaseQuerySource()
  const states = []
  const stop = subscribeCaseDetail(source, 'case-1', state => states.push(state), () => '2026-09-01')
  source.emitCase('case-1', document('case-1', caseData()))
  source.emitWarranties('case-1', [document('warranty-1', warrantyData)])
  assert.equal(states.at(-1).status, 'loading')
  emitAllMasters(source)
  assert.equal(states.at(-1).status, 'ready')
  assert.equal(states.at(-1).row.propertyName, '物件')
  stop()
})

test('case UI consumers use narrow boundaries and the aggregate composable is gone', async () => {
  const expectations = [
    ['app/components/PrototypeDashboard.vue', ['useCaseList', 'useCaseCommands', 'useMasterCatalog']],
    ['app/components/DashboardOverview.vue', ['useCaseList']],
    ['app/components/CaseDetail.vue', ['useCaseDetail', 'useMasterCatalog']],
    ['app/components/CaseEditDialog.vue', ['useCaseCommands']],
    ['app/components/AppliedWarrantyDialog.vue', ['useCaseCommands', 'useMasterCatalog']],
    ['app/components/CaseFilterPanel.vue', ['canonicalLocalDate']],
  ]
  for (const [path, names] of expectations) {
    const source = await readProjectFile(path)
    assert.doesNotMatch(source, /usePrototypeData/)
    for (const name of names) assert.match(source, new RegExp(name))
  }
  await assert.rejects(readProjectFile('app/composables/usePrototypeData.ts'), error => error?.code === 'ENOENT')
})
