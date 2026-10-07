import {fixedRuntimeState,sameFixedEpoch} from '../../src/domain/fixed-recovery.mjs'
const deny=()=>{throw Error('Dev command admission refused.')}
const same=(a,b)=>{try{return sameFixedEpoch(fixedRuntimeState(a),fixedRuntimeState(b))}catch{return false}}
export async function admitDev({options:o,repository,request,readDocument,listOperations}) {
  if(repository.head!==o.revision||repository.dirty!==false||o.project!=='termite-warranty-dev'||!o['dev-execute']||o.apply!==true||o.confirm!=='fixed-recovery'||!o.approval)deny()
  const ids=[...new Set(['(default)',o.control,o.source])]
  const descriptions=await Promise.all(ids.map(id=>request(`https://firestore.googleapis.com/v1/projects/${o.project}/databases/${id}`)))
  if(descriptions.some((d,i)=>d.name!==`projects/${o.project}/databases/${ids[i]}`||typeof d.locationId!=='string'||!d.locationId||d.type!=='FIRESTORE_NATIVE')||new Set(descriptions.map(d=>d.locationId)).size!==1)deny()
  const [runtime,marker,lock,authLock,operations]=await Promise.all([readDocument(o.control,'recovery/runtime'),readDocument('(default)','_recovery/access'),readDocument(o.control,'recovery/operatorLock'),readDocument(o.control,'recovery/authExportLock'),listOperations(o.control)])
  const closing=o.command==='enter'||o.command==='recover-operator'&&lock?.intent?.kind==='default-enter'
  const completedPublication=o.command==='recover-operator'&&lock?.intent?.kind==='default-publish'&&same(runtime,lock.intent.next)&&same(marker,lock.intent.next)
  if(runtime?.controlDatabaseId!==o.control||runtime.generation!==o.generation||!Array.isArray(operations)||!closing&&!completedPublication&&(authLock!==null||operations.length))deny()
  const source=o.source==='(default)'?marker:await readDocument(o.source,'_recovery/access')
  if(source?.databaseId!==o.source)deny()
  if(o.command==='recover-operator') {
    if(!o['worker-stopped']||!o['expected-owner']||lock?.owner!==o['expected-owner']||lock.operationId!==o.operation||!['default-enter','default-publish','default-seal'].includes(lock.intent?.kind))deny()
    if(lock.intent.kind==='default-enter') {
      if(o.source!=='(default)'||!same(runtime,lock.intent.next)||!same(marker,lock.intent.prior)&&!same(marker,lock.intent.next))deny()
      return
    }
  }else if(o.command==='resume') {
    if(!o['worker-stopped']||!o['expected-owner']||lock?.owner!==o['expected-owner']||lock.operationId!==o.operation||lock.intent?.kind!=='default-apply')deny()
  }else if(lock!==null)deny()
  if(o.command==='enter') {
    if(o.source!=='(default)'||!same(runtime,marker)||!['normal','verification'].includes(runtime.phase))deny()
    return
  }
  if(o.command==='plan-address') {
    if(o.source!=='(default)'||runtime.phase!=='recovering'||runtime.databaseId!=='(default)'||!same(runtime,marker)||!/^[\w-]{8,80}$/.test(o.baseline??'')||!/^[\w-]{1,100}$/.test(o['address-operation']??'')||!/^[a-f0-9]{64}$/.test(o['address-plan-hash']??''))deny()
    return
  }
  if(o.command==='plan') {
    if(runtime.phase!=='recovering'||source.phase!=='recovering'||source.generation!==o.generation||o.source==='(default)'||source.controlDatabaseId!==undefined&&source.controlDatabaseId!==o.control)deny()
    if(o.migration){if(runtime.protocol!==undefined||runtime.databaseId!==o.source||source.protocol!==undefined)deny()}
    else if(!same(runtime,marker)||runtime.databaseId!=='(default)')deny()
    return
  }
  const plan=await readDocument(o.control,`defaultRecoveryPlans/${o.operation}`)
  if(!plan||plan.source!==o.source||plan.target!=='(default)'||plan.controlId!==o.control||plan.revision!==o.revision)deny()
  if(o.source!=='(default)'&&!['recovering','retired'].includes(source.phase))deny()
  const retiredGenerations=o.command==='recover-operator'&&lock.intent.kind==='default-publish'?[lock.intent.prior?.generation,lock.intent.next?.generation]:[runtime.generation]
  if(o.source!=='(default)'&&(source.controlDatabaseId!==undefined&&source.controlDatabaseId!==o.control||source.phase==='recovering'&&source.generation!==plan.generation||source.phase==='retired'&&!retiredGenerations.includes(source.generation)))deny()
  if(o.command==='recover-operator'&&lock.intent.kind==='default-publish'){if(o.approval!==lock.intent.approval)deny()}
  else if(o.command!=='reopen'&&o.approval!==plan.approval)deny()
  if(o.command==='recover-operator') {
    if(lock.intent.kind==='default-seal') {
      if(!['sealing','sealed',...(plan.publicationOnly&&plan.kind==='address-migration'?['verified']:[])].includes(plan.status)||runtime.phase!=='recovering'||plan.generation!==o.generation||!plan.migration&&!same(runtime,marker))deny()
    }else if(plan.status!=='verified'||!same(runtime,lock.intent.next)||!same(marker,lock.intent.prior)&&!same(marker,lock.intent.next))deny()
    return
  }
  if(['apply','resume'].includes(o.command)) {
    if(plan.publicationOnly||plan.kind==='address-migration')deny()
    if(!['sealed','applying','verified'].includes(plan.status)||plan.generation!==o.generation||runtime.phase!=='recovering')deny()
    if(!plan.migration&&!same(runtime,marker))deny()
    if(plan.migration&&runtime.databaseId!==o.source&&!(runtime.protocol===2&&runtime.databaseId==='(default)'))deny()
  }else {
    if(plan.status!=='verified'||runtime.databaseId!=='(default)'||!same(runtime,marker)||runtime.phase!==(o.command==='reopen'?'verification':'recovering'))deny()
    if(o.command==='publish'&&plan.generation!==o.generation||o.command==='reopen'&&plan.publishedGeneration!==o.generation)deny()
  }
}
export function sanitizeCommand(result,command) {
  const summary={mode:'execute',command}
  for(const key of ['phase','generation','planId','changes','deletes','count','status'])if(typeof result?.[key]==='string'||Number.isSafeInteger(result?.[key]))summary[key]=result[key]
  return summary
}
// The factory itself owns the fresh deployment proof immediately before public exposure.
// Closed operations must remain usable when the application release is broken.
export async function dispatchDev(o,{factory,admission,verifyClosedRules}) {
  await admission()
  if(['plan','plan-address','apply','resume'].includes(o.command))await verifyClosedRules()
  await admission()
  const resume={workerStopped:o['worker-stopped']===true,expectedOwner:o['expected-owner']}
  if(o.command==='enter')return factory.enter(o.generation,o.operation)
  if(o.command==='plan')return factory.plan(o.generation,o.operation,{source:o.source,baselineId:o.baseline,verificationId:o.verification,approval:o.approval,migration:o.migration===true})
  if(o.command==='plan-address')return factory.planAddress(o.generation,o.operation,{baselineId:o.baseline,addressOperationId:o['address-operation'],addressPlanHash:o['address-plan-hash'],approval:o.approval})
  if(['apply','resume'].includes(o.command))return factory.apply(o.operation,{...resume,resume:o.command==='resume'})
  if(o.command==='recover-operator')return factory.recoverOperator(o.operation,resume)
  if(['publish','reopen'].includes(o.command))return factory.publish(o.operation,o.approval,{reopen:o.command==='reopen'})
  deny()
}
