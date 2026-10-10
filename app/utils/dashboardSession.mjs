// Counts only, scoped to one signed-in application session. No persistent cache.
export function createDashboardSession({ fetch, today, generation, publish, timeoutMs = 60000 }) {
  let epoch = 0, changes = 0, pending, sequence = 0
  let state = { value: null, attempted: false, loading: false, stale: false, error: '' }
  const emit = patch => { state = { ...state, ...patch }; publish(state) }
  function reset() { epoch++; sequence++; pending = undefined; changes = 0; emit({ value: null, attempted: false, loading: false, stale: false, error: '' }) }
  function markStale() { changes++; emit({ stale: true }) }
  function checkDate() { if (state.value && state.value.basisDate !== today()) emit({ stale: true }) }
  function refresh() {
    if (pending) return pending
    const request = ++sequence, scope = epoch, change = changes, runtime = generation()
    const current = () => request === sequence && scope === epoch
    emit({ attempted: true, loading: true, error: '' })
    let timer
    pending = Promise.race([Promise.resolve().then(fetch), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('件数の取得に時間がかかっています。更新ボタンから再試行してください。')), timeoutMs) })])
      .then(value => {
        if (!current()) return
        if (value?.version !== 1 || value.runtimeGeneration !== runtime || !['active','insurancePending','warrantyNoticePending','billingPending'].every(key => Number.isSafeInteger(value.counts?.[key]) && value.counts[key] >= 0) || !/^\d{4}-\d{2}-\d{2}$/.test(value.basisDate) || value.basisMonth !== value.basisDate.slice(0, 7) || !Number.isFinite(Date.parse(value.startedAt)) || !Number.isFinite(Date.parse(value.completedAt))) throw new Error('件数を確認できませんでした。更新ボタンから再試行してください。')
        emit({ value, stale: change !== changes || value.basisDate !== today(), error: '' })
      })
      .catch(error => {
        if (!current()) return
        const denied = ['functions/permission-denied','functions/unauthenticated'].includes(error?.code)
        emit({ ...(denied ? {value:null} : {}), error: error instanceof Error ? error.message : '件数を取得できませんでした。', stale: !denied && !!state.value })
      })
      .finally(() => { clearTimeout(timer); if (current()) { pending = undefined; emit({ loading: false }) } })
    return pending
  }
  return { reset, markStale, checkDate, refresh, ensure: () => state.attempted ? (checkDate(), Promise.resolve()) : refresh(), getState: () => state }
}
