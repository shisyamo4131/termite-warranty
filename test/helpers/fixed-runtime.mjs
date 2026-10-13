import './emulator-runtime.mjs'
import { httpsCallable as callable } from 'firebase/functions'
import { getFirestore } from 'firebase-admin/firestore'
import { getApps } from 'firebase-admin/app'
import { doc, setDoc } from 'firebase/firestore'

export const fixtureRuntime = { protocol: 2, generation: 1, phase: 'normal', databaseId: '(default)', controlDatabaseId: 'test-fixed-control' }
function assertFixture() {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:38080') throw new Error('Fixed fixtures require dedicated fictional emulator.')
}
export async function seedFixedRuntime(adminDb) {
  assertFixture()
  if (adminDb.projectId !== 'demo-termite-warranty-test') throw new Error('Fictional project required.')
  await adminDb.doc('_recovery/access').set(fixtureRuntime)
  const app = getApps().find(value => value.options.projectId === 'demo-termite-warranty-test')
  if (!app) throw new Error('Fictional Admin application required.')
  await getFirestore(app, 'test-fixed-control').doc('recovery/runtime').set(fixtureRuntime)
}
export async function seedFixedRules(db) {
  assertFixture()
  await setDoc(doc(db, '_recovery/access'), fixtureRuntime)
}
export function httpsCallable(functions, name) {
  const invoke = callable(functions, name)
  return input => invoke({ ...input, runtimeProtocol: 2, runtimeGeneration: 1 })
}
