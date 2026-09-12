import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { LOCAL_RUNTIME, localRuntimeUrl } from '../../src/config/local-emulator.mjs'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const localProjectId = config.public.firebaseProjectId
  const developmentProjectId = config.public.firebaseDevProjectId
  const functionsRegion = config.public.firebaseFunctionsRegion
  const isLocal = new Set(['127.0.0.1', 'localhost']).has(window.location.hostname)

  if (typeof functionsRegion !== 'string' || functionsRegion !== 'asia-northeast1') {
    throw new Error('The Firebase Functions region is not approved for this environment.')
  }

  let firebaseOptions: FirebaseOptions
  if (isLocal) {
    if (localProjectId !== 'demo-termite-warranty') {
      throw new Error('The local prototype accepts only the demo-termite-warranty emulator project.')
    }
    firebaseOptions = {
      projectId: localProjectId,
      apiKey: 'demo-only-api-key',
      authDomain: `${localProjectId}.firebaseapp.com`,
    }
  } else {
    const response = await fetch('/__/firebase/init.json', { cache: 'no-store' })
    if (!response.ok) throw new Error('Firebase Hosting configuration could not be loaded.')
    firebaseOptions = await response.json() as FirebaseOptions
    if (developmentProjectId !== 'termite-warranty-dev' || firebaseOptions.projectId !== developmentProjectId) {
      throw new Error('This build is not running on the approved Firebase development project.')
    }
  }

  const app = getApps().length
    ? getApp()
    : initializeApp(firebaseOptions)
  const auth = getAuth(app)
  const firestore = getFirestore(app)
  const functions = getFunctions(app, functionsRegion)

  const emulatorState = globalThis as typeof globalThis & {
    __termiteWarrantyEmulatorsConnected?: boolean
  }
  if (isLocal && !emulatorState.__termiteWarrantyEmulatorsConnected) {
    connectAuthEmulator(auth, localRuntimeUrl(LOCAL_RUNTIME.authPort), { disableWarnings: true })
    connectFirestoreEmulator(firestore, LOCAL_RUNTIME.host, LOCAL_RUNTIME.firestorePort)
    connectFunctionsEmulator(functions, LOCAL_RUNTIME.host, LOCAL_RUNTIME.functionsPort)
    emulatorState.__termiteWarrantyEmulatorsConnected = true
  }
  await setPersistence(auth, browserSessionPersistence)

  return {
    provide: {
      firebase: { auth, firestore, functions },
    },
  }
})
