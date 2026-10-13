// Private read-only Dev inspection; imports are enabled only in dedicated emulators.
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Firestore } from '@google-cloud/firestore'
import { OAuth2Client } from 'google-auth-library'
import { LOCAL_RUNTIME, localRuntimeHost } from '../src/config/local-emulator.mjs'
import { databaseId } from '../src/domain/recovery.mjs'
import { authImportOptions, loadAuthAuthority, missingAuthPlan, restoreMissingAuth, readPrivateAuthObject } from './lib/auth-recovery.mjs'

async function main() {
  const args=process.argv.slice(2), o={command:args[0]}
  const values=['project','control','revision','generation','operation-id','approval','snapshot','hash-configuration','confirm']
  for(let i=1;i<args.length;i++) {
    const name=args[i].replace(/^--/,'')
    if(!args[i].startsWith('--')||Object.hasOwn(o,name))throw Error('Unknown or duplicate option.')
    if(['emulator','apply','confirm-exclusive-auth'].includes(name))o[name]=true
    else if(values.includes(name)&&args[i+1]&&!args[i+1].startsWith('--'))o[name]=args[++i]
    else throw Error('Unknown option or missing value.')
  }
  if(!['inspect','restore'].includes(o.command)||o.project!==(o.emulator?'demo-termite-warranty':'termite-warranty-dev')||! /^[a-f0-9]{40}$/.test(o.revision??''))throw Error('Explicit inspected project, command and revision required.')
  databaseId(o.control);if(o.control==='(default)')throw Error('Separate control required.')
  if(!o.emulator&&(o.apply||o.command==='restore'||o.snapshot||o['hash-configuration']))throw Error('Live Auth import is unavailable in this increment. Dev supports private read-only inspection only.')
  if(o.command==='inspect'&&o.apply)throw Error('Inspection cannot apply.')
  if(o.command==='restore'&&!o.apply){console.log(JSON.stringify({mode:'plan',writesPerformed:false,liveAuthImportAvailable:false}));return}
  if(o.apply&&(o.confirm!=='auth-recovery'||!o['confirm-exclusive-auth']||!Number.isSafeInteger(Number(o.generation))))throw Error('Separate Auth repair approval, generation and exclusive operator confirmation required.')
  let credential,oauth,readPrivate
  if(o.emulator) {
    for(const [name,port] of [['FIRESTORE_EMULATOR_HOST',LOCAL_RUNTIME.firestorePort],['FIREBASE_AUTH_EMULATOR_HOST',LOCAL_RUNTIME.authPort]]){if(process.env[name]&&process.env[name]!==localRuntimeHost(port))throw Error('Wrong emulator endpoint.');process.env[name]=localRuntimeHost(port)}
    if(!o.snapshot||!o['hash-configuration'])throw Error('Fictional emulator fixtures required.')
  } else {
    if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Mixed environment forbidden.')
    const require=createRequire(import.meta.url),a=require('firebase-tools/lib/auth.js'),api=require('firebase-tools/lib/api.js'),account=a.getGlobalDefaultAccount()
    if(!account)throw Error('Firebase CLI sign-in required.')
    credential={async getAccessToken(){const t=await a.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase']);return {access_token:t.access_token,expires_in:t.expires_in??3600}}}
    oauth=new OAuth2Client(api.clientId(),api.clientSecret());oauth.setCredentials({refresh_token:account.tokens.refresh_token})
    readPrivate=async (meta,requirePinned=false)=>{
      const token=await credential.getAccessToken()
      const headers={Authorization:`Bearer ${token.access_token}`}
      return readPrivateAuthObject(meta,url=>fetch(url,{headers,signal:AbortSignal.timeout(60000)}),{requirePinned})
    }
  }
  const app=initializeApp({projectId:o.project,...(credential?{credential}:{})},'auth-recovery-operator'),dbs=new Map()
  const database=id=>{if(!dbs.has(id))dbs.set(id,new Firestore({projectId:o.project,databaseId:id,...(oauth?{authClient:oauth}:{})}));return dbs.get(id)}
  try {
    const control=database(o.control),state=(await control.doc('recovery/runtime').get()).data()
    if(!state||state.controlDatabaseId!==o.control)throw Error('Runtime unavailable.')
    let snapshot,configuration,backupReferencePinned=null
    if(o.emulator){snapshot=JSON.parse(await readFile(o.snapshot,'utf8'));configuration=JSON.parse(await readFile(o['hash-configuration'],'utf8'))}
    else {
      const [last,evidence]=await Promise.all(['recovery/lastAuthBackup','recovery/hashConfigurationEvidence'].map(path=>control.doc(path).get()))
      if(!last.exists||!evidence.exists)throw Error('Private evidence unavailable.')
      const backupObject=await readPrivate(last.data()),hashObject=await readPrivate(evidence.data(),true)
      backupReferencePinned=backupObject.pinned
      snapshot=JSON.parse(gunzipSync(backupObject.bytes,{maxOutputLength:16*1024*1024}).toString('utf8'))
      configuration=JSON.parse(hashObject.bytes.toString('utf8'))
      if(snapshot.hashConfigurationEvidence!=='recovery/hashConfigurationEvidence')throw Error('Wrong hash evidence reference.')
    }
    authImportOptions(configuration,o.project)
    const auth=getAuth(app)
    if(o.command==='inspect') {
      const {profiles,users}=await loadAuthAuthority(database(state.databaseId),auth),plan=missingAuthPlan(snapshot,profiles,users)
      console.log(JSON.stringify({mode:'inspect',writesPerformed:false,liveAuthImportAvailable:false,phase:state.phase,generation:state.generation,accounts:plan.total,missing:plan.missing,preserved:plan.preserved,ignoredHistorical:plan.ignoredHistorical,backupReferencePinned}))
    } else {
      const result=await restoreMissingAuth({database,auth,controlId:o.control,project:o.project,revision:o.revision,generation:Number(o.generation),operationId:o['operation-id'],approval:o.approval,snapshot,configuration})
      console.log(JSON.stringify({mode:'apply',emulator:true,result}))
    }
  } finally {for(const db of dbs.values())await db.terminate();await deleteApp(app)}
}
main().catch(()=>{console.error(JSON.stringify({status:'failed',message:'Auth recovery was refused or interrupted. Inspect private evidence and maintenance state; no private data is printed.'}));process.exitCode=1})
