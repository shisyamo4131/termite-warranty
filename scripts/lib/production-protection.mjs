// Additive protection foundation only. No business/Auth writes or IAM mutation.
import {randomUUID} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {fixedRuntimeState,sameFixedEpoch} from '../../src/domain/fixed-recovery.mjs'
import {assertPrivateAuthBucket} from '../../src/domain/backup-health.mjs'
const refuse=()=>{throw Error('Protection foundation refused; inspect the retained operation before retrying.')}
export const protectionBucket=t=>`${t.project}-auth-backups-${t.projectNumber}`
export function protectionBucketSpec(t){return {name:protectionBucket(t),location:'ASIA-NORTHEAST1',storageClass:'STANDARD',iamConfiguration:{publicAccessPrevention:'enforced',uniformBucketLevelAccess:{enabled:true}},lifecycle:{rule:[{action:{type:'Delete'},condition:{age:30,matchesPrefix:['auth/']}}]},softDeletePolicy:{retentionDurationSeconds:'0'}}}
export function protectionRequestAllowed(url,method,t,write=false,body){
  try{
    const u=new URL(url),base=`/storage/v1/b/${protectionBucket(t)}`
    if(u.origin!=='https://storage.googleapis.com'||u.username||u.password||u.hash)return false
    if(method==='GET')return !u.search&&[base,base+'/iam'].includes(u.pathname)
    return write&&method==='POST'&&u.pathname==='/storage/v1/b'&&u.search===`?project=${t.project}`&&isDeepStrictEqual(body,protectionBucketSpec(t))
  }catch{return false}
}
export function productionProtectionProvider({target:t,request,provider}){
  const root=`https://storage.googleapis.com/storage/v1/b/${protectionBucket(t)}`
  async function inspect(){
    const db=await provider.describe('(default)'),schedules=await provider.schedules('(default)')
    if(db.name!==`projects/${t.project}/databases/(default)`||db.locationId!=='asia-northeast1'||db.type!=='FIRESTORE_NATIVE'||!['POINT_IN_TIME_RECOVERY_DISABLED','POINT_IN_TIME_RECOVERY_ENABLED'].includes(db.pointInTimeRecoveryEnablement))refuse()
    if(schedules.length>1||schedules.some(s=>!s.dailyRecurrence||s.weeklyRecurrence||s.retention!=='2592000s'))refuse()
    let bucket
    try{bucket=await request(root)}catch(e){if(e.status!==404)throw e}
    if(bucket){
      const spec=protectionBucketSpec(t)
      assertPrivateAuthBucket(bucket,await request(root+'/iam'),t.projectNumber)
      if(bucket.name!==spec.name||bucket.location!==spec.location||bucket.storageClass!==spec.storageClass||Number(bucket.softDeletePolicy?.retentionDurationSeconds??-1)!==0||!isDeepStrictEqual(bucket.lifecycle,spec.lifecycle)||bucket.versioning?.enabled||bucket.retentionPolicy)refuse()
    }
    const pitrEnabled=db.pointInTimeRecoveryEnablement==='POINT_IN_TIME_RECOVERY_ENABLED'
    return {pitrEnabled,dailySchedules:schedules.length,privateBucket:!!bucket,foundationReady:pitrEnabled&&schedules.length===1&&!!bucket}
  }
  async function configure(){
    const before=await inspect()
    if(!before.privateBucket)await request(`https://storage.googleapis.com/storage/v1/b?project=${t.project}`,'POST',protectionBucketSpec(t))
    // An unknown POST/PATCH result is never automatically resubmitted.
    await provider.configure('(default)')
    return inspect()
  }
  return {inspect,configure}
}
export async function configureProductionProtection(o,{database,protection}){
  const kind=o.command==='backup-job-run'?'production-backup-job':o.command==='auth-protection-configure'?'production-auth-protection':'production-protection-foundation'
  const control=database(o.target.control),runtime=control.doc('recovery/runtime'),lock=control.doc('recovery/operatorLock'),journal=control.doc(`productionProtection/${o.operation}`)
  const marker=fixedRuntimeState((await database('(default)').doc('_recovery/access').get()).data())
  if(marker.phase!=='normal'||marker.generation!==o.generation||marker.controlDatabaseId!==o.target.control)refuse()
  // Validate ALL current foundation settings before any control or Cloud write.
  const inspected=await protection.inspect()
  if(o.resumeOwner){
    // Finalize only: previous worker must be stopped, every setting already
    // verified, and exact private lock/journal identity retained. NO API writes.
    if(!o.workerStopped||!inspected.foundationReady)refuse()
    await control.runTransaction(async tx=>{
      const [state,held,prior]=await Promise.all([tx.get(runtime),tx.get(lock),tx.get(journal)])
      const h=held.data(),j=prior.data()
      if(!sameFixedEpoch(marker,fixedRuntimeState(state.data()))||h?.kind!==kind||h?.owner!==o.resumeOwner||j?.owner!==o.resumeOwner||j?.status!=='started'||['operationId','generation','approval','revision'].some(k=>h[k]!==j[k]||j[k]!==({operationId:o.operation,...o})[k]))refuse()
      tx.update(journal,{status:'verified'});tx.delete(lock)
    })
    return inspected
  }
  const owner=randomUUID()
  await control.runTransaction(async tx=>{
    const [state,held,prior,exporting,ops]=await Promise.all([tx.get(runtime),tx.get(lock),tx.get(journal),tx.get(control.doc('recovery/authExportLock')),tx.get(control.collection('recoveryOperations').limit(1))])
    if(!sameFixedEpoch(marker,fixedRuntimeState(state.data()))||held.exists||prior.exists||exporting.exists||ops.size)refuse()
    const entry={owner,operationId:o.operation,generation:o.generation,approval:o.approval,revision:o.revision,status:'started'}
    tx.create(lock,{...entry,kind});tx.create(journal,entry)
  })
  // Retain journal/lock on ANY uncertain result, including an asynchronous PITR
  // update not yet visible. Read-only inspection remains available; no retry.
  const result=await protection.configure()
  if(!result.foundationReady)refuse()
  const after=fixedRuntimeState((await database('(default)').doc('_recovery/access').get()).data())
  if(!sameFixedEpoch(marker,after))refuse()
  await control.runTransaction(async tx=>{
    const [held,state]=await Promise.all([tx.get(lock),tx.get(runtime)])
    if(held.data()?.owner!==owner||!sameFixedEpoch(marker,fixedRuntimeState(state.data())))refuse()
    tx.update(journal,{status:'verified'});tx.delete(lock)
  })
  return result
}
