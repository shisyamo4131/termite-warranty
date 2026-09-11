import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertApprovedPrototypeRuntime, assertLocalPrototypeRuntime, resolveProjectId } from '../functions/local-runtime.js'

const validEnvironment = {
  FUNCTIONS_EMULATOR: 'true',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180',
  GCLOUD_PROJECT: 'demo-termite-warranty',
}

test('local runtime guard accepts only the intended loopback demo emulator', () => {
  assert.doesNotThrow(() => assertLocalPrototypeRuntime(validEnvironment))
  for (const override of [
    { FUNCTIONS_EMULATOR: 'false' },
    { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' },
    { FIRESTORE_EMULATOR_HOST: '127.0.0.1:5001' },
    { FIRESTORE_EMULATOR_HOST: 'localhost:8180' },
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
    { GCLOUD_PROJECT: 'termite-warranty-dev', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180' },
    { GCLOUD_PROJECT: 'demo-termite-warranty' },
    { GCLOUD_PROJECT: 'termite-warranty-prod' },
    {},
  ]) assert.throws(() => assertApprovedPrototypeRuntime(environment))
})
