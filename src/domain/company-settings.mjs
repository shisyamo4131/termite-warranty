const profileFields = ['companyName','postalCode','address1','address2','telephone','fax','invoiceRegistrationNumber','representativeName','representativeTitle','email']
const recipientFields = ['name','department','contactPerson','postalCode','address1','address2','telephone','email']
export const companyProfileDefaults = () => Object.fromEntries(profileFields.map(key => [key, '']))
export const billingRecipientDefaults = () => Object.fromEntries(recipientFields.map(key => [key, '']))

function normalize(input, fields) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('設定内容を確認してください。')
  const result = {}
  for (const key of fields) {
    const value = input[key] === undefined ? '' : input[key]
    if (typeof value !== 'string' || value.length > 2000 || /[\u0000-\u001f\u007f]/.test(value)) throw Error('各項目は2000文字以内の文字列で入力してください。')
    result[key] = value.trim()
  }
  result.postalCode = result.postalCode.replace(/[-\s]/g, '')
  if (result.postalCode && !/^\d{7}$/.test(result.postalCode)) throw Error('郵便番号は7桁で入力してください。')
  for (const key of ['telephone','fax']) if (result[key] && !/^[0-9-]+$/.test(result[key])) throw Error('電話番号・FAXは半角数字とハイフンのみ入力できます。')
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw Error('メールアドレスの形式を確認してください。')
  return result
}
export function normalizeCompanyProfile(input = {}, { requireName = true } = {}) {
  const result = normalize(input, profileFields)
  if (requireName && !result.companyName) throw Error('会社名を入力してください。')
  if (result.invoiceRegistrationNumber && !/^T\d{13}$/.test(result.invoiceRegistrationNumber)) throw Error('適格請求書発行事業者番号はTと13桁の数字で入力してください。')
  return result
}
export function normalizeBillingRecipient(input = {}) { return normalize(input, recipientFields) }

// Explicit public contract: new private fields must never leak through the portal catalog.
export function portalWarrantyGroup(group, id) {
  const keys = ['name','prefix','fiscalStartMonth','template','enabled','externalKeyRequired','externalKeyLabel','addressRequired','insulationMaterialsRequired']
  return { ...Object.fromEntries(keys.filter(key => group[key] !== undefined).map(key => [key, group[key]])), id }
}
