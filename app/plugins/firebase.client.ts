import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const projectId = config.public.firebaseProjectId

  if (typeof projectId !== 'string' || !projectId.startsWith('demo-')) {
    throw new Error('This prototype accepts only a local Firebase demo project ID.')
  }

  const app = getApps().length
    ? getApp()
    : initializeApp({
        projectId,
        apiKey: 'demo-only-api-key',
        authDomain: `${projectId}.firebaseapp.com`,
      })
  const auth = getAuth(app)
  const firestore = getFirestore(app)
  const functions = getFunctions(app)

  const emulatorState = globalThis as typeof globalThis & {
    __termiteWarrantyEmulatorsConnected?: boolean
  }
  if (!emulatorState.__termiteWarrantyEmulatorsConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true })
    connectFirestoreEmulator(firestore, '127.0.0.1', 8180)
    connectFunctionsEmulator(functions, '127.0.0.1', 5101)
    emulatorState.__termiteWarrantyEmulatorsConnected = true
  }
  await setPersistence(auth, browserSessionPersistence)

  return {
    provide: {
      firebase: { auth, firestore, functions },
    },
  }
})
