// The stored key remains provider-neutral; labels are presentation only.
export function externalKeySettings(group = {}) {
  const uh = String(group.name ?? '').trim().toUpperCase() === 'UH'
  if (group.externalKeyRequired !== undefined && typeof group.externalKeyRequired !== 'boolean') throw Error('外部キーの必須設定が不正です。')
  const required = group.externalKeyRequired ?? uh
  if (uh && !required) throw Error('UHでは外部キーを必須にしてください。')
  const label = group.externalKeyLabel === undefined ? (uh ? 'お施主様契約No' : '外部キー') : group.externalKeyLabel
  if (typeof label !== 'string' || label.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(label) || required && !label.trim()) throw Error('外部キーの名称は80文字以内で入力してください。')
  return { required, label: label.trim() || '外部キー' }
}
export function normalizeExternalKey(value, label = '外部キー') {
  if (value === undefined) return ''
  if (typeof value !== 'string' || value.trim().length > 200 || /[\u0000-\u001f\u007f]/.test(value)) throw Error(`${label}は200文字以内の文字列で入力してください。`)
  return value.trim()
}
