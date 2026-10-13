import '../helpers/emulator-runtime.mjs'
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { initializeApp, deleteApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { withRecovery, resolveRecovery } from '../../functions/recovery-runtime.js'
import { recoveryBackupMonitor } from '../../functions/recovery-backups.js'
import { fixtureRuntime } from '../helpers/fixed-runtime.mjs'

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:38080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:39099') throw new Error('Dedicated fictional emulators required.')
const app=initializeApp({projectId:'demo-termite-warranty-test'})
const business=getFirestore(app),control=getFirestore(app,'test-fixed-control')
const marker=business.doc('_recovery/access'),runtime=control.doc('recovery/runtime')
const request=(generation=1,protocol=2,uid='fixed-admin')=>({auth:{uid},data:{runtimeGeneration:generation,runtimeProtocol:protocol}})
process.env.RECOVERY_CONTROL_DATABASE='test-fixed-control'
after(async()=>{delete process.env.RECOVERY_CONTROL_DATABASE;await marker.delete();await runtime.delete();await deleteApp(app)})

test('fixed Functions resolve only default, reject absent protocol/config and lease against private authority',async()=>{
  await control.recursiveDelete(control.collection('recoveryOperations'))
  await marker.delete()
  await assert.rejects(resolveRecovery())
  await marker.set({...fixtureRuntime,protocol:1})
  await assert.rejects(resolveRecovery())
  await marker.set({...fixtureRuntime,databaseId:'test-restored'})
  await assert.rejects(resolveRecovery())
  await marker.set(fixtureRuntime);await runtime.set(fixtureRuntime)
  await business.doc('staffAccounts/fixed-admin').set({enabled:true,role:'house_solution_administrator'})
  await business.doc('staffAccounts/fixed-staff').set({enabled:true,role:'general_staff'})
  assert.equal((await resolveRecovery()).firestore.databaseId,'(default)')
  process.env.RECOVERY_CONTROL_DATABASE=''
  await assert.rejects(resolveRecovery())
  process.env.RECOVERY_CONTROL_DATABASE='test-fixed-control'
  const missingProtocol=request();delete missingProtocol.data.runtimeProtocol
  await assert.rejects(withRecovery(missingProtocol,true,()=>assert.fail('missing protocol ran')))
  for (const args of [[0,2],[1,1]]) await assert.rejects(withRecovery(request(...args),true,()=>assert.fail('stale mutation ran')))
  await runtime.delete()
  await withRecovery(request(),false,async db=>assert.equal(db.databaseId,'(default)')) // documented read/control availability boundary
  await assert.rejects(withRecovery(request(),true,()=>assert.fail('missing control admitted mutation')))
  await runtime.set({...fixtureRuntime,generation:2})
  await assert.rejects(withRecovery(request(),true,()=>assert.fail('control mismatch admitted mutation')))
  await runtime.set(fixtureRuntime)
  let release,started
  const ready=new Promise(resolve=>{started=resolve})
  const running=withRecovery(request(),true,async()=>{started();await new Promise(resolve=>{release=resolve})})
  await ready
  assert.equal((await control.collection('recoveryOperations').get()).size,1)
  await runtime.set({...fixtureRuntime,phase:'recovering',generation:2})
  await assert.rejects(withRecovery(request(),true,()=>assert.fail('closed admission ran')))
  await marker.set({...fixtureRuntime,phase:'recovering',generation:2})
  await assert.rejects(withRecovery(request(2),false,()=>assert.fail('HS business read while recovering')))
  release();await running
  assert.equal((await control.collection('recoveryOperations').get()).size,0)
  await marker.set({...fixtureRuntime,phase:'verification',generation:3});await runtime.set({...fixtureRuntime,phase:'verification',generation:3})
  await withRecovery(request(3),false,async()=>({csv:'fictional non-mutating output'}))
  await assert.rejects(withRecovery(request(3,2,'fixed-staff'),false,()=>assert.fail('staff verification read')))
  await assert.rejects(withRecovery(request(3),true,()=>assert.fail('verification mutation')))
  await marker.set({...fixtureRuntime,generation:4});await runtime.set({...fixtureRuntime,generation:4})
  let readStarted,releaseRead
  const readReady=new Promise(resolve=>{readStarted=resolve})
  const read=withRecovery(request(4),false,async()=>{readStarted();await new Promise(resolve=>{releaseRead=resolve});return 'old output'})
  await readReady;await marker.set({...fixtureRuntime,phase:'recovering',generation:5});releaseRead()
  await assert.rejects(read)
  await marker.set({...fixtureRuntime,generation:6});await runtime.set({...fixtureRuntime,generation:6})
  await assert.rejects(withRecovery(request(4),true,()=>assert.fail('old screen after reopen')))
  await withRecovery(request(6),true,async db=>assert.equal(db.databaseId,'(default)'))
})

test('backup failure emits structured notification when both history and health storage fail',async()=>{
  await marker.set(fixtureRuntime);await runtime.set(fixtureRuntime)
  const referencePrototype=Object.getPrototypeOf(control.doc('recovery/backupHealth'))
  const originalSet=referencePrototype.set,originalCreate=referencePrototype.create
  const credential=applicationDefault(),originalToken=credential.getAccessToken,originalFetch=globalThis.fetch
  const originalWrite=process.stderr.write,logs=[]
  const keys=['GCLOUD_PROJECT','RECOVERY_BACKUP_AUTOMATION','RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE']
  const environment=Object.fromEntries(keys.map(key=>[key,process.env[key]]))
  process.env.GCLOUD_PROJECT='demo-termite-warranty-test';process.env.RECOVERY_BACKUP_AUTOMATION='true';process.env.RECOVERY_DEVELOPER_EMAIL_ALERT_EVIDENCE='fictional/notification'
  credential.getAccessToken=async()=>({access_token:'fictional-token',expires_in:3600})
  globalThis.fetch=async url=>{assert.ok(String(url).startsWith('https://firestore.googleapis.com/v1/projects/demo-termite-warranty-test/'));return{ok:true,json:async()=>String(url).includes('/backups')?{backups:[]}:{locationId:'fictional-location'}}}
  referencePrototype.create=async function(...args){if(this.path.startsWith('backupHistory/'))throw Error('fictional-private-history-failure');return originalCreate.apply(this,args)}
  referencePrototype.set=async function(...args){if(this.path==='recovery/backupHealth')throw Error('fictional-private-health-failure');return originalSet.apply(this,args)}
  process.stderr.write=function(chunk,...args){logs.push(String(chunk));return true}
  try{
    await assert.rejects(recoveryBackupMonitor.run({}),/Backup monitoring failed/)
    const entries=logs.flatMap(line=>line.trim().split('\n')).map(line=>JSON.parse(line))
    const notifications=entries.filter(entry=>entry.recoveryBackupFailure===true)
    assert.equal(notifications.length,1)
    assert.equal(notifications[0].severity,'ERROR')
    assert.equal(JSON.stringify(entries).includes('fictional-private'),false)
    assert.equal(JSON.stringify(entries).includes('fictional-token'),false)
  }finally{
    referencePrototype.set=originalSet;referencePrototype.create=originalCreate
    credential.getAccessToken=originalToken;globalThis.fetch=originalFetch;process.stderr.write=originalWrite
    for(const key of keys)if(environment[key]===undefined)delete process.env[key];else process.env[key]=environment[key]
  }
})

test('successful account mutation keeps its result and notifies when Auth export and health storage fail',async()=>{
  await marker.set(fixtureRuntime);await runtime.set(fixtureRuntime)
  await business.doc('staffAccounts/fixed-admin').set({enabled:true,role:'house_solution_administrator'})
  await control.doc('recovery/lastAuthBackup').delete()
  await control.doc('recovery/authExportLock').delete()
  const keys=['RECOVERY_BACKUP_AUTOMATION','RECOVERY_AUTH_BACKUP_BUCKET','RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE']
  const environment=Object.fromEntries(keys.map(key=>[key,process.env[key]]))
  process.env.RECOVERY_BACKUP_AUTOMATION='true';process.env.RECOVERY_AUTH_BACKUP_BUCKET='fictional-unreachable-private-bucket';process.env.RECOVERY_AUTH_HASH_CONFIGURATION_EVIDENCE='fictional/hash'
  const referencePrototype=Object.getPrototypeOf(control.doc('recovery/backupHealth')),originalSet=referencePrototype.set
  const credential=applicationDefault(),originalToken=credential.getAccessToken
  const originalWrite=process.stderr.write,logs=[]
  credential.getAccessToken=async()=>{throw Error('fictional-private-credential-failure')}
  referencePrototype.set=async function(...args){if(this.path==='recovery/backupHealth')throw Error('fictional-private-health-failure');return originalSet.apply(this,args)}
  process.stderr.write=function(chunk,...args){logs.push(String(chunk));return true}
  try{
    assert.equal(await withRecovery(request(),true,async()=> 'account-change-succeeded',{accountMutation:true}),'account-change-succeeded')
    const entries=logs.flatMap(line=>line.trim().split('\n')).map(line=>JSON.parse(line))
    const notifications=entries.filter(entry=>entry.recoveryBackupFailure===true)
    assert.equal(notifications.length,1)
    assert.equal(notifications[0].severity,'ERROR')
    assert.equal(JSON.stringify(entries).includes('fictional-private'),false)
    assert.equal(JSON.stringify(entries).includes('fictional-unreachable'),false)
    assert.equal((await control.collection('recoveryOperations').get()).size,0)
    assert.equal((await control.doc('recovery/authExportLock').get()).exists,false)
  }finally{
    referencePrototype.set=originalSet;credential.getAccessToken=originalToken;process.stderr.write=originalWrite
    for(const key of keys)if(environment[key]===undefined)delete process.env[key];else process.env[key]=environment[key]
  }
})
