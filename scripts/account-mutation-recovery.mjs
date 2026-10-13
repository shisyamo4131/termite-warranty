// Inspect by default; real recovery needs separate approval and a stopped old worker.
import { createRequire } from 'node:module'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Firestore } from '@google-cloud/firestore'
import { OAuth2Client } from 'google-auth-library'
import { inspectAccountMutation, recoverAccountMutation } from '../functions/account-mutation-recovery.js'

const args = process.argv.slice(2)
const option = key => args.includes(key) ? args[args.indexOf(key) + 1] : undefined
const projectId = option('--project'), uid = option('--uid'), apply = args.includes('--apply')
if (projectId !== 'termite-warranty-dev' || !/^[\w-]{1,128}$/.test(uid ?? '')) throw Error('Explicit Dev project and UID required.')
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw Error('Emulator overrides forbidden for Dev recovery.')
if (apply && (option('--confirm') !== 'account-mutation-recovery' || !args.includes('--confirm-worker-stopped') || !/^[a-f0-9-]{36}$/.test(option('--expected-operation') ?? ''))) throw Error('Apply requires inspected operation ID, recovery confirmation and old-worker quiescence.')
if (option('--expected-recovery-owner') && (!apply || !args.includes('--confirm-recovery-worker-stopped') || !/^[a-f0-9-]{36}$/.test(option('--expected-recovery-owner')))) throw Error('Recovery takeover requires inspected recovery owner and confirmed stopped recovery worker.')
const require = createRequire(import.meta.url)
const cliAuth = require('firebase-tools/lib/auth.js'), cliApi = require('firebase-tools/lib/api.js')
const account = cliAuth.getGlobalDefaultAccount()
if (!account) throw Error('Firebase CLI sign-in required.')
const credential = { async getAccessToken() {
  const token = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'])
  return { access_token: token.access_token, expires_in: token.expires_in ?? 3600 }
} }
const oauth = new OAuth2Client(cliApi.clientId(), cliApi.clientSecret())
oauth.setCredentials({ refresh_token: account.tokens.refresh_token })
const app = initializeApp({ projectId, credential }), auth = getAuth(app), db = new Firestore({ projectId, authClient: oauth })
try {
  const result = apply
    ? await recoverAccountMutation(auth, db, { uid, expectedOperationId: option('--expected-operation'), workerStopped: true, expectedRecoveryOwner: option('--expected-recovery-owner'), recoveryWorkerStopped: args.includes('--confirm-recovery-worker-stopped') })
    : await inspectAccountMutation(auth, db, uid)
  console.log(JSON.stringify({ projectId, mode: apply ? 'apply' : 'inspect', ...result }))
} catch (error) {
  const code = String(error?.code ?? 'recovery-failed')
  console.error(JSON.stringify({ projectId, mode: apply ? 'apply' : 'inspect', code: /^[a-z0-9/-]{1,80}$/i.test(code) ? code : 'recovery-failed', message: 'Account recovery did not complete. Inspect state; the lock must be retained until verified recovery.' }))
  process.exitCode = 1
} finally { await db.terminate(); await deleteApp(app) }
