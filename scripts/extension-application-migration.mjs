import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,statSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {Firestore} from '@google-cloud/firestore'
import {OAuth2Client} from 'google-auth-library'
import {inspectExtensionApplications,migrateExtensionApplications,stopExtensionApplicationMigration} from './lib/extension-application-migration.mjs'
import {LOCAL_RUNTIME,localRuntimeHost} from '../src/config/local-emulator.mjs'

function artifactHash() {
  const paths=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard','--','app','src','functions','scripts','test','package.json','package-lock.json','firebase.json','firestore.indexes.json','firestore.rules','nuxt.config.ts'],{encoding:'utf8'}).split('\0').filter(Boolean)
  const hash=createHash('sha256')
  for(const path of [...new Set(paths)].sort()){hash.update(path+'\0');try{hash.update(readFileSync(path))}catch(error){if(error.code!=='ENOENT')throw error;hash.update('DELETED')}hash.update('\0')}
  return hash.digest('hex')
}
function savePrivate(path,value) {
  path=resolve(path)
  // Require a pre-created private parent. Never silently inherit broad Windows ACLs.
  if(process.platform==='win32')execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
    "$ErrorActionPreference='Stop'; $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $acl=Get-Acl -LiteralPath $env:EXTENSION_MIGRATION_PRIVATE_PARENT; foreach($rule in $acl.Access){if($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -ne $sid){throw 'Private parent ACL required'}}"],
    {env:{...process.env,EXTENSION_MIGRATION_PRIVATE_PARENT:dirname(path)},stdio:'pipe'})
  else if((statSync(dirname(path)).mode&0o077)!==0)throw Error('Private parent permissions required')
  writeFileSync(path,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600})
}
const args=process.argv.slice(2),mode=args.shift(),options={}
const flags=new Set(['--apply','--writers-drained','--previous-worker-ended'])
const allowed=new Set([...flags,'--project','--control','--generation','--operation','--artifact-hash','--plan-hash','--resume-owner','--confirmations','--output'])
for(let i=0;i<args.length;i++){const k=args[i];if(!allowed.has(k)||Object.hasOwn(options,k))throw Error('Unknown or duplicate argument');options[k]=flags.has(k)?true:args[++i];if(options[k]===undefined)throw Error('Argument value required')}
if(mode==='artifact'){if(args.length)throw Error('Artifact takes no arguments');console.log(JSON.stringify({artifactHash:artifactHash(),cloudWrites:false}));process.exit(0)}
const project=options['--project'],local=project==='demo-termite-warranty'
if(!['inspect','plan','status','apply','stop'].includes(mode)||!['demo-termite-warranty','termite-warranty-dev'].includes(project)||!options['--control']||options['--control']==='(default)')throw Error('Explicit local/Dev and separate control required')
if(local&&process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort)||!local&&(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST))throw Error('Runtime target mismatch')
if(!['apply','stop'].includes(mode)&&options['--apply'])throw Error('Read-only mode cannot apply')
if(['apply','stop'].includes(mode)&&(options['--apply']!==true||options['--artifact-hash']!==artifactHash()))throw Error('Reviewed artifact and explicit apply required')
if(mode==='apply'&&options['--writers-drained']!==true)throw Error('Writer drain evidence required')
if(options['--output']&&!['inspect','plan'].includes(mode))throw Error('Output only available for inventory or plan')
const confirmations=options['--confirmations']?JSON.parse(readFileSync(options['--confirmations'],'utf8')):[]
let authClient
if(!local){const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js'),api=require('firebase-tools/lib/api.js'),account=auth.getGlobalDefaultAccount();if(!account?.tokens?.refresh_token)throw Error('CLI authentication required');authClient=new OAuth2Client(api.clientId(),api.clientSecret());authClient.setCredentials({refresh_token:account.tokens.refresh_token})}
const db=new Firestore({projectId:project,databaseId:'(default)',...(authClient?{authClient}:{})}),control=new Firestore({projectId:project,databaseId:options['--control'],...(authClient?{authClient}:{})})
try {
  if(['inspect','plan'].includes(mode)) {
    const p=await inspectExtensionApplications(db,confirmations)
    if(options['--output'])savePrivate(options['--output'],{project,database:'(default)',planHash:p.planHash,inventory:p.inventory,blocked:p.blocked})
    console.log(JSON.stringify({mode,project,scanned:p.scanned,effective:p.effective,missing:p.missing,undone:p.undone,changed:p.changed,blocked:p.blocked.length,planHash:p.planHash,cloudWrites:false}))
  }
  if(mode==='status') {
    const [runtime,marker,held]=await Promise.all([control.doc('recovery/runtime').get(),db.doc('_recovery/access').get(),control.doc('recovery/operatorLock').get()])
    console.log(JSON.stringify({mode,project,runtime:runtime.data(),marker:marker.data(),lock:held.data()??null,cloudWrites:false}))
  }
  if(mode==='apply')console.log(JSON.stringify(await migrateExtensionApplications(db,control,{generation:Number(options['--generation']),operationId:options['--operation'],planHash:options['--plan-hash'],confirmations,writersDrained:true,resumeOwner:options['--resume-owner'],previousWorkerEnded:options['--previous-worker-ended']===true})))
  if(mode==='stop')console.log(JSON.stringify(await stopExtensionApplicationMigration(control,{operationId:options['--operation'],owner:options['--resume-owner'],previousWorkerEnded:options['--previous-worker-ended']===true})))
} finally {await Promise.all([db.terminate(),control.terminate()])}
