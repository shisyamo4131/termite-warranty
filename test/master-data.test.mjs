import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  MasterDataError,
  countDisplayCharacters,
  createNameSearch,
  masterFieldMigrationPatch,
  normalizeMasterFields,
  parseCreateMasterRequest,
  parseSetMasterActiveRequest,
  parseUpdateMasterRequest,
} from '../src/domain/master-data.mjs'
import { createMasterFormDraft, masterFormDraftToFields } from '../src/domain/master-form.mjs'
import { submitMasterCreate, submitMasterUpdate } from '../app/utils/masterFormSubmission.mjs'
import { matchesManagedMasterName } from '../app/composables/useMasterManagement.ts'

const readProjectFile = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8')

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
    ['warrantyService', { name: ' 保証 ', shortName: ' 保証5 ', type: 'warranty', defaultPeriodYears: 5, notes: ' ' }, { name: '保証', shortName: '保証5', type: 'warranty', defaultPeriodYears: 5, notes: null }],
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
    contactDetails: ' 営業時間内 ', notes: ' ',
  })
  assert.deepEqual(result, {
    name: '工務店',
    address: {
      postalCode: '1000001', prefecture: '東京都', municipality: '千代田区',
      streetTownAndNumber: '千代田1-1', buildingName: null,
    },
    telephone: '03-1234-5678', fax: null, contactPerson: null,
    contactDetails: '営業時間内', notes: null,
    nameSearch: createNameSearch('工務店'),
  })
})

test('property fields normalize postal code and nullable building name', () => {
  const result = normalizeMasterFields('property', {
    name: ' 住宅 ', homeownerId: ' homeowner-1 ', constructionCompanyId: ' company-1 ', buildingAreaSquareMeters: 98.25,
    address: {
      postalCode: '100-0001', prefecture: ' 東京都 ', municipality: ' 千代田区 ',
      streetTownAndNumber: ' 千代田1-1 ', buildingName: '',
    },
    notes: ' メモ ',
  })
  assert.equal(result.address.postalCode, '1000001')
  assert.equal(result.address.buildingName, null)
  assert.equal(result.homeownerId, 'homeowner-1')
  assert.equal(result.buildingAreaSquareMeters, 98.25)
  assert.equal(result.notes, 'メモ')
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
    parseUpdateMasterRequest({ masterType: 'warrantyService', id: 'a', fields: { name: 'A', shortName: 'A', type: 'insurance', defaultPeriodYears: 1, notes: null } }),
    { masterType: 'warrantyService', id: 'a', fields: { name: 'A', shortName: 'A', type: 'insurance', defaultPeriodYears: 1, notes: null } },
  )
  assert.deepEqual(
    parseSetMasterActiveRequest({ masterType: 'homeowner', id: 'a', active: false }),
    { masterType: 'homeowner', id: 'a', active: false },
  )
  for (const request of [
    { masterType: 'warrantyService', id: 'a', expectedRevision: 1, fields: { name: 'A', shortName: 'A', type: 'warranty', defaultPeriodYears: 1, notes: null } },
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
    ['warrantyService', { name: 'Warranty', shortName: 'W', type: 'warranty', defaultPeriodYears: 1.5, notes: null }],
    ['property', {
      name: 'House', homeownerId: 'h', constructionCompanyId: 'c', buildingAreaSquareMeters: 10.123,
      address: { postalCode: '123', prefecture: 'P', municipality: 'M', streetTownAndNumber: 'S', buildingName: null },
      notes: null,
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
    telephone: null, fax: null, contactPerson: null, contactDetails: null, notes: null,
    unsupported: null,
  }), MasterDataError)
  assert.throws(() => normalizeMasterFields('constructionCompany', {
    name: '工務店',
    address: { postalCode: '1000001', prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '1', buildingName: null },
    telephone: null, fax: null, contactPerson: null, contactDetails: null, notes: null,
    email: 'master-email@example.invalid',
  }), MasterDataError)
})

test('master form drafts initialize independently for every master type', () => {
  const table = [
    ['warrantyService', { masterType: 'warrantyService', name: '', shortName: '', type: 'warranty', defaultPeriodYears: 1, notes: '' }],
    ['property', {
      masterType: 'property', name: '', homeownerId: '', constructionCompanyId: '', buildingAreaSquareMeters: null,
      address: { postalCode: '', prefecture: '', municipality: '', streetTownAndNumber: '', buildingName: '' },
      notes: '',
    }],
    ['constructionCompany', {
      masterType: 'constructionCompany', name: '',
      address: { postalCode: '', prefecture: '', municipality: '', streetTownAndNumber: '', buildingName: '' },
      telephone: '', fax: '', contactPerson: '', contactDetails: '', notes: '',
    }],
    ['homeowner', {
      masterType: 'homeowner', name: '',
      address: { postalCode: '', prefecture: '', municipality: '', streetTownAndNumber: '', buildingName: '' },
      telephone: '', fax: '', notes: '',
    }],
  ]

  for (const [masterType, expected] of table) {
    assert.deepEqual(createMasterFormDraft(masterType), expected)
  }

  const first = createMasterFormDraft('property')
  const second = createMasterFormDraft('property')
  first.address.postalCode = 'changed'
  assert.equal(second.address.postalCode, '')
})

test('master form drafts restore stored rows into editable values', () => {
  const address = {
    postalCode: '1000001', prefecture: '東京都', municipality: '千代田区',
    streetTownAndNumber: '1-1', buildingName: null,
  }
  const table = [
    ['warrantyService', { name: '保証', shortName: '保証10', type: 'insurance', defaultPeriodYears: 10, notes: '長期' }, { masterType: 'warrantyService', name: '保証', shortName: '保証10', type: 'insurance', defaultPeriodYears: 10, notes: '長期' }],
    ['property', { name: '住宅', homeownerId: 'h1', constructionCompanyId: 'c1', buildingAreaSquareMeters: 88.5, address, notes: '南向き' }, {
      masterType: 'property', name: '住宅', homeownerId: 'h1', constructionCompanyId: 'c1', buildingAreaSquareMeters: 88.5,
      address: { ...address, buildingName: '' },
      notes: '南向き',
    }],
    ['constructionCompany', {
      name: '工務店', address, telephone: null, fax: '03', contactPerson: null,
      contactDetails: '担当窓口', notes: '備考',
    }, {
      masterType: 'constructionCompany', name: '工務店', address: { ...address, buildingName: '' },
      telephone: '', fax: '03', contactPerson: '', contactDetails: '担当窓口', notes: '備考',
    }],
    ['homeowner', { name: '施主', address, telephone: null, fax: null, notes: null }, {
      masterType: 'homeowner', name: '施主', address: { ...address, buildingName: '' },
      telephone: '', fax: '', notes: '',
    }],
  ]

  for (const [masterType, row, expected] of table) {
    assert.deepEqual(createMasterFormDraft(masterType, row), expected)
  }
})

test('master form mapper emits the exact write payload for every master type', () => {
  const address = {
    postalCode: '100-0001', prefecture: ' 東京都 ', municipality: ' 千代田区 ',
    streetTownAndNumber: ' 1-1 ', buildingName: '',
  }
  const table = [
    ['warrantyService', { masterType: 'warrantyService', name: ' 保証 ', shortName: ' 保証5 ', type: 'warranty', defaultPeriodYears: 5, notes: '' }, {
      name: ' 保証 ', shortName: ' 保証5 ', type: 'warranty', defaultPeriodYears: 5, notes: null,
    }],
    ['property', {
      masterType: 'property', name: ' 住宅 ', homeownerId: ' h1 ', constructionCompanyId: ' c1 ', buildingAreaSquareMeters: 101.25, address, notes: '',
    }, {
      name: ' 住宅 ', homeownerId: ' h1 ', constructionCompanyId: ' c1 ', buildingAreaSquareMeters: 101.25,
      address: { ...address, buildingName: null }, notes: null,
    }],
    ['constructionCompany', {
      masterType: 'constructionCompany', name: ' 工務店 ', address,
      telephone: '', fax: ' 03 ', contactPerson: '', contactDetails: ' 窓口 ', notes: '',
    }, {
      name: ' 工務店 ', address: { ...address, buildingName: null },
      telephone: null, fax: ' 03 ', contactPerson: null, contactDetails: ' 窓口 ', notes: null,
    }],
    ['homeowner', {
      masterType: 'homeowner', name: ' 施主 ', address, telephone: '', fax: ' 03 ', notes: '',
    }, {
      name: ' 施主 ', address: { ...address, buildingName: null }, telephone: null, fax: ' 03 ', notes: null,
    }],
  ]

  for (const [masterType, draft, expected] of table) {
    const fields = masterFormDraftToFields(draft)
    assert.deepEqual(fields, expected)
    assert.doesNotThrow(() => normalizeMasterFields(masterType, fields))
  }
})

test('all three master entry points use the shared form and payload mapper', async () => {
  const entryPoints = [
    ['app/components/MasterManagement.vue', 'submitMasterCreate'],
    ['app/components/QuickCreateMasterDialog.vue', 'submitMasterCreate'],
    ['app/components/MasterEditDialog.vue', 'submitMasterUpdate'],
  ]

  for (const [path, submissionMethod] of entryPoints) {
    const source = await readProjectFile(path)
    assert.match(source, /<MasterFormFields/)
    assert.match(source, new RegExp(`\\b${submissionMethod}\\(`))
    assert.doesNotMatch(source, /Record<string,\s*any>/)
    assert.doesNotMatch(source, /const\s+fields\s*=/)
    assert.doesNotMatch(source, /emptyForm/)
  }

  const editSource = await readProjectFile('app/components/MasterEditDialog.vue')
  assert.match(editSource, /createMasterFormDraft\(props\.masterType, row\)/)
  assert.match(editSource, /loadPropertyReferences\(row\)/)
  assert.match(editSource, /open\.value = false/)
  assert.match(editSource, /emit\('saved'\)/)

  const quickSource = await readProjectFile('app/components/QuickCreateMasterDialog.vue')
  assert.match(quickSource, /emit\('created', payload\)/)
  assert.match(quickSource, /dialogOpen\.value = false/)
  assert.match(quickSource, /form\.value = createMasterFormDraft\(props\.masterType\)/)
})

test('construction-company and homeowner lists delegate presentation to bounded user-designed tables', async () => {
  const parentSource = await readProjectFile('app/components/MasterManagement.vue')
  const tableSources = [
    await readProjectFile('app/components/ConstructionCompanyTable.vue'),
    await readProjectFile('app/components/HomeOwnerTable.vue'),
  ]

  assert.match(parentSource, /<ConstructionCompanyTable/)
  assert.match(parentSource, /v-if="masterType === 'constructionCompany'"/)
  assert.match(parentSource, /<HomeOwnerTable/)
  assert.match(parentSource, /v-else-if="masterType === 'homeowner'"/)
  assert.equal(parentSource.match(/:items="visibleRows"/g)?.length, 2)
  assert.equal(parentSource.match(/@show-detail="handleTableDetail"/g)?.length, 2)
  assert.equal(parentSource.match(/@change-active="handleTableActiveChange"/g)?.length, 2)

  for (const tableSource of tableSources) {
    assert.match(tableSource, /items: ManagedMaster\[\]/)
    assert.match(tableSource, /item\.address\?\./)
    assert.match(tableSource, /disable-sort/)
    assert.match(tableSource, /hide-default-footer/)
    assert.match(tableSource, /:items-per-page="-1"/)
    assert.doesNotMatch(tableSource, /\.user-ui-workbench|firebase|navigateTo|useRouter/)
  }
})

test('warranty short name accepts at most six displayed characters after trimming', () => {
  assert.equal(countDisplayCharacters('シロアリ10'), 6)
  assert.equal(countDisplayCharacters('か\u3099'), 1)
  assert.equal(normalizeMasterFields('warrantyService', {
    name: '長期保証', shortName: ' 保証10年 ', type: 'warranty', defaultPeriodYears: 10, notes: null,
  }).shortName, '保証10年')
  assert.throws(
    () => normalizeMasterFields('warrantyService', {
      name: '長期保証', shortName: 'シロアリ保証1', type: 'warranty', defaultPeriodYears: 10, notes: null,
    }),
    error => error instanceof MasterDataError && error.message === '略称は6文字以内で入力してください。',
  )
})

test('property building area and warranty-service type enforce the confirmed values', () => {
  const address = { postalCode: '1000001', prefecture: '東京都', municipality: '千代田区', streetTownAndNumber: '1-1', buildingName: null }
  const property = { name: '住宅', homeownerId: 'h', constructionCompanyId: 'c', buildingAreaSquareMeters: 123.45, address, notes: null }
  assert.equal(normalizeMasterFields('property', property).buildingAreaSquareMeters, 123.45)
  assert.throws(() => normalizeMasterFields('property', { ...property, buildingAreaSquareMeters: 123.456 }), /小数点以下2桁/)
  assert.equal(normalizeMasterFields('warrantyService', { name: '保険商品', shortName: '保険', type: 'insurance', defaultPeriodYears: 5, notes: null }).type, 'insurance')
  assert.throws(() => normalizeMasterFields('warrantyService', { name: '不明', shortName: '不明', type: 'other', defaultPeriodYears: 5, notes: null }), /保証または保険/)
})

test('managed master matching supports one character and verifies contiguous normalized text', () => {
  const nameSearch = createNameSearch('青葉住宅')
  const master = { id: 'company-1', name: '青葉住宅', active: true, nameSearch }

  assert.equal(matchesManagedMasterName(master, '青'), true)
  assert.equal(matchesManagedMasterName(master, '住宅'), true)
  assert.equal(matchesManagedMasterName(master, '葉青'), false)
  assert.equal(matchesManagedMasterName(master, '不存在'), false)
})

test('development warranty short-name migration is compatible and idempotent', () => {
  assert.deepEqual(masterFieldMigrationPatch('warrantyServices', { name: '標準保証', defaultPeriodYears: 5 }), {
    shortName: '標準保証',
  })
  assert.deepEqual(masterFieldMigrationPatch('warrantyServices', { name: '標準保証', shortName: ' ', notes: null }), {
    shortName: '標準保証',
  })
  assert.equal(masterFieldMigrationPatch('warrantyServices', { name: '標準保証', shortName: '標準', notes: null }), null)
  assert.throws(
    () => masterFieldMigrationPatch('warrantyServices', { name: '住まい安心5年保証' }),
    /must be selected manually/,
  )
  assert.throws(() => masterFieldMigrationPatch('properties', { name: '物件' }), /Unsupported migration collection/)
})

test('development migration has explicit fictional defaults for all demo records', async () => {
  const [source, workflow] = await Promise.all([
    readProjectFile('scripts/migrate-development-master-fields.mjs'),
    readProjectFile('.github/workflows/migrate-development-master-fields.yml'),
  ])
  assert.match(source, /'development-demo-standard', '安心5年'/)
  assert.match(source, /'development-demo-long', '長期10年'/)
  assert.match(source, /shortName: 'デモ保証', type: 'warranty'/)
  assert.match(source, /buildingAreaSquareMeters: 100/)
  assert.match(workflow, /^on:\s*\n\s*workflow_dispatch:/m)
  assert.match(workflow, /node scripts\/migrate-development-master-fields\.mjs --apply --confirm=termite-warranty-dev/)
  assert.doesNotMatch(workflow, /\bpush:/)
})

test('master entry submission adapters execute payload and success contracts', async () => {
  const companyForm = createMasterFormDraft('constructionCompany', {
    name: '工務店',
    address: {
      postalCode: '1000001', prefecture: '東京都', municipality: '千代田区',
      streetTownAndNumber: '1-1', buildingName: null,
    },
    telephone: null, fax: '03', contactPerson: '担当者', contactDetails: null,
    notes: null,
  })
  let listFields
  let listCompleted = false
  await submitMasterCreate({
    form: companyForm,
    createMaster: async (fields) => { listFields = fields; return { id: 'company-1' } },
    afterSuccess: () => { listCompleted = true },
  })
  assert.deepEqual(listFields, masterFormDraftToFields(companyForm))
  assert.equal(listCompleted, true)

  const propertyForm = createMasterFormDraft('property', {
    name: '物件', homeownerId: 'homeowner-1', constructionCompanyId: 'company-1', buildingAreaSquareMeters: 100,
    address: {
      postalCode: '1000002', prefecture: '東京都', municipality: '千代田区',
      streetTownAndNumber: '2-2', buildingName: '建物',
    },
  })
  let quickFields
  let quickDialogOpen = true
  let createdPayload
  let quickForm = propertyForm
  await submitMasterCreate({
    form: propertyForm,
    createMaster: async (fields) => { quickFields = fields; return { id: 'property-1' } },
    afterSuccess: (payload) => {
      quickDialogOpen = false
      createdPayload = payload
      quickForm = createMasterFormDraft('property')
    },
  })
  assert.deepEqual(quickFields, masterFormDraftToFields(propertyForm))
  assert.equal(quickDialogOpen, false)
  assert.deepEqual(createdPayload, { masterType: 'property', id: 'property-1' })
  assert.deepEqual(quickForm, createMasterFormDraft('property'))

  const homeownerForm = createMasterFormDraft('homeowner', {
    name: '施主',
    address: {
      postalCode: '1000003', prefecture: '東京都', municipality: '千代田区',
      streetTownAndNumber: '3-3', buildingName: null,
    },
    telephone: null, fax: null, notes: null,
  })
  let updateCall
  let editDialogOpen = true
  let saved = false
  await submitMasterUpdate({
    id: 'homeowner-1',
    form: homeownerForm,
    updateMaster: async (id, fields) => { updateCall = { id, fields }; return { id } },
    afterSuccess: () => { editDialogOpen = false; saved = true },
  })
  assert.deepEqual(updateCall, { id: 'homeowner-1', fields: masterFormDraftToFields(homeownerForm) })
  assert.equal(editDialogOpen, false)
  assert.equal(saved, true)
})

test('shared master form declares each type-specific section once', async () => {
  const source = await readProjectFile('app/components/MasterFormFields.vue')
  for (const component of [
    'MasterAddressFields',
    'MasterPropertyReferenceFields',
    'MasterConstructionCompanyContactFields',
    'MasterHomeownerContactFields',
  ]) {
    assert.equal(source.match(new RegExp(`<${component}\\b`, 'g'))?.length, component === 'MasterAddressFields' ? 3 : 1)
  }
  assert.match(source, /step="1"/)
  assert.match(source, /v-model="form\.shortName"[\s\S]*label="略称"[\s\S]*required/)
  assert.equal((source.match(/label="備考（任意）"/g) ?? []).length, 2)
})

test('list screens share the compact card-title action layout and simple list titles', async () => {
  const dashboard = await readProjectFile('app/components/PrototypeDashboard.vue')
  const masters = await readProjectFile('app/components/MasterManagement.vue')

  for (const source of [dashboard, masters]) {
    assert.match(source, /justify-space-between/)
    assert.match(source, /新規登録/)
  }
  assert.match(dashboard, /list-page-row/)
  assert.match(dashboard, /list-data-card/)
  assert.match(dashboard, /flex-grow-0/)
  assert.match(dashboard, /<v-dialog v-model="filterDialog"/)
  assert.match(dashboard, /条件を初期化/)
  assert.match(dashboard, /startCaseList\(Object\.values\(normalized\)\.some\(Boolean\)\)/)
  assert.match(dashboard, /loadAllMasters\(\)/)
  assert.match(dashboard, /該当\$\{filteredRows\.length\}件を20件ずつ表示しています/)
  assert.match(dashboard, /<v-pagination/)
  assert.match(dashboard, /filteredRows\.value\.slice/)
  assert.doesNotMatch(dashboard, /20件の中を絞り込み/)
  assert.match(masters, /restartSubscription\(complete\)/)
  assert.match(masters, /該当\$\{filteredRows\.length\}件を20件ずつ表示しています/)
  assert.match(masters, /<v-pagination/)
  assert.match(masters, /filteredRows\.value\.slice/)
  assert.doesNotMatch(masters, /20件の中を絞り込み/)

  for (const path of [
    'app/pages/masters/construction-companies/index.vue',
    'app/pages/masters/homeowners/index.vue',
    'app/pages/masters/properties/index.vue',
    'app/pages/masters/warranty-services/index.vue',
  ]) {
    assert.doesNotMatch(await readProjectFile(path), /マスター/)
  }
})

test('master details expose the confirmed linked-property labels and account-owned company email', async () => {
  const detail = await readProjectFile('app/components/MasterDetail.vue')
  const repository = await readProjectFile('app/composables/useMasterManagement.ts')
  const layout = await readProjectFile('app/layouts/default.vue')
  const indexes = await readProjectFile('firestore.indexes.json')
  const companyFields = await readProjectFile('app/components/MasterConstructionCompanyContactFields.vue')

  for (const label of ['担当物件', '所有物件', '対象物件', 'アカウントのメールアドレス']) {
    assert.match(detail, new RegExp(label))
  }
  assert.match(repository, /collectionGroup\(\$firebase\.firestore, 'appliedWarranties'\)/)
  assert.match(repository, /where\('status', '==', 'active'\)/)
  assert.match(repository, /data\?\.status === 'active'/)
  assert.match(repository, /data\?\.active === true/)
  assert.match(repository, /constructionCompanyAccounts/)
  assert.match(repository, /email: deleteField\(\)/)
  assert.doesNotMatch(companyFields, /メールアドレス|v-model="email"/)
  assert.match(indexes, /"collectionGroup": "appliedWarranties"/)
  assert.match(indexes, /"fieldPath": "homeownerId"/)
  assert.match(layout, /<v-list nav slim>/)
  assert.match(layout, /const drawer = ref\(false\)/)
  assert.equal((layout.match(/prepend-icon/g) ?? []).length >= 3, true)
  for (const title of ['ダッシュボード', '案件一覧', '工務店', '施主', '保証サービス', '物件', '通知管理', 'アカウント管理']) {
    assert.match(layout, new RegExp(`title: '${title}'.*icon:`))
  }
})

test('transient operation results use the shared application snackbar', async () => {
  const app = await readProjectFile('app/app.vue')
  const component = await readProjectFile('app/components/AppSnackbar.vue')
  const composable = await readProjectFile('app/composables/useAppSnackbar.ts')

  assert.match(app, /<AppSnackbar\s*\/>/)
  assert.match(component, /<v-snackbar/)
  assert.match(component, /location="bottom center"/)
  assert.match(component, /メッセージを閉じる/)
  assert.match(composable, /ERROR_TIMEOUT = 8000/)

  for (const path of [
    'app/components/CompanyPortalAccountManagement.vue',
    'app/components/CompanyPortalNotificationManagement.vue',
    'app/components/MasterManagement.vue',
    'app/components/PrototypeDashboard.vue',
    'app/components/ConstructionCompanyPortal.vue',
  ]) {
    const source = await readProjectFile(path)
    assert.match(source, /useAppSnackbar\(\)/)
    assert.doesNotMatch(source, /v-alert v-if="(?:message|pageMessage)"/)
  }

  const login = await readProjectFile('app/components/LoginPanel.vue')
  assert.match(login, /showSnackbar\('パスワード設定・再設定メールを送信しました。/)
  assert.doesNotMatch(login, /successMessage/)
})

test('password setup and reset use the same-site Japanese action handler', async () => {
  const [app, session, actionPage] = await Promise.all([
    readProjectFile('app/app.vue'),
    readProjectFile('app/composables/useSession.ts'),
    readProjectFile('app/pages/auth/action.vue'),
  ])

  assert.match(app, /route\.path === '\/auth\/action'.*route\.path === '\/auth\/action\/'/)
  assert.match(session, /auth\.languageCode = 'ja'/)
  assert.match(actionPage, /verifyPasswordResetCode/)
  assert.match(actionPage, /confirmPasswordReset/)
  assert.equal((actionPage.match(/autocomplete="new-password"/g) ?? []).length, 2)
  assert.match(actionPage, /route\.query\.mode !== 'resetPassword'/)
  assert.match(actionPage, /有効期限が切れています/)
})
