import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
import {Firestore} from '@google-cloud/firestore'
import {OAuth2Client} from 'google-auth-library'
import {inspectPropertyAddresses,applyPropertyAddresses,rollbackPropertyAddresses} from './lib/property-address-migration.mjs'
const args=process.argv.slice(2),mode=args.shift(),options={}
for(let i=0;i<args.length;i++){
  const key=args[i]
  if(!['--project','--control','--operation','--generation','--plan-hash','--revision','--apply','--confirm','--resume-owner','--previous-worker-ended'].includes(key)||Object.hasOwn(options,key))throw Error('Unknown or duplicate argument.')
  options[key]=['--apply','--previous-worker-ended'].includes(key)?true:args[++i]
}
if(!['inspect','status','apply','rollback'].includes(mode)||!['termite-warranty-dev','demo-termite-warranty'].includes(options['--project']))throw Error('Explicit inspected Dev or fictional local project required.')
const project=options['--project'],local=project==='demo-termite-warranty',controlId=options['--control']
if(!controlId||controlId==='(default)'||!/^[a-z][a-z0-9-]+$/.test(controlId))throw Error('Explicit separate control database required.')
if(local&&process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:28080'||!local&&process.env.FIRESTORE_EMULATOR_HOST)throw Error('Runtime target mismatch.')
let authClient
if(!local){
 const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js'),api=require('firebase-tools/lib/api.js'),account=auth.getGlobalDefaultAccount()
 if(!account?.tokens?.refresh_token)throw Error('CLI authentication required.')
 authClient=new OAuth2Client(api.clientId(),api.clientSecret());authClient.setCredentials({refresh_token:account.tokens.refresh_token})
}
const db=new Firestore({projectId:project,databaseId:'(default)',...(authClient?{authClient}:{})}),control=new Firestore({projectId:project,databaseId:controlId,...(authClient?{authClient}:{})})
try{
 if(mode==='status'){
   if(options['--apply']||!options['--operation']||!/^[\w-]{1,100}$/.test(options['--operation']))throw Error('Read-only explicit operation required.')
   const lock=(await control.doc('recovery/operatorLock').get()).data(),journal=(await control.doc('addressMigrations/'+options['--operation']).get()).data(),checkpoint=(await db.doc('_recovery/addressMigration').get()).data()
   console.log(JSON.stringify({mode,project,database:'(default)',operation:options['--operation'],lock:lock?{kind:lock.kind,operationId:lock.operationId,owner:lock.owner,generation:lock.generation,planHash:lock.planHash}:null,journal:journal?{status:journal.status,generation:journal.generation,planHash:journal.planHash,count:journal.count}:null,committed:checkpoint?.operationId===options['--operation'],cloudWrites:false}))
 }else if(mode==='inspect'){
   if(options['--apply'])throw Error('Inspect cannot apply.')
   const plan=await inspectPropertyAddresses(db)
   console.log(JSON.stringify({mode,project,database:'(default)',documents:plan.documents,changes:plan.rows.length,conflicts:plan.conflicts.length,planHash:plan.hash,cloudWrites:false}))
 }else{
   if(options['--apply']!==true||options['--confirm']!==(mode==='rollback'?'property-address-rollback':'property-address-migration'))throw Error('Apply confirmation required.')
   if(!local){
     const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
     const dirty=execFileSync('git',['status','--porcelain','--untracked-files=normal','--','src','functions','scripts','firestore.rules'],{encoding:'utf8'}).trim()
     if(options['--revision']!==head||dirty)throw Error('Reviewed committed runtime required for Dev apply.')
   }
   const run=mode==='rollback'?rollbackPropertyAddresses:applyPropertyAddresses
   const result=await run(db,control,{operationId:options['--operation'],generation:Number(options['--generation']),planHash:options['--plan-hash'],resumeOwner:options['--resume-owner'],previousWorkerEnded:options['--previous-worker-ended']===true})
   console.log(JSON.stringify({mode,project,database:'(default)',...result}))
 }
}finally{await db.terminate();await control.terminate()}
