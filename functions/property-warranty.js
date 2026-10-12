import { pendingBillingRows } from './domain/billing-output.mjs'
import { companyBankFields, companyProfileDefaults, normalizeCompanyProfile, normalizeBillingRecipient, portalWarrantyGroup } from './domain/company-settings.mjs'
import { dashboardCounts } from './dashboard.js'
import { activeInsuranceWaivers, materializeInsuranceState, insuranceProjection, validateInsuranceState, insuranceMonthlyRows } from './domain/insurance-state.mjs'
import { assertInsuranceCapacity } from './domain/insurance-capacity.mjs'
import { certificatePeriods, certificateRows } from './domain/warranty-certificate.mjs'
import { AccountMutationError, mutateAccount } from './account-mutation.js'
import { createHash } from 'node:crypto'
import { externalKeySettings, normalizeExternalKey } from './domain/external-key.mjs'
import { normalizeBranchCode } from './domain/branch-code.mjs'
import { propertyFieldRequirements } from './domain/property-field-requirements.mjs'
import { monthlyQueryProjection, validMonth, withInsuranceDefaults } from './domain/monthly-query.mjs'
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
  if (!a.staff && (a.constructionCompanyId !== value.constructionCompanyId || (a.scope === 'branch' && a.branchId !== value.branchId))) fail('permission-denied', 'この工務店・本支店の物件は操作できません。')
}
// Legacy trial rows remain readable, but are not silently promoted to reportable insurance data.
const withInsurance = withInsuranceDefaults
const rows = snapshot => snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
function visibleInsurance(row, staff) {
  if (staff) return row
  const { insuranceWaiverEvents, insuranceMigration, ...visible } = row
  return visible
}
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
  if (!search && !companyId && purpose !== 'referenceStore') branches = branches.limit(20)
  const matching = items => search ? items.filter(row => row.name.includes(search)) : items
  return {
    companies: matching(rows(companies)).filter(row => !groupId || row.defaultGroupId === groupId),
    branches: matching(purpose === 'companyOptions' ? [] : rows(await branches.get())).filter(row => !companyId || row.constructionCompanyId === companyId),
    groups: a.staff ? rows(await db.collection('warrantyGroups').get()) : await (async()=>{const groupId=companies.docs[0]?.data()?.defaultGroupId;if(!groupId)return [];const group=await db.doc(`warrantyGroups/${groupId}`).get();return group.exists ? [portalWarrantyGroup(group.data(),group.id)] : []})(),
  }
}

async function requireBranchCode(db, tx, companyId, branchCode) {
  const company = (await tx.get(db.doc(`constructionCompanies/${id(companyId)}`))).data()
  if (!company) fail('not-found', '工務店が見つかりません。')
  const group = (await tx.get(db.doc(`warrantyGroups/${id(company.defaultGroupId)}`))).data()
  if (!group) fail('not-found', '保証グループが見つかりません。')
  let required
  try { required = externalKeySettings(group).required } catch (error) { fail('failed-precondition', error.message) }
  if (required && !branchCode) fail('invalid-argument', '一括取込み対象の保証グループでは本支店コードを入力してください。')
}

async function reserveBranchCode(db, tx, ref, old, value) {
  const reservation = code => db.doc('branchCodeReservations/' + createHash('sha256').update(value.constructionCompanyId + '\0' + code).digest('hex'))
  const previousCode = String(old?.branchCode ?? '').trim()
  // Reservation ownership follows the branch's own enabled state, not its parent.
  const newRef = value.enabled && value.branchCode ? reservation(value.branchCode) : null
  const previousRef = previousCode ? reservation(previousCode) : null
  const held = newRef ? (await tx.get(newRef)).data() : null
  const previous = previousRef ? (newRef?.path === previousRef.path ? held : (await tx.get(previousRef)).data()) : null
  const ownsPrevious = previous && previous.branchId === ref.id && previous.branchCode === previousCode && previous.constructionCompanyId === value.constructionCompanyId
  // Missing/corrupt active reservations need explicit repair, not silent release.
  if (previousCode && old?.enabled !== false && !ownsPrevious) fail('failed-precondition', '本支店コードの管理情報を確認してください。')
  if (held && (held.branchId !== ref.id || held.branchCode !== value.branchCode || held.constructionCompanyId !== value.constructionCompanyId)) fail('already-exists', '同じ工務店内で本支店コードが重複しています。')
  if (newRef) {
    // Compare full codes in the company scope; indexed values may truncate long codes.
    const matching = await tx.get(db.collection('companyBranches').where('constructionCompanyId','==',value.constructionCompanyId))
    if (matching.docs.some(row => row.id !== ref.id && row.data().enabled !== false && row.data().branchCode === value.branchCode)) fail('already-exists', '同じ工務店内で本支店コードが重複しています。')
  }
  // Editing an inactive branch must never delete another branch's reservation.
  if (ownsPrevious && previousRef.path !== newRef?.path) tx.delete(previousRef)
  if (newRef) tx.set(newRef, { constructionCompanyId:value.constructionCompanyId, branchCode:value.branchCode, branchId:ref.id })
}

export async function propertyPrototypeOperation(auth, db, input, uid) {
  const a = await actor(db, uid)
  const action = input?.action
  if (action === 'companyProfile' || action === 'saveCompanyProfile') {
    if (!a.staff) fail('permission-denied', 'HS担当者のみ利用できます。')
    const ref = db.doc('prototypeSettings/companyProfile')
    const visibleProfile = saved => ({ ...Object.fromEntries(Object.keys(companyProfileDefaults()).map(key => [key, saved[key] ?? ''])), updatedAt: saved.updatedAt?.toDate?.().toISOString() ?? null, updatedBy: saved.updatedBy ?? '', updatedByName: saved.updatedByName ?? '' })
    if (action === 'saveCompanyProfile') {
      manager(a)
      let profile
      try { profile = normalizeCompanyProfile(input.profile) } catch (error) { fail('invalid-argument', error.message) }
      // Older clients omit bank fields. Preserve each omitted key; explicit blanks clear it.
      for (const key of companyBankFields) if (!Object.hasOwn(input.profile, key)) delete profile[key]
      return db.runTransaction(async tx => {
        const previous = (await tx.get(ref)).data() ?? {}
        const value = { ...profile, updatedAt: Timestamp.now(), updatedBy: uid, updatedByName: String(a.displayName ?? '') }
        tx.set(ref, value, { merge: true })
        return visibleProfile({ ...previous, ...value })
      })
    }
    const saved = (await ref.get()).data() ?? {}
    return visibleProfile(saved)
  }
  if (action === 'dashboard') return dashboardCounts(db,{uid,runtimeGeneration:input.runtimeGeneration})
  if (action === 'alertSettings') return normalizeAlertSettings((await db.doc('prototypeSettings/alerts').get()).data())
  if (action === 'saveAlertSettings') {
    manager(a)
    const settings = normalizeAlertSettings(input.settings)
    await db.doc('prototypeSettings/alerts').set({ ...settings, updatedAt: Timestamp.now() })
    return settings
  }
  if (action === 'catalog') return catalog(db, a, String(input.search ?? '').trim(), input.groupId || '', input.companyId || '', input.purpose || '')
  if (action === 'certificateList' || action === 'billingList') {
    if (!a.staff) fail('permission-denied', 'HS担当者のみ出力できます。')
    if (!validMonth(input.month)) fail('invalid-argument', '対象年月を指定してください。')
    if (input.includeDone !== undefined && typeof input.includeDone !== 'boolean') fail('invalid-argument', '処理済みの表示条件を確認してください。')
    const includeDone = input.includeDone === true
    const groupId = id(input.groupId)
    const group = (await db.doc(`warrantyGroups/${groupId}`).get()).data()
    if (!group || group.enabled === false) fail('failed-precondition', '有効な保証グループを選択してください。')
    if (action === 'billingList') {
      if ((await db.doc('prototypeSettings/billingQueries').get()).data()?.version !== 1) fail('failed-precondition', '請求一覧の準備中です。開発側へ確認してください。')
      const collection = db.collection('propertyWarranties').where('groupId','==',groupId)
      if (includeDone && (await db.doc('prototypeSettings/monthlyQueries').get()).data()?.version !== 1) fail('failed-precondition', '月別検索の準備中です。開発側へ確認してください。')
      const page = await (includeDone ? collection.where('billingQueryMonths','array-contains',input.month) : collection.where('billingPendingMonth','>','').where('billingPendingMonth','<=',input.month)).get()
      return {rows:pendingBillingRows(rows(page), input.month, {includeDone})}
    }
    if ((await db.doc('prototypeSettings/certificateQueries').get()).data()?.version !== 1) fail('failed-precondition', '保証書一覧の準備中です。開発側へ確認してください。')
    const collection = db.collection('propertyWarranties').where('groupId','==',groupId)
    const page = await (includeDone ? collection.where('certificateQueryMonths','array-contains',input.month) : collection.where('certificatePendingMonth','>','').where('certificatePendingMonth','<=',input.month)).get()
    return { rows: certificateRows(rows(page), input.month, {includeDone}) }
  }
  if (action === 'list' || action === 'propertyList') {
    const f = input.filter ?? {}
    if (f.includeDone !== undefined && typeof f.includeDone !== 'boolean') fail('invalid-argument', '処理済みの表示条件を確認してください。')
    if (action === 'propertyList') {
      if (Object.keys(f).some(key => key !== 'warrantyNumber') || (f.warrantyNumber != null && typeof f.warrantyNumber !== 'string')) fail('invalid-argument', '物件・保証一覧は保証番号の完全一致検索のみ利用できます。')
      f.warrantyNumber = (f.warrantyNumber ?? '').trim()
    }
    if (f.alertKind && !['warranty','insurance'].includes(f.alertKind)) fail('invalid-argument', '案内の種類が不正です。')
    if (f.alertKind === 'insurance' && !a.staff) fail('permission-denied', '保険満了案内はHS担当者のみ閲覧できます。')
    if ((f.reportMonth || f.alertKind === 'insurance') && (await db.doc('prototypeSettings/insuranceStates').get()).data()?.version !== 1) fail('failed-precondition','保険業務の準備中です。開発側へ確認してください。')
    let query = db.collection('propertyWarranties')
    if (!a.staff) query = query.where('constructionCompanyId', '==', a.constructionCompanyId)
    if (!a.staff && a.scope === 'branch') query = query.where('branchId', '==', a.branchId)
    if (f.warrantyNumber?.trim()) query = query.where('warrantyNumber', '==', f.warrantyNumber.trim())
    if ((f.reportMonth || f.billingMonth) && !a.staff) fail('permission-denied', 'HS担当者のみ出力できます。')
    const monthly = !!(f.reportMonth || f.billingMonth)
    const monthlyBaseQuery = query
    if (monthly) {
      if (f.reportMonth && f.billingMonth || !validMonth(f.reportMonth || f.billingMonth)) fail('invalid-argument', '対象年月を指定してください。')
      if ((await db.doc('prototypeSettings/monthlyQueries').get()).data()?.version !== 1) fail('failed-precondition', '月別検索の準備中です。開発側へ確認してください。')
      if (f.reportMonth && f.includeDone === true && (await db.doc('prototypeSettings/insuranceReportQueries').get()).data()?.version !== 1) fail('failed-precondition', '報告済みの月別検索の準備中です。開発側へ確認してください。')
      query = f.reportMonth
        ? query.where('insuranceQueryStart', '<=', f.reportMonth).where('insuranceQueryEnd', '>=', f.reportMonth)
        : query.where('billingQueryMonths', 'array-contains', f.billingMonth)
    } else query = query.orderBy('updatedAt', 'desc').orderBy(FieldPath.documentId(), 'desc')
    const filtered = ['reportMonth','billingMonth','warrantyNumber','handoverMissing', 'alertKind', 'search', 'companyId', 'branchId', 'groupId', 'fiscalYear', 'status', 'expiryBefore', 'from', 'to','applicationFrom','applicationTo','handoverFrom','handoverTo'].some(k => typeof f[k] === 'string' && f[k].trim())
    for (const key of ['application','handover']) if (f[`${key}From`] && f[`${key}To`] && f[`${key}From`] > f[`${key}To`]) fail('invalid-argument','日付の開始・終了を確認してください。')
    if (!filtered) query = query.limit(20)
    const snapshots = await Promise.all([query.get(), ...(f.reportMonth && f.includeDone === true ? [monthlyBaseQuery.where('insuranceReportedQueryMonths','array-contains',f.reportMonth).get()] : [])])
    const unique = new Map(snapshots.flatMap(page=>rows(page)).map(row=>[row.id,row]))
    let result = [...unique.values()].map(withInsurance).filter(row => matchesProperty(row, f))
    let unclassifiedCount = 0
    if (monthly) result.sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0) || (b.updatedAt?.nanoseconds ?? 0) - (a.updatedAt?.nanoseconds ?? 0) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    if (f.alertKind) {
      const settings = normalizeAlertSettings((await db.doc('prototypeSettings/alerts').get()).data())
      result = result.filter(row => expiryAlertEligible(row, f.alertKind, japanDate(), settings[f.alertKind === 'insurance' ? 'insuranceMonths' : 'warrantyMonths']))
      if (f.alertKind === 'warranty' && f.notification !== 'all') result = result.filter(row => row.warrantyNotified === (f.notification === 'done'))
    }
    if (f.reportMonth) ({rows:result,unclassifiedCount} = insuranceMonthlyRows(result, f.reportMonth, {includeDone:f.includeDone === true}))
    if (f.billingMonth) result = billingRows(result, f.billingMonth)
    if (f.from || f.to) result = reportRows(result, f.from, f.to, f.includeCancelled === true)
    if (a.staff && input.omitReferenceLabels === true) return { rows: result, limited: !filtered, ...(f.reportMonth ? {unclassifiedCount} : {}) }
    // Resolve labels for the displayed result without unbounded master reads or child listeners.
    const paths = [...new Set(result.flatMap(row => [`constructionCompanies/${row.constructionCompanyId}`, ...(row.branchId ? [`companyBranches/${row.branchId}`] : [])]))]
    const names = new Map()
    for(let i=0;i<paths.length;i+=100) for(const doc of await db.getAll(...paths.slice(i,i+100).map(path=>db.doc(path)))) names.set(doc.ref.path,doc.data()?.name ?? '')
    result = result.map(row=>({...row,companyLabel:names.get(`constructionCompanies/${row.constructionCompanyId}`),branchLabel:row.branchId ? names.get(`companyBranches/${row.branchId}`) : '未指定'}))
    return { rows: result.map(row => visibleInsurance(row,a.staff)), limited: !filtered, ...(f.reportMonth ? {unclassifiedCount} : {}) }
  }
  if (action === 'detail') {
    const snapshot = await db.doc(`propertyWarranties/${id(input.id)}`).get()
    if (!snapshot.exists) fail('not-found', '物件が見つかりません。')
    owner(a, snapshot.data())
    const value = snapshot.data()
    if (a.staff && input.omitReferenceLabels === true) return withInsurance({...value,id:snapshot.id})
    const company = (await db.doc(`constructionCompanies/${value.constructionCompanyId}`).get()).data()
    const branch = value.branchId ? (await db.doc(`companyBranches/${value.branchId}`).get()).data() : null
    return visibleInsurance(withInsurance({ ...value, id: snapshot.id, companyLabel: company?.name ?? value.constructionCompanyId, branchLabel: branch?.name ?? (value.branchId || '未指定') }),a.staff)
  }
  if (action === 'reenableMaster') {
    if (!a.staff) fail('permission-denied', 'HS担当者のみ設定できます。')
    // Recovery admission validates these transport fields before dispatching this operation.
    if (!['company','branch','group'].includes(input.kind) || Object.keys(input).some(key => !['action','kind','id','runtimeGeneration','runtimeProtocol'].includes(key))) fail('invalid-argument', '有効化と内容の編集は別々に行ってください。')
    const collection = { company: 'constructionCompanies', branch: 'companyBranches', group: 'warrantyGroups' }[input.kind]
    const ref = db.doc(`${collection}/${id(input.id)}`)
    await db.runTransaction(async tx => {
      const old = (await tx.get(ref)).data()
      if (!old) fail('not-found', '対象が見つかりません。')
      if (old.enabled !== false) fail('failed-precondition', '現在の状態を取得し直してください。')
      if (input.kind === 'company' && !(await tx.get(db.doc(`warrantyGroups/${id(old.defaultGroupId)}`))).exists) fail('not-found', '保証グループが見つかりません。')
      if (input.kind === 'group') {
        const all = await tx.get(db.collection('warrantyGroups'))
        if (all.docs.some(row => row.id !== ref.id && normalizeWarrantyPrefix(row.data().prefix) === normalizeWarrantyPrefix(old.prefix))) fail('already-exists', '同じ接頭辞のグループが存在します。')
      }
      if (input.kind === 'branch') {
        let branchCode
        try { branchCode = normalizeBranchCode(old.branchCode) } catch (error) { fail('failed-precondition', error.message) }
        if (branchCode !== (old.branchCode ?? '')) fail('failed-precondition', '本支店コードの管理情報を確認してください。')
        await requireBranchCode(db, tx, old.constructionCompanyId, branchCode)
        await reserveBranchCode(db, tx, ref, old, { ...old, branchCode, enabled: true })
      }
      tx.set(ref, { enabled: true, updatedAt: Timestamp.now() }, { merge: true })
    })
    return { id: ref.id }
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
      if (input.groupId) fail('invalid-argument', '本支店独自の保証グループは設定できません。所属工務店のグループを使用します。')
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
      if (old?.enabled === false) fail('failed-precondition', '無効なマスタは編集できません。先に有効化してください。')
      value.enabled = input.enabled ?? old?.enabled ?? true
      if (old && action === 'saveCompany' && old.defaultGroupId !== value.defaultGroupId) fail('failed-precondition', '登録済み工務店の所属保証グループは変更できません。')
      if (old && action === 'saveBranch' && old.constructionCompanyId !== value.constructionCompanyId) fail('failed-precondition', '登録済み本支店の工務店は変更できません。')
      if (action === 'saveBranch') {
        // Older clients omit the field; they must not erase a configured code.
        try { value.branchCode = normalizeBranchCode(input.branchCode ?? old?.branchCode ?? '') }
        catch (error) { fail('invalid-argument', error.message) }
        await requireBranchCode(db, tx, value.constructionCompanyId, value.branchCode)
        await reserveBranchCode(db, tx, ref, old, value)
      }
      // Reserve numbering settings and prefixes from creation, even while disabled.
      if (action === 'saveGroup') {
        if (input.billingRecipient !== undefined) {
          if (!input.billingRecipient || typeof input.billingRecipient !== 'object' || Array.isArray(input.billingRecipient)) fail('invalid-argument', '請求先の指定が不正です。')
          try { value.billingRecipient = normalizeBillingRecipient({ ...old?.billingRecipient, ...input.billingRecipient }) }
          catch (error) { fail('invalid-argument', error.message) }
        }
        let settings, previous
        try {
          previous = old ? externalKeySettings(old) : null
          settings = externalKeySettings({ name:value.name, externalKeyRequired:input.externalKeyRequired ?? previous?.required, externalKeyLabel:input.externalKeyLabel ?? previous?.label })
        } catch (error) { fail('invalid-argument', error.message) }
        if (previous && settings.required !== previous.required) fail('failed-precondition', '登録済みグループの外部キー必須設定は変更できません。')
        value.externalKeyRequired = settings.required
        value.externalKeyLabel = settings.label
        try {
          const previousFields = old ? propertyFieldRequirements(old) : null
          const fieldSettings = propertyFieldRequirements({ name: value.name,
            addressRequired: input.addressRequired === undefined ? previousFields?.addressRequired : input.addressRequired,
            insulationMaterialsRequired: input.insulationMaterialsRequired === undefined ? previousFields?.insulationMaterialsRequired : input.insulationMaterialsRequired })
          if (previousFields && Object.keys(previousFields).some(key => previousFields[key] !== fieldSettings[key])) fail('failed-precondition', '登録済みグループの住所・資材名の必須設定は変更できません。')
          Object.assign(value, fieldSettings)
        } catch (error) { if (error instanceof HttpsError) throw error; fail('invalid-argument', error.message) }
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
    if (branchId && (await db.doc(`companyBranches/${branchId}`).get()).data()?.constructionCompanyId !== constructionCompanyId) fail('invalid-argument', '所属本支店が不正です。')
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
  if (!['waiveInsurance','undoInsuranceWaiver','save', 'register', 'extend', 'undoExtend', 'cancel', 'restore','notify','report','undoReport','bill','undoBill','confirmUnbilled','issueCertificate','billPeriods','undoCertificate'].includes(action)) fail('invalid-argument', '操作を確認してください。')
  if (['waiveInsurance','undoInsuranceWaiver','notify','report','undoReport','undoExtend','bill','undoBill','confirmUnbilled','issueCertificate','billPeriods','undoCertificate'].includes(action) && !a.staff) fail('permission-denied', 'HS担当者のみ操作できます。')
  const ref = db.doc(`propertyWarranties/${id(input.id)}`)
  const requestId = id(input.requestId)
  return db.runTransaction(async tx => {
    const currentActor = await tx.get(db.doc(`${a.staff ? 'staffAccounts' : 'constructionCompanyAccounts'}/${uid}`))
    if (currentActor.data()?.enabled !== true) fail('permission-denied', 'アカウントが無効です。')
    if (!a.staff && ['constructionCompanyId','branchId','scope'].some(key => currentActor.data()[key] !== a[key])) fail('aborted', 'アカウントの所属が変更されました。ログインし直してください。')
    const snapshot = await tx.get(ref)
    let old = snapshot.data()
    if (old) owner(a, old)
    const receipt = (await tx.get(db.doc(`propertyOperationReceipts/${ref.id}_${requestId}`))).data()
    if (receipt) {
      if (receipt.uid !== uid || receipt.action !== action) fail('failed-precondition','操作識別子を再利用できません。')
      return {id:ref.id}
    }
    if (old?.history?.some(event => event.requestId === requestId)) return { id: ref.id }
    if (input.operationProtocol !== 1) fail('failed-precondition','保存形式が変更されました。画面を再読込してください。')
    const insuranceReady = (await tx.get(db.doc('prototypeSettings/insuranceStates'))).data()?.version === 1
    if (['waiveInsurance','undoInsuranceWaiver','report','undoReport'].includes(action) && !insuranceReady) fail('failed-precondition','保険業務の準備中です。開発側へ確認してください。')
    if ((old?.revision ?? 0) !== Number(input.revision ?? 0)) fail('aborted', '他の操作で更新されました。一覧から開き直してください。')
    if (!old && !['save', 'register'].includes(action)) fail('not-found', '物件が見つかりません。')
    const now = Timestamp.now(), date = japanDate(now.toDate())
    if (old) {
      try {
        const original = old
        old = materializeInsuranceState(old,{at:now.toDate().toISOString(),sourceFingerprint:createHash('sha256').update(JSON.stringify({insuranceEvents:original.insuranceEvents??null,insuranceStartDate:original.insuranceStartDate??null,insuranceExpiryDate:original.insuranceExpiryDate??null,revision:original.revision??0})).digest('hex')})
        const errors = validateInsuranceState(old)
        if (errors.length) fail('failed-precondition',errors.join('\n'))
      } catch (error) { fail('failed-precondition',error.message) }
    }
    if (old && Object.hasOwn(old,'ownerName') && (typeof old.name !== 'string' || !old.name.trim() || typeof old.ownerName !== 'string' || old.ownerName.trim() && old.name.trim() !== old.ownerName.trim())) fail('failed-precondition','旧名称に不一致があります。開発者へ確認してください。')
    let next = { ...old }
    let newKeyReservation = null
    let operationTarget = null
    if (['waiveInsurance','undoInsuranceWaiver'].includes(action)) {
      if (old.status !== 'active') fail('failed-precondition','本登録済みの物件だけが対象です。')
      const period = old.insurancePeriods.find(period => period.id === input.insurancePeriodId)
      if (!period || period.expiryDate < date) fail('failed-precondition','対象の保険期間が終了したため変更できません。')
      if (action === 'waiveInsurance') {
        if (period.state !== 'pending') fail('failed-precondition','未報告の保険期間を選択してください。')
        const reason = text(input.reason,'報告不要とする理由')
        next.insuranceWaiverEvents = [...old.insuranceWaiverEvents,{kind:'waive',id:requestId,periodId:period.id,warrantyPeriodId:period.warrantyPeriodId,basisRevision:period.basisRevision,half:period.half,startDate:period.startDate,expiryDate:period.expiryDate,reason,actorUid:id(uid),actorName:String(a.displayName??''),at:now.toDate().toISOString()}]
      } else {
        if (period.state !== 'waived' || !activeInsuranceWaivers(old).some(event => event.id === period.waiverId)) fail('failed-precondition','報告不要の状態が変わりました。開き直してください。')
        next.insuranceWaiverEvents = [...old.insuranceWaiverEvents,{kind:'undoWaive',id:requestId,targetId:period.waiverId,periodId:period.id,actorUid:id(uid),at:now.toDate().toISOString()}]
      }
    } else if (action === 'undoCertificate') {
      if (old.status !== 'active') fail('failed-precondition', '本登録済みの物件だけが対象です。')
      const period = certificatePeriods(old).find(p=>p.id === input.warrantyPeriodId && p.identifiable)
      if (!period || !period.certificateIssued || period.startDate !== input.startDate || period.expiryDate !== input.expiryDate) fail('failed-precondition','発行済みの保証期間を確認して開き直してください。')
      text(input.reason,'理由')
      next.certificateItems = [...(old.certificateItems ?? []).filter(item=>item.id !== period.id), {id:period.id,startDate:period.startDate,expiryDate:period.expiryDate,issued:false,requestId,at:now.toDate().toISOString(),actorUid:uid}]
      operationTarget = {id:period.id,startDate:period.startDate,expiryDate:period.expiryDate}
    } else if (action === 'billPeriods') {
      if (old.status !== 'active') fail('failed-precondition','本登録済みの物件だけが対象です。')
      if (!validMonth(input.month) || !Array.isArray(input.periods) || !input.periods.length || input.periods.length > 3 || new Set(input.periods.map(p=>p?.id)).size !== input.periods.length) fail('invalid-argument','対象年月と保証期間を確認してください。')
      if (old.groupId !== input.groupId) fail('failed-precondition','保証グループが一致しません。')
      const available = warrantyTransactions(old)
      const selected = input.periods.map(target=>{
        const period = available.find(p=>p.id === target?.id && p.identifiable)
        if (!period || period.billingState !== 'pending' || !validMonth(period.billingDate.slice(0,7)) || period.billingDate.slice(0,7)>input.month || period.startDate !== target.startDate || period.expiryDate !== target.expiryDate) fail('failed-precondition','請求対象の保証期間・状態が変わりました。一覧を更新してください。')
        return period
      })
      next.billingItems = [...(old.billingItems ?? []).filter(item=>!selected.some(p=>p.id === item.id)), ...selected.map(p=>({id:p.id,startDate:p.startDate,expiryDate:p.expiryDate,state:'billed',requestId,at:now.toDate().toISOString(),actorUid:uid}))]
      operationTarget = {periods:selected.map(p=>({id:p.id,startDate:p.startDate,expiryDate:p.expiryDate}))}
    } else if (action === 'issueCertificate') {
      if (old.status !== 'active') fail('failed-precondition', '本登録済みの物件だけが対象です。')
      if (!validMonth(input.month) || !Array.isArray(input.periods) || !input.periods.length || input.periods.length > 3 || new Set(input.periods.map(p => p?.id)).size !== input.periods.length) fail('invalid-argument', '対象年月と保証期間を確認してください。')
      const available = certificatePeriods(old)
      const selected = input.periods.map(target => {
        const period = available.find(p => p.id === target?.id && p.identifiable)
        if (!period || period.startDate !== target.startDate || period.expiryDate !== target.expiryDate || period.certificateMonth > input.month || period.certificateIssued) fail('failed-precondition', '発行対象の保証期間・状態が変わりました。一覧を更新してください。')
        return period
      })
      next.certificateItems = [...(old.certificateItems ?? []).filter(item => !selected.some(p => p.id === item.id)), ...selected.map(p => ({id:p.id,startDate:p.startDate,expiryDate:p.expiryDate,issued:true,requestId,at:now.toDate().toISOString(),actorUid:uid}))]
      operationTarget = {periods:selected.map(p => ({id:p.id,startDate:p.startDate,expiryDate:p.expiryDate}))}
    } else if (['bill','undoBill','confirmUnbilled'].includes(action)) {
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
        Object.assign(next,{insuranceStartDate:target.startDate,insuranceExpiryDate:target.expiryDate,insuranceRenewalMonth:target.expiryDate.slice(0,7).replace('-','')})
        if (renewal) next.insuranceEverRenewed = true
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
      if (!Object.hasOwn(input.fields ?? {}, 'address')) fail('failed-precondition', '住所の入力形式が変更されました。画面を再読込してください。')
      if (typeof input.fields.address !== 'string') fail('invalid-argument', '住所は文字列で入力してください。')
      if (old?.status === 'cancelled') fail('failed-precondition', '取消物件は復元後に編集してください。')
      const supplied = { ...input.fields }
      if (!supplied.constructionCompanyId || !supplied.branchId) fail('invalid-argument', '工務店・本支店を選択してください。本店も本支店として登録し、選択してください。')
      if (old?.status === 'active' && supplied.applicationDate === undefined) supplied.applicationDate = old.applicationDate
      const fields = normalizeProperty(supplied, false)
      if (old?.groupName?.trim().toUpperCase() === 'UH' && fields.maxYears !== 10) fail('failed-precondition', 'UHの最長保証期間は10年です。')
      if (old?.status === 'active' && fields.applicationDate !== old.applicationDate) fail('failed-precondition', '本登録後の申込日は変更できません。')
      if (old?.status === 'active' && (supplied.constructionCompanyId !== old.constructionCompanyId || (supplied.branchId || '') !== old.branchId)) fail('failed-precondition','本登録後の工務店・本支店は変更できません。誤登録は取消後に再登録してください。')
      if ((old?.years ?? 0) > fields.maxYears) fail('failed-precondition', '既に延長した期間より短い上限にはできません。')
      const constructionCompanyId = old?.status === 'active' ? old.constructionCompanyId : id(input.fields.constructionCompanyId)
      const branchId = id(old?.status === 'active' ? old.branchId : input.fields.branchId)
      owner(a, { constructionCompanyId, branchId })
      const company = (await tx.get(db.doc(`constructionCompanies/${constructionCompanyId}`))).data()
      const branch = (await tx.get(db.doc(`companyBranches/${branchId}`))).data()
      if (!company || !branch || branch.constructionCompanyId !== constructionCompanyId) fail('invalid-argument', '工務店・本支店を確認してください。')
      if ((!old || action === 'register') && (company.enabled === false || branch.enabled === false)) fail('failed-precondition', '無効な工務店・本支店では新規登録できません。既存の保証は引き続き処理できます。')
      // Issued records retain their group even after a company's reassignment.
      const keyGroupId = old?.status === 'active' ? old.groupId : company.defaultGroupId
      const keyGroup = keyGroupId ? (await tx.get(db.doc(`warrantyGroups/${id(keyGroupId)}`))).data() : null
      let keySettings, externalKey
      try {
        keySettings = externalKeySettings(keyGroup ?? {})
        externalKey = normalizeExternalKey(Object.hasOwn(supplied,'externalKey') ? supplied.externalKey : old?.externalKey, keySettings.label)
      } catch (error) { fail('invalid-argument', error.message) }
      if (old?.externalKey && externalKey !== old.externalKey) fail('failed-precondition', `${keySettings.label}は登録後に変更できません。`)
      if (!keySettings.required && externalKey && !old?.externalKey) fail('invalid-argument', 'この保証グループでは外部キーを入力できません。画面を再読込してください。')
      if (keySettings.required && !externalKey) fail('invalid-argument', `${keySettings.label}を入力してください。`)
      if (externalKey) {
        const keyRef = db.doc('externalKeyReservations/' + createHash('sha256').update(externalKey).digest('hex'))
        const held = (await tx.get(keyRef)).data()
        const matching = await tx.get(db.collection('propertyWarranties').where('externalKey','==',externalKey).limit(2))
        if (held && (held.propertyId !== ref.id || held.externalKey !== externalKey) || matching.docs.some(row=>row.id !== ref.id)) fail('already-exists', `${keySettings.label}は既に登録されています。`)
        if (old?.externalKey && !held) fail('failed-precondition', '外部キーの管理情報を開発側へ確認してください。')
        if (!held) newKeyReservation = {ref:keyRef,value:{externalKey,propertyId:ref.id,createdAt:now}}
      }
      normalizeProperty(supplied, action === 'register' || old?.status === 'active', keyGroup ?? {})
      if (old?.status === 'active' && old.handoverDate && !fields.handoverDate) fail('failed-precondition', '確定済みの引渡日は空欄に戻せません。')
      next = { ...next, ...fields, constructionCompanyId, branchId, status: old?.status ?? 'draft', years: old?.years ?? 0 }
      if (externalKey) next.externalKey = externalKey
      for (const key of ['prefecture','municipality','streetTownAndNumber']) delete next[key]
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
        if (group.name?.trim().toUpperCase() === 'UH' && fields.maxYears !== 10) fail('failed-precondition', 'UHの最長保証期間は10年です。')
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
    const before = old ? { applicationDate: old.applicationDate ?? '', handoverDate: old.handoverDate, startDate: old.startDate ?? '', expiryDate: old.expiryDate ?? '', maxYears: old.maxYears, years: old.years, warrantyNotified: old.warrantyNotified ?? false, name: old.name, ownerTelephone:old.ownerTelephone ?? '', status: old.status, periods: old.periods ?? [] } : null
    if (!['notify','waiveInsurance','undoInsuranceWaiver'].includes(action)) next.history = [...(old?.history ?? []), { kind: action, requestId, date, at: now.toDate().toISOString(), actorUid: uid, actorName: a.displayName ?? '', ...(action === 'undoExtend' ? {targetRequestId: input.targetRequestId} : {}), ...(operationTarget ? {target:operationTarget} : {}), reason: String(input.reason ?? ''), before }]
    // Separate receipts provide replay safety without introducing a business report/notice history.
    if (newKeyReservation) tx.create(newKeyReservation.ref,newKeyReservation.value)
    tx.set(db.doc(`propertyOperationReceipts/${ref.id}_${requestId}`),{uid,action,propertyId:ref.id,createdAt:now})
    next.revision = (old?.revision ?? 0) + 1
    next.updatedAt = now
    next.createdAt = old?.createdAt ?? now
    delete next.ownerName
    try {
      const changedHandover = old?.status === 'active' && old.handoverDate !== next.handoverDate
      next = materializeInsuranceState(next,{reconcile:true,newRegistration: action === 'register' || changedHandover,basisRevision: changedHandover ? old.insuranceBasisRevision + 1 : next.insuranceBasisRevision ?? 1})
      // Before publication, unrelated existing business may preserve an unknown
      // interval. Activation/coverage changes must never introduce one into use.
      // Once published every active write preserves readiness; the marker read
      // participates in this transaction so publication cannot race this choice.
      const coverageChanged = ['handoverDate','startDate','expiryDate','years'].some(key => old?.[key] !== next[key])
      const requireKnown = insuranceReady || old?.status !== 'active' || coverageChanged
      const errors = validateInsuranceState(next,requireKnown ? {today:date} : {})
      if (errors.length) fail('failed-precondition',errors.join('\n'))
      Object.assign(next,insuranceProjection(next))
    } catch (error) { fail('failed-precondition',error.message) }
    Object.assign(next, monthlyQueryProjection(next))
    try { assertInsuranceCapacity(next,{documentPath:ref.path,today:date}) } catch (error) { fail('resource-exhausted',error.message) }
    tx.set(ref, next)
    return { id: ref.id }
  })
}
