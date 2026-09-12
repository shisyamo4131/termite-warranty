import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  LOCAL_RUNTIME,
  localRuntimeHost,
  resolveDedicatedEmulatorHost,
} from '../src/config/local-emulator.mjs'

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))

test('Firebase and Nuxt local ports match the shared dedicated allocation', async () => {
  const firebase = await readJson('../firebase.json')
  const manifest = await readJson('../package.json')
  const configured = firebase.emulators

  assert.deepEqual(
    {
      auth: configured.auth,
      firestore: configured.firestore,
      functions: configured.functions,
      ui: configured.ui,
      hub: configured.hub,
      logging: configured.logging,
    },
    {
      auth: { host: LOCAL_RUNTIME.host, port: LOCAL_RUNTIME.authPort },
      firestore: { host: LOCAL_RUNTIME.host, port: LOCAL_RUNTIME.firestorePort },
      functions: { host: LOCAL_RUNTIME.host, port: LOCAL_RUNTIME.functionsPort },
      ui: { enabled: true, host: LOCAL_RUNTIME.host, port: LOCAL_RUNTIME.emulatorUiPort },
      hub: { host: LOCAL_RUNTIME.host, port: LOCAL_RUNTIME.emulatorHubPort },
      logging: { host: LOCAL_RUNTIME.host, port: LOCAL_RUNTIME.emulatorLoggingPort },
    },
  )
  assert.match(manifest.scripts.dev, new RegExp(`--host ${LOCAL_RUNTIME.host} --port ${LOCAL_RUNTIME.nuxtPort}$`))
  assert.match(
    manifest.scripts['dev:ui-workbench'],
    new RegExp(`--host ${LOCAL_RUNTIME.host} --port ${LOCAL_RUNTIME.workbenchPreviewPort}$`),
  )
})

test('the dedicated allocation has no internal port collisions and matches the Functions guard', async () => {
  const ports = [
    LOCAL_RUNTIME.nuxtPort,
    LOCAL_RUNTIME.workbenchPreviewPort,
    LOCAL_RUNTIME.authPort,
    LOCAL_RUNTIME.firestorePort,
    LOCAL_RUNTIME.functionsPort,
    LOCAL_RUNTIME.emulatorUiPort,
    LOCAL_RUNTIME.emulatorHubPort,
    LOCAL_RUNTIME.emulatorLoggingPort,
  ]
  assert.equal(new Set(ports).size, ports.length)

  const functionsRuntime = await readFile(new URL('../functions/local-runtime.js', import.meta.url), 'utf8')
  assert.match(functionsRuntime, new RegExp(`prototypeFirestoreHost = '${localRuntimeHost(LOCAL_RUNTIME.firestorePort)}'`))
})

test('seed targets accept only the dedicated Auth and Firestore emulator hosts', () => {
  const firestoreHost = localRuntimeHost(LOCAL_RUNTIME.firestorePort)
  const authHost = localRuntimeHost(LOCAL_RUNTIME.authPort)

  assert.equal(
    resolveDedicatedEmulatorHost(undefined, LOCAL_RUNTIME.firestorePort, 'FIRESTORE_EMULATOR_HOST'),
    firestoreHost,
  )
  assert.equal(
    resolveDedicatedEmulatorHost(authHost, LOCAL_RUNTIME.authPort, 'FIREBASE_AUTH_EMULATOR_HOST'),
    authHost,
  )

  for (const rejected of ['127.0.0.1:8080', 'localhost:28080', '0.0.0.0:28080', '127.0.0.1:1']) {
    assert.throws(
      () => resolveDedicatedEmulatorHost(rejected, LOCAL_RUNTIME.firestorePort, 'FIRESTORE_EMULATOR_HOST'),
      { message: `FIRESTORE_EMULATOR_HOST must be ${firestoreHost}; received ${rejected}.` },
    )
  }
  assert.throws(
    () => resolveDedicatedEmulatorHost('127.0.0.1:9099', LOCAL_RUNTIME.authPort, 'FIREBASE_AUTH_EMULATOR_HOST'),
    { message: 'FIREBASE_AUTH_EMULATOR_HOST must be 127.0.0.1:29099; received 127.0.0.1:9099.' },
  )
})
