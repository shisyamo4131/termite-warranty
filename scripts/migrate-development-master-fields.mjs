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
const demoWarrantyShortNames = new Map([
  ['development-demo-standard', '安心5年'],
  ['development-demo-long', '長期10年'],
])
const planned = []
const unresolved = []
for (const [index, snapshot] of snapshots.entries()) {
  const collectionName = collectionNames[index]
  for (const document of snapshot.docs) {
    const data = document.data()
    const demoShortName = demoWarrantyShortNames.get(document.id)
    if (demoShortName) {
      if (data.shortName !== demoShortName) planned.push({ collectionName, document, patch: { shortName: demoShortName } })
      continue
    }
    try {
      const patch = masterFieldMigrationPatch(collectionName, data)
      if (patch) planned.push({ collectionName, document, patch })
    } catch {
      unresolved.push(`${collectionName}/${document.id}`)
    }
  }
}

const counts = Object.fromEntries(collectionNames.map(name => [name, planned.filter(item => item.collectionName === name).length]))
console.log(JSON.stringify({ projectId, mode: apply ? 'apply' : 'dry-run', counts, unresolvedCount: unresolved.length, unresolved }))

if (apply) {
  if (unresolved.length > 0) throw new Error('Refusing to write while warranty-service short names require a manual decision.')
  for (let offset = 0; offset < planned.length; offset += 450) {
    const batch = firestore.batch()
    for (const { document, patch } of planned.slice(offset, offset + 450)) {
      batch.update(document.ref, patch)
    }
    await batch.commit()
  }
  console.log(JSON.stringify({ projectId, migrated: planned.length, counts }))
}
