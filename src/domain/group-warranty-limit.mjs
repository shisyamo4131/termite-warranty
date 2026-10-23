export function groupWarrantyLimit(group) {
  const value = group?.maxWarrantyYears
  if (![10, 20, 30].includes(value)) throw Error('保証グループの最大保証期間が未設定または不正です。管理者に確認してください。')
  return value
}

export function assertGroupWarrantyLimit(group, years) {
  const limit = groupWarrantyLimit(group)
  if (![10, 20, 30].includes(years) || years > limit) throw Error(`この保証グループの最大保証期間は${limit}年です。`)
  return limit
}
