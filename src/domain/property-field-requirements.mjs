// Legacy groups retain their effective policy without rewriting business records.
export function propertyFieldRequirements(group = {}) {
  const requiredByDefault = String(group.name ?? '').trim().toUpperCase() !== 'UH'
  const result = {}
  for (const [key, label] of [['addressRequired', '住所'], ['insulationMaterialsRequired', '資材名']]) {
    if (group[key] !== undefined && typeof group[key] !== 'boolean') throw new Error(`${label}の必須設定が不正です。`)
    result[key] = group[key] ?? requiredByDefault
  }
  return result
}
