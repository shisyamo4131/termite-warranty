// Explicit Dev-only test-data reset. Default mode inventories counts without writes.
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { Timestamp } from 'firebase-admin/firestore'
import { Firestore } from '@google-cloud/firestore'
import { OAuth2Client } from 'google-auth-library'
import { getAuth } from 'firebase-admin/auth'
import { createRequire } from 'node:module'
import { initialGroups } from '../src/domain/property-warranty.mjs'
const require = createRequire(import.meta.url)
const cliAuth = require('firebase-tools/lib/auth.js')
const cliApi = require('firebase-tools/lib/api.js')
const projectId = 'termite-warranty-dev'
const args = process.argv.slice(2)
const value = key => args[args.indexOf(key) + 1]
const apply = args.includes('--apply')
const preserveMasters = args.includes('--preserve-masters')
const emptyMasters = args.includes('--empty-masters')
if (preserveMasters && emptyMasters) throw new Error('Choose exactly one master reset mode.')
if (!args.includes('--system-email') || !args.includes('--hs-email')) throw new Error('Both retained account email arguments are required.')
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Dev reset cannot run with emulator overrides.')
if (apply && value('--confirm-project') !== projectId) throw new Error('Explicit project confirmation required.')
const account = cliAuth.getGlobalDefaultAccount()
if (!account) throw new Error('Firebase CLI sign-in is required.')
const credential = { async getAccessToken() {
  const token = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase'])
  return { access_token: token.access_token, expires_in: token.expires_in ?? 3600 }
} }
const oauth = new OAuth2Client(cliApi.clientId(), cliApi.clientSecret())
oauth.setCredentials({refresh_token:account.tokens.refresh_token})
const app = initializeApp({ projectId, credential }), db = new Firestore({projectId,authClient:oauth}), auth = getAuth(app)
try {
  const retained = await Promise.all([value('--system-email'),value('--hs-email')].map(email=>auth.getUserByEmail(email)))
  if (retained[0].uid === retained[1].uid) throw new Error('Retained accounts must be distinct.')
  for (let i=0;i<retained.length;i++) {
    const doc = await db.doc(`staffAccounts/${retained[i].uid}`).get()
    if (doc.data()?.role !== ['developer_superuser','house_solution_administrator'][i] || doc.data()?.enabled !== true || retained[i].disabled) throw new Error(`Retained account ${i+1} role/enabled state differs from the requested role.`)
  }
  const allowed = new Set(['accountMutationLocks', 'prototypeSettings','staffAccounts','constructionCompanyAccounts','constructionCompanyAccountBindings','constructionCompanyCaseWorkItems','notificationOutbox','branches','constructionCompanies','homeowners','properties','warrantyServices','cases','systemCounters','caseNumberReservations','propertyWarranties','companyBranches','warrantyGroups','warrantyCounters'])
  const collections = await db.listCollections()
  for (const col of collections) if (!allowed.has(col.id)) throw new Error(`Unclassified collection: ${col.id}. Reset stopped.`)
  if (!(await db.collection('accountMutationLocks').limit(1).get()).empty) throw new Error('Pending account mutation; reset forbidden until explicit recovery.')
  const inventory = []
  for (const col of collections) inventory.push({ collection:col.id, documents:(await col.count().get()).data().count })
  const users=[];let page
  do { const result=await auth.listUsers(1000,page);users.push(...result.users);page=result.pageToken } while(page)
  console.log(JSON.stringify({projectId,mode:apply?'apply':'inspect',preserveMasters,emptyMasters,retainedAccountsVerified:2,authAccounts:users.length,collections:inventory}))
  if (preserveMasters) {
    // This mode never deletes master/settings/counter collections or administrator accounts.
    const staffDocs = (await db.collection('staffAccounts').get()).docs
    const companyDocs = (await db.collection('constructionCompanyAccounts').get()).docs
    const admins = staffDocs.filter(doc=>['developer_superuser','house_solution_administrator'].includes(doc.data().role))
    const staffDelete = staffDocs.filter(doc=>doc.data().role==='general_staff')
    if (admins.length + staffDelete.length !== staffDocs.length) throw new Error('Unknown staff role; stopped before deletion.')
    const keepIds = new Set(admins.map(doc=>doc.id))
    const deleteIds = new Set([...staffDelete,...companyDocs].map(doc=>doc.id))
    if ([...deleteIds].some(uid=>keepIds.has(uid))) throw new Error('Conflicting account bindings; stopped before deletion.')
    if (users.some(user=>!keepIds.has(user.uid) && !deleteIds.has(user.uid))) throw new Error('Unclassified Auth account; stopped before deletion.')
    if (admins.some(doc=>!users.some(user=>user.uid===doc.id))) throw new Error('Administrator Auth record missing; stopped before deletion.')
    const deleteCollections = new Set(['propertyWarranties','properties','cases','constructionCompanyAccounts','constructionCompanyAccountBindings','constructionCompanyCaseWorkItems'])
    // Compare retained contents in memory only; never log private master data or credentials.
    async function retainedSnapshot() {
      const result = []
      for (const col of collections) {
        if (deleteCollections.has(col.id)) continue
        const docs = (await col.get()).docs.filter(doc=>col.id!=='staffAccounts'||keepIds.has(doc.id))
        result.push([col.id,docs.map(doc=>[doc.id,doc.data()]).sort((a,b)=>a[0].localeCompare(b[0]))])
      }
      return JSON.stringify(result.sort((a,b)=>a[0].localeCompare(b[0])))
    }
    const before = await retainedSnapshot()
    const keptAuth = users.filter(user=>keepIds.has(user.uid)).map(user=>({uid:user.uid,email:user.email,disabled:user.disabled}))
    console.log(JSON.stringify({projectId,plan:'preserve-masters',deleteAuthAccounts:users.filter(u=>deleteIds.has(u.uid)).length,deleteGeneralStaff:staffDelete.length,retainedAdministrators:admins.length,retainedIdentity:retained.map((user,i)=>({email:user.email,uid:user.uid,role:['developer_superuser','house_solution_administrator'][i]})),deleteCollections:inventory.filter(c=>deleteCollections.has(c.collection))}))
    if (apply) {
      for (const col of collections) if (deleteCollections.has(col.id)) await db.recursiveDelete(col)
      for (const doc of staffDelete) await db.recursiveDelete(doc.ref)
      for (const user of users) if (deleteIds.has(user.uid)) await auth.deleteUser(user.uid)
      for (const name of deleteCollections) if ((await db.collection(name).count().get()).data().count !== 0) throw new Error(`Deletion incomplete: ${name}`)
      if (await retainedSnapshot() !== before) throw new Error('Retained documents changed; investigate without further writes.')
      const remaining = await auth.listUsers(1000)
      if (remaining.pageToken || remaining.users.length!==keepIds.size || !remaining.users.every(user=>keptAuth.some(keep=>keep.uid===user.uid && keep.email===user.email && keep.disabled===user.disabled))) throw new Error('Retained Auth reconciliation failed.')
      console.log(JSON.stringify({projectId,resetVerified:true,preserveMasters:true,retainedDocumentsUnchanged:true,authAccounts:remaining.users.length,propertyWarranties:0,companyAccounts:0,generalStaffAccounts:0,retainedPasswordsChanged:false}))
    }
  }
  if (apply && !preserveMasters) {
    // Empty-master demo reset additionally preserves the alert settings but seeds no groups.
    const settingsBefore = emptyMasters ? JSON.stringify((await db.collection('prototypeSettings').get()).docs.map(doc=>[doc.id,doc.data()])) : null
    // Delete business records before Auth, keeping both verified administrator profiles intact.
    for (const col of collections) {
      if (emptyMasters && col.id === 'prototypeSettings') continue
      if (col.id !== 'staffAccounts') await db.recursiveDelete(col)
      else for (const doc of (await col.get()).docs) if (!retained.some(user=>user.uid===doc.id)) await db.recursiveDelete(doc.ref)
    }
    for (const user of users) if (!retained.some(keep=>keep.uid===user.uid)) await auth.deleteUser(user.uid)
    if (!emptyMasters) for (const group of initialGroups) await db.doc(`warrantyGroups/${group.id}`).set({...group,updatedAt:Timestamp.now()})
    const remaining = await auth.listUsers(1000)
    if (remaining.pageToken || remaining.users.length!==2 || !remaining.users.every(user=>retained.some(keep=>keep.uid===user.uid))) throw new Error('Post-reset account reconciliation failed.')
    for (const col of await db.listCollections()) {
      if (emptyMasters && col.id === 'prototypeSettings') continue
      const count=(await col.count().get()).data().count
      if (count !== (col.id==='staffAccounts'?2:col.id==='warrantyGroups' && !emptyMasters?3:0)) throw new Error(`Post-reset collection reconciliation failed: ${col.id}`)
    }
    if (emptyMasters && JSON.stringify((await db.collection('prototypeSettings').get()).docs.map(doc=>[doc.id,doc.data()])) !== settingsBefore) throw new Error('Alert settings changed unexpectedly.')
    console.log(JSON.stringify({projectId,resetVerified:true,emptyMasters,authAccounts:2,staffAccounts:2,warrantyGroups:emptyMasters?0:3,businessRecords:0,retainedPasswordsChanged:false}))
  }
} finally { await db.terminate(); await deleteApp(app) }
