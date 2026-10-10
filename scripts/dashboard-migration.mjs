import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {Firestore} from '@google-cloud/firestore'
import {OAuth2Client} from 'google-auth-library'
import {inspectDashboardMigration,migrateDashboard,stopDashboardMigration} from './lib/dashboard-migration.mjs'
import {LOCAL_RUNTIME,localRuntimeHost} from '../src/config/local-emulator.mjs'

// Bind a reviewed worktree (including uncommitted owned changes) without staging unrelated work.
function artifactHash() {
  const paths=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard','--','app','src','functions','scripts','test','package.json','package-lock.json','firebase.json','firestore.indexes.json','firestore.rules','nuxt.config.ts'],{encoding:'utf8'}).split('\0').filter(Boolean)
  const hash=createHash('sha256')
  for(const path of [...new Set(paths)].sort()){hash.update(path+'\0');try{hash.update(readFileSync(path))}catch(error){if(error.code!=='ENOENT')throw error;hash.update('DELETED')}hash.update('\0')}
  return hash.digest('hex')
}
const args=process.argv.slice(2),mode=args.shift(),options={}
const flags=new Set(['--apply','--writers-drained','--previous-worker-ended'])
const allowed=new Set([...flags,'--project','--control','--generation','--operation','--artifact-hash','--resume-owner'])
for(let i=0;i<args.length;i++){const key=args[i];if(!allowed.has(key)||Object.hasOwn(options,key))throw Error('Unknown or duplicate argument');options[key]=flags.has(key)?true:args[++i]}
if(mode==='artifact'){if(args.length)throw Error('Artifact takes no arguments');console.log(JSON.stringify({artifactHash:artifactHash(),cloudWrites:false}));process.exit(0)}
const project=options['--project'],local=project==='demo-termite-warranty'
if(!['inspect','status','apply','stop'].includes(mode)||!['demo-termite-warranty','termite-warranty-dev'].includes(project)||!options['--control']||options['--control']==='(default)')throw Error('Explicit Dev/local and separate control required')
if(local&&process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort)||!local&&(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST))throw Error('Runtime target mismatch')
if(!['apply','stop'].includes(mode)&&options['--apply'])throw Error('Read-only mode cannot apply')
if(mode==='stop'&&(options['--apply']!==true||options['--artifact-hash']!==artifactHash()))throw Error('Reviewed artifact and explicit stop required')
if(mode==='apply'&&(options['--apply']!==true||options['--writers-drained']!==true||options['--artifact-hash']!==artifactHash()))throw Error('Reviewed artifact and old-writer drain evidence required')
let authClient
if(!local){const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js'),api=require('firebase-tools/lib/api.js'),account=auth.getGlobalDefaultAccount();if(!account?.tokens?.refresh_token)throw Error('CLI authentication required');authClient=new OAuth2Client(api.clientId(),api.clientSecret());authClient.setCredentials({refresh_token:account.tokens.refresh_token})}
const db=new Firestore({projectId:project,databaseId:'(default)',...(authClient?{authClient}:{})}),control=new Firestore({projectId:project,databaseId:options['--control'],...(authClient?{authClient}:{})})
try {
  if(mode==='inspect')console.log(JSON.stringify({mode,project,database:'(default)',...await inspectDashboardMigration(db),cloudWrites:false}))
  if(mode==='status'){
    const held=(await control.doc('recovery/operatorLock').get()).data()
    console.log(JSON.stringify({mode,project,lock:held?{kind:held.kind,owner:held.owner,operationId:held.operationId,generation:held.generation}:null,cloudWrites:false}))
  }
  if(mode==='apply')console.log(JSON.stringify({mode,project,database:'(default)',artifactHash:options['--artifact-hash'],...await migrateDashboard(db,control,{generation:Number(options['--generation']),operationId:options['--operation'],resumeOwner:options['--resume-owner'],previousWorkerEnded:options['--previous-worker-ended']===true})}))
  if(mode==='stop')console.log(JSON.stringify({mode,project,...await stopDashboardMigration(control,{operationId:options['--operation'],owner:options['--resume-owner'],previousWorkerEnded:options['--previous-worker-ended']===true})}))
} finally {await Promise.all([db.terminate(),control.terminate()])}
