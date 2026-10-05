// Dev-only, explicitly authorized business reset. Accounts, groups and settings are retained.
// No writes without --apply --confirm-project termite-warranty-dev --expected-plan <digest>.
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Firestore } from '@google-cloud/firestore'
import { OAuth2Client } from 'google-auth-library'

const projectId = 'termite-warranty-dev'
const args = process.argv.slice(2)
const option = key => args.includes(key) ? args[args.indexOf(key) + 1] : undefined
const apply = args.includes('--apply')
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_DATABASE_EMULATOR_HOST) throw Error('Emulator overrides are forbidden.')
if (apply && (option('--confirm-project') !== projectId || !/^[a-f0-9]{64}$/.test(option('--expected-plan') ?? ''))) throw Error('Explicit Dev project and inspected plan digest required.')

const deleteNames = new Set(['propertyWarranties', 'propertyOperationReceipts', 'properties', 'cases', 'warrantyCounters', 'systemCounters', 'caseNumberReservations', 'constructionCompanies', 'companyBranches', 'branches'])
const keepNames = new Set(['warrantyGroups', 'prototypeSettings', 'staffAccounts', 'constructionCompanyAccounts', 'constructionCompanyAccountBindings', 'constructionCompanyCaseWorkItems', 'notificationOutbox', 'homeowners', 'warrantyServices'])
const require = createRequire(import.meta.url)
const cliAuth = require('firebase-tools/lib/auth.js')
const cliApi = require('firebase-tools/lib/api.js')
const account = cliAuth.getGlobalDefaultAccount()
if (!account) throw Error('Firebase CLI sign-in required.')
const oauth = new OAuth2Client(cliApi.clientId(), cliApi.clientSecret())
oauth.setCredentials({ refresh_token: account.tokens.refresh_token })
const credential = { async getAccessToken() {
  const token = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'])
  return { access_token: token.access_token, expires_in: token.expires_in ?? 3600 }
} }
const app = initializeApp({ projectId, credential })
const db = new Firestore({ projectId, authClient: oauth })
const auth = getAuth(app)
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
async function authSnapshot() {
  const users = []; let page
  do { const result = await auth.listUsers(1000, page); users.push(...result.users.map(u => u.toJSON())); page = result.pageToken } while (page)
  return { count: users.length, digest: hash(users.sort((a, b) => a.uid.localeCompare(b.uid))) }
}
async function snapshot() {
  const records = []; const counts = []
  for (const col of (await db.listCollections()).sort((a, b) => a.id.localeCompare(b.id))) {
    if (!deleteNames.has(col.id) && !keepNames.has(col.id)) throw Error(`Unclassified collection: ${col.id}`)
    const docs = (await col.get()).docs
    // Never silently omit nested data from the inspected plan.
    for (const doc of docs) if ((await doc.ref.listCollections()).length) throw Error(`Nested data requires a separate review: ${col.id}`)
    counts.push({ collection: col.id, documents: docs.length, action: deleteNames.has(col.id) ? 'delete' : 'keep' })
    records.push([col.id, docs.map(d => [d.id, d.data()]).sort((a, b) => a[0].localeCompare(b[0]))])
  }
  return { records, counts }
}
try {
  const before = await snapshot()
  const authBefore = await authSnapshot()
  // These could otherwise leave accounts/workflows tied to deleted business records.
  for (const name of ['constructionCompanyAccounts', 'constructionCompanyAccountBindings', 'constructionCompanyCaseWorkItems', 'notificationOutbox']) {
    if (before.counts.some(c => c.collection === name && c.documents)) throw Error(`Nonempty dependent collection needs owner review: ${name}`)
  }
  const planDigest = hash({ projectId, records: before.records, auth: authBefore })
  console.log(JSON.stringify({ projectId, mode: apply ? 'apply' : 'inspect', planDigest, authAccounts: authBefore.count, collections: before.counts }))
  if (apply) {
    if (planDigest !== option('--expected-plan')) throw Error('Data changed since inspection. Nothing deleted.')
    const retainedBefore = hash(before.records.filter(([name]) => keepNames.has(name)))
    for (const name of deleteNames) await db.recursiveDelete(db.collection(name))
    const after = await snapshot()
    const authAfter = await authSnapshot()
    if (after.counts.some(c => deleteNames.has(c.collection) && c.documents)) throw Error('Deleted collection is not empty.')
    if (hash(after.records.filter(([name]) => keepNames.has(name))) !== retainedBefore) throw Error('Retained documents changed; investigate.')
    if (authAfter.digest !== authBefore.digest || authAfter.count !== authBefore.count) throw Error('Auth changed; investigate.')
    console.log(JSON.stringify({ projectId, resetVerified: true, retainedDocumentsUnchanged: true, authUnchanged: true, authAccounts: authAfter.count, collections: after.counts }))
  }
} finally { await db.terminate(); await deleteApp(app) }
