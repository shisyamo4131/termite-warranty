import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
import {initializeApp,deleteApp} from 'firebase-admin/app'
import {getAuth} from 'firebase-admin/auth'
import {Firestore} from '@google-cloud/firestore'
import {OAuth2Client} from 'google-auth-library'
import {inspectHistoricalTarget,executeHistoricalIntake} from './lib/historical-intake-execution.mjs'
import {LOCAL_RUNTIME,localRuntimeHost} from '../src/config/local-emulator.mjs'
import {documentImage} from './lib/default-recovery.mjs'
import {captureIntakeSettings,intakeSettingsHash} from './lib/historical-intake-settings.mjs'

function artifactHash(){const hash=createHash('sha256'),paths=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard','--','scripts','src','functions','test','package.json','package-lock.json','firestore.rules','firestore.control.rules','firebase.json'],{encoding:'utf8'}).split('\0').filter(Boolean);for(const path of [...new Set(paths)].sort()){hash.update(path+'\0');hash.update(readFileSync(path));hash.update('\0')}return hash.digest('hex')}
async function main(){
  const args=process.argv.slice(2),mode=args.shift(),o={},flags=new Set(['--apply','--previous-worker-ended']),keys=new Set([...flags,'--project','--control','--input','--output','--date','--plan-hash','--inventory-hash','--generation','--operation','--actor-uid','--resume-owner','--artifact-hash','--confirm'])
  for(let i=0;i<args.length;i++){const key=args[i];if(!keys.has(key)||Object.hasOwn(o,key))throw Error('ARGS');o[key]=flags.has(key)?true:args[++i];if(o[key]===undefined||String(o[key]).startsWith('--'))throw Error('ARGS')}
  if(mode==='artifact'){if(args.length)throw Error('ARGS');console.log(JSON.stringify({artifactHash:artifactHash(),cloudWrites:false}));return}
  const project=o['--project'],controlId=o['--control'],local=project==='demo-termite-warranty'
  if(!['inspect','status','preserve-settings','apply'].includes(mode)||!['demo-termite-warranty','termite-warranty-dev'].includes(project)||!controlId||controlId==='(default)'||!local&&controlId!=='recovery-control')throw Error('TARGET')
  if(local&&(process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort)||process.env.FIREBASE_AUTH_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.authPort))||!local&&(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST))throw Error('ENVIRONMENT')
  if(mode!=='apply'&&o['--apply'])throw Error('READ_ONLY')
  if(mode==='apply'&&(o['--apply']!==true||o['--confirm']!=='reset-dev-business'||o['--artifact-hash']!==artifactHash()))throw Error('REVIEWED_APPLY_REQUIRED')
  let oauth
  if(!local){const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js'),api=require('firebase-tools/lib/api.js'),account=auth.getGlobalDefaultAccount();if(!account?.tokens?.refresh_token)throw Error('AUTH');oauth=new OAuth2Client(api.clientId(),api.clientSecret());oauth.setCredentials({refresh_token:account.tokens.refresh_token})}
  const app=initializeApp({projectId:project,...(oauth?{credential:{getAccessToken:async()=>{const value=await oauth.getAccessToken();if(!value.token)throw Error('AUTH');return {access_token:value.token,expires_in:Math.max(1,Math.floor(((oauth.credentials.expiry_date??Date.now()+60000)-Date.now())/1000))}}}}:{})},'historical-intake-operator')
  const db=new Firestore({projectId:project,databaseId:'(default)',...(oauth?{authClient:oauth}:{})}),control=new Firestore({projectId:project,databaseId:controlId,...(oauth?{authClient:oauth}:{})})
  try {
    if(mode==='preserve-settings') {
      if(!o['--input']||!o['--output'])throw Error('PRIVATE_PATH_REQUIRED')
      const bytes=readFileSync(o['--input']);if(bytes.length>32*1024*1024)throw Error('INPUT_SIZE')
      const input=JSON.parse(bytes),preservedBusinessSettings=captureIntakeSettings(await documentImage(db))
      writeFileSync(o['--output'],JSON.stringify({...input,preservedBusinessSettings},null,2),{flag:'wx'})
      console.log(JSON.stringify({cloudWrites:false,settingsHash:intakeSettingsHash(preservedBusinessSettings),companyProfile:preservedBusinessSettings.companyProfile!==null,billingRecipients:preservedBusinessSettings.billingRecipients.length}))
    }
    if(mode==='inspect')console.log(JSON.stringify(await inspectHistoricalTarget(db,control,getAuth(app))))
    if(mode==='status') {const lock=(await control.doc('recovery/operatorLock').get()).data(),r=(await db.doc('_recovery/historicalIntake').get()).data();console.log(JSON.stringify({cloudWrites:false,lock:lock?{owner:lock.owner,operationId:lock.operationId,kind:lock.kind}:null,progress:r?{status:r.status,cursor:r.cursor,deleted:r.deleted,operationId:r.operationId}:null}))}
    if(mode==='apply') {const bytes=readFileSync(o['--input']);if(bytes.length>32*1024*1024)throw Error('INPUT_SIZE');const result=await executeHistoricalIntake(db,control,getAuth(app),JSON.parse(bytes),{today:o['--date'],planHash:o['--plan-hash'],inventoryHash:o['--inventory-hash'],generation:Number(o['--generation']),operationId:o['--operation'],actorUid:o['--actor-uid'],resumeOwner:o['--resume-owner'],previousWorkerEnded:o['--previous-worker-ended']===true});console.log(JSON.stringify(result))}
  }finally{await Promise.all([db.terminate(),control.terminate(),deleteApp(app)])}
}
main().catch(()=>{console.error('HISTORICAL_INTAKE_REFUSED_OR_INTERRUPTED: inspect private evidence; no automatic reopening');process.exitCode=1})
