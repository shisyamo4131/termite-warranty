import {randomUUID} from 'node:crypto'
import {TEST_RUNTIME,isIsolatedTestEnvironment} from '../../functions/test-emulator-profile.js'
import {Timestamp} from 'firebase-admin/firestore'
import {prepareHistoricalIntake,intakeHash} from './historical-intake-plan.mjs'
import {documentImage,imageHash,typed} from './default-recovery.mjs'
import {authorizationDigest,inspectBusinessIntegrity} from './recovery-controller.mjs'
import {fixedRuntimeState,sameFixedEpoch} from '../../src/domain/fixed-recovery.mjs'
import {captureIntakeSettings,intakeSettingsHash,restoreIntakeSettings} from './historical-intake-settings.mjs'
import {validateProductionTarget} from './production-deployment-plan.mjs'

const propertyRoots=new Set(['propertyWarranties','propertyOperationReceipts','externalKeyReservations','warrantyCounters'])
const selectedProperties=image=>new Map([...image].filter(([path])=>propertyRoots.has(path.split('/')[0])))
const retainedBusiness=image=>new Map([...business(image)].filter(([path])=>!propertyRoots.has(path.split('/')[0])))
const protectedRoots=new Set(['accountCreationOperations','staffAccounts','constructionCompanyAccounts','constructionCompanyAccountBindings','accountMutationLocks'])
const hash=value=>intakeHash(typed(value))
const deny=()=>{throw Error('HISTORICAL_INTAKE_REFUSED: inspect private evidence; maintenance is retained')}
const accounts=image=>new Map([...image].filter(([path])=>protectedRoots.has(path.split('/')[0])))
const business=image=>new Map([...image].filter(([path])=>!protectedRoots.has(path.split('/')[0])))
function target(db,control,productionTarget){
  const production=productionTarget?validateProductionTarget(productionTarget):null
  if(production&&(db.projectId!==production.project||control.databaseId!==production.control))deny()
  if(db.projectId!==control.projectId||(!production&&!['termite-warranty-dev','demo-termite-warranty'].includes(db.projectId)&&!(db.projectId===TEST_RUNTIME.projectId&&isIsolatedTestEnvironment()))||db.databaseId!=='(default)'||control.databaseId==='(default)')deny()
}
function noPortal(image){if([...image.keys()].some(p=>['constructionCompanyAccounts','constructionCompanyAccountBindings','accountMutationLocks'].includes(p.split('/')[0])))deny()}
function closed(raw,access,control,generation){const state=fixedRuntimeState(raw);if(state.phase!=='recovering'||state.generation!==generation||state.controlDatabaseId!==control.databaseId||!sameFixedEpoch(state,fixedRuntimeState(access)))deny()}
function prepared(input,today,planHash){const plan=prepareHistoricalIntake(input,{today});if(plan.summary.errors.length||plan.planDigest!==planHash)deny();return plan}

// No network writes: exact document image includes orphan/unknown-root detection.
export async function inspectHistoricalTarget(db,control,auth,productionTarget) {
  target(db,control,productionTarget)
  const image=await documentImage(db);noPortal(image)
  const counts={};for(const path of business(image).keys()){const root=path.split('/')[0];counts[root]=(counts[root]??0)+1}
  return {deleteCount:business(image).size,deleteCounts:counts,retainedDocuments:accounts(image).size,inventoryHash:imageHash(image),accountHash:imageHash(accounts(image)),authorizationHash:await authorizationDigest(db,auth),cloudWrites:false}
}

function materialized(plan,journal) {
  const documents=plan.documents.map(row=>{
    const data={...row.data,updatedAt:journal.startedAt},root=row.path.split('/')[0]
    if(root==='propertyWarranties') {
      data.createdAt=journal.startedAt
      data.insuranceWaiverEvents=data.insuranceWaiverEvents.map(event=>({...event,actorUid:journal.actorUid,actorName:journal.actorUid,at:journal.startedAt.toDate().toISOString()}))
      data.historicalIntakeSource={...data.historicalIntakeSource,operationId:journal.operationId}
      data.history=[{kind:'historicalImport',requestId:journal.operationId,date:journal.today,at:journal.startedAt.toDate().toISOString(),actorUid:journal.actorUid}]
    }
    return {path:row.path,data}
  })
  for(const id of ['monthlyQueries','certificateQueries','billingQueries','insuranceReportQueries','insuranceNoticeQueries','insuranceStates','dashboard'])documents.push({path:'prototypeSettings/'+id,data:{version:1,generation:journal.generation,operationId:journal.operationId,verifiedDocuments:plan.summary.properties,updatedAt:journal.startedAt}})
  documents.push({path:'prototypeSettings/alerts',data:{warrantyMonths:2,insuranceMonths:2,updatedAt:journal.startedAt}})
  return journal.propertiesOnly ? documents.filter(row=>propertyRoots.has(row.path.split('/')[0])) : restoreIntakeSettings(documents,plan.preservedSettings)
}

export async function verifyCompletedHistoricalIntake(db,control,auth,{operationId,generation,planHash,productionTarget}) {
  target(db,control,productionTarget)
  const receipt=(await db.doc('_recovery/historicalIntake').get()).data()
  if(receipt?.status!=='complete'||receipt.operationId!==operationId||receipt.generation!==generation||receipt.planHash!==planHash)deny()
  const image=await documentImage(db)
  if(imageHash(business(image))!==receipt.expectedHash||imageHash(accounts(image))!==receipt.accountHash||await authorizationDigest(db,auth)!==receipt.authorizationHash)deny()
  if(receipt.settingsHash&&intakeSettingsHash(captureIntakeSettings(image))!==receipt.settingsHash)deny()
  const highWater={};for(const [path,row] of image)if(path.startsWith('warrantyCounters/'))highWater[path.split('/')[1]]=row.fields.lastValue
  await inspectBusinessIntegrity(db,highWater)
  return {image,receiptHash:hash(receipt),authorizationHash:receipt.authorizationHash,highWater}
}

// Each chunk and its progress marker commit in the SAME database transaction.
// A failed/unknown response retains the exclusive owner; explicit stopped-worker
// acknowledgement and the exact prior owner are required to resume.
export async function executeHistoricalIntake(db,control,auth,input,{today,planHash,inventoryHash,generation,operationId,actorUid,resumeOwner,previousWorkerEnded=false,afterCommit=async()=>{},productionTarget,initialOnly=false,propertiesOnly=false}={}) {
  target(db,control,productionTarget)
  if(productionTarget&&!initialOnly||propertiesOnly&&(productionTarget||initialOnly))deny()
  const selected=image=>propertiesOnly?selectedProperties(image):business(image)
  if(!Number.isSafeInteger(generation)||generation<1||!/^[-\w]{8,80}$/.test(operationId??'')||!/^[-\w]{1,128}$/.test(actorUid??'')||!/^[a-f0-9]{64}$/.test(inventoryHash??''))deny()
  const plan=prepared(input,today,planHash),lock=control.doc('recovery/operatorLock'),runtime=control.doc('recovery/runtime'),marker=db.doc('_recovery/access'),receipt=db.doc('_recovery/historicalIntake'),owner=randomUUID()
  if(initialOnly){const prior=(await receipt.get()).data();if(prior?(prior.operationId!==operationId||prior.initialOnly!==true):business(await documentImage(db)).size>0)deny()}
  const inspectClosed=async()=>{
    closed((await runtime.get()).data(),(await marker.get()).data(),control,generation)
    if((await control.collection('recoveryOperations').limit(1).get()).size||(await control.doc('recovery/authExportLock').get()).exists)deny()
  }
  await inspectClosed()
  await control.runTransaction(async tx=>{
    const [held,state,ops,exportLock]=await Promise.all([tx.get(lock),tx.get(runtime),tx.get(control.collection('recoveryOperations').limit(1)),tx.get(control.doc('recovery/authExportLock'))])
    closed(state.data(),(await marker.get()).data(),control,generation)
    if(ops.size||exportLock.exists)deny()
    const prior=held.data()
    if(held.exists&&!(previousWorkerEnded&&resumeOwner===prior.owner&&prior.kind==='historical-intake'&&prior.operationId===operationId&&prior.generation===generation&&prior.planHash===planHash&&Boolean(prior.propertiesOnly)===propertiesOnly)||!held.exists&&resumeOwner)deny()
    tx.set(lock,{kind:'historical-intake',owner,operationId,generation,planHash,propertiesOnly,startedAt:Timestamp.now()})
  })
  const guard=async tx=>{
    const access=await tx.get(marker),state=await runtime.get(),held=await lock.get()
    closed(state.data(),access.data(),control,generation)
    if(held.data()?.owner!==owner)deny()
  }
  try {
    await afterCommit('lock')
    let journal=(await receipt.get()).data()
    if(journal?.operationId===operationId) {
      if(initialOnly&&journal.initialOnly!==true||Boolean(journal.propertiesOnly)!==propertiesOnly)deny()
      if(journal.planHash!==planHash||journal.inventoryHash!==inventoryHash||journal.generation!==generation||journal.actorUid!==actorUid||journal.today!==today||journal.settingsHash!==intakeSettingsHash(plan.preservedSettings))deny()
    }else {
      const startedAt=Timestamp.now()
      if(new Date(startedAt.toMillis()+9*60*60*1000).toISOString().slice(0,10)!==today)deny()
      const image=await documentImage(db);noPortal(image)
      if(initialOnly&&(business(image).size||journal))deny()
      if(imageHash(image)!==inventoryHash)deny()
      if(intakeSettingsHash(captureIntakeSettings(image))!==intakeSettingsHash(plan.preservedSettings))deny()
      const actor=(await db.doc('staffAccounts/'+actorUid).get()).data()
      if(actor?.enabled!==true||actor.role!=='developer_superuser')deny()
      if(propertiesOnly) {
        for(const row of plan.documents.filter(row=>['warrantyGroups','constructionCompanies','companyBranches'].includes(row.path.split('/')[0]))) {
          const existing=image.get(row.path)?.fields
          if(!existing)deny()
          for(const key of ['defaultGroupId','constructionCompanyId','branchCode','prefix','fiscalStartMonth'])if(row.data[key]!==undefined&&existing[key]!==row.data[key])deny()
        }
      }
      const deleteManifest=[...selected(image)].map(([path,row])=>({path,hash:row.hash})).sort((a,b)=>b.path.split('/').length-a.path.split('/').length||a.path.localeCompare(b.path))
      if(Buffer.byteLength(JSON.stringify(deleteManifest))>512*1024)deny()
      const initial={operationId,planHash,inventoryHash,generation,actorUid,today,settingsHash:intakeSettingsHash(plan.preservedSettings),accountHash:imageHash(accounts(image)),authorizationHash:await authorizationDigest(db,auth),status:'deleting',cursor:0,deleted:0,deleteManifest,startedAt}
      if(propertiesOnly){initial.propertiesOnly=true;initial.retainedHash=imageHash(retainedBusiness(image))}
      if(initialOnly)initial.initialOnly=true
      await db.runTransaction(async tx=>{await guard(tx);tx.set(receipt,initial)});journal=initial
      await afterCommit('journal')
    }
    const verifyAccounts=async()=>{if(propertiesOnly&&imageHash(retainedBusiness(await documentImage(db)))!==journal.retainedHash)deny();if(await authorizationDigest(db,auth)!==journal.authorizationHash||imageHash(accounts(await documentImage(db)))!==journal.accountHash)deny()}
    await verifyAccounts()
    // Resume must match the sealed remaining preimages, including absence of additions.
    if(journal.status==='deleting') {
      if(!Array.isArray(journal.deleteManifest)||!Number.isSafeInteger(journal.deleted)||journal.deleted<0||journal.deleted>journal.deleteManifest.length)deny()
      const remaining=journal.deleteManifest.slice(journal.deleted),currentImage=selected(await documentImage(db))
      if(currentImage.size!==remaining.length||remaining.some(row=>currentImage.get(row.path)?.hash!==row.hash))deny()
      for(let index=0;index<remaining.length;index+=100) {
        const chunk=remaining.slice(index,index+100)
        await db.runTransaction(async tx=>{
          await guard(tx);const current=(await tx.get(receipt)).data()
          if(current.operationId!==operationId||current.status!=='deleting'||current.deleted!==journal.deleted+index)deny()
          const snapshots=await Promise.all(chunk.map(row=>tx.get(db.doc(row.path))))
          if(snapshots.some((snapshot,i)=>!snapshot.exists||hash(snapshot.data())!==chunk[i].hash))deny()
          for(const row of chunk)tx.delete(db.doc(row.path));tx.update(receipt,{deleted:current.deleted+chunk.length})
        })
        await afterCommit('delete')
      }
      if(selected(await documentImage(db)).size)deny()
      await db.runTransaction(async tx=>{await guard(tx);tx.update(receipt,{status:'writing',cursor:0})})
      journal=(await receipt.get()).data()
    }
    const documents=materialized(plan,journal)
    if(journal.status==='writing') {
      if(!Number.isSafeInteger(journal.cursor)||journal.cursor<0||journal.cursor>documents.length)deny()
      const written=selected(await documentImage(db)),prefix=documents.slice(0,journal.cursor)
      if(written.size!==prefix.length||prefix.some(row=>written.get(row.path)?.hash!==hash(row.data)))deny()
      for(let index=journal.cursor;index<documents.length;index+=100) {
        const chunk=documents.slice(index,index+100)
        await db.runTransaction(async tx=>{await guard(tx);const current=(await tx.get(receipt)).data();if(current.operationId!==operationId||current.status!=='writing'||current.cursor!==index)deny();for(const row of chunk)tx.create(db.doc(row.path),row.data);tx.update(receipt,{cursor:index+chunk.length})})
        await afterCommit('write')
      }
    }else if(journal.status!=='complete')deny()
    await verifyAccounts()
    const completeImage=await documentImage(db),image=selected(completeImage)
    if(propertiesOnly&&imageHash(retainedBusiness(completeImage))!==journal.retainedHash)deny()
    if(image.size!==documents.length||documents.some(row=>image.get(row.path)?.hash!==hash(row.data)))deny()
    if(intakeSettingsHash(captureIntakeSettings(completeImage))!==journal.settingsHash)deny()
    await inspectBusinessIntegrity(db,Object.fromEntries(plan.summary.counters.map(c=>[c.id,c.lastValue])))
    await db.runTransaction(async tx=>{await guard(tx);tx.update(receipt,{status:'complete',expectedHash:imageHash(business(completeImage)),documents:documents.length,completedAt:Timestamp.now()})})
    await control.runTransaction(async tx=>{if((await tx.get(lock)).data()?.owner!==owner)deny();tx.delete(lock)})
    return {complete:true,properties:plan.summary.properties,documents:documents.length,maintenanceRetained:true}
  }catch {
    // No cleanup/reopen after uncertainty; all rows and progress remain inspectable.
    throw Error('HISTORICAL_INTAKE_INTERRUPTED: retain maintenance and inspect the exact owner before resuming')
  }
}
