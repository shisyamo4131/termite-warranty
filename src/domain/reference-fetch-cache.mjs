export class ReferenceFetchInvalidatedError extends Error {
  constructor() { super('取得中に利用条件が変わりました。もう一度操作してください。') }
}
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
export const referenceFetchKey = (scope, action, conditions = {}) => JSON.stringify(canonical({ scope, action, conditions }))

// Component-owned reference results only. Never use this for authorization or writes.
export function createReferenceFetchCache({ ttlMs = 300000, maxKeys = 64, now = Date.now } = {}) {
  const entries = new Map()
  let generation = 0
  const clear = () => { generation++; entries.clear() }
  const get = (key, loader, { force = false } = {}) => {
    const old = entries.get(key)
    if (!force && old && (old.pending || old.expires > now())) return old.promise
    entries.delete(key)
    if (entries.size >= maxKeys) {
      const evict = [...entries].find(([, entry]) => !entry.pending)
      if (!evict) return Promise.reject(new Error('候補の取得が集中しています。時間を置いて再試行してください。'))
      entries.delete(evict[0])
    }
    const started = generation, entry = { pending: true, expires: 0, promise: null }
    entry.promise = Promise.resolve().then(loader).then(value => {
      if (generation !== started || entries.get(key) !== entry) throw new ReferenceFetchInvalidatedError()
      entry.pending = false; entry.expires = now() + ttlMs
      return value
    }).catch(error => { if (entries.get(key) === entry) entries.delete(key); throw error })
    entries.set(key, entry)
    return entry.promise
  }
  return { get, clear, size: () => entries.size }
}
