import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, collection, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { LOCAL_RUNTIME, localRuntimeHost } from '../src/config/local-emulator.mjs'
test('control Rules expose only sanitized runtime get and deny private metadata/list/writes',async()=>{
  if(process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort))throw Error('Dedicated emulator required')
  const env=await initializeTestEnvironment({projectId:'demo-termite-warranty',firestore:{host:LOCAL_RUNTIME.host,port:LOCAL_RUNTIME.firestorePort,rules:await readFile(new URL('../firestore.control.rules',import.meta.url),'utf8')}})
  try{
    await env.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'recovery/runtime'),{phase:'normal',databaseId:'business-db',generation:1});await setDoc(doc(context.firestore(),'recoveryBaselines/private'),{secret:'fictional-private-metadata'})})
    for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('fictional-admin').firestore()]){
      await assertSucceeds(getDoc(doc(db,'recovery/runtime')))
      await assertFails(getDocs(collection(db,'recovery')))
      await assertFails(getDoc(doc(db,'recoveryBaselines/private')))
      await assertFails(setDoc(doc(db,'recovery/runtime'),{phase:'normal'}))
    }
  }finally{await env.cleanup()}
})
