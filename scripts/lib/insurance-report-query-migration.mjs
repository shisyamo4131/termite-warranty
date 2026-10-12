import { FieldPath } from 'firebase-admin/firestore'
import { insuranceReportedQueryProjection } from '../../src/domain/insurance-state.mjs'

const matches = row => Object.entries(insuranceReportedQueryProjection(row)).every(([key,value])=>JSON.stringify(row[key])===JSON.stringify(value))

// Only the two new derived fields are repaired. Other projection or business
// inconsistencies must be handled by their own reviewed migration.
export async function migrateInsuranceReportQueries(db, {apply=false,generation}={}) {
  const guard = async tx => {
    if (generation === undefined) return // Isolated Local seed/tests; live CLI always supplies it.
    const marker = (await tx.get(db.doc('_recovery/access'))).data()
    if (marker?.phase !== 'normal' || marker.databaseId !== '(default)' || marker.generation !== generation) throw Error('Recovery state changed during insurance report migration.')
  }
  if (apply) await db.runTransaction(async tx=>{await guard(tx);tx.set(db.doc('prototypeSettings/insuranceReportQueries'),{version:0})})
  let cursor,scanned=0,changed=0
  do {
    let query=db.collection('propertyWarranties').orderBy(FieldPath.documentId()).limit(100)
    if(cursor)query=query.startAfter(cursor)
    const page=await query.get()
    for(const snapshot of page.docs) {
      scanned++
      if(matches(snapshot.data()))continue
      changed++
      if(apply)await db.runTransaction(async tx=>{
        await guard(tx)
        const current=await tx.get(snapshot.ref)
        if(current.exists&&!matches(current.data()))tx.update(snapshot.ref,insuranceReportedQueryProjection(current.data()))
      })
    }
    cursor=page.size===100?page.docs.at(-1):null
  }while(cursor)
  if(apply) {
    const verify=await migrateInsuranceReportQueries(db)
    if(verify.changed)throw Error('Insurance report query verification failed; readiness not published.')
    await db.runTransaction(async tx=>{await guard(tx);tx.set(db.doc('prototypeSettings/insuranceReportQueries'),{version:1})})
  }
  return {scanned,changed,applied:apply}
}
