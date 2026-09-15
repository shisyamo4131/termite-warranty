import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const readProjectFile = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('company portal gateway uses the seven trusted callable commands', async () => {
  const source = await readProjectFile('app/gateways/companyPortalGateway.ts')
  for (const callable of [
    'createConstructionCompanyAccount', 'setConstructionCompanyAccountEnabled',
    'createRenewalWorkItem', 'createNewCaseWorkItem',
    'updateCompanyCaseWorkItem', 'withdrawNewCaseWorkItem', 'reviewCompanyCaseWorkItem',
  ]) assert.match(source, new RegExp(`'${callable}'`))
})

test('session and root rendering separate staff and construction-company surfaces', async () => {
  const [session, app, portal] = await Promise.all([
    readProjectFile('app/composables/useSession.ts'),
    readProjectFile('app/app.vue'),
    readProjectFile('app/components/ConstructionCompanyPortal.vue'),
  ])
  assert.match(session, /constructionCompanyAccounts/)
  assert.match(session, /sendPasswordResetEmail/)
  assert.match(app, /profile\.accountType === 'construction_company'/)
  assert.match(portal, /where\('constructionCompanyId', '==', companyProfile\.value\.constructionCompanyId\)/)
  assert.doesNotMatch(portal, /collection\(\$firebase\.firestore, 'cases'/)
})

test('all company work-item writes stay behind callable functions and one-to-one case ids are explicit', async () => {
  const [rules, functions, indexes] = await Promise.all([
    readProjectFile('firestore.rules'),
    readProjectFile('functions/company-portal.js'),
    readProjectFile('firestore.indexes.json'),
  ])
  assert.match(rules, /match \/constructionCompanyCaseWorkItems\/\{workItemId\}[\s\S]*allow write: if false;/)
  assert.match(functions, /doc\(`constructionCompanyCaseWorkItems\/\$\{caseId\}`\)/)
  assert.match(functions, /caseId: ref\.id/)
  assert.match(functions, /constructionCompanyAccountBindings/)
  assert.match(functions, /expectedRevision/)
  assert.match(functions, /status: submit \? 'submitted' : 'draft'/)
  assert.match(functions, /status: 'withdrawn'/)
  assert.match(functions, /withdrawalReason: reason/)
  assert.match(functions, /previousWorkItem\?\.status !== 'approved'/)
  assert.match(functions, /transaction\.set\(workItemRef/)
  assert.match(indexes, /"collectionGroup": "constructionCompanyCaseWorkItems"/)
  assert.match(indexes, /"fieldPath": "constructionCompanyId"/)
})

test('staff renewal candidates include approved one-to-one work items but exclude active ones', async () => {
  const source = await readProjectFile('app/components/CompanyPortalNotificationManagement.vue')
  assert.match(source, /workItem\.id === item\.id && workItem\.status !== 'approved'/)
})

test('company portal uses the 要修正 wording while preserving the needs_correction identifier', async () => {
  const [company, staff, functions] = await Promise.all([
    readProjectFile('app/components/ConstructionCompanyPortal.vue'),
    readProjectFile('app/components/CompanyPortalNotificationManagement.vue'),
    readProjectFile('functions/company-portal.js'),
  ])
  for (const source of [company, staff, functions]) {
    assert.doesNotMatch(source, /差戻し|差し戻し/)
    assert.match(source, /要修正/)
  }
  assert.match(company, /needs_correction: '要修正'/)
  assert.match(company, /item\.status === 'needs_correction' \? '要修正内容' : '確認コメント'/)
  assert.match(staff, /needs_correction: '要修正'/)
  assert.match(staff, /要修正理由/)
  assert.match(functions, /要修正理由を入力してください。/)
  assert.match(functions, /status: 'needs_correction'/)
})

test('notification-management info alert uses the peer screen flex-growth guard', async () => {
  const [source, theme] = await Promise.all([
    readProjectFile('app/components/CompanyPortalNotificationManagement.vue'),
    readProjectFile('app/assets/clear-sky-theme.css'),
  ])
  assert.match(source, /<v-alert type="info" density="compact" variant="tonal" class="(?=[^"]*notification-guidance-alert)(?=[^"]*mb-6)[^"]+">/)
  assert.match(theme, /\.notification-guidance-alert\s*\{\s*flex: 0 0 auto;\s*\}/)
})

test('prototype email behavior is visibly queued rather than presented as delivered', async () => {
  const [staff, company, functions] = await Promise.all([
    readProjectFile('app/components/CompanyPortalNotificationManagement.vue'),
    readProjectFile('app/components/ConstructionCompanyPortal.vue'),
    readProjectFile('functions/company-portal.js'),
  ])
  assert.match(staff, /メール配送サービスには接続していません/)
  assert.match(company, /実メールは送信しません/)
  assert.match(functions, /notificationOutbox/)
  assert.match(functions, /status: 'queued'/)
})

test('new-case portal derives email, captures building area, auto-fills dates, and supports retained withdrawal', async () => {
  const [company, staffRegistration, functions, gateway] = await Promise.all([
    readProjectFile('app/components/ConstructionCompanyPortal.vue'),
    readProjectFile('app/components/PrototypeDashboard.vue'),
    readProjectFile('functions/company-portal.js'),
    readProjectFile('app/gateways/companyPortalGateway.ts'),
  ])
  assert.doesNotMatch(company, /v-model="form\.contactEmail"/)
  assert.match(company, /v-model\.number="form\.buildingAreaSquareMeters"/)
  assert.match(company, /watch\(\(\) => form\.handoverDate/)
  assert.match(staffRegistration, /watch\(\(\) => registrationForm\.handoverDate/)
  assert.match(functions, /contactEmail: email\(accountEmail/)
  assert.match(functions, /text\(value, message\)\.toLowerCase\(\)/)
  assert.match(functions, /\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$/)
  assert.match(functions, /buildingAreaSquareMeters: response\.buildingAreaSquareMeters/)
  assert.match(gateway, /'withdrawNewCaseWorkItem'/)
})

test('staff portal management is split into notification-first submenu screens', async () => {
  const [layout, indexPage, notificationPage, accountPage, notifications, accounts] = await Promise.all([
    readProjectFile('app/layouts/default.vue'),
    readProjectFile('app/pages/company-portal/index.vue'),
    readProjectFile('app/pages/company-portal/notifications.vue'),
    readProjectFile('app/pages/company-portal/accounts.vue'),
    readProjectFile('app/components/CompanyPortalNotificationManagement.vue'),
    readProjectFile('app/components/CompanyPortalAccountManagement.vue'),
  ])
  assert.match(layout, /title="工務店管理ポータル"/)
  assert.ok(layout.indexOf("title: '通知管理'") < layout.indexOf("title: 'アカウント管理'"))
  assert.match(indexPage, /redirect: '\/company-portal\/notifications'/)
  assert.match(notificationPage, /CompanyPortalNotificationManagement/)
  assert.match(accountPage, /CompanyPortalAccountManagement/)
  assert.match(notifications, /constructionCompanyCaseWorkItems/)
  assert.doesNotMatch(notifications, /constructionCompanyAccounts/)
  assert.match(notifications, /query\(collection\(\$firebase\.firestore, 'branches'\), limit\(20\)\)/)
  assert.doesNotMatch(notifications, /query\(collection\(\$firebase\.firestore, 'branches'\), orderBy\(documentId\(\), 'desc'\)/)
  assert.match(accounts, /constructionCompanyAccounts/)
  assert.doesNotMatch(accounts, /constructionCompanyCaseWorkItems/)
})
