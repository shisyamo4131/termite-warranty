// Fixed, loopback-only allocation for disposable automated tests. Never user Local.
export const TEST_RUNTIME = Object.freeze({
  projectId: 'demo-termite-warranty-test', host: '127.0.0.1',
  authPort: 39099, firestorePort: 38080, functionsPort: 35001,
  emulatorHubPort: 34400, emulatorLoggingPort: 34500, emulatorUiPort: 34000,
  websocketPort: 39150,
  eventarcPort: 39299, tasksPort: 39499,
})
export const testRuntimeHost = port => `${TEST_RUNTIME.host}:${port}`
export function isIsolatedTestEnvironment(env = process.env) {
  return /^[0-9a-f-]{36}$/.test(env.TERMITE_TEST_RUN ?? '')
    && env.GCLOUD_PROJECT === TEST_RUNTIME.projectId
    && (env.GOOGLE_CLOUD_PROJECT === undefined || env.GOOGLE_CLOUD_PROJECT === TEST_RUNTIME.projectId)
    && env.FIRESTORE_EMULATOR_HOST === testRuntimeHost(TEST_RUNTIME.firestorePort)
    && env.FIREBASE_AUTH_EMULATOR_HOST === testRuntimeHost(TEST_RUNTIME.authPort)
    && env.FIREBASE_EMULATOR_HUB === testRuntimeHost(TEST_RUNTIME.emulatorHubPort)
}
