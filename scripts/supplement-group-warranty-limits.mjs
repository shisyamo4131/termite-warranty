import {createRequire} from 'node:module'
import {OAuth2Client} from 'google-auth-library'
import {Firestore} from '@google-cloud/firestore'
import {initialGroups} from '../src/domain/property-warranty.mjs'
import {supplementGroupWarrantyLimits} from './lib/group-warranty-limit-migration.mjs'

const args=process.argv.slice(2)
const project=args[0],apply=args[1]==='--apply',expectedDigest=args[2]
if (!['demo-termite-warranty','termite-warranty-dev'].includes(project) ||
    args.length!==(apply?3:1) || apply&&!/^[a-f0-9]{64}$/.test(expectedDigest??''))
  throw Error('Usage: node scripts/supplement-group-warranty-limits.mjs <demo-termite-warranty|termite-warranty-dev> [--apply <reviewed-beforeDigest>]')
const local=project==='demo-termite-warranty'
if(local ? !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST??'') : !!process.env.FIRESTORE_EMULATOR_HOST) throw Error('TARGET_EMULATOR_MISMATCH')
let authClient
if(!local){
  const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js'),api=require('firebase-tools/lib/api.js')
  const account=auth.getGlobalDefaultAccount()
  if(!account?.tokens?.refresh_token)throw Error('LOCAL_FIREBASE_LOGIN_REQUIRED')
  authClient=new OAuth2Client(api.clientId(),api.clientSecret())
  authClient.setCredentials({refresh_token:account.tokens.refresh_token})
}
const db=new Firestore({projectId:project,databaseId:'(default)',...(authClient?{authClient}:{})})
try{
  const result=await supplementGroupWarrantyLimits(db,initialGroups,{apply,expectedDigest,requireNormal:!local})
  console.log(JSON.stringify({project,apply,...result}))
}finally{await db.terminate()}
