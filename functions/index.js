import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { HttpsError, onCall as nativeOnCall } from 'firebase-functions/v2/https'
import { measureFirestoreOperation, observedFirestore } from './firestore-metrics.js'
import { reportClientMetrics } from './client-metrics.js'
import { createAuthDiagnosticReceiver } from './auth-diagnostics.js'
import { setGlobalOptions } from 'firebase-functions/v2'
import { assertApprovedPrototypeRuntime } from './local-runtime.js'
import { runtimeIdentity } from './production-identities.js'
import { withRecovery, recoveryRuntimeOperation, recoveryStatusOperation } from './recovery-runtime.js'
import { PROPERTY_READ_ACTIONS } from './domain/recovery.mjs'
import { propertyPrototypeOperation } from './property-warranty.js'
import { propertyBulkImportOperation } from './property-bulk-import.js'
import { registerCaseTransaction } from './register-case.js'
import { AppliedWarrantyOperationError, addAppliedWarrantyTransaction, updateAppliedWarrantyTransaction } from './applied-warranty-management.js'
import {
  CompanyPortalError,
  createConstructionCompanyAccountOperation,
  createNewCaseWorkItemOperation,
  createRenewalWorkItemOperation,
  reviewCompanyCaseWorkItemOperation,
  setConstructionCompanyAccountEnabledOperation,
  updateCompanyCaseWorkItemOperation,
  withdrawNewCaseWorkItemOperation,
} from './company-portal.js'
import {
  StaffAccountError,
  createStaffAccountOperation,
  listManageableStaffAccountsOperation,
  setStaffAccountEnabledOperation,
  updateStaffAccountOperation,
} from './staff-account-management.js'

assertApprovedPrototypeRuntime()
setGlobalOptions({ region: 'asia-northeast1' })
initializeApp()
export { recoveryBackupMonitor } from './recovery-backups.js'

const onCall = (name, options, handler) => {
  if (!handler) { handler = options; options = {} }
  return nativeOnCall({ ...options, ...runtimeIdentity('business') }, request => measureFirestoreOperation(name, request.data?.action, () => handler(request)))
}
export const reportFirestoreMetrics = onCall('reportFirestoreMetrics', request => reportClientMetrics(request, observedFirestore(getFirestore(), 'business', 'telemetry')))
// No business-data access and no Auth requirement: failed login is the observed event.
export const reportAuthDiagnostics = nativeOnCall({ maxInstances: 2, timeoutSeconds: 10, ...runtimeIdentity('diagnostics') }, createAuthDiagnosticReceiver())

export const propertyBulkImport = onCall('propertyBulkImport', { timeoutSeconds: 300 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'ログインしてください。')
  try { return await withRecovery(request, request.data?.action === 'commit', db => propertyBulkImportOperation(db, request.data, request.auth.uid)) }
  catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('propertyBulkImport failed', { code:error?.code })
    throw new HttpsError('internal', '取込結果を確認できません。同じ実行を再確認してください。')
  }
})

export const propertyPrototype = onCall('propertyPrototype', async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'ログインしてください。')
  try { return await withRecovery(request, !PROPERTY_READ_ACTIONS.includes(request.data?.action), db => propertyPrototypeOperation(getAuth(), db, request.data, request.auth.uid), { accountMutation: ['createAccount','setAccountEnabled'].includes(request.data?.action) }) }
  catch (error) {
    if (error instanceof HttpsError) throw error
    if (error instanceof TypeError || error instanceof RangeError || (error instanceof Error && !error.code)) throw new HttpsError('invalid-argument', error.message)
    console.error('propertyPrototype failed', { code: error?.code })
    throw new HttpsError('internal', '操作に失敗しました。再読込して確認してください。')
  }
})

export const registerCase = onCall('registerCase', async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.')
  try {
    return await withRecovery(request, true, db => registerCaseTransaction(db, request.data, request.auth.uid))
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new HttpsError('permission-denied', error.message)
    }
    throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'Case registration failed.')
  }
})

const warrantyCallable = (name, operation) => onCall(name, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.')
  try { return await withRecovery(request, true, db => operation(db, request.data, request.auth.uid)) } catch (error) {
    const allowed = new Set(['invalid-argument', 'permission-denied', 'not-found', 'aborted', 'failed-precondition'])
    throw new HttpsError(allowed.has(error?.code) ? error.code : 'internal', error instanceof AppliedWarrantyOperationError ? error.message : '適用保証を更新できませんでした。')
  }
})
export const addAppliedWarranty = warrantyCallable('addAppliedWarranty', addAppliedWarrantyTransaction)
export const updateAppliedWarranty = warrantyCallable('updateAppliedWarranty', updateAppliedWarrantyTransaction)

const companyPortalCallable = (name, operation, accountMutation = false) => onCall(name, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.')
  try {
    return await withRecovery(request, true, db => operation(request, db), { accountMutation })
  } catch (error) {
    const allowed = new Set(['invalid-argument', 'permission-denied', 'not-found', 'already-exists', 'aborted', 'failed-precondition'])
    const code = error instanceof CompanyPortalError && allowed.has(error.code) ? error.code : 'internal'
    throw new HttpsError(code, error instanceof CompanyPortalError ? error.message : '工務店ポータルの操作に失敗しました。')
  }
})

export const createConstructionCompanyAccount = companyPortalCallable('createConstructionCompanyAccount', (request, db) =>
  createConstructionCompanyAccountOperation(getAuth(), db, request.data, request.auth.uid), true)
export const setConstructionCompanyAccountEnabled = companyPortalCallable('setConstructionCompanyAccountEnabled', (request, db) =>
  setConstructionCompanyAccountEnabledOperation(getAuth(), db, request.data, request.auth.uid), true)
export const createRenewalWorkItem = companyPortalCallable('createRenewalWorkItem', (request, db) =>
  createRenewalWorkItemOperation(db, request.data, request.auth.uid))
export const createNewCaseWorkItem = companyPortalCallable('createNewCaseWorkItem', (request, db) =>
  createNewCaseWorkItemOperation(db, request.data, request.auth.uid))
export const updateCompanyCaseWorkItem = companyPortalCallable('updateCompanyCaseWorkItem', (request, db) =>
  updateCompanyCaseWorkItemOperation(db, request.data, request.auth.uid))
export const withdrawNewCaseWorkItem = companyPortalCallable('withdrawNewCaseWorkItem', (request, db) =>
  withdrawNewCaseWorkItemOperation(db, request.data, request.auth.uid))
export const reviewCompanyCaseWorkItem = companyPortalCallable('reviewCompanyCaseWorkItem', (request, db) =>
  reviewCompanyCaseWorkItemOperation(db, request.data, request.auth.uid))

const staffAccountCallable = (name, operation, mutation = true) => onCall(name, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.')
  try {
    return await withRecovery(request, mutation, db => operation(request, db), { accountMutation: mutation })
  } catch (error) {
    const allowed = new Set(['invalid-argument', 'permission-denied', 'not-found', 'already-exists', 'aborted', 'failed-precondition'])
    const code = error instanceof StaffAccountError && allowed.has(error.code) ? error.code : 'internal'
    throw new HttpsError(code, error instanceof StaffAccountError ? error.message : '担当者アカウントを管理できませんでした。')
  }
})

export const listManageableStaffAccounts = staffAccountCallable('listManageableStaffAccounts', (request, db) =>
  listManageableStaffAccountsOperation(db, request.auth.uid), false)
export const createStaffAccount = staffAccountCallable('createStaffAccount', (request, db) =>
  createStaffAccountOperation(getAuth(), db, request.data, request.auth.uid))
export const updateStaffAccount = staffAccountCallable('updateStaffAccount', (request, db) =>
  updateStaffAccountOperation(getAuth(), db, request.data, request.auth.uid))
export const setStaffAccountEnabled = staffAccountCallable('setStaffAccountEnabled', (request, db) =>
  setStaffAccountEnabledOperation(getAuth(), db, request.data, request.auth.uid))

export const recoveryRuntime = onCall('recoveryRuntime', () => recoveryRuntimeOperation())
export const recoveryStatus = onCall('recoveryStatus', request => recoveryStatusOperation(request))
