import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { assertApprovedPrototypeRuntime } from './local-runtime.js'
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

export const registerCase = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.')
  const firestore = getFirestore()
  try {
    return await registerCaseTransaction(firestore, request.data, request.auth.uid)
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new HttpsError('permission-denied', error.message)
    }
    throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'Case registration failed.')
  }
})

const warrantyCallable = (operation) => onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.')
  try { return await operation(getFirestore(), request.data, request.auth.uid) } catch (error) {
    const allowed = new Set(['invalid-argument', 'permission-denied', 'not-found', 'aborted', 'failed-precondition'])
    throw new HttpsError(allowed.has(error?.code) ? error.code : 'internal', error instanceof AppliedWarrantyOperationError ? error.message : '適用保証を更新できませんでした。')
  }
})
export const addAppliedWarranty = warrantyCallable(addAppliedWarrantyTransaction)
export const updateAppliedWarranty = warrantyCallable(updateAppliedWarrantyTransaction)

const companyPortalCallable = operation => onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.')
  try {
    return await operation(request)
  } catch (error) {
    const allowed = new Set(['invalid-argument', 'permission-denied', 'not-found', 'already-exists', 'aborted', 'failed-precondition'])
    const code = error instanceof CompanyPortalError && allowed.has(error.code) ? error.code : 'internal'
    throw new HttpsError(code, error instanceof CompanyPortalError ? error.message : '工務店ポータルの操作に失敗しました。')
  }
})

export const createConstructionCompanyAccount = companyPortalCallable(request =>
  createConstructionCompanyAccountOperation(getAuth(), getFirestore(), request.data, request.auth.uid))
export const setConstructionCompanyAccountEnabled = companyPortalCallable(request =>
  setConstructionCompanyAccountEnabledOperation(getAuth(), getFirestore(), request.data, request.auth.uid))
export const createRenewalWorkItem = companyPortalCallable(request =>
  createRenewalWorkItemOperation(getFirestore(), request.data, request.auth.uid))
export const createNewCaseWorkItem = companyPortalCallable(request =>
  createNewCaseWorkItemOperation(getFirestore(), request.data, request.auth.uid))
export const updateCompanyCaseWorkItem = companyPortalCallable(request =>
  updateCompanyCaseWorkItemOperation(getFirestore(), request.data, request.auth.uid))
export const withdrawNewCaseWorkItem = companyPortalCallable(request =>
  withdrawNewCaseWorkItemOperation(getFirestore(), request.data, request.auth.uid))
export const reviewCompanyCaseWorkItem = companyPortalCallable(request =>
  reviewCompanyCaseWorkItemOperation(getFirestore(), request.data, request.auth.uid))

const staffAccountCallable = operation => onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.')
  try {
    return await operation(request)
  } catch (error) {
    const allowed = new Set(['invalid-argument', 'permission-denied', 'not-found', 'already-exists', 'failed-precondition'])
    const code = error instanceof StaffAccountError && allowed.has(error.code) ? error.code : 'internal'
    throw new HttpsError(code, error instanceof StaffAccountError ? error.message : '担当者アカウントを管理できませんでした。')
  }
})

export const listManageableStaffAccounts = staffAccountCallable(request =>
  listManageableStaffAccountsOperation(getFirestore(), request.auth.uid))
export const createStaffAccount = staffAccountCallable(request =>
  createStaffAccountOperation(getAuth(), getFirestore(), request.data, request.auth.uid))
export const updateStaffAccount = staffAccountCallable(request =>
  updateStaffAccountOperation(getAuth(), getFirestore(), request.data, request.auth.uid))
export const setStaffAccountEnabled = staffAccountCallable(request =>
  setStaffAccountEnabledOperation(getAuth(), getFirestore(), request.data, request.auth.uid))
