import { createHash } from 'node:crypto'
import { externalKeySettings } from './domain/external-key.mjs'
import { propertyFieldRequirements } from './domain/property-field-requirements.mjs'
import { Timestamp } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { insuranceNoticeProjection } from './domain/insurance-notice-query.mjs'
import { monthlyQueryProjection } from './domain/monthly-query.mjs'
import { materializeInsuranceState, insuranceProjection } from './domain/insurance-state.mjs'
import { assertInsuranceCapacity } from './domain/insurance-capacity.mjs'
import { prepareBulkImportRows } from './domain/property-bulk-import.mjs'
import { coveragePeriods, fiscalYear, initialInsurance, initialInsurancePeriodAt, japanDate, warrantyNumber } from './domain/property-warranty.mjs'

const hash = value => createHash('sha256').update(value).digest('hex')
const fail = (code, message, errors, safeToDiscard = false) => { throw new HttpsError(code, message, errors || safeToDiscard ? { ...(errors ? { errors } : {}), ...(safeToDiscard ? { safeToDiscard: true } : {}) } : undefined) }
const identifier = value => typeof value === 'string' && /^[\w-]{1,128}$/.test(value) ? value : fail('invalid-argument', '識別子が不正です。')
const staffRoles = ['developer_superuser', 'house_solution_administrator', 'general_staff']
const reason = (row, field, message) => ({ line: row?.line ?? 0, field, message })

export async function readImportDocuments(tx, refs) {
  const snapshots = new Map()
  for (let offset = 0; offset < refs.length; offset += 100) {
    for (const snapshot of await tx.getAll(...refs.slice(offset, offset + 100))) snapshots.set(snapshot.ref.path, snapshot)
  }
  return snapshots
}

// Do not limit a chunk to one document: every matching value must be rejected.
export async function existingImportValues(tx, collection, field, values) {
  const unique = [...new Set(values)], found = new Set()
  for (let offset = 0; offset < unique.length; offset += 30) {
    const snapshot = await tx.get(collection.where(field, 'in', unique.slice(offset, offset + 30)))
    for (const doc of snapshot.docs) found.add(doc.data()[field])
  }
  return found
}

// Caller must use the shared recovery admission boundary for commit.
export async function propertyBulkImportOperation(db, input, uid) {
  identifier(uid)
  if (!['preview', 'commit', 'status'].includes(input?.action)) fail('invalid-argument', '取込操作が不正です。')
  if (input.action === 'status') {
    const requestId = identifier(input.requestId)
    const account = (await db.doc(`staffAccounts/${uid}`).get()).data()
    if (account?.enabled !== true || !staffRoles.includes(account.role)) fail('permission-denied', 'HS担当者のみ取込結果を確認できます。')
    const receipt = (await db.doc(`propertyImportReceipts/${requestId}`).get()).data()
    if (!receipt) return { pending: true }
    if (receipt.uid !== uid) fail('permission-denied', 'この取込結果は確認できません。')
    if (!Number.isSafeInteger(receipt.count) || receipt.count < 1 || !Array.isArray(receipt.ids) || receipt.ids.length !== receipt.count || receipt.ids.some(value => typeof value !== 'string' || !/^[\w-]{1,128}$/.test(value)) || new Set(receipt.ids).size !== receipt.ids.length) fail('failed-precondition', '取込結果の記録を開発側へ確認してください。')
    return { count: receipt.count, ids: receipt.ids, replayed: true }
  }
  const commit = input.action === 'commit'
  const groupId = identifier(input.groupId), companyId = identifier(input.companyId)
  const requestId = identifier(input.requestId)
  if (commit && (input.confirmed !== true || !/^[a-f0-9]{64}$/.test(input.previewHash ?? ''))) fail('failed-precondition', 'プレビューを確認してから全件本登録してください。')
  const format = input.format ?? 'common'
  const digest = hash(JSON.stringify({ groupId, companyId, format, csv: input.csv }))
  let refs
  const receiptRef = db.doc(`propertyImportReceipts/${requestId}`)
  return db.runTransaction(async tx => {
    const account = (await tx.get(db.doc(`staffAccounts/${uid}`))).data()
    if (account?.enabled !== true || !staffRoles.includes(account.role)) fail('permission-denied', 'HS担当者のみ一括取込みできます。')
    if (commit) {
      const receipt = (await tx.get(receiptRef)).data()
      if (receipt) {
        if (receipt.uid !== uid || receipt.digest !== digest || receipt.previewHash !== input.previewHash) fail('failed-precondition', '取込識別子を別の内容・利用者で再利用できません。')
        return { count: receipt.count, ids: receipt.ids, replayed: true }
      }
      if (input.operationProtocol !== 1) fail('failed-precondition','保存形式が変更されました。画面を再読込してください。')
    }
    const destinations = await readImportDocuments(tx, [db.doc(`constructionCompanies/${companyId}`), db.doc(`warrantyGroups/${groupId}`)])
    const company = destinations.get(`constructionCompanies/${companyId}`).data()
    const group = destinations.get(`warrantyGroups/${groupId}`).data()
    const parsed = prepareBulkImportRows(input.csv, { format, group: group ?? {} })
    refs ??= []
    while (refs.length < parsed.rows.length) refs.push(db.collection('propertyWarranties').doc())
    const errors = [...parsed.errors]
    if (!company || company.enabled === false || company.defaultGroupId !== groupId) errors.push(reason(null, '工務店', '有効な工務店と所属保証グループを指定してください。'))
    if (!group || group.enabled === false || !Number.isInteger(group.fiscalStartMonth) || group.fiscalStartMonth < 1 || group.fiscalStartMonth > 12) errors.push(reason(null, '保証グループ', '有効な保証グループと年度設定を確認してください。'))
    let keyLabel = '外部キー'
    let requirements, keyPolicy
    try {
      const settings = externalKeySettings(group ?? {})
      keyPolicy = settings
      keyLabel = settings.label
      requirements = propertyFieldRequirements(group ?? {})
      if (!settings.required) errors.push(reason(null, '保証グループ', '外部キー必須の保証グループだけが一括取込みを利用できます。'))
    } catch(error) { errors.push(reason(null,'保証グループ',error.message)) }
    // Reject an ineligible destination before any row-by-row reads.
    if (!keyPolicy?.required || !requirements || !company || company.enabled === false || company.defaultGroupId !== groupId || !group || group.enabled === false || !Number.isInteger(group.fiscalStartMonth) || group.fiscalStartMonth < 1 || group.fiscalStartMonth > 12) {
      if (commit) fail('failed-precondition', '取込み先に問題があるため全件を棄却しました。', errors, true)
      return { count: parsed.rows.length, externalKeyLabel: keyLabel, rows: [], errors, previewHash: hash(JSON.stringify({ digest, errors })) }
    }
    const branches = new Map()
    const codes = [...new Set(parsed.rows.map(row => row.branchCode))]
    const reservations = await readImportDocuments(tx, codes.map(code => db.doc(`branchCodeReservations/${hash(companyId + '\0' + code)}`)))
    const branchIds = new Set()
    for (const code of codes) {
      const reservation = reservations.get(`branchCodeReservations/${hash(companyId + '\0' + code)}`).data()
      if (reservation?.constructionCompanyId === companyId && reservation.branchCode === code && typeof reservation.branchId === 'string' && /^[\w-]{1,128}$/.test(reservation.branchId)) branchIds.add(reservation.branchId)
    }
    const branchDocuments = await readImportDocuments(tx, [...branchIds].map(id => db.doc(`companyBranches/${id}`)))
    for (const code of codes) {
      const reservation = reservations.get(`branchCodeReservations/${hash(companyId + '\0' + code)}`).data()
      if (reservation?.constructionCompanyId !== companyId || reservation.branchCode !== code || !branchIds.has(reservation.branchId)) continue
      const branch = branchDocuments.get(`companyBranches/${reservation.branchId}`)?.data()
      if (branch && branch.constructionCompanyId === companyId && branch.branchCode === code && branch.enabled !== false) branches.set(code, { ...branch, id: reservation.branchId })
    }
    const keys = new Map()
    const keyReservations = await readImportDocuments(tx, [...new Set(parsed.rows.map(row => row.externalKey))].map(key => db.doc(`externalKeyReservations/${hash(key)}`)))
    const existingKeys = await existingImportValues(tx, db.collection('propertyWarranties'), 'externalKey', parsed.rows.map(row => row.externalKey))
    for (const row of parsed.rows) {
      const keyRef = db.doc(`externalKeyReservations/${hash(row.externalKey)}`)
      const reserved = keyReservations.get(keyRef.path)
      keys.set(row.externalKey, keyRef)
      if (reserved.exists || existingKeys.has(row.externalKey)) errors.push(reason(row, keyLabel, `${keyLabel}は既に登録されています。`))
      if (!branches.has(row.branchCode)) errors.push(reason(row, '本支店コード', '指定工務店の有効な本支店コードが一意に登録されていません。'))
    }
    const now = Timestamp.now(), today = japanDate(now.toDate())
    const plans = [], counters = new Map()
    if (group && Number.isInteger(group.fiscalStartMonth) && group.fiscalStartMonth >= 1 && group.fiscalStartMonth <= 12) {
      const years = [...new Set(parsed.rows.map(row => fiscalYear(row.fields.applicationDate, group.fiscalStartMonth)))]
      const savedCounters = await readImportDocuments(tx, [db.doc(`warrantyCounters/${groupId}`), ...years.map(year => db.doc(`warrantyCounters/${groupId}_${year}`))])
      const legacy = savedCounters.get(`warrantyCounters/${groupId}`)
      if (legacy.exists) errors.push(reason(null, '採番', '旧採番カウンターの年度別移行が必要です。'))
      for (const year of years) {
        const ref = db.doc(`warrantyCounters/${groupId}_${year}`)
        const value = savedCounters.get(ref.path).data()?.lastValue ?? 0
        if (!Number.isSafeInteger(value) || value < 0) errors.push(reason(null, '採番', '年度別採番値が不正です。'))
        counters.set(year, { ref, original: value, value: Number.isSafeInteger(value) && value >= 0 ? value : 0 })
      }
      const usedNumbers = new Set()
      for (let index = 0; index < parsed.rows.length; index++) {
        const row = parsed.rows[index], branch = branches.get(row.branchCode)
        const year = fiscalYear(row.fields.applicationDate, group.fiscalStartMonth), counter = counters.get(year)
        counter.value++
        let number = ''
        if (!Number.isSafeInteger(counter.value)) errors.push(reason(row, '採番', '年度別採番値が上限を超えています。'))
        else number = warrantyNumber(group, row.fields.applicationDate, counter.value)
        if (usedNumbers.has(number)) errors.push(reason(row, '保証番号', 'ファイル内の保証番号が重複しています。'))
        usedNumbers.add(number)
        const periods = coveragePeriods(row.fields.handoverDate, row.years)
        if (periods[0].expiryDate < today) errors.push(reason(row, '保証期間', '初回10年の保証が終了している物件は一括取込み対象外です。個別登録で確認してください。'))
        const value = { ...row.fields, constructionCompanyId: companyId, branchId: branch?.id ?? '', groupId, groupName: group.name, fiscalYear: year, warrantyNumber: number, externalKey: row.externalKey, receivedRecordId: refs[index].id, status: 'active', years: 10, periods, startDate: row.fields.handoverDate, expiryDate: periods[0].expiryDate, ...initialInsurance(row.fields.handoverDate), warrantyNotified: false, insuranceEvents: [], insuranceHistoryIncomplete: false, billingItems: [{ id: 'initial', ...periods[0], state: 'pending' }], history: [{ kind: 'register', requestId: `${requestId}_${index}`, date: today, at: now.toDate().toISOString(), actorUid: uid, actorName: account.displayName ?? '', reason: 'CSV一括取込み', before: null }], revision: 1, createdAt: now, updatedAt: now }
        const insurance = initialInsurancePeriodAt(value, today)
        if (insurance) Object.assign(value, insurance)
        Object.assign(value,materializeInsuranceState(value,{newRegistration:true}))
        Object.assign(value,insuranceProjection(value))
        Object.assign(value, monthlyQueryProjection(value), insuranceNoticeProjection(value))
        try { assertInsuranceCapacity(value,{documentPath:refs[index].path,today}) } catch (error) { errors.push(reason(row,'保険記録',error.message)) }
        plans.push({ row, ref: refs[index], branchLabel: branch ? `${branch.name}（${row.branchCode}）` : '', value })
      }
    }
    const previewHash = hash(JSON.stringify({ digest, group: group ? { name: group.name, prefix: group.prefix, fiscalStartMonth: group.fiscalStartMonth, enabled: group.enabled ?? true, ...keyPolicy, ...requirements } : null, company: company ? { name: company.name, defaultGroupId: company.defaultGroupId, enabled: company.enabled ?? true } : null, branches: [...branches].map(([code, branch]) => [code, branch.id, branch.name, branch.enabled ?? true]), counters: [...counters].map(([year, counter]) => [year, counter.original, counter.value]), numbers: plans.map(plan => plan.value.warrantyNumber) }))
    const preview = { count: parsed.rows.length, externalKeyLabel:keyLabel, rows: plans.map(plan => ({ line: plan.row.line, externalKey: plan.row.externalKey, branchCode: plan.row.branchCode, branchId: plan.value.branchId, branchLabel: plan.branchLabel, warrantyNumber: plan.value.warrantyNumber, name: plan.value.name, address: plan.value.address, applicationDate: plan.value.applicationDate, handoverDate: plan.value.handoverDate, insulationMaterials: plan.value.insulationMaterials })), errors, previewHash }
    const existingNumbers = await existingImportValues(tx, db.collection('propertyWarranties'), 'warrantyNumber', plans.map(plan => plan.value.warrantyNumber))
    for (const plan of plans) if (existingNumbers.has(plan.value.warrantyNumber)) errors.push(reason(plan.row, '保証番号', '既存の保証番号と重複しています。'))
    if (!commit) return preview
    if (errors.length) fail('failed-precondition', '入力に問題があるため全件を棄却しました。', errors, true)
    if (previewHash !== input.previewHash) fail('aborted', 'プレビュー後に所属・本支店・採番設定が変わりました。再度プレビューしてください。', undefined, true)
    const sources = plans.map(plan => ({ propertyId: plan.ref.id, externalKey: plan.row.externalKey, requestId, format, values: plan.row.sourceValues, createdAt: now }))
    const ids = plans.map(plan => plan.ref.id)
    const receipt = { uid, digest, previewHash, count: plans.length, ids, createdAt: now }
    const bytes = Buffer.byteLength(JSON.stringify({ properties: plans.map(plan => plan.value), sources, receipt }))
    if (bytes > 6 * 1024 * 1024) fail('resource-exhausted', '保存内容が大きすぎるため全件を棄却しました。CSVを分割してください。', undefined, true)
    // Every transaction read above precedes every write below.
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i]
      tx.create(plan.ref, plan.value)
      tx.create(keys.get(plan.row.externalKey), { externalKey: plan.row.externalKey, propertyId: plan.ref.id, createdAt: now })
      tx.create(db.doc(`propertyImportSources/${plan.ref.id}`), sources[i])
    }
    for (const counter of counters.values()) if (counter.value !== counter.original) tx.set(counter.ref, { lastValue: counter.value, updatedAt: now })
    tx.create(receiptRef, receipt)
    return { count: plans.length, ids, replayed: false }
  })
}
