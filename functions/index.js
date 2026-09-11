import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { assertApprovedPrototypeRuntime } from './local-runtime.js'
import { registerCaseTransaction } from './register-case.js'
import {
  createMasterTransaction,
  setMasterActiveTransaction,
  updateMasterTransaction,
} from './master-management.js'
import { MasterDataError } from '../src/domain/master-data.mjs'
import { AppliedWarrantyOperationError, addAppliedWarrantyTransaction, updateAppliedWarrantyTransaction } from './applied-warranty-management.js'

assertApprovedPrototypeRuntime()
setGlobalOptions({ region: 'asia-northeast1' })
initializeApp()

export const getOwnProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in is required.')
  }

  const snapshot = await getFirestore()
    .collection('staffAccounts')
    .doc(request.auth.uid)
    .get()

  if (!snapshot.exists || snapshot.data()?.enabled !== true) {
    throw new HttpsError('permission-denied', 'The staff account is disabled or missing.')
  }

  const profile = snapshot.data()
  return {
    uid: request.auth.uid,
    displayName: profile.displayName,
    role: profile.role,
    enabled: true,
  }
})

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

const masterCallable = (operation) => onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.')
  try {
    return await operation(getFirestore(), request.data, request.auth.uid)
  } catch (error) {
    const allowedCodes = new Set([
      'invalid-argument',
      'permission-denied',
      'not-found',
      'aborted',
      'failed-precondition',
    ])
    const code = allowedCodes.has(error?.code) ? error.code : 'internal'
    const message = error instanceof MasterDataError || allowedCodes.has(error?.code)
      ? error.message
      : 'Master operation failed.'
    throw new HttpsError(code, message)
  }
})

export const createMaster = masterCallable(createMasterTransaction)
export const updateMaster = masterCallable(updateMasterTransaction)
export const setMasterActive = masterCallable(setMasterActiveTransaction)

const warrantyCallable = (operation) => onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.')
  try { return await operation(getFirestore(), request.data, request.auth.uid) } catch (error) {
    const allowed = new Set(['invalid-argument', 'permission-denied', 'not-found', 'aborted', 'failed-precondition'])
    throw new HttpsError(allowed.has(error?.code) ? error.code : 'internal', error instanceof AppliedWarrantyOperationError ? error.message : '適用保証を更新できませんでした。')
  }
})
export const addAppliedWarranty = warrantyCallable(addAppliedWarrantyTransaction)
export const updateAppliedWarranty = warrantyCallable(updateAppliedWarrantyTransaction)
