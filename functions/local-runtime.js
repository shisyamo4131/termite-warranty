const prototypeFirestoreHost = '127.0.0.1:8180'

export function resolveProjectId(env = process.env) {
  if (env.GCLOUD_PROJECT) return env.GCLOUD_PROJECT
  if (env.GCLOUD_PROJECT_ID) return env.GCLOUD_PROJECT_ID
  try {
    return JSON.parse(env.FIREBASE_CONFIG ?? '{}').projectId
  } catch {
    return undefined
  }
}

export function assertLocalPrototypeRuntime(env = process.env) {
  const projectId = resolveProjectId(env)
  if (
    env.FUNCTIONS_EMULATOR !== 'true'
    || projectId !== 'demo-termite-warranty'
    || env.FIRESTORE_EMULATOR_HOST !== prototypeFirestoreHost
  ) {
    throw new Error('This prototype function may run only against the local demo-termite-warranty emulator.')
  }
}
