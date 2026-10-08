import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
import {Firestore} from '@google-cloud/firestore'
import {OAuth2Client} from 'google-auth-library'
import {inspectPropertyNames,migratePropertyNames} from './lib/property-name-migration.mjs'
const args=process.argv.slice(2),mode=args.shift(),o={}
for(let i=0;i<args.length;i++){const k=args[i];if(!['--project','--control','--operation','--generation','--plan-hash','--revision','--apply','--confirm','--resume-owner','--previous-worker-ended'].includes(k)||Object.hasOwn(o,k))throw Error('Unknown or duplicate argument.');o[k]=['--apply','--previous-worker-ended'].includes(k)?true:args[++i]}
if(!['inspect','status','apply','rollback'].includes(mode)||!['termite-warranty-dev','demo-termite-warranty'].includes(o['--project'])||!o['--control']||o['--control']==='(default)')throw Error('Explicit Dev/local and separate control required.')
const project=o['--project'],local=project==='demo-termite-warranty'
if(local&&process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:28080'||!local&&(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST))throw Error('Runtime target mismatch.')
let authClient
if(!local){const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js'),api=require('firebase-tools/lib/api.js'),account=auth.getGlobalDefaultAccount();if(!account?.tokens?.refresh_token)throw Error('CLI authentication required.');authClient=new OAuth2Client(api.clientId(),api.clientSecret());authClient.setCredentials({refresh_token:account.tokens.refresh_token})}
const db=new Firestore({projectId:project,databaseId:'(default)',...(authClient?{authClient}:{})}),control=new Firestore({projectId:project,databaseId:o['--control'],...(authClient?{authClient}:{})})
try{
 if(mode==='inspect'){if(o['--apply'])throw Error('Inspect is read-only.');const p=await inspectPropertyNames(db);console.log(JSON.stringify({mode,project,database:'(default)',documents:p.documents,changes:p.rows.length,conflicts:p.conflicts.length,planHash:p.hash,cloudWrites:false}))}
 else if(mode==='status'){if(o['--apply']||!/^[\w-]{1,100}$/.test(o['--operation']??''))throw Error('Explicit read-only operation required.');const [l,j,c]=await Promise.all([control.doc('recovery/operatorLock').get(),control.doc('nameMigrations/'+o['--operation']).get(),db.doc('_recovery/nameMigration').get()]);const v=l.data(),p=j.data(),done=c.data();console.log(JSON.stringify({mode,project,operation:o['--operation'],lock:v?{kind:v.kind,owner:v.owner,operationId:v.operationId,generation:v.generation,planHash:v.planHash}:null,journal:p?{status:p.status,count:p.count,generation:p.generation,planHash:p.planHash}:null,committed:done?.operationId===o['--operation'],rolledBack:done?.rolledBack??false,cloudWrites:false}))}
 else{
  if(o['--apply']!==true||o['--confirm']!==(mode==='rollback'?'property-name-rollback':'property-name-migration'))throw Error('Explicit apply confirmation required.')
  if(!local){const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty=execFileSync('git',['status','--porcelain','--untracked-files=normal','--','app','src','functions','scripts','test','package.json','package-lock.json','firebase.json','firestore.rules'],{encoding:'utf8'}).trim();if(head!==o['--revision']||dirty)throw Error('Reviewed committed runtime required.')}
  const result=await migratePropertyNames(db,control,{operationId:o['--operation'],generation:Number(o['--generation']),planHash:o['--plan-hash'],rollback:mode==='rollback',resumeOwner:o['--resume-owner'],previousWorkerEnded:o['--previous-worker-ended']===true});console.log(JSON.stringify({mode,project,database:'(default)',...result}))
 }
}finally{await Promise.all([db.terminate(),control.terminate()])}
