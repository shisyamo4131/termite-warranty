import { FieldPath } from 'firebase-admin/firestore'
import { certificateProjection as monthlyQueryProjection } from '../../src/domain/warranty-certificate.mjs'
const monthlyProjectionMatches = row => Object.entries(monthlyQueryProjection(row)).every(([key,value]) => JSON.stringify(row[key]) === JSON.stringify(value))

export async function migrateCertificateQueries(db, { apply = false, generation } = {}) {
  const guard = async tx => {
    if (generation === undefined) return // Isolated Local seed/tests only; live CLI always supplies it.
    const marker = (await tx.get(db.doc('_recovery/access'))).data()
    if (marker?.phase !== 'normal' || marker.databaseId !== '(default)' || marker.generation !== generation) throw Error('Recovery state changed during certificate migration.')
  }
  // Fail closed during repair as well as the first migration.
  if (apply) await db.runTransaction(async tx => { await guard(tx); tx.set(db.doc('prototypeSettings/certificateQueries'), { version: 0 }) })
  let cursor, scanned = 0, changed = 0
  do {
    let query = db.collection('propertyWarranties').orderBy(FieldPath.documentId()).limit(100)
    if (cursor) query = query.startAfter(cursor)
    const page = await query.get()
    for (const snapshot of page.docs) {
      scanned++
      if (monthlyProjectionMatches(snapshot.data())) continue
      changed++
      if (apply) await db.runTransaction(async tx => {
        await guard(tx)
        const current = await tx.get(snapshot.ref)
        if (current.exists && !monthlyProjectionMatches(current.data())) tx.update(snapshot.ref, monthlyQueryProjection(current.data()))
      })
    }
    cursor = page.size === 100 ? page.docs.at(-1) : null
  } while (cursor)
  if (apply) {
    const verify = await migrateCertificateQueries(db)
    if (verify.changed) throw Error('Certificate query projection verification failed; readiness not published.')
    await db.runTransaction(async tx => { await guard(tx); tx.set(db.doc('prototypeSettings/certificateQueries'), { version: 1 }) })
  }
  return { scanned, changed, applied: apply }
}
