import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { masterFieldMigrationPatch } from '../src/domain/master-data.mjs'

const projectId = 'termite-warranty-dev'
const apply = process.argv.includes('--apply')
const confirmation = process.argv.find(argument => argument.startsWith('--confirm='))?.slice('--confirm='.length)

if (apply && confirmation !== projectId) {
  throw new Error(`Refusing to write. Pass --confirm=${projectId} with --apply.`)
}

const firestore = getFirestore(initializeApp({ credential: applicationDefault(), projectId }))
const collectionNames = ['warrantyServices']
const snapshots = await Promise.all(collectionNames.map(name => firestore.collection(name).get()))
const planned = snapshots.flatMap((snapshot, index) => snapshot.docs.flatMap(document => {
  const collectionName = collectionNames[index]
  const patch = masterFieldMigrationPatch(collectionName, document.data())
  return patch ? [{ collectionName, document, patch }] : []
}))

const counts = Object.fromEntries(collectionNames.map(name => [name, planned.filter(item => item.collectionName === name).length]))
console.log(JSON.stringify({ projectId, mode: apply ? 'apply' : 'dry-run', counts }))

if (apply) {
  for (let offset = 0; offset < planned.length; offset += 450) {
    const batch = firestore.batch()
    for (const { document, patch } of planned.slice(offset, offset + 450)) {
      batch.update(document.ref, patch)
    }
    await batch.commit()
  }
  console.log(JSON.stringify({ projectId, migrated: planned.length, counts }))
}
