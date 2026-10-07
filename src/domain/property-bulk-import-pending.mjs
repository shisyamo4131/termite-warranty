// Only request identity/fingerprints are persisted; source CSV and property rows never are.
const identifiers = ['projectId', 'actorUid', 'requestId', 'groupId', 'companyId']
export function pendingImportStorageKey(scope) {
  if (!scope?.projectId || !scope?.actorUid) throw new Error('取込みの接続先・利用者を確認できません。')
  return `termite-warranty:pending-import:v1:${encodeURIComponent(scope.projectId)}:${encodeURIComponent(scope.actorUid)}`
}
function validate(value, scope) {
  if (!value || value.version !== 1 || identifiers.some(key => typeof value[key] !== 'string' || !value[key] || value[key].length > 256)
    || !['common', 'uh'].includes(value.format) || !/^[\w-]{1,128}$/.test(value.requestId)
    || !/^[a-f0-9]{64}$/.test(value.csvHash) || !/^[a-f0-9]{64}$/.test(value.previewHash)
    || value.projectId !== scope.projectId || value.actorUid !== scope.actorUid) throw new Error('保存された取込状態を確認できません。開発側へ確認を依頼してください。')
  return Object.fromEntries(['version', ...identifiers, 'format', 'csvHash', 'previewHash'].map(key => [key, value[key]]))
}
export function loadPendingImport(storage, scope) {
  const raw = storage.getItem(pendingImportStorageKey(scope))
  if (raw === null) return null
  let value
  try { value = JSON.parse(raw) } catch { throw new Error('保存された取込状態を読み取れません。開発側へ確認を依頼してください。') }
  return validate(value, scope)
}
export function savePendingImport(storage, scope, value) {
  const checked = validate({ ...value, ...scope, version: 1 }, scope)
  const existing = loadPendingImport(storage, scope)
  if (existing && JSON.stringify(existing) !== JSON.stringify(checked)) throw new Error('未確認の取込みが残っています。先にその結果を確認してください。')
  const key = pendingImportStorageKey(scope), raw = JSON.stringify(checked)
  storage.setItem(key, raw)
  if (storage.getItem(key) !== raw) throw new Error('取込状態を保存できません。登録は送信しません。')
  return checked
}
export function clearPendingImport(storage, scope, requestId) {
  const pending = loadPendingImport(storage, scope)
  if (pending && pending.requestId !== requestId) throw new Error('別の取込状態が保存されています。消去せず確認してください。')
  storage.removeItem(pendingImportStorageKey(scope))
}
export async function hashImportCsv(csv) {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(csv))
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}
