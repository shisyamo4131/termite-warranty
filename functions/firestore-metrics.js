import { AsyncLocalStorage } from 'node:async_hooks'
import { logger } from 'firebase-functions'

// Application observations, NOT Firestore billing units. No document identifiers,
// payloads, query values, database IDs or error messages enter these records.
const contexts = new AsyncLocalStorage()
const originals = new WeakMap()
const collections = new Set(['staffAccounts','constructionCompanyAccounts','constructionCompanyAccountBindings','constructionCompanyCaseWorkItems','constructionCompanies','companyBranches','warrantyGroups','propertyWarranties','propertyOperationReceipts','propertyImportSources','externalKeyReservations','propertyImportReceipts','branchCodeReservations','warrantyCounters','accountMutationLocks','notificationOutbox','cases','appliedWarranties','properties','homeowners','warrantyServices','prototypeSettings','caseNumberReservations','systemCounters','branches','recovery','_recovery','recoveryOperations','backupHistory'])
const actions = new Set(['dashboard','waiveInsurance','undoInsuranceWaiver','catalog','list','propertyList','certificateList','billingList','detail','alertSettings','saveAlertSettings','accounts','createAccount','setAccountEnabled','saveCompany','saveBranch','saveGroup','reenableMaster','save','register','extend','undoExtend','cancel','restore','notify','report','undoReport','bill','undoBill','confirmUnbilled','issueCertificate','billPeriods','undoCertificate','preview','commit','status'])
export const SERVER_OPERATIONS = new Set(['propertyPrototype','propertyBulkImport','registerCase','addAppliedWarranty','updateAppliedWarranty','createConstructionCompanyAccount','setConstructionCompanyAccountEnabled','createRenewalWorkItem','createNewCaseWorkItem','updateCompanyCaseWorkItem','withdrawNewCaseWorkItem','reviewCompanyCaseWorkItem','listManageableStaffAccounts','createStaffAccount','updateStaffAccount','setStaffAccountEnabled','recoveryRuntime','recoveryStatus','recoveryBackupMonitor','reportFirestoreMetrics'])
const unwrap = value => value && originals.get(value) || value
const safeCollection = path => collections.has(path) ? path : 'other'
const collectionFromPath = path => safeCollection(String(path ?? '').split('/').filter(Boolean).at(-2))

export async function measureFirestoreOperation(operation, action, callback, emit = record => logger.info('firestore_operation_metrics', record)) {
  const context = { rows: new Map() }
  const started = performance.now()
  let outcome = 'success'
  return contexts.run(context, async () => {
    try { return await callback() }
    catch (error) { outcome = 'failure'; throw error }
    finally {
      try {
        emit({ event: 'firestore_metrics', schemaVersion: 1, source: 'server_observed', operation: SERVER_OPERATIONS.has(operation) ? operation : 'other', action: actions.has(action) ? action : 'none', outcome, durationMs: Math.round(performance.now() - started), rows: [...context.rows.values()] })
      } catch { /* Metrics must never replace the business result/error. */ }
    }
  })
}

export function observedFirestore(database, databaseLabel = 'business', category = 'business') {
  const context = contexts.getStore()
  if (!context) return unwrap(database)
  const databaseName = databaseLabel === 'control' ? 'control' : 'business'
  const categoryName = ['business','recovery','telemetry'].includes(category) ? category : 'business'
  const cache = new WeakMap()
  const labels = new WeakMap()
  const count = (collection, key, value = 1) => {
    const id = `${collection}:${databaseName}:${categoryName}`
    let row = context.rows.get(id)
    if (!row) { row = { collection, database: databaseName, category: categoryName, counters: {} }; context.rows.set(id, row) }
    row.counters[key] = (row.counters[key] ?? 0) + value
  }
  const results = (result, collection) => {
    if (Array.isArray(result)) return result.map(row => results(row, collectionFromPath(row.ref?.path)))
    if (Array.isArray(result?.docs)) {
      count(collection, 'returnedDocuments', result.size)
      if (result.empty) count(collection, 'emptyQueries')
    } else if (typeof result?.exists === 'boolean') count(collection, result.exists ? 'returnedDocuments' : 'missingDocuments')
    return wrap(result, 'snapshot', collection)
  }
  const read = async (target, method, args, collection, key) => {
    const started = performance.now()
    count(collection, key)
    try { return results(await target[method](...args.map(unwrap)), collection) }
    catch (error) { count(collection, 'readFailures'); throw error }
    finally { count(collection, 'readDurationMs', Math.round(performance.now() - started)) }
  }
  const write = async (target, method, args, collection) => {
    const started = performance.now()
    count(collection, 'writeAttempts')
    if (method === 'delete') count(collection, 'deleteAttempts')
    try {
      const result = await target[method](...args.map(unwrap))
      count(collection, 'writeConfirmed')
      if (method === 'delete') count(collection, 'deleteConfirmed')
      return method === 'add' ? wrap(result, 'doc', collection) : result
    } catch (error) { count(collection, 'writeFailures'); throw error }
    finally { count(collection, 'writeDurationMs', Math.round(performance.now() - started)) }
  }
  const recordWrites = (writes, key) => { for (const [collection, method] of writes) { count(collection, key); if (key === 'writeConfirmed' && method === 'delete') count(collection, 'deleteConfirmed') } }
  function wrap(value, kind, collection = 'other', writes) {
    if (!value || typeof value !== 'object') return value
    value = unwrap(value)
    if (kind !== 'tx' && cache.has(value)) return cache.get(value)
    labels.set(value, collection)
    const proxy = new Proxy(value, {
      get(target, property) {
        if (kind === 'snapshot') {
          if (property === 'ref') return wrap(target.ref, 'doc', collectionFromPath(target.ref.path))
          if (property === 'docs') return target.docs.map(doc => wrap(doc, 'snapshot', collection))
          if (property === 'forEach') return (callback, thisArg) => target.forEach(doc => callback.call(thisArg, wrap(doc, 'snapshot', collection)))
        }
        const member = Reflect.get(target, property, target)
        if (typeof member !== 'function') return member
        if (kind === 'query' && ['count','aggregate'].includes(property)) return (...args) => wrap(member.apply(target,args),'aggregate',collection)
        if (kind === 'aggregate' && property === 'get') return async (...args) => {
          const started = performance.now()
          count(collection,'aggregateCalls')
          try { const result = await member.apply(target,args); count(collection,'aggregateSuccesses'); return result }
          catch (error) { count(collection,'aggregateFailures'); throw error }
          finally { count(collection,'aggregateDurationMs',Math.round(performance.now()-started)) }
        }
        if (property === 'collection') return (...args) => wrap(member.apply(target, args), 'query', safeCollection(String(args[0]).split('/').at(-1)))
        if (property === 'collectionGroup') return (...args) => wrap(member.apply(target, args), 'query', safeCollection(args[0]))
        if (property === 'doc') return (...args) => { const ref = member.apply(target, args); return wrap(ref, 'doc', collectionFromPath(ref.path)) }
        if (property === 'batch') return () => wrap(member.call(target), 'batch', 'other', [])
        if (property === 'runTransaction') return async (callback, options) => {
          const started = performance.now()
          let attempts = 0, pending = []
          count('other', 'transactionCalls')
          try {
            const result = await member.call(target, async tx => {
              if (attempts++) { count('other', 'transactionRetries'); recordWrites(pending, 'discardedTransactionWrites') }
              count('other', 'transactionAttempts'); pending = []
              return callback(wrap(tx, 'tx', 'other', pending))
            }, options)
            recordWrites(pending, 'writeConfirmed')
            return result
          } catch (error) { count('other', 'transactionFailures'); recordWrites(pending, 'writeFailures'); throw error }
          finally { count('other', 'transactionDurationMs', Math.round(performance.now() - started)) }
        }
        if (property === 'getAll' && ['db','tx'].includes(kind)) return (...args) => read(target, property, args, 'other', 'getAllCalls')
        if (property === 'get' && ['doc','query','tx'].includes(kind)) return (...args) => {
          const ref = kind === 'tx' ? unwrap(args[0]) : target
          const query = typeof ref?.where === 'function'
          const label = kind === 'tx' ? (labels.get(ref) ?? (ref?.path ? (query ? safeCollection(ref.path.split('/').at(-1)) : collectionFromPath(ref.path)) : 'other')) : collection
          return read(target, property, args, label, query ? 'queryCalls' : 'getCalls')
        }
        if (['set','create','update','delete','add'].includes(property) && ['doc','query','tx','batch'].includes(kind)) return (...args) => {
          if (kind === 'doc' || property === 'add') return write(target, property, args, collection)
          const label = collectionFromPath(unwrap(args[0])?.path)
          count(label, 'writeAttempts'); if (property === 'delete') count(label, 'deleteAttempts')
          try { member.apply(target, args.map(unwrap)); writes.push([label, property]); return proxy }
          catch (error) { count(label, 'writeFailures'); throw error }
        }
        if (property === 'commit' && kind === 'batch') return async (...args) => {
          const started = performance.now()
          try { const result = await member.apply(target, args); recordWrites(writes, 'writeConfirmed'); return result }
          catch (error) { recordWrites(writes, 'writeFailures'); throw error }
          finally { count('other', 'writeDurationMs', Math.round(performance.now() - started)) }
        }
        if (kind === 'query' && ['where','orderBy','limit','limitToLast','offset','select','startAt','startAfter','endAt','endBefore'].includes(property)) return (...args) => wrap(member.apply(target, args.map(unwrap)), 'query', collection)
        return (...args) => member.apply(target, args.map(unwrap))
      },
    })
    originals.set(proxy, value); cache.set(value, proxy)
    return proxy
  }
  return wrap(unwrap(database), 'db')
}
