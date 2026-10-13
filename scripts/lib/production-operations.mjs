import {validateProductionTarget} from './production-deployment-plan.mjs'
import {databaseId} from '../../src/domain/recovery.mjs'
import {administratorInput,initializeProductionData,bindProductionAdministrator,requireClosed} from './production-bootstrap-data.mjs'
import {inspectHistoricalTarget,executeHistoricalIntake} from './historical-intake-execution.mjs'
import {scanDatabase} from './recovery-controller.mjs'
import {randomUUID} from 'node:crypto'
import {backupHealth} from '../../src/domain/backup-health.mjs'
const refuse=()=>{throw Error('Production operation refused or interrupted; inspect private evidence before retrying.')}
const commandKeys={
  observe:[],initialize:[],administrator:['generation','operation','approval','administrator','resumeOwner','workerStopped'],
  'intake-inspect':[],'intake-apply':['generation','operation','approval','input','today','planHash','inventoryHash','actorUid','resumeOwner','workerStopped'],
  preflight:['generation','bundle','digest','providerVersion'],backups:[],'auth-inspect':['bucket'],
  'configure-backups':['generation','operation','approval'],
  enter:['generation','operation','approval'],baseline:['generation','operation','approval'],
  restore:['generation','operation','approval','targetDatabase','backup','snapshotTime'],
  'restore-status':['generation','operation','approval','targetDatabase','restoreOperation','workerStopped'],
  quarantine:['generation','operation','approval','targetDatabase'],scan:['targetDatabase'],
  reconcile:['generation','operation','approval','targetDatabase','baseline','snapshotHash'],
  verify:['generation','operation','approval','targetDatabase','baseline','snapshotHash','restoreOperation','recoveryPoint'],
  plan:['generation','operation','approval','targetDatabase','baseline','verification'],
  'plan-intake':['generation','operation','approval','intakeOperation','planHash'],
  apply:['generation','operation','approval'],resume:['generation','operation','approval','resumeOwner','workerStopped'],
  'recover-operator':['generation','operation','approval','resumeOwner','workerStopped','bundle','digest','providerVersion'],
  'recovery-worker-resume':['generation','operation','approval','workerStopped','targetDatabase','resumeOwner','recoveryWorkerStopped'],
  publish:['generation','operation','approval','bundle','digest','providerVersion'],
  reopen:['generation','operation','approval','bundle','digest','providerVersion'],
}
const readCommands=new Set(['observe','intake-inspect','preflight','backups','auth-inspect','scan'])
export function productionOperation(value){
  if(!value||!Object.hasOwn(commandKeys,value.command))refuse()
  const keys=new Set(['target','operatorIdentity','revision','command',...commandKeys[value.command],...(value.command==='initialize'?['operation','approval']:[])])
  if(Object.keys(value).some(k=>!keys.has(k))||!/^[a-f0-9]{40}$/.test(value.revision??''))refuse()
  const target=validateProductionTarget(value.target),o={...value,target,readOnly:readCommands.has(value.command)}
  if(!o.operatorIdentity||Object.keys(o.operatorIdentity).sort().join()!=='audience,serviceAccount'||o.operatorIdentity.serviceAccount===target.serviceAccount)refuse()
  validateProductionTarget({...target,...o.operatorIdentity})
  if(!o.readOnly&&(!/^[-\w]{8,80}$/.test(o.operation??'')||!/^[-\w./:]{4,160}$/.test(o.approval??'')))refuse()
  if(commandKeys[o.command].includes('generation')&&(!Number.isSafeInteger(o.generation)||o.generation<1))refuse()
  if(commandKeys[o.command].includes('targetDatabase')&&!(o.command==='recovery-worker-resume'&&o.targetDatabase===undefined)){databaseId(o.targetDatabase);if(['(default)',target.control].includes(o.targetDatabase))refuse()}
  for(const k of ['planHash','inventoryHash','snapshotHash','digest'])if(commandKeys[o.command].includes(k)&&!/^[a-f0-9]{64}$/.test(o[k]??''))refuse()
  for(const k of ['baseline','verification','intakeOperation'])if(commandKeys[o.command].includes(k)&&!/^[-\w]{8,80}$/.test(o[k]??''))refuse()
  if(o.command==='restore'&&Boolean(o.backup)===Boolean(o.snapshotTime))refuse()
  if(commandKeys[o.command].includes('restoreOperation')&&!new RegExp(`^projects/${target.project}/databases/[-()\\w]+/operations/[-\\w]+$`).test(o.restoreOperation??''))refuse()
  if(commandKeys[o.command].includes('recoveryPoint')&&!Number.isFinite(Date.parse(o.recoveryPoint)))refuse()
  if(o.command==='administrator')administratorInput(o.administrator)
  if(o.command==='intake-apply'&&(!o.input||typeof o.input!=='object'||!/^\d{4}-\d{2}-\d{2}$/.test(o.today??'')||!/^[-\w]{1,128}$/.test(o.actorUid??'')))refuse()
  if(o.resumeOwner!==undefined&&(!o.workerStopped||!/^[-\w]{8,80}$/.test(o.resumeOwner))||o.workerStopped!==undefined&&o.workerStopped!==true)refuse()
  if(['resume','recover-operator'].includes(o.command)&&!o.resumeOwner)refuse()
  if(o.command==='recovery-worker-resume'&&(!o.workerStopped||Boolean(o.resumeOwner)!==Boolean(o.recoveryWorkerStopped)||o.recoveryWorkerStopped!==undefined&&o.recoveryWorkerStopped!==true))refuse()
  if(commandKeys[o.command].includes('bundle')&&(typeof o.bundle!=='string'||!o.bundle||!new RegExp(`^sites/${target.site}/versions/[-a-zA-Z0-9]+$`).test(o.providerVersion??'')))refuse()
  if(o.command==='auth-inspect'&&(!/^[a-z0-9][a-z0-9.-]{1,220}[a-z0-9]$/.test(o.bucket??'')||o.bucket==='termite-warranty-dev-recovery-auth'))refuse()
  return Object.freeze(o)
}
export function productionOperationPlan(o){return {command:o.command,project:o.target.project,readOnly:o.readOnly,cloudWrites:false,executionAuthorized:false}}
export async function dispatchProductionOperation(o,c){
  const {database,auth,fixed,controller,provider}=c,control=database(o.target.control)
  const closed=()=>requireClosed(database,o.target.control,o.generation,{allowLock:!!o.resumeOwner||o.command==='restore-status'})
  if(!o.readOnly)await c.assertRules()
  if(o.command==='observe')return fixed.status()
  if(o.command==='initialize')return initializeProductionData({database,controlId:o.target.control,factory:fixed})
  if(o.command==='administrator')return bindProductionAdministrator({database,auth,controlId:o.target.control,...o,input:o.administrator})
  if(o.command==='intake-inspect')return inspectHistoricalTarget(database('(default)'),control,auth,o.target)
  if(o.command==='intake-apply')return executeHistoricalIntake(database('(default)'),control,auth,o.input,{...o,operationId:o.operation,productionTarget:o.target,initialOnly:true,previousWorkerEnded:o.workerStopped===true})
  if(o.command==='preflight'){await closed();return c.verifyDeployment()}
  if(o.command==='auth-inspect')return c.inspectAuth(o.bucket)
  if(o.command==='backups'){
    const description=await provider.describe('(default)'),schedules=await provider.schedules('(default)'),backups=await provider.backups('(default)')
    const daily=schedules.filter(s=>s.dailyRecurrence)
    return {schedules,backups,policyVerified:description.pointInTimeRecoveryEnablement==='POINT_IN_TIME_RECOVERY_ENABLED'&&daily.length===1&&daily[0].retention==='2592000s',firestoreBackupStatus:backupHealth(backups,`projects/${o.target.project}/databases/(default)`,Date.now()).status}
  }
  if(o.command==='scan')return scanDatabase(database(o.targetDatabase))
  if(o.command==='enter')return fixed.enter(o.generation,o.operation)
  if(o.command==='publish'||o.command==='reopen'){
    const state=(await control.doc('recovery/runtime').get()).data();if(state?.generation!==o.generation)refuse()
    return fixed.publish(o.operation,o.approval,{reopen:o.command==='reopen'})
  }
  if(o.command==='recover-operator')return fixed.recoverOperator(o.operation,{workerStopped:o.workerStopped,expectedOwner:o.resumeOwner})
  if(o.command==='recovery-worker-resume'){
    const held=(await control.doc('recovery/operatorLock').get()).data()
    if(!held||held.operationId!==o.operation||held.kind||held.intent&&!['baseline','quarantine','reconcile','verify'].includes(held.intent.kind)||held.intent?.target&&held.intent.target!==o.targetDatabase)refuse()
    if(o.targetDatabase)await c.assertRules(o.targetDatabase)
    return controller.resumeOperator(o.generation,o.operation,true,{expectedRecoveryOwner:o.resumeOwner,recoveryWorkerStopped:o.recoveryWorkerStopped===true})
  }
  await closed()
  if(o.command==='configure-backups'){
    const lock=control.doc('recovery/operatorLock'),owner=randomUUID()
    await lock.create({kind:'production-backup-policy',owner,operationId:o.operation,generation:o.generation,approval:o.approval})
    const result=await provider.configure('(default)')
    await control.runTransaction(async tx=>{if((await tx.get(lock)).data()?.owner!==owner)refuse();tx.delete(lock)})
    return result
  }
  if(o.command==='baseline')return controller.baseline(o.generation,o.operation)
  if(o.command==='quarantine'){await c.assertRules(o.targetDatabase);return controller.quarantine(o.generation,o.operation,o.targetDatabase)}
  if(o.command==='reconcile')return controller.reconcile(o.generation,o.operation,{target:o.targetDatabase,baselineId:o.baseline,snapshotHash:o.snapshotHash})
  if(o.command==='verify'){
    const r=(await control.doc(`recoveryTargets/${o.targetDatabase}`).get()).data()
    if(!r?.restoreDone||r.restoreOperation!==o.restoreOperation||r.recoveryPoint!==o.recoveryPoint)refuse()
    return controller.verify(o.generation,o.operation,{target:o.targetDatabase,baselineId:o.baseline,snapshotHash:o.snapshotHash,restoreOperation:o.restoreOperation,recoveryPoint:o.recoveryPoint,approval:o.approval})
  }
  if(o.command==='plan')return fixed.plan(o.generation,o.operation,{source:o.targetDatabase,baselineId:o.baseline,verificationId:o.verification,approval:o.approval})
  if(o.command==='plan-intake')return fixed.planIntake(o.generation,o.operation,{intakeOperationId:o.intakeOperation,intakePlanHash:o.planHash,approval:o.approval})
  if(o.command==='apply'||o.command==='resume'){
    const plan=(await control.doc(`defaultRecoveryPlans/${o.operation}`).get()).data()
    if(plan?.approval!==o.approval||plan.generation!==o.generation||plan.revision!==o.revision)refuse()
    return fixed.apply(o.operation,{resume:o.command==='resume',workerStopped:o.workerStopped===true,expectedOwner:o.resumeOwner})
  }
  const journal=control.doc(`recoveryTargets/${o.targetDatabase}`)
  if(o.command==='restore'){
    await c.assertRules(o.targetDatabase)
    const lock=control.doc('recovery/operatorLock'),owner=randomUUID()
    await control.runTransaction(async tx=>{
      const [prior,held,r]=await Promise.all([tx.get(journal),tx.get(lock),tx.get(control.doc('recovery/runtime'))])
      if(prior.exists||held.exists||r.data()?.phase!=='recovering'||r.data()?.generation!==o.generation)refuse()
      tx.create(lock,{kind:'production-restore',owner,operationId:o.operation,generation:o.generation})
      tx.create(journal,{owner,status:'submitting',operationId:o.operation,generation:o.generation,approval:o.approval,revision:o.revision,source:'(default)',requestedBackup:o.backup??null,requestedSnapshotTime:o.snapshotTime??null})
    })
    const result=await provider.restore({source:'(default)',target:o.targetDatabase,backup:o.backup,snapshotTime:o.snapshotTime})
    await journal.update({status:'submitted',restoreOperation:result.operation.name,recoveryPoint:result.recoveryPoint})
    return {restoreSubmitted:true}
  }
  if(o.command==='restore-status'){
    const entry=(await journal.get()).data()
    if(!entry||entry.generation!==o.generation||entry.revision!==o.revision||entry.approval!==o.approval||entry.operationId!==o.operation||entry.restoreOperation&&entry.restoreOperation!==o.restoreOperation||!entry.restoreOperation&&!o.workerStopped)refuse()
    const expected={source:entry.source,backup:entry.requestedBackup,snapshotTime:entry.requestedSnapshotTime},result=await provider.operation(o.restoreOperation,o.targetDatabase,expected)
    const recoveryPoint=entry.recoveryPoint??await provider.recoveryPoint(expected)
    const lock=control.doc('recovery/operatorLock')
    await control.runTransaction(async tx=>{
      const held=await tx.get(lock)
      if(held.data()?.owner!==entry.owner||held.data()?.kind!=='production-restore')refuse()
      tx.update(journal,{status:result.done?'restored':'submitted',restoreDone:result.done,restoreOperation:o.restoreOperation,recoveryPoint})
      if(result.done)tx.delete(lock)
    })
    return {restoreDone:result.done}
  }
  refuse()
}
