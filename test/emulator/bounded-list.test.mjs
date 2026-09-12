import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { createBoundedListQuery, listCursorFromDocuments } from '../../app/repositories/boundedListQuery.ts'
import { LOCAL_RUNTIME, localRuntimeHost } from '../../src/config/local-emulator.mjs'

const projectId = 'demo-termite-warranty'
if (process.env.FIRESTORE_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.firestorePort)) {
  throw new Error(`Bounded-list integration tests require the dedicated local Firestore emulator at ${localRuntimeHost(LOCAL_RUNTIME.firestorePort)}.`)
}

let testEnvironment

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: LOCAL_RUNTIME.firestorePort,
      rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8'),
    },
  })
})

beforeEach(async () => {
  await testEnvironment.clearFirestore()
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'staffAccounts', 'staff-1'), {
      email: 'staff-1@example.invalid', displayName: 'staff-1', role: 'general_staff', enabled: true,
    })
    const updatedAt = Timestamp.fromMillis(1_800_000_000_000)
    for (let index = 0; index < 21; index += 1) {
      const id = `case-${String(index).padStart(2, '0')}`
      batch.set(doc(db, 'cases', id), { updatedAt, marker: index })
      batch.set(doc(db, 'properties', `property-${String(index).padStart(2, '0')}`), {
        constructionCompanyId: 'company-1', updatedAt, marker: index,
      })
    }
    await batch.commit()
  })
})

after(async () => {
  await testEnvironment?.cleanup()
})

test('default case query returns 20 freshest rows with stable ID tie-break and cursor continuation', async () => {
  const db = testEnvironment.authenticatedContext('staff-1').firestore()
  const first = await getDocs(createBoundedListQuery(collection(db, 'cases')))
  assert.equal(first.size, 20)
  assert.equal(first.docs[0].id, 'case-20')
  assert.equal(first.docs.at(-1).id, 'case-01')

  const cursor = listCursorFromDocuments(first.docs.map(item => ({ id: item.id, data: item.data() })))
  assert.ok(cursor)
  const second = await getDocs(createBoundedListQuery(collection(db, 'cases'), cursor))
  assert.deepEqual(second.docs.map(item => item.id), ['case-00'])
})

test('filtered linked-property query remains capped at 20 in freshness order', async () => {
  const db = testEnvironment.authenticatedContext('staff-1').firestore()
  const linked = query(collection(db, 'properties'), where('constructionCompanyId', '==', 'company-1'))
  const snapshot = await getDocs(createBoundedListQuery(linked))
  assert.equal(snapshot.size, 20)
  assert.equal(snapshot.docs[0].id, 'property-20')
  assert.equal(snapshot.docs.at(-1).id, 'property-01')
})
