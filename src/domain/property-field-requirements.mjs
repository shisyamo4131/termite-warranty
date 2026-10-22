// Address is universally required for formal records; legacy optional metadata is ignored.
export function propertyFieldRequirements(group = {}) {
  const requiredByDefault = String(group.name ?? '').trim().toUpperCase() !== 'UH'
  const result = { addressRequired: true }
  for (const [key, label] of [['insulationMaterialsRequired', '資材名']]) {
    if (group[key] !== undefined && typeof group[key] !== 'boolean') throw new Error(`${label}の必須設定が不正です。`)
    result[key] = group[key] ?? requiredByDefault
  }
  return result
}
