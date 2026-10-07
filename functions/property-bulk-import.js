import { createHash } from 'node:crypto'
import { externalKeySettings } from './domain/external-key.mjs'
import { Timestamp } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { prepareBulkImportRows } from './domain/property-bulk-import.mjs'
import { coveragePeriods, importedWarrantyPeriods, fiscalYear, initialInsurance, initialInsurancePeriodAt, japanDate, normalizeWarrantyPrefix, warrantyNumber } from './domain/property-warranty.mjs'

const hash = value => createHash('sha256').update(value).digest('hex')
const fail = (code, message, errors, safeToDiscard = false) => { throw new HttpsError(code, message, errors || safeToDiscard ? { ...(errors ? { errors } : {}), ...(safeToDiscard ? { safeToDiscard: true } : {}) } : undefined) }
const identifier = value => typeof value === 'string' && /^[\w-]{1,128}$/.test(value) ? value : fail('invalid-argument', '識別子が不正です。')
const staffRoles = ['developer_superuser', 'house_solution_administrator', 'general_staff']
const reason = (row, field, message) => ({ line: row?.line ?? 0, field, message })

function importedSequence(number, group, applicationDate) {
  const prefix = normalizeWarrantyPrefix(group.prefix)
  const expected = `${prefix ? prefix + '-' : ''}${String(fiscalYear(applicationDate, group.fiscalStartMonth)).slice(-2)}-`
  if (!number.startsWith(expected) || !/^\d{3,}$/.test(number.slice(expected.length))) throw new Error('既存保証番号の接頭辞・年度・通し番号が指定グループと申込日に一致しません。')
  const sequence = Number(number.slice(expected.length))
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error('既存保証番号の通し番号が不正です。')
  return sequence
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
  const parsed = prepareBulkImportRows(input.csv, { format })
  const refs = parsed.rows.map(() => db.collection('propertyWarranties').doc())
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
    }
    const errors = [...parsed.errors]
    const company = (await tx.get(db.doc(`constructionCompanies/${companyId}`))).data()
    const group = (await tx.get(db.doc(`warrantyGroups/${groupId}`))).data()
    if (!company || company.enabled === false || company.defaultGroupId !== groupId) errors.push(reason(null, '工務店', '有効な工務店と所属保証グループを指定してください。'))
    if (!group || group.enabled === false || !Number.isInteger(group.fiscalStartMonth) || group.fiscalStartMonth < 1 || group.fiscalStartMonth > 12) errors.push(reason(null, '保証グループ', '有効な保証グループと年度設定を確認してください。'))
    const isUh = String(group?.name ?? '').trim().toUpperCase() === 'UH'
    let keyLabel = '外部キー'
    try { keyLabel = externalKeySettings(group ?? {}).label } catch(error) { errors.push(reason(null,'保証グループ',error.message)) }
    if ((format === 'uh') !== isUh) errors.push(reason(null, '形式', 'UHはUH日付補完、それ以外は共通形式を指定してください。'))
    const branches = new Map()
    for (const code of new Set(parsed.rows.map(row => row.branchCode))) {
      const result = await tx.get(db.collection('companyBranches').where('constructionCompanyId', '==', companyId).where('branchCode', '==', code).limit(2))
      if (result.docs.length === 1 && result.docs[0].data().enabled !== false) branches.set(code, { ...result.docs[0].data(), id: result.docs[0].id })
    }
    const keys = new Map()
    for (const row of parsed.rows) {
      const keyRef = db.doc(`externalKeyReservations/${hash(row.externalKey)}`)
      const reserved = await tx.get(keyRef)
      const existing = await tx.get(db.collection('propertyWarranties').where('externalKey', '==', row.externalKey).limit(1))
      keys.set(row.externalKey, keyRef)
      if (reserved.exists || !existing.empty) errors.push(reason(row, keyLabel, `${keyLabel}は既に登録されています。`))
      if (!branches.has(row.branchCode)) errors.push(reason(row, '支店コード', '指定工務店の有効な支店コードが一意に登録されていません。'))
    }
    const now = Timestamp.now(), today = japanDate(now.toDate())
    const plans = [], counters = new Map()
    if (group && Number.isInteger(group.fiscalStartMonth) && group.fiscalStartMonth >= 1 && group.fiscalStartMonth <= 12) {
      const legacy = await tx.get(db.doc(`warrantyCounters/${groupId}`))
      if (legacy.exists) errors.push(reason(null, '採番', '旧採番カウンターの年度別移行が必要です。'))
      for (const year of new Set(parsed.rows.map(row => fiscalYear(row.fields.applicationDate, group.fiscalStartMonth)))) {
        const ref = db.doc(`warrantyCounters/${groupId}_${year}`)
        const value = (await tx.get(ref)).data()?.lastValue ?? 0
        if (!Number.isSafeInteger(value) || value < 0) errors.push(reason(null, '採番', '年度別採番値が不正です。'))
        counters.set(year, { ref, original: value, value: Number.isSafeInteger(value) && value >= 0 ? value : 0 })
      }
      for (const row of parsed.rows) {
        if (!row.existingWarrantyNumber) continue
        try {
          const year = fiscalYear(row.fields.applicationDate, group.fiscalStartMonth)
          const counter = counters.get(year)
          counter.value = Math.max(counter.value, importedSequence(row.existingWarrantyNumber, group, row.fields.applicationDate))
        } catch (error) { errors.push(reason(row, '既存保証番号', error.message)) }
      }
      const usedNumbers = new Set()
      for (let index = 0; index < parsed.rows.length; index++) {
        const row = parsed.rows[index], branch = branches.get(row.branchCode)
        const year = fiscalYear(row.fields.applicationDate, group.fiscalStartMonth), counter = counters.get(year)
        let number = row.existingWarrantyNumber
        if (!number) {
          counter.value++
          if (!Number.isSafeInteger(counter.value)) { errors.push(reason(row, '採番', '年度別採番値が上限を超えています。')); number = '' }
          else number = warrantyNumber(group, row.fields.applicationDate, counter.value)
        }
        if (usedNumbers.has(number)) errors.push(reason(row, '保証番号', 'ファイル内の保証番号が重複しています。'))
        usedNumbers.add(number)
        const existing = await tx.get(db.collection('propertyWarranties').where('warrantyNumber', '==', number).limit(1))
        if (!existing.empty) errors.push(reason(row, '保証番号', '既存の保証番号と重複しています。'))
        const periods = coveragePeriods(row.fields.handoverDate, row.years)
        const importedPeriods = importedWarrantyPeriods(row.fields.handoverDate, row.years, refs[index].id)
        if (periods.at(-1).expiryDate < today) errors.push(reason(row, '保証期間', '保証終了済みの物件は取込み対象外です。'))
        const value = { ...row.fields, constructionCompanyId: companyId, branchId: branch?.id ?? '', groupId, groupName: group.name, fiscalYear: year, warrantyNumber: number, externalKey: row.externalKey, receivedRecordId: refs[index].id, importedWarrantyPeriods: importedPeriods, framingDate: row.framingDate, status: 'active', years: row.years, periods, startDate: row.fields.handoverDate, expiryDate: periods.at(-1).expiryDate, ...initialInsurance(row.fields.handoverDate), warrantyNotified: false, insuranceEvents: [], insuranceHistoryIncomplete: false, billingItems: importedPeriods.map(period => ({ id: period.id, startDate: period.startDate, expiryDate: period.expiryDate, state: row.existingWarrantyNumber || period.index ? 'unknown' : 'pending' })), history: [{ kind: 'register', requestId: `${requestId}_${index}`, date: today, at: now.toDate().toISOString(), actorUid: uid, actorName: account.displayName ?? '', reason: 'CSV一括取込み', before: null }], revision: 1, createdAt: now, updatedAt: now }
        const insurance = initialInsurancePeriodAt(value, today)
        if (insurance) Object.assign(value, insurance)
        plans.push({ row, ref: refs[index], branchLabel: branch ? `${branch.name}（${row.branchCode}）` : '', value })
      }
    }
    const previewHash = hash(JSON.stringify({ digest, group: group ? { name: group.name, prefix: group.prefix, fiscalStartMonth: group.fiscalStartMonth, enabled: group.enabled ?? true } : null, company: company ? { name: company.name, defaultGroupId: company.defaultGroupId, enabled: company.enabled ?? true } : null, branches: [...branches].map(([code, branch]) => [code, branch.id, branch.name, branch.enabled ?? true]), counters: [...counters].map(([year, counter]) => [year, counter.original, counter.value]), numbers: plans.map(plan => plan.value.warrantyNumber) }))
    const preview = { count: parsed.rows.length, externalKeyLabel:keyLabel, rows: plans.map(plan => ({ line: plan.row.line, externalKey: plan.row.externalKey, branchId: plan.value.branchId, branchLabel: plan.branchLabel, warrantyNumber: plan.value.warrantyNumber, name: plan.value.name, address: plan.value.address, applicationDate: plan.value.applicationDate, handoverDate: plan.value.handoverDate, insulationMaterials: plan.value.insulationMaterials })), errors, previewHash }
    if (!commit) return preview
    if (errors.length) fail('failed-precondition', '入力に問題があるため全件を棄却しました。', errors, true)
    if (previewHash !== input.previewHash) fail('aborted', 'プレビュー後に所属・支店・採番設定が変わりました。再度プレビューしてください。', undefined, true)
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
