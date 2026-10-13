import { isIsolatedTestEnvironment } from './test-emulator-profile.js'
const prototypeFirestoreHost = '127.0.0.1:28080'
const developmentProjectId = 'termite-warranty-dev'

export function resolveProjectId(env = process.env) {
  if (env.GCLOUD_PROJECT) return env.GCLOUD_PROJECT
  if (env.GCLOUD_PROJECT_ID) return env.GCLOUD_PROJECT_ID
  try {
    return JSON.parse(env.FIREBASE_CONFIG ?? '{}').projectId
  } catch {
    return undefined
  }
}

export function isLocalPrototypeRuntime(env = process.env) {
  const projectId = resolveProjectId(env)
  return env.FUNCTIONS_EMULATOR === 'true' && (
    (!env.TERMITE_TEST_RUN && projectId === 'demo-termite-warranty' && env.FIRESTORE_EMULATOR_HOST === prototypeFirestoreHost)
    || isIsolatedTestEnvironment(env))
}

export function assertLocalPrototypeRuntime(env = process.env) {
  if (!isLocalPrototypeRuntime(env)) {
    throw new Error('This prototype function may run only against the local demo-termite-warranty emulator.')
  }
}

export function assertApprovedPrototypeRuntime(env = process.env) {
  const projectId = resolveProjectId(env)
  const isLocalEmulator = isLocalPrototypeRuntime(env)
  const isDevelopment = env.FUNCTIONS_EMULATOR !== 'true'
    && !env.FIRESTORE_EMULATOR_HOST
    && !env.TERMITE_TEST_RUN
    && projectId === developmentProjectId

  if (!isLocalEmulator && !isDevelopment) {
    throw new Error('This prototype function may run only in the approved emulator or Firebase development project.')
  }
}
