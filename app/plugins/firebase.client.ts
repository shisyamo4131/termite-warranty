import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, doc, onSnapshot } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { getDoc } from 'firebase/firestore'
import { fixedRuntimeState } from '../../src/domain/fixed-recovery.mjs'
import { initializeRecovery, recoveryRuntime, recoveryProblem, type RecoveryRuntime } from '../utils/recoveryClient'
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
  try {
    const result = fixedRuntimeState((await getDoc(doc(firestore, '_recovery/access'))).data()) as RecoveryRuntime
    initializeRecovery(result)
    onSnapshot(doc(firestore, '_recovery/access'), snapshot => {
      const value = snapshot.data()
      if (!value || value.protocol !== 2 || value.generation !== result.generation || value.phase !== result.phase || value.databaseId !== '(default)' || value.controlDatabaseId !== result.controlDatabaseId) {
        recoveryRuntime.value = { ...result, phase: 'unavailable' }
        // Force recreation of Firebase handles, profile listeners and caches.
        window.location.reload()
      }
    }, () => { recoveryRuntime.value = { ...result, phase: 'unavailable' }; recoveryProblem.value = '接続状態を確認できません。再読込してください。' })
  } catch {
    recoveryProblem.value = 'システムの接続状態を確認できません。時間をおいて再読込してください。'
  }

  return {
    provide: {
      firebase: { auth, firestore, functions },
    },
  }
})
