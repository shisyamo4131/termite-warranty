import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { LOCAL_RUNTIME, localRuntimeHost } from '../src/config/local-emulator.mjs'
import { initialGroups } from '../src/domain/property-warranty.mjs'
process.env.FIRESTORE_EMULATOR_HOST = localRuntimeHost(LOCAL_RUNTIME.firestorePort)
process.env.FIREBASE_AUTH_EMULATOR_HOST = localRuntimeHost(LOCAL_RUNTIME.authPort)
const app=initializeApp({projectId:'demo-termite-warranty'}), auth=getAuth(app),db=getFirestore(app)
const fixedRuntime={protocol:2,generation:1,phase:'normal',databaseId:'(default)',controlDatabaseId:'test-fixed-control'}
await getFirestore(app,'test-fixed-control').doc('recovery/runtime').set(fixedRuntime)
await db.doc('_recovery/access').set(fixedRuntime)
for(const [email,role,displayName] of [['meeting.system@example.invalid','developer_superuser','試験システム管理者'],['meeting.hs@example.invalid','house_solution_administrator','試験HS管理者']]) {
  let user
  try{user=await auth.getUserByEmail(email)}catch(error){if(error.code!=='auth/user-not-found')throw error;user=await auth.createUser({email,password:'Demo-only-password-123',displayName})}
  await db.doc(`staffAccounts/${user.uid}`).set({email,displayName,role,enabled:true,updatedAt:Timestamp.now()})
}
for(const group of initialGroups)await db.doc(`warrantyGroups/${group.id}`).set({...group,updatedAt:Timestamp.now()})
console.log('Local meeting administrators and three groups prepared; no business data created.')
