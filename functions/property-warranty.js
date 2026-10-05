import { AccountMutationError, mutateAccount } from './account-mutation.js'
import { FieldPath, Timestamp } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { warrantyTransactions, activeInsuranceReports, latestInsuranceReport, insuranceReportTarget, handoverChangeBlockers } from './domain/property-warranty.mjs'
import { expiryAlertEligible, insuranceExpiryDate, initialInsurance, insuranceReportKind, nextInsurancePeriod, applicationWarnings, billingRows, extensionUndoPreview, normalizeAlertSettings, coveragePeriods, fiscalYear, japanDate, matchesProperty, normalizeProperty, reportRows, warrantyNumber, normalizeWarrantyPrefix } from './domain/property-warranty.mjs'

const fail = (code, text) => { throw new HttpsError(code, text) }
const id = value => typeof value === 'string' && /^[\w-]{1,128}$/.test(value) ? value : fail('invalid-argument', '識別子が不正です。')
const text = (value, label) => typeof value === 'string' && value.trim() && value.length <= 2000 ? value.trim() : fail('invalid-argument', `${label}を入力してください。`)
async function actor(db, uid) {
  const staff = (await db.doc(`staffAccounts/${uid}`).get()).data()
  if (staff?.enabled && ['developer_superuser', 'house_solution_administrator', 'general_staff'].includes(staff.role)) return { ...staff, staff: true, uid }
  const company = (await db.doc(`constructionCompanyAccounts/${uid}`).get()).data()
  if (company?.enabled && company.role === 'construction_company' && ['company', 'branch'].includes(company.scope)) return { ...company, staff: false, uid }
  fail('permission-denied', '利用可能なアカウントを確認できません。')
}
function manager(a) { if (!a.staff || !['developer_superuser', 'house_solution_administrator'].includes(a.role)) fail('permission-denied', '管理者のみ操作できます。') }
function owner(a, value) {
  if (!a.staff && (a.constructionCompanyId !== value.constructionCompanyId || (a.scope === 'branch' && a.branchId !== value.branchId))) fail('permission-denied', 'この工務店・支店の物件は操作できません。')
}
// Legacy trial rows remain readable, but are not silently promoted to reportable insurance data.
const withInsurance = row => ({ ...row, insuranceStartDate: row.insuranceStartDate ?? row.handoverDate ?? '', insuranceExpiryDate: row.insuranceExpiryDate ?? insuranceExpiryDate(row.handoverDate || ''), insuranceNeedsReview: !row.insuranceRenewalMonth, warrantyNotified: row.warrantyNotified === true })
const rows = snapshot => snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
async function catalog(db, a, search = '', groupId = '', companyId = '', purpose = '') {
  if ((groupId || companyId) && !a.staff) fail('permission-denied', '階層の管理はHS担当者のみ利用できます。')
  if (groupId) id(groupId)
  if (companyId) id(companyId)
  let companyQuery = db.collection('constructionCompanies')
  if (groupId) companyQuery = companyQuery.where('defaultGroupId', '==', groupId)
  companyQuery = companyQuery.orderBy('updatedAt','desc').orderBy(FieldPath.documentId(),'desc')
  const companies = a.staff ? await (search || groupId ? companyQuery : companyQuery.limit(20)).get() : await db.collection('constructionCompanies').where(FieldPath.documentId(), '==', a.constructionCompanyId).get()
  let branches = db.collection('companyBranches')
  if (companyId) branches = branches.where('constructionCompanyId', '==', companyId)
  if (!a.staff) branches = branches.where('constructionCompanyId', '==', a.constructionCompanyId)
  if (!a.staff && a.scope === 'branch') branches = branches.where(FieldPath.documentId(), '==', a.branchId)
  branches = branches.orderBy('updatedAt','desc').orderBy(FieldPath.documentId(),'desc')
  if (!search && !companyId) branches = branches.limit(20)
  const matching = items => search ? items.filter(row => row.name.includes(search)) : items
  return {
    companies: matching(rows(companies)).filter(row => !groupId || row.defaultGroupId === groupId),
    branches: matching(purpose === 'companyOptions' ? [] : rows(await branches.get())).filter(row => !companyId || row.constructionCompanyId === companyId),
    groups: rows(await db.collection('warrantyGroups').get()),
  }
}

export async function propertyPrototypeOperation(auth, db, input, uid) {
  const a = await actor(db, uid)
  const action = input?.action
  if (action === 'alertSettings') return normalizeAlertSettings((await db.doc('prototypeSettings/alerts').get()).data())
  if (action === 'saveAlertSettings') {
    manager(a)
    const settings = normalizeAlertSettings(input.settings)
    await db.doc('prototypeSettings/alerts').set({ ...settings, updatedAt: Timestamp.now() })
    return settings
  }
  if (action === 'catalog') return catalog(db, a, String(input.search ?? '').trim(), input.groupId || '', input.companyId || '', input.purpose || '')
  if (action === 'list') {
    const f = input.filter ?? {}
    if (f.alertKind && !['warranty','insurance'].includes(f.alertKind)) fail('invalid-argument', '案内の種類が不正です。')
    if (f.alertKind === 'insurance' && !a.staff) fail('permission-denied', '保険満了案内はHS担当者のみ閲覧できます。')
    let query = db.collection('propertyWarranties')
    if (!a.staff) query = query.where('constructionCompanyId', '==', a.constructionCompanyId)
    if (!a.staff && a.scope === 'branch') query = query.where('branchId', '==', a.branchId)
    query = query.orderBy('updatedAt', 'desc').orderBy(FieldPath.documentId(), 'desc')
    if ((f.reportMonth || f.billingMonth) && !a.staff) fail('permission-denied', 'HS担当者のみ出力できます。')
    const filtered = ['reportMonth','billingMonth','warrantyNumber','handoverMissing', 'alertKind', 'search', 'companyId', 'branchId', 'groupId', 'fiscalYear', 'status', 'expiryBefore', 'from', 'to','applicationFrom','applicationTo','handoverFrom','handoverTo'].some(k => typeof f[k] === 'string' && f[k].trim())
    for (const key of ['application','handover']) if (f[`${key}From`] && f[`${key}To`] && f[`${key}From`] > f[`${key}To`]) fail('invalid-argument','日付の開始・終了を確認してください。')
    if (!filtered) query = query.limit(20)
    let result = rows(await query.get()).map(withInsurance).filter(row => matchesProperty(row, f))
    if (f.alertKind) {
      const settings = normalizeAlertSettings((await db.doc('prototypeSettings/alerts').get()).data())
      result = result.filter(row => expiryAlertEligible(row, f.alertKind, japanDate(), settings[f.alertKind === 'insurance' ? 'insuranceMonths' : 'warrantyMonths']))
      if (f.alertKind === 'warranty' && f.notification !== 'all') result = result.filter(row => row.warrantyNotified === (f.notification === 'done'))
    }
    if (f.reportMonth) result = result.map(row => { const kind = row.insuranceNeedsReview && row.status === 'active' ? 'review' : insuranceReportKind(row, f.reportMonth); const reportTarget = kind && kind !== 'review' ? insuranceReportTarget(row, f.reportMonth) : null; return {...row, reportTarget, reportKind: kind && !reportTarget ? 'review' : kind} }).filter(row => row.reportKind)
    if (f.billingMonth) result = billingRows(result, f.billingMonth)
    if (f.from || f.to) result = reportRows(result, f.from, f.to, f.includeCancelled === true)
    // Resolve labels for the displayed result without unbounded master reads or child listeners.
    const paths = [...new Set(result.flatMap(row => [`constructionCompanies/${row.constructionCompanyId}`, ...(row.branchId ? [`companyBranches/${row.branchId}`] : [])]))]
    const names = new Map()
    for(let i=0;i<paths.length;i+=100) for(const doc of await db.getAll(...paths.slice(i,i+100).map(path=>db.doc(path)))) names.set(doc.ref.path,doc.data()?.name ?? '')
    result = result.map(row=>({...row,companyLabel:names.get(`constructionCompanies/${row.constructionCompanyId}`),branchLabel:row.branchId ? names.get(`companyBranches/${row.branchId}`) : '本店'}))
    return { rows: result, limited: !filtered }
  }
  if (action === 'detail') {
    const snapshot = await db.doc(`propertyWarranties/${id(input.id)}`).get()
    if (!snapshot.exists) fail('not-found', '物件が見つかりません。')
    owner(a, snapshot.data())
    const value = snapshot.data()
    const company = (await db.doc(`constructionCompanies/${value.constructionCompanyId}`).get()).data()
    const branch = value.branchId ? (await db.doc(`companyBranches/${value.branchId}`).get()).data() : null
    return withInsurance({ ...value, id: snapshot.id, companyLabel: company?.name ?? value.constructionCompanyId, branchLabel: branch?.name ?? (value.branchId || '本店') })
  }
  if (['saveCompany', 'saveBranch', 'saveGroup'].includes(action)) {
    if (!a.staff) fail('permission-denied', 'HS担当者のみ設定できます。')
    const collection = { saveCompany: 'constructionCompanies', saveBranch: 'companyBranches', saveGroup: 'warrantyGroups' }[action]
    const value = { name: text(input.name, '名称'), updatedAt: Timestamp.now() }
    if (input.enabled !== undefined && typeof input.enabled !== 'boolean') fail('invalid-argument', '有効・無効の指定が不正です。')
    if (action === 'saveCompany') {
      value.defaultGroupId = id(input.defaultGroupId)
      for (const k of ['prefecture', 'municipality', 'streetTownAndNumber']) text(input.address?.[k], '会社の住所')
      for (const k of ['telephone', 'fax', 'contactPerson', 'notes']) value[k] = String(input[k] ?? '').trim()
    } else if (action === 'saveBranch') {
      value.constructionCompanyId = id(input.constructionCompanyId)
      if (input.groupId) fail('invalid-argument', '支店独自の保証グループは設定できません。所属工務店のグループを使用します。')
      for (const k of ['telephone','fax']) value[k] = String(input[k] ?? '').trim()
    } else {
      value.prefix = normalizeWarrantyPrefix(input.prefix)
      value.fiscalStartMonth = Number(input.fiscalStartMonth)
      if (!Number.isInteger(value.fiscalStartMonth) || value.fiscalStartMonth < 1 || value.fiscalStartMonth > 12 || !/^[A-Z0-9-]*$/.test(value.prefix)) fail('invalid-argument', '接頭辞または年度開始月が不正です。')
      value.template = 'sample'
    }
    if (action === 'saveCompany' || action === 'saveBranch') {
      value.address = Object.fromEntries(['postalCode','prefecture','municipality','streetTownAndNumber','buildingName'].map(k => [k, String(input.address?.[k] ?? '').trim()]))
      value.address.postalCode = value.address.postalCode.replace(/[-\s]/g, '')
      if (value.address.postalCode && !/^\d{7}$/.test(value.address.postalCode)) fail('invalid-argument', '郵便番号は7桁です。')
    }
    for (const k of ['telephone','fax']) if (value[k] && !/^[0-9-]+$/.test(value[k])) fail('invalid-argument','電話番号・FAXは半角数字とハイフンのみ入力できます。')
    const ref = input.id ? db.doc(`${collection}/${id(input.id)}`) : db.collection(collection).doc()
    await db.runTransaction(async tx => {
      const old = (await tx.get(ref)).data()
      value.enabled = input.enabled ?? old?.enabled ?? true
      if (old && action === 'saveBranch' && old.constructionCompanyId !== value.constructionCompanyId) fail('failed-precondition', '登録済み支店の工務店は変更できません。')
      if (action === 'saveBranch' && !(await tx.get(db.doc(`constructionCompanies/${value.constructionCompanyId}`))).exists) fail('not-found', '工務店が見つかりません。')
      // Reserve numbering settings and prefixes from creation, even while disabled.
      if (action === 'saveGroup') {
        if (old && (normalizeWarrantyPrefix(old.prefix) !== normalizeWarrantyPrefix(value.prefix) || old.fiscalStartMonth !== value.fiscalStartMonth)) fail('failed-precondition', '登録済みグループの接頭辞・年度開始月は変更できません。')
        const all = await tx.get(db.collection('warrantyGroups'))
        if (all.docs.some(d => d.id !== ref.id && normalizeWarrantyPrefix(d.data().prefix) === normalizeWarrantyPrefix(value.prefix))) fail('already-exists', '同じ接頭辞のグループが存在します。')
        if (old) value.prefix = old.prefix // Keep legacy storage; issued numbers are never rewritten.
      }
      if (action === 'saveCompany') {
        const group = (await tx.get(db.doc(`warrantyGroups/${value.defaultGroupId}`))).data()
        if (!group) fail('not-found', '保証グループが見つかりません。')
        if (group.enabled === false && old?.defaultGroupId !== value.defaultGroupId) fail('failed-precondition', '無効な保証グループは新しく割り当てられません。')
      }
      tx.set(ref, value, { merge: true })
    })
    return { id: ref.id }
  }
  if (action === 'accounts') {
    manager(a)
    return { accounts: rows(await db.collection('constructionCompanyAccounts').orderBy('updatedAt','desc').orderBy(FieldPath.documentId(),'desc').get()) }
  }
  if (action === 'createAccount') {
    manager(a)
    const constructionCompanyId = id(input.constructionCompanyId)
    const company = (await db.doc(`constructionCompanies/${constructionCompanyId}`).get()).data()
    if (!company) fail('not-found', '工務店が見つかりません。')
    if (!['company', 'branch'].includes(input.scope)) fail('invalid-argument', '閲覧範囲を指定してください。')
    const branchId = input.scope === 'branch' ? id(input.branchId) : ''
    if (branchId && (await db.doc(`companyBranches/${branchId}`).get()).data()?.constructionCompanyId !== constructionCompanyId) fail('invalid-argument', '所属支店が不正です。')
    const email = text(input.email, 'メールアドレス').toLowerCase()
    const displayName = text(input.displayName, '担当者名')
    let user
    try {
      user = await auth.createUser({ email, displayName, disabled: false })
      await db.doc(`constructionCompanyAccounts/${user.uid}`).create({ constructionCompanyId, companyName: company.name, displayName, email, scope: input.scope, branchId, role: 'construction_company', enabled: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() })
    } catch (error) {
      if (user) await auth.deleteUser(user.uid)
      fail(error.code === 'auth/email-already-exists' ? 'already-exists' : 'invalid-argument', error.code === 'auth/email-already-exists' ? 'このメールアドレスは使用済みです。' : 'アカウントを作成できませんでした。メールアドレスを確認してください。')
    }
    return { uid: user.uid, email }
  }
  if (action === 'setAccountEnabled') {
    manager(a)
    const targetUid = id(input.uid)
    if (typeof input.enabled !== 'boolean') fail('invalid-argument', 'アカウントを確認してください。')
    try {
      await mutateAccount(auth, db, { uid: targetUid, targetPath: `constructionCompanyAccounts/${targetUid}`, actorUid: uid, kind: 'enabled', desired: { enabled: input.enabled }, authorize: (currentActor, target) => {
        manager({ ...currentActor, staff: currentActor?.enabled === true })
        if (!target || target.role !== 'construction_company') fail('not-found', '工務店アカウントが見つかりません。')
      } })
    } catch (error) { if (error instanceof AccountMutationError) fail(error.code, error.message); throw error }
    return { ok: true }
  }
  if (!['save', 'register', 'extend', 'undoExtend', 'cancel', 'restore','notify','report','undoReport','bill','undoBill','confirmUnbilled'].includes(action)) fail('invalid-argument', '操作を確認してください。')
  if (['notify','report','undoReport','undoExtend','bill','undoBill','confirmUnbilled'].includes(action) && !a.staff) fail('permission-denied', 'HS担当者のみ操作できます。')
  const ref = db.doc(`propertyWarranties/${id(input.id)}`)
  const requestId = id(input.requestId)
  return db.runTransaction(async tx => {
    const currentActor = await tx.get(db.doc(`${a.staff ? 'staffAccounts' : 'constructionCompanyAccounts'}/${uid}`))
    if (currentActor.data()?.enabled !== true) fail('permission-denied', 'アカウントが無効です。')
    if (!a.staff && ['constructionCompanyId','branchId','scope'].some(key => currentActor.data()[key] !== a[key])) fail('aborted', 'アカウントの所属が変更されました。ログインし直してください。')
    const snapshot = await tx.get(ref)
    const old = snapshot.data()
    if (old) owner(a, old)
    const receipt = (await tx.get(db.doc(`propertyOperationReceipts/${ref.id}_${requestId}`))).data()
    if (receipt) {
      if (receipt.uid !== uid || receipt.action !== action) fail('failed-precondition','操作識別子を再利用できません。')
      return {id:ref.id}
    }
    if (old?.history?.some(event => event.requestId === requestId)) return { id: ref.id }
    if ((old?.revision ?? 0) !== Number(input.revision ?? 0)) fail('aborted', '他の操作で更新されました。一覧から開き直してください。')
    if (!old && !['save', 'register'].includes(action)) fail('not-found', '物件が見つかりません。')
    const now = Timestamp.now(), date = japanDate(now.toDate())
    let next = { ...old }
    let operationTarget = null
    if (['bill','undoBill','confirmUnbilled'].includes(action)) {
      if (old.status !== 'active') fail('failed-precondition','本登録済みの物件だけが対象です。')
      const period = warrantyTransactions(old).find(p => p.id === input.warrantyPeriodId && p.identifiable)
      if (!period) fail('failed-precondition','請求対象の保証区間を確認してください。')
      if (input.startDate !== period.startDate || input.expiryDate !== period.expiryDate) fail('failed-precondition','確認した請求対象期間と一致しません。開き直してください。')
      if (action === 'bill' && period.billingState === 'billed' || action === 'undoBill' && period.billingState !== 'billed' || action === 'confirmUnbilled' && period.billingState !== 'unknown') fail('failed-precondition','請求状態が変わりました。開き直してください。')
      if (action === 'undoBill') text(input.reason,'理由')
      const state = action === 'bill' ? 'billed' : 'pending'
      next.billingItems = [...(old.billingItems ?? []).filter(p => p.id !== period.id), {id:period.id,startDate:period.startDate,expiryDate:period.expiryDate,state,requestId,at:now.toDate().toISOString(),actorUid:uid}]
      operationTarget = {...period,previousState:period.billingState,state}
    } else if (['notify','report','undoReport'].includes(action)) {
      if (old.status !== 'active') fail('failed-precondition','本登録済みの物件だけが対象です。')
      if (action === 'notify') {
        if (typeof input.notified !== 'boolean') fail('invalid-argument','案内状態を指定してください。')
        next.warrantyNotified = input.notified
      } else if (action === 'report') {
        if (!old.insuranceRenewalMonth) fail('failed-precondition','旧データの保険期間の確認が必要です。')
        const kind = insuranceReportKind(old, input.month)
        if (!kind || kind === 'review') fail('failed-precondition','報告対象ではありません。過去区間は個別確認が必要です。')
        const renewal = ['renewal','past-renewal'].includes(kind)
        const target = insuranceReportTarget(old,input.month)
        if (!target || ['warrantyPeriodId','startDate','expiryDate'].some(k => input.reportTarget?.[k] !== target[k])) fail('failed-precondition','報告対象の保証区間・保険期間を確認して開き直してください。')
        next.insuranceEvents = [...(old.insuranceEvents ?? activeInsuranceReports(old))]
        next.insuranceHistoryIncomplete = old.insuranceHistoryIncomplete ?? (!Array.isArray(old.insuranceEvents) && !!(old.insuranceEverRenewed || old.insuranceLastReport?.before?.insuranceReported || old.insuranceReported && !old.insuranceLastReport))
        const event = {kind:'report',requestId,reportKind:renewal ? 'renewal' : 'new',month:input.month,...target,before:{insuranceStartDate:old.insuranceStartDate,insuranceExpiryDate:old.insuranceExpiryDate,insuranceRenewalMonth:old.insuranceRenewalMonth,insuranceReported:old.insuranceReported},at:now.toDate().toISOString(),actorUid:uid}
        next.insuranceEvents.push(event)
        next.insuranceLastReport = {...event,kind:event.reportKind}
        operationTarget = target
        if (renewal) Object.assign(next,nextInsurancePeriod(old),{insuranceEverRenewed:true})
        else Object.assign(next,{insuranceStartDate:target.startDate,insuranceExpiryDate:target.expiryDate,insuranceRenewalMonth:target.expiryDate.slice(0,7).replace('-','')})
        next.insuranceReported = true
      } else {
        const target = latestInsuranceReport(old)
        if (!target || target.requestId !== input.targetReportId) fail('failed-precondition','取り消せる直近の報告を確認してください。')
        next.insuranceEvents = [...(old.insuranceEvents ?? activeInsuranceReports(old)),{kind:'undoReport',requestId,targetRequestId:target.requestId,at:now.toDate().toISOString(),actorUid:uid}]
        next.insuranceHistoryIncomplete = old.insuranceHistoryIncomplete ?? (!Array.isArray(old.insuranceEvents) && !!(target.before.insuranceReported || old.insuranceEverRenewed))
        Object.assign(next,target.before)
        const previous = latestInsuranceReport(next)
        next.insuranceLastReport = previous ? {...previous,kind:previous.reportKind} : null
        operationTarget = {warrantyPeriodId:target.warrantyPeriodId,startDate:target.startDate,expiryDate:target.expiryDate,targetRequestId:target.requestId}
      }
    } else
    if (action === 'save' || action === 'register') {
      if (old?.status === 'cancelled') fail('failed-precondition', '取消物件は復元後に編集してください。')
      const supplied = { ...input.fields }
      if (old?.status === 'active' && supplied.applicationDate === undefined) supplied.applicationDate = old.applicationDate
      const fields = normalizeProperty(supplied, false)
      if (old?.status === 'active' && fields.applicationDate !== old.applicationDate) fail('failed-precondition', '本登録後の申込日は変更できません。')
      if (old?.status === 'active' && (supplied.constructionCompanyId !== old.constructionCompanyId || (supplied.branchId || '') !== old.branchId)) fail('failed-precondition','本登録後の工務店・支店は変更できません。誤登録は取消後に再登録してください。')
      if ((old?.years ?? 0) > fields.maxYears) fail('failed-precondition', '既に延長した期間より短い上限にはできません。')
      const constructionCompanyId = old?.status === 'active' ? old.constructionCompanyId : id(input.fields.constructionCompanyId)
      const branchId = old?.status === 'active' ? old.branchId : (input.fields.branchId ? id(input.fields.branchId) : '')
      owner(a, { constructionCompanyId, branchId })
      const company = (await tx.get(db.doc(`constructionCompanies/${constructionCompanyId}`))).data()
      const branch = branchId ? (await tx.get(db.doc(`companyBranches/${branchId}`))).data() : null
      if (!company || (branchId && branch?.constructionCompanyId !== constructionCompanyId)) fail('invalid-argument', '工務店・支店を確認してください。')
      if ((!old || action === 'register') && (company.enabled === false || branch?.enabled === false)) fail('failed-precondition', '無効な工務店・支店では新規登録できません。既存の保証は引き続き処理できます。')
      normalizeProperty(supplied, action === 'register' || old?.status === 'active')
      if (old?.status === 'active' && old.handoverDate && !fields.handoverDate) fail('failed-precondition', '確定済みの引渡日は空欄に戻せません。')
      next = { ...next, ...fields, constructionCompanyId, branchId, status: old?.status ?? 'draft', years: old?.years ?? 0 }
      if (old?.status === 'active' && old.handoverDate !== fields.handoverDate) {
        const blockers = handoverChangeBlockers(old)
        if (blockers.length) fail('failed-precondition',blockers.join('\n'))
        if (input.confirmDates !== true) fail('failed-precondition', '変更後の保証期間を確認してください。')
        next.periods = fields.handoverDate ? coveragePeriods(fields.handoverDate, old.years) : []
        next.startDate = fields.handoverDate
        next.expiryDate = next.periods.at(-1)?.expiryDate ?? ''
        Object.assign(next, initialInsurance(fields.handoverDate))
        next.warrantyNotified = false
        next.billingItems = (old.billingItems ?? []).map(p => p.id === 'initial' ? {...p,...next.periods[0]} : p)
      }
      if (action === 'register') {
        if (input.confirmRegistration !== true) fail('failed-precondition', '本登録の内容を確認し、確認チェックを入れてください。')
        if (old?.status === 'active') fail('failed-precondition', '既に本登録されています。')
        // Current company membership applies only at issuance; issued warranties retain their group.
        const groupId = company.defaultGroupId
        if (!groupId) fail('failed-precondition', 'HSに保証グループの設定を依頼してください。')
        const group = (await tx.get(db.doc(`warrantyGroups/${id(groupId)}`))).data()
        if (!group || group.enabled === false) fail('failed-precondition', '保証グループが未設定または無効です。HSに設定変更を依頼してください。')
        const year = fiscalYear(fields.applicationDate, group.fiscalStartMonth)
        const counterRef = db.doc(`warrantyCounters/${groupId}_${year}`)
        const counter = (await tx.get(counterRef)).data()
        // Old global counters require an explicit migration; never guess a year's high-water mark.
        if (!counter && (await tx.get(db.doc(`warrantyCounters/${groupId}`))).exists) fail('failed-precondition','旧採番カウンターの年度別移行が必要です。開発側へ依頼してください。')
        const sequence = (counter?.lastValue ?? 0) + 1
        const periods = fields.handoverDate ? coveragePeriods(fields.handoverDate, 10) : []
        next = { ...next, groupId, groupName: group.name, fiscalYear: fiscalYear(fields.applicationDate, group.fiscalStartMonth), warrantyNumber: warrantyNumber(group, fields.applicationDate, sequence), applicationDate: fields.applicationDate, status: 'active', years: 10, periods, startDate: fields.handoverDate, expiryDate: periods[0]?.expiryDate ?? '' }
        const duplicates = await tx.get(db.collection('propertyWarranties').where('warrantyNumber', '==', next.warrantyNumber).limit(1))
        if (!duplicates.empty) fail('failed-precondition', '既存の保証番号と重複します。HSで採番開始値を確認してください。')
        const warnings = applicationWarnings(fields,date)
        if (warnings.length && input.confirmWarnings !== true) throw new HttpsError('failed-precondition', '注意事項を確認してください。', { registrationWarnings: warnings })
        Object.assign(next,initialInsurance(fields.handoverDate),{warrantyNotified:false})
        next.insuranceEvents = []
        next.insuranceHistoryIncomplete = false
        next.billingItems = [{id:'initial',...periods[0],state:'pending'}]
        tx.set(counterRef, { lastValue: sequence, updatedAt: now })
      }
    } else if (action === 'undoExtend') {
      text(input.reason, '理由')
      const preview = extensionUndoPreview(old)
      if (!preview || input.targetRequestId !== preview.targetRequestId) fail('failed-precondition', '取消対象の延長を確認し、開き直してください。')
      if (preview.blockers.length) fail('failed-precondition',preview.blockers.join('\n'))
      next.years = preview.years
      next.periods = preview.periods
      next.expiryDate = preview.expiryDate
      // Restore notice state for the original interval, retaining later owner/date corrections.
      const target = old.history.find(h => h.requestId === preview.targetRequestId)
      next.warrantyNotified = target.before?.expiryDate === next.expiryDate && target.before?.warrantyNotified === true
      // Insurance period, reported state and last report are intentionally untouched.
    } else if (action === 'extend') {
      if (!old.handoverDate || old.status !== 'active' || old.years + 10 > old.maxYears) fail('failed-precondition', '延長できません。状態と最長保証期間を確認してください。')
      next.years = old.years + 10
      next.periods = coveragePeriods(old.handoverDate, next.years)
      next.expiryDate = next.periods.at(-1)?.expiryDate ?? ''
      next.warrantyNotified = false
      next.billingItems = [...(old.billingItems ?? []),{id:requestId,...next.periods.at(-1),state:'pending'}]
    } else {
      text(input.reason, '理由')
      if (action === 'restore') {
        if (!a.staff) fail('permission-denied', '取消の復元はHS担当者のみ操作できます。')
        if (old.status !== 'cancelled') fail('failed-precondition', '取消済みではありません。')
        next.status = 'active'
      } else {
        if (old.status !== 'active') fail('failed-precondition', '本登録済みの物件のみ取消できます。')
        if (input.confirmCancellation !== true) fail('failed-precondition','報告・延長・請求と取消の影響を確認してください。')
        next.status = 'cancelled'
      }
    }
    const before = old ? { applicationDate: old.applicationDate ?? '', handoverDate: old.handoverDate, startDate: old.startDate ?? '', expiryDate: old.expiryDate ?? '', maxYears: old.maxYears, years: old.years, warrantyNotified: old.warrantyNotified ?? false, ownerName: old.ownerName, ownerTelephone:old.ownerTelephone ?? '', status: old.status, periods: old.periods ?? [] } : null
    if (action !== 'notify') next.history = [...(old?.history ?? []), { kind: action, requestId, date, at: now.toDate().toISOString(), actorUid: uid, actorName: a.displayName ?? '', ...(action === 'undoExtend' ? {targetRequestId: input.targetRequestId} : {}), ...(operationTarget ? {target:operationTarget} : {}), reason: String(input.reason ?? ''), before }]
    // Separate receipts provide replay safety without introducing a business report/notice history.
    tx.set(db.doc(`propertyOperationReceipts/${ref.id}_${requestId}`),{uid,action,propertyId:ref.id,createdAt:now})
    next.revision = (old?.revision ?? 0) + 1
    next.updatedAt = now
    next.createdAt = old?.createdAt ?? now
    tx.set(ref, next)
    return { id: ref.id }
  })
}
