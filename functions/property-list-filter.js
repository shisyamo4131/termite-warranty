import { HttpsError } from 'firebase-functions/v2/https'

const reject = () => { throw new HttpsError('invalid-argument', 'この検索条件には対応していません。画面を再読み込みしてください。') }

// Validate before constructing any property query. Unknown empty keys also fail.
export function propertyListFilter(action, input) {
  if (input === undefined) input = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) reject()
  const f = { ...input }
  let allowed = ['groupId', 'handoverMonth']
  if (action === 'list') {
    if (Object.hasOwn(f, 'alertKind')) {
      if (f.alertKind === 'warranty' && f.notification === 'pending') allowed = ['alertKind', 'notification']
      else reject()
    } else if (Object.hasOwn(f, 'reportMonth')) allowed = ['reportMonth', 'includeDone', 'warrantyNumber']
    else if (Object.hasOwn(f, 'billingMonth')) allowed = ['billingMonth', 'warrantyNumber']
  }
  if (Object.keys(f).some(key => !allowed.includes(key))) reject()
  if (Object.hasOwn(f, 'warrantyNumber')) {
    if (typeof f.warrantyNumber !== 'string') reject()
    f.warrantyNumber = f.warrantyNumber.trim()
  }
  if (Object.hasOwn(f, 'includeDone') && typeof f.includeDone !== 'boolean') reject()
  for (const key of ['reportMonth', 'billingMonth']) {
    if (Object.hasOwn(f, key) && (typeof f[key] !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(f[key]))) reject()
  }
  if (allowed.includes('groupId')) {
    for (const key of ['groupId', 'handoverMonth']) {
      if (f[key] === undefined || f[key] === null) f[key] = ''
      if (typeof f[key] !== 'string') reject()
      f[key] = f[key].trim()
    }
    if (!!f.groupId !== !!f.handoverMonth) throw new HttpsError('invalid-argument', '保証グループと引渡年月を両方指定してください。')
    if (f.groupId && (!/^[\w-]{1,128}$/.test(f.groupId) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(f.handoverMonth))) reject()
    if (!f.groupId) { delete f.groupId; delete f.handoverMonth }
  }
  return f
}
