import {randomUUID} from 'node:crypto'
import {Timestamp} from 'firebase-admin/firestore'
import {fixedRuntimeState,sameFixedEpoch} from '../../src/domain/fixed-recovery.mjs'
const refuse=()=>{throw Error('Production bootstrap refused; retain maintenance and inspect private evidence.')}
export function administratorInput(value){
  if(!value||Object.keys(value).sort().join(',')!=='displayName,email,role,uid'||!/^[-\w]{1,128}$/.test(value.uid??'')||!['developer_superuser','house_solution_administrator'].includes(value.role)||typeof value.email!=='string'||value.email!==value.email.trim().toLowerCase()||!/^\S+@\S+\.\S+$/.test(value.email)||typeof value.displayName!=='string'||!value.displayName.trim()||value.displayName.length>100)refuse()
  return {...value}
}
export async function requireClosed(database,controlId,generation,{allowLock=false}={}){
  const control=database(controlId),db=database('(default)')
  const [r,m,ops,exporting,lock]=await Promise.all([control.doc('recovery/runtime').get(),db.doc('_recovery/access').get(),control.collection('recoveryOperations').limit(1).get(),control.doc('recovery/authExportLock').get(),control.doc('recovery/operatorLock').get()])
  const state=fixedRuntimeState(r.data())
  if(state.controlDatabaseId!==controlId||state.phase!=='recovering'||state.generation!==generation||!sameFixedEpoch(state,fixedRuntimeState(m.data()))||ops.size||exporting.exists||!allowLock&&lock.exists)refuse()
  return state
}
// Refuse pre-existing business/control contents; partial initialization may only
// contain the exact first closed epoch. No reset or normal transition exists here.
export async function initializeProductionData({database,controlId,factory}){
  const state={protocol:2,phase:'recovering',generation:1,databaseId:'(default)',controlDatabaseId:controlId}
  for(const [id,path] of [['(default)','_recovery/access'],[controlId,'recovery/runtime']]){
    const db=database(id)
    for(const collection of await db.listCollections()){
      if(collection.id!==path.split('/')[0])refuse()
      for(const ref of await collection.listDocuments()){
        if(ref.path!==path||(await ref.listCollections()).length)refuse()
        const row=await ref.get();if(!row.exists||Object.keys(row.data()).sort().join()!==Object.keys(state).sort().join()||!sameFixedEpoch(fixedRuntimeState(row.data()),state))refuse()
      }
    }
  }
  await factory.initialize()
  await requireClosed(database,controlId,1)
  return {phase:'recovering',generation:1,initialized:true}
}
export async function bindProductionAdministrator({database,auth,controlId,generation,operation,approval,input,resumeOwner,workerStopped=false}){
  const v=administratorInput(input),control=database(controlId),db=database('(default)')
  if(!/^[-\w]{8,80}$/.test(operation??'')||!/^[-\w./:]{4,160}$/.test(approval??''))refuse()
  await requireClosed(database,controlId,generation,{allowLock:!!resumeOwner})
  const sameUser=async()=>{const u=await auth.getUser(v.uid);if(u.disabled||u.email?.trim().toLowerCase()!==v.email)refuse()}
  await sameUser()
  const lock=control.doc('recovery/operatorLock'),journal=control.doc(`productionAdministrators/${v.role}`),profile=db.doc(`staffAccounts/${v.uid}`),owner=randomUUID()
  const matches=j=>j&&j.operation===operation&&j.generation===generation&&j.approval===approval&&Object.keys(v).every(k=>j.input?.[k]===v[k])
  await control.runTransaction(async tx=>{
    const [held,prior,runtime]=await Promise.all([tx.get(lock),tx.get(journal),tx.get(control.doc('recovery/runtime'))])
    const state=fixedRuntimeState(runtime.data())
    if(state.phase!=='recovering'||state.generation!==generation)refuse()
    if(held.exists&&!(workerStopped&&resumeOwner===held.data().owner&&held.data().kind==='production-admin'&&held.data().operationId===operation)||!held.exists&&resumeOwner)refuse()
    if(prior.exists&&!matches(prior.data()))refuse()
    tx.set(lock,{kind:'production-admin',owner,operationId:operation,generation})
    if(!prior.exists)tx.create(journal,{operation,generation,approval,input:v,status:'binding'})
  })
  // An unknown write outcome retains this exact owner. Resume requires a stopped
  // worker and cannot change identity, role or authority evidence.
  await requireClosed(database,controlId,generation,{allowLock:true});await sameUser()
  await db.runTransaction(async tx=>{
    const existing=await tx.get(profile),others=await tx.get(db.collection('staffAccounts').where('role','==',v.role))
    if(others.docs.some(row=>row.id!==v.uid))refuse()
    if(existing.exists){const p=existing.data();if(Object.keys(v).filter(k=>k!=='uid').some(k=>p[k]!==v[k])||p.enabled!==true)refuse()}
    else tx.create(profile,{email:v.email,displayName:v.displayName,role:v.role,enabled:true,updatedAt:Timestamp.now()})
  })
  await sameUser();await requireClosed(database,controlId,generation,{allowLock:true})
  await control.runTransaction(async tx=>{const held=await tx.get(lock);if(held.data()?.owner!==owner)refuse();tx.update(journal,{status:'complete'});tx.delete(lock)})
  return {administratorBound:true,authCreated:false,maintenanceRetained:true}
}
