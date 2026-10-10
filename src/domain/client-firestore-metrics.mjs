// Application observations, deliberately not a reconstruction of billable usage.
export const CLIENT_METRIC_OPERATIONS = Object.freeze(['dashboard', 'referenceStore', 'session', 'recovery', 'masterManagement', 'masterCatalog', 'caseQuery', 'caseCommand', 'companyPortal', 'portalAccounts', 'portalNotifications'])
export const CLIENT_METRIC_COUNTERS = Object.freeze(['cacheHits', 'readDurationMs', 'writeDurationMs', 'transactionDurationMs', 'getCalls', 'queryCalls', 'returnedDocuments', 'missingDocuments', 'emptyQueries', 'readFailures', 'writeAttempts', 'writeConfirmed', 'writeFailures', 'deleteAttempts', 'deleteConfirmed', 'transactionAttempts', 'transactionRetries', 'transactionFailures', 'listenerStarts', 'listenerStops', 'listenerSnapshots', 'listenerInitialDocuments', 'listenerAdded', 'listenerModified', 'listenerRemoved', 'listenerCacheSnapshots', 'listenerPendingSnapshots', 'listenerMetadataSnapshots', 'listenerDocumentSnapshots', 'listenerFailures', 'referenceHits', 'inactiveReferenceHits', 'inactiveUniqueReferences', 'activeDocuments', 'inactiveDocuments'])

export function createClientMetricBuffer() {
  const rows = new Map()
  return {
    record(operation, counters) {
      if (!CLIENT_METRIC_OPERATIONS.includes(operation)) return
      const row = rows.get(operation) ?? {}
      for (const [key, value] of Object.entries(counters)) {
        if (CLIENT_METRIC_COUNTERS.includes(key) && Number.isSafeInteger(value) && value >= 0) row[key] = Math.min(1_000_000, (row[key] ?? 0) + value)
      }
      if (Object.keys(row).length) rows.set(operation, row)
    },
    drain() { const result = [...rows].map(([operation, counters]) => ({ operation, counters })); rows.clear(); return result },
    clear() { rows.clear() },
  }
}

export function measuredFirestore(sdk, record, getGeneration = () => 0) {
  const countFor = () => {
    const generation = getGeneration()
    return counters => { try { if (generation === getGeneration()) record(counters) } catch { /* Telemetry never changes business outcomes. */ } }
  }
  const read = (fn, query = false, parentCount) => async (...args) => {
    const count = parentCount ?? countFor()
    const started = performance.now()
    count({ [query ? 'queryCalls' : 'getCalls']: 1 })
    try {
      const result = await fn(...args)
      const size = query ? result.size : result.exists() ? 1 : 0
      count({ returnedDocuments: size, ...(!size ? { [query ? 'emptyQueries' : 'missingDocuments']: 1 } : {}) })
      return result
    } catch (error) { count({ readFailures: 1 }); throw error }
    finally { count({ readDurationMs: Math.round(performance.now() - started) }) }
  }
  const write = (fn, deletion = false) => async (...args) => {
    const count = countFor()
    const started = performance.now()
    count({ writeAttempts: 1, ...(deletion ? { deleteAttempts: 1 } : {}) })
    try { const result = await fn(...args); count({ writeConfirmed: 1, ...(deletion ? { deleteConfirmed: 1 } : {}) }); return result }
    catch (error) { count({ writeFailures: 1 }); throw error }
    finally { count({ writeDurationMs: Math.round(performance.now() - started) }) }
  }
  return {
    getDoc: read(sdk.getDoc), getDocs: read(sdk.getDocs, true),
    setDoc: write(sdk.setDoc), updateDoc: write(sdk.updateDoc), deleteDoc: write(sdk.deleteDoc, true),
    onSnapshot(reference, ...args) {
      const count = countFor()
      let firstServer = true, stopped = false
      count({ listenerStarts: 1 })
      const observe = snapshot => {
        if (stopped) return
        const query = Array.isArray(snapshot.docs)
        const size = query ? snapshot.size : snapshot.exists() ? 1 : 0
        count({ listenerSnapshots: 1 })
        if (snapshot.metadata.fromCache) count({ listenerCacheSnapshots: 1 })
        if (snapshot.metadata.hasPendingWrites) count({ listenerPendingSnapshots: 1 })
        // Local/pending events are reported separately, never presented as server reads.
        if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
          if (firstServer) { count({ listenerInitialDocuments: size }); firstServer = false }
          else if (query) {
            const changes = snapshot.docChanges()
            if (!changes.length) count({ listenerMetadataSnapshots: 1 })
            for (const change of changes) count({ [{ added: 'listenerAdded', modified: 'listenerModified', removed: 'listenerRemoved' }[change.type]]: 1 })
          } else count({ listenerDocumentSnapshots: 1 })
        }
      }
      const callbackIndex = args.findIndex(value => typeof value === 'function' || value && (typeof value.next === 'function' || typeof value.error === 'function'))
      if (callbackIndex >= 0) {
        const callback = args[callbackIndex]
        if (typeof callback === 'function') {
          args[callbackIndex] = snapshot => { observe(snapshot); callback(snapshot) }
          const onError = args[callbackIndex + 1]
          args[callbackIndex + 1] = error => { count({ listenerFailures: 1 }); onError?.(error) }
        } else {
          args[callbackIndex] = { ...callback, next: snapshot => { observe(snapshot); callback.next?.(snapshot) }, error: error => { count({ listenerFailures: 1 }); callback.error?.(error) } }
        }
      }
      let unsubscribe
      try { unsubscribe = sdk.onSnapshot(reference, ...args) }
      catch (error) { count({ listenerFailures: 1 }); throw error }
      return () => { if (!stopped) { stopped = true; unsubscribe(); count({ listenerStops: 1 }) } }
    },
    async runTransaction(db, callback, options) {
      const count = countFor()
      const started = performance.now()
      let attempts = 0, committedWrites = 0, committedDeletes = 0
      try {
        const result = await sdk.runTransaction(db, async native => {
          count({ transactionAttempts: 1, ...(attempts++ ? { transactionRetries: 1 } : {}) })
          let writes = 0, deletes = 0
          const transaction = new Proxy(native, { get(target, key) {
            if (key === 'get') return read(target.get.bind(target), false, count)
            if (['set', 'update', 'delete'].includes(key)) return (...args) => {
              count({ writeAttempts: 1, ...(key === 'delete' ? { deleteAttempts: 1 } : {}) })
              target[key](...args); writes++; if (key === 'delete') deletes++
              return transaction
            }
            const value = Reflect.get(target, key, target)
            return typeof value === 'function' ? value.bind(target) : value
          } })
          const result = await callback(transaction)
          committedWrites = writes; committedDeletes = deletes
          return result
        }, options)
        count({ writeConfirmed: committedWrites, deleteConfirmed: committedDeletes })
        return result
      } catch (error) { count({ transactionFailures: 1 }); throw error }
      finally { count({ transactionDurationMs: Math.round(performance.now() - started) }) }
    },
  }
}
