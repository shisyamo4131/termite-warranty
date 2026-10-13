import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
import {Firestore} from '@google-cloud/firestore'
import {OAuth2Client} from 'google-auth-library'
import {migrateBillingQueries} from './lib/billing-query-migration.mjs'
const args=process.argv.slice(2),options={}
for(let i=0;i<args.length;i++){
  const key=args[i]
  if(!['--project','--generation','--revision','--apply','--writers-drained'].includes(key)||Object.hasOwn(options,key))throw Error('Unknown or duplicate argument.')
  options[key]=['--apply','--writers-drained'].includes(key)?true:args[++i]
}
const project=options['--project'],local=project==='demo-termite-warranty'
if(!['termite-warranty-dev','demo-termite-warranty'].includes(project))throw Error('Explicit Dev/local target required.')
if(local?process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:28080':process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Runtime target mismatch.')
let authClient
if(!local){
  const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js'),api=require('firebase-tools/lib/api.js'),account=auth.getGlobalDefaultAccount()
  if(!account?.tokens?.refresh_token)throw Error('CLI authentication required.')
  authClient=new OAuth2Client(api.clientId(),api.clientSecret());authClient.setCredentials({refresh_token:account.tokens.refresh_token})
}
const db=new Firestore({projectId:project,databaseId:'(default)',...(authClient?{authClient}:{})})
try{
  if(options['--apply']){
    if(!options['--writers-drained'])throw Error('Confirm deployment and old writer drain before migration.')
    if(!local){
      const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
      const dirty=execFileSync('git',['status','--porcelain','--untracked-files=normal','--','app','src','functions','scripts','test','package.json','package-lock.json','firebase.json','firestore.indexes.json','firestore.rules'],{encoding:'utf8'}).trim()
      if(head!==options['--revision']||dirty)throw Error('Reviewed committed runtime required.')
    }
    const marker=(await db.doc('_recovery/access').get()).data()
    if(marker?.phase!=='normal'||marker.databaseId!=='(default)'||marker.generation!==Number(options['--generation']))throw Error('Normal runtime generation mismatch.')
  }
  console.log(JSON.stringify({project,database:'(default)',...await migrateBillingQueries(db,{apply:options['--apply']===true,...(options['--apply']?{generation:Number(options['--generation'])}:{})})}))
}finally{await db.terminate()}
