import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { assertLocalPrototypeRuntime } from './local-runtime.js'
import { registerCaseTransaction } from './register-case.js'

assertLocalPrototypeRuntime()
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
