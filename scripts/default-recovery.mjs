// Local rehearsal only. Live execution requires a separately reviewed Dev release gate.
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { databaseId } from '../src/domain/recovery.mjs'
import { defaultRecovery } from './lib/default-recovery.mjs'
import { LOCAL_RUNTIME, localRuntimeHost } from '../src/config/local-emulator.mjs'

export function options(args) {
  const command=args.shift(),allowed=new Set(['initialize','status','enter','plan','apply','resume','publish','reopen','recover-operator','emergency-close','reconcile-emergency'])
  if(!allowed.has(command))throw Error('Unknown fixed recovery command.')
  const o={command},flags=new Set(['apply','worker-stopped','migration'])
  const keys=new Set(['project','control','revision','generation','operation','source','baseline','verification','approval','expected-owner',...flags])
  while(args.length){const k=args.shift()?.replace(/^--/,'');if(!keys.has(k)||k in o)throw Error('Unknown or duplicate argument.');o[k]=flags.has(k)?true:args.shift();if(o[k]===undefined||String(o[k]).startsWith('--'))throw Error('Missing argument.')}
  // Deliberately cannot execute against Dev, even with --apply. No ambient credential fallback.
  if(o.project!=='demo-termite-warranty'||!o.control||o.control==='(default)'||!/^[a-z][a-z0-9-]{3,62}$/.test(o.control)||!/^[a-f0-9]{40}$/.test(o.revision??''))throw Error('Only the explicit fictional project and separate control are enabled.')
  databaseId(o.control);if(o.source!==undefined)databaseId(o.source)
  if(o.generation!==undefined){o.generation=Number(o.generation);if(!Number.isSafeInteger(o.generation)||o.generation<1)throw Error('Invalid generation.')}
  return o
}
async function main(){
  const o=options(process.argv.slice(2))
  if(o.command!=='status'&&!o.apply){console.log(JSON.stringify({mode:'plan',command:o.command,writesPerformed:false}));return}
  for(const [key,port] of [['FIRESTORE_EMULATOR_HOST',LOCAL_RUNTIME.firestorePort],['FIREBASE_AUTH_EMULATOR_HOST',LOCAL_RUNTIME.authPort]]){const expected=localRuntimeHost(port);if(process.env[key]!==expected)throw Error('Dedicated emulator endpoints must already be configured.')}
  const app=initializeApp({projectId:o.project},'fixed-recovery-operator'),database=id=>id==='(default)'?getFirestore(app):getFirestore(app,id)
  try{
    const api=defaultRecovery({database,auth:getAuth(app),controlId:o.control,revision:o.revision})
    const resume={workerStopped:o['worker-stopped']===true,expectedOwner:o['expected-owner']}
    let result
    if(o.command==='status')result=await api.status()
    else if(o.command==='initialize')result=await api.initialize()
    else if(o.command==='enter')result=await api.enter(o.generation,o.operation)
    else if(o.command==='emergency-close')result=await api.emergencyClose(o.generation,o.operation)
    else if(o.command==='reconcile-emergency')result=await api.reconcileEmergency(o.generation,o.operation,resume)
    else if(o.command==='plan')result=await api.plan(o.generation,o.operation,{source:o.source,baselineId:o.baseline,verificationId:o.verification,approval:o.approval,migration:o.migration===true})
    else if(o.command==='apply'||o.command==='resume')result=await api.apply(o.operation,{...resume,resume:o.command==='resume'})
    else if(o.command==='recover-operator')result=await api.recoverOperator(o.operation,resume)
    else result=await api.publish(o.operation,o.approval,{reopen:o.command==='reopen'})
    console.log(JSON.stringify(result))
  }finally{await deleteApp(app)}
}
if(process.argv[1]&&new URL(import.meta.url).pathname.toLowerCase().endsWith(process.argv[1].replaceAll('\\','/').split('/').at(-1).toLowerCase()))main().catch(()=>{console.error('Fixed recovery refused or interrupted. Retain maintenance and inspect private evidence; no automatic reopening.');process.exitCode=1})
