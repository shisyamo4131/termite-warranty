// Fast, bounded incident discovery. No build, writes, customer fields or release claim.
import {fixedRuntimeState,sameFixedEpoch} from '../../src/domain/fixed-recovery.mjs'
export async function observeFixedRecovery({project,control,request,readDocument,listOperations}) {
  if(project!=='termite-warranty-dev'||control==='(default)')throw Error('Unapproved incident scope.')
  const ids=['(default)',control]
  const descriptions=await Promise.all(ids.map(id=>request(`https://firestore.googleapis.com/v1/projects/${project}/databases/${id}`)))
  if(descriptions.some((d,i)=>d.name!==`projects/${project}/databases/${ids[i]}`||d.type!=='FIRESTORE_NATIVE'||!d.uid||!d.locationId)||descriptions[0].locationId!==descriptions[1].locationId)throw Error('Incident identities unavailable.')
  const [raw,access,lock,operations,authLock]=await Promise.all([readDocument(control,'recovery/runtime'),readDocument('(default)','_recovery/access'),readDocument(control,'recovery/operatorLock'),listOperations(control),readDocument(control,'recovery/authExportLock')])
  const runtime=fixedRuntimeState(raw),marker=fixedRuntimeState(access)
  if(runtime.controlDatabaseId!==control||marker.controlDatabaseId!==control||!Array.isArray(operations))throw Error('Incident control mismatch.')
  const aligned=sameFixedEpoch(runtime,marker)
  const interrupted=lock?{blocked:true}:null
  if(lock&&/^[\w-]{8,80}$/.test(lock.operationId??''))interrupted.operationId=lock.operationId
  if(lock&&/^[\w-]{8,160}$/.test(lock.owner??''))interrupted.owner=lock.owner
  if(lock&&['default-enter','default-seal','default-apply','default-publish','baseline','quarantine','reconcile'].includes(lock.intent?.kind))interrupted.kind=lock.intent.kind
  return {mode:'observe',cloudWrites:false,writesPerformed:false,liveMutationAvailable:false,
    runtime,marker,aligned,activeUpdatesPresent:operations.length>0,authExportHeld:authLock!==null,
    interruptedOperation:interrupted,maintenanceMarkerClosed:marker.phase==='recovering',
    nextAction:!aligned||lock?'inspect-interruption':runtime.phase==='normal'?'enter-maintenance':runtime.phase==='verification'?'await-hs-consent':operations.length||authLock?'await-drain':'select-recovery-point'}
}
