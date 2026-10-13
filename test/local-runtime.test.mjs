import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertApprovedPrototypeRuntime, assertLocalPrototypeRuntime, resolveProjectId } from '../functions/local-runtime.js'
import { LOCAL_RUNTIME, localRuntimeHost } from '../src/config/local-emulator.mjs'
import { TEST_RUNTIME, isIsolatedTestEnvironment } from '../functions/test-emulator-profile.js'

test('test profile requires all isolated endpoints, project and run identity; Local is not a fallback', () => {
  const env = { FUNCTIONS_EMULATOR:'true', TERMITE_TEST_RUN:'12345678-1234-1234-1234-123456789abc',
    GCLOUD_PROJECT:TEST_RUNTIME.projectId, GOOGLE_CLOUD_PROJECT:TEST_RUNTIME.projectId,
    FIRESTORE_EMULATOR_HOST:'127.0.0.1:38080', FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:39099', FIREBASE_EMULATOR_HUB:'127.0.0.1:34400' }
  assert.ok(isIsolatedTestEnvironment(env))
  assert.doesNotThrow(() => assertLocalPrototypeRuntime(env))
  assert.doesNotThrow(() => assertApprovedPrototypeRuntime(env))
  for (const [key,value] of Object.entries(env)) {
    const invalid = {...env, [key]:key === 'FUNCTIONS_EMULATOR' ? 'false' : 'invalid'}
    assert.throws(() => assertLocalPrototypeRuntime(invalid))
    assert.throws(() => assertApprovedPrototypeRuntime(invalid))
  }
  assert.throws(() => assertLocalPrototypeRuntime({...env, FIRESTORE_EMULATOR_HOST:'127.0.0.1:28080'}))
  assert.throws(() => assertApprovedPrototypeRuntime({...env, GCLOUD_PROJECT:'termite-warranty-dev', FUNCTIONS_EMULATOR:'false', FIRESTORE_EMULATOR_HOST:undefined}))
  const localPorts = new Set(Object.entries(LOCAL_RUNTIME).filter(([k])=>k.endsWith('Port')).map(([,v])=>v))
  const ports = Object.entries(TEST_RUNTIME).filter(([k])=>k.endsWith('Port')).map(([,v])=>v)
  assert.equal(new Set(ports).size,ports.length)
  assert.ok(ports.every(port=>!localPorts.has(port)&&port!==9150))
})

const validEnvironment = {
  FUNCTIONS_EMULATOR: 'true',
  FIRESTORE_EMULATOR_HOST: localRuntimeHost(LOCAL_RUNTIME.firestorePort),
  GCLOUD_PROJECT: 'demo-termite-warranty',
}

test('local runtime guard accepts only the intended loopback demo emulator', () => {
  assert.doesNotThrow(() => assertLocalPrototypeRuntime(validEnvironment))
  for (const override of [
    { FUNCTIONS_EMULATOR: 'false' },
    { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' },
    { FIRESTORE_EMULATOR_HOST: '127.0.0.1:5001' },
    { FIRESTORE_EMULATOR_HOST: `localhost:${LOCAL_RUNTIME.firestorePort}` },
    { FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443' },
    { GCLOUD_PROJECT: 'production-project' },
  ]) {
    assert.throws(() => assertLocalPrototypeRuntime({ ...validEnvironment, ...override }))
  }
})

test('project ID can be resolved from emulator Firebase configuration', () => {
  assert.equal(resolveProjectId({
    FIREBASE_CONFIG: JSON.stringify({ projectId: 'demo-termite-warranty' }),
  }), 'demo-termite-warranty')
  assert.equal(resolveProjectId({ FIREBASE_CONFIG: '{' }), undefined)
})

test('approved runtime guard accepts only the exact emulator or development project', () => {
  assert.doesNotThrow(() => assertApprovedPrototypeRuntime(validEnvironment))
  assert.doesNotThrow(() => assertApprovedPrototypeRuntime({ GCLOUD_PROJECT: 'termite-warranty-dev' }))
  for (const environment of [
    { GCLOUD_PROJECT: 'termite-warranty-dev', FUNCTIONS_EMULATOR: 'true' },
    { GCLOUD_PROJECT: 'termite-warranty-dev', FIRESTORE_EMULATOR_HOST: localRuntimeHost(LOCAL_RUNTIME.firestorePort) },
    { GCLOUD_PROJECT: 'demo-termite-warranty' },
    { GCLOUD_PROJECT: 'termite-warranty-prod' },
    {},
  ]) assert.throws(() => assertApprovedPrototypeRuntime(environment))
})
