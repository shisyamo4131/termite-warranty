// Operator CLI: inspect by default. No production target or database deletion.
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Firestore } from '@google-cloud/firestore'
import { OAuth2Client } from 'google-auth-library'
import { recoveryOptions } from './lib/recovery-options.mjs'
import { recoveryController, scanDatabase } from './lib/recovery-controller.mjs'
import { firestoreRecoveryProvider } from './lib/firestore-recovery-provider.mjs'
import { LOCAL_RUNTIME, localRuntimeHost } from '../src/config/local-emulator.mjs'

async function main() {
  const o = recoveryOptions(process.argv.slice(2))
  if (!o.readOnly && !o.apply) {
    console.log(JSON.stringify({ mode: 'plan', command: o.command, projectId: o.project, controlDatabaseId: o.control, target: o.target ?? null, writesPerformed: false }))
    return
  }
  let credential, oauth
  if (o.emulator) {
    if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.firestorePort)
      || process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST !== localRuntimeHost(LOCAL_RUNTIME.authPort)) throw Error('Wrong emulator endpoint.')
    process.env.FIRESTORE_EMULATOR_HOST = localRuntimeHost(LOCAL_RUNTIME.firestorePort)
    process.env.FIREBASE_AUTH_EMULATOR_HOST = localRuntimeHost(LOCAL_RUNTIME.authPort)
  } else {
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw Error('Emulator overrides forbidden for Dev operations.')
    if(o.apply){
      const git=promisify(execFile),cwd=fileURLToPath(new URL('..',import.meta.url))
      const head=(await git('git',['rev-parse','HEAD'],{cwd})).stdout.trim()
      const changes=(await git('git',['status','--porcelain','--untracked-files=all','--','app','functions','src','scripts','firestore.rules','firestore.control.rules','firebase.json','package.json','package-lock.json','nuxt.config.ts'],{cwd})).stdout.trim()
      if(head!==o.revision||changes)throw Error('Real writes require the inspected committed revision and unchanged runtime source.')
    }
    const require = createRequire(import.meta.url), cliAuth = require('firebase-tools/lib/auth.js'), cliApi = require('firebase-tools/lib/api.js')
    const account = cliAuth.getGlobalDefaultAccount()
    if (!account) throw Error('Firebase CLI sign-in required.')
    credential = { async getAccessToken() { const token = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase']); return { access_token: token.access_token, expires_in: token.expires_in ?? 3600 } } }
    oauth = new OAuth2Client(cliApi.clientId(), cliApi.clientSecret())
    oauth.setCredentials({ refresh_token: account.tokens.refresh_token })
  }
  const app = initializeApp({ projectId: o.project, ...(credential ? { credential } : {}) }, 'recovery-operator')
  const instances = new Map()
  const database = id => { if (!instances.has(id)) instances.set(id, new Firestore({ projectId: o.project, databaseId: id, ...(oauth ? { authClient: oauth } : {}) })); return instances.get(id) }
  const request = async (url, method = 'GET', body) => {
    if (!['https://firestore.googleapis.com','https://firebaserules.googleapis.com'].includes(new URL(url).origin)) throw Error('Unapproved API origin.')
    const { access_token } = await credential.getAccessToken()
    const result = await fetch(url, { method, headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60_000) })
    if (!result.ok) { const error = new Error('Cloud API request failed. Inspect the operation before retrying.'); error.status = result.status; throw error }
    return result.json()
  }
  const ruleContent = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
  async function assertRules(id, expected) {
    if (o.emulator) return
    const release = id === '(default)' ? 'cloud.firestore' : `cloud.firestore/${id}`
    const released = await request(`https://firebaserules.googleapis.com/v1/projects/${o.project}/releases/${release}`)
    const ruleset = await request(`https://firebaserules.googleapis.com/v1/${released.rulesetName}`)
    if (ruleset.source?.files?.length !== 1 || ruleset.source.files[0].content !== expected) throw Error('The reviewed database Rules are not deployed to this exact target.')
  }
  const controller = recoveryController({ database, auth: getAuth(app), controlId: o.control, revision: o.revision })
  const provider = o.emulator ? null : firestoreRecoveryProvider({ projectId: o.project, request })
  const control = database(o.control), generation = o.generation, operationId = o['operation-id']
  try {
    let result
    if (o.command === 'status') result = await controller.status()
    else if(o.command==='resume-operator'){
      const held=(await control.doc('recovery/operatorLock').get()).data()
      await assertRules(o.control,await readFile(new URL('../firestore.control.rules',import.meta.url),'utf8'))
      if(held?.intent?.next?.databaseId)await assertRules(held.intent.next.databaseId,ruleContent)
      if(held?.intent?.target)await assertRules(held.intent.target,ruleContent)
      result=await controller.resumeOperator(generation,o['expected-operation'],o['confirm-worker-stopped'],{expectedRecoveryOwner:o['expected-recovery-owner'],recoveryWorkerStopped:o['confirm-recovery-worker-stopped']})
    }
    else if (o.command === 'scan') result = await scanDatabase(database(o.target))
    else if (o.command === 'initialize') {
      await assertRules(o.control, await readFile(new URL('../firestore.control.rules', import.meta.url), 'utf8'))
      await assertRules('(default)', ruleContent)
      result = await controller.initialize()
    } else if (o.command === 'enter') result = await controller.enter(generation, operationId)
    else if (o.command === 'baseline') result = await controller.baseline(generation, operationId)
    else if (o.command === 'quarantine') { await assertRules(o.target, ruleContent); result = await controller.quarantine(generation, operationId, o.target) }
    else if (o.command === 'reconcile') result=await controller.reconcile(generation,operationId,{target:o.target,baselineId:o.baseline,snapshotHash:o['snapshot-hash']})
    else if (o.command === 'verify') {
      const restored = (await control.doc(`recoveryTargets/${o.target}`).get()).data()
      if (!restored?.restoreDone || restored.restoreOperation !== o['restore-operation'] || restored.recoveryPoint !== o['recovery-point']) throw Error('A completed and inspected restore operation is required.')
      result = await controller.verify(generation, operationId, { target: o.target, baselineId: o.baseline, restoreOperation: o['restore-operation'], recoveryPoint: o['recovery-point'], snapshotHash: o['snapshot-hash'], approval: o.approval })
    } else if (o.command === 'cutover') { const receipt = (await control.doc(`recoveryVerifications/${o.verification}`).get()).data(); await assertRules(receipt?.target, ruleContent); result = await controller.cutover(generation, operationId, o.verification) }
    else if (o.command === 'reopen') result = await controller.reopen(generation, operationId, o.approval)
    else {
      const inspected = await controller.status(), state = inspected.runtime
      if (o.command !== 'backups' && (state.generation !== generation || inspected.operatorBlocked)) throw Error('Stale state or unfinished operator command.')
      if (o.command === 'backups') result = { schedules: await provider.schedules(state.databaseId), backups: await provider.backups(state.databaseId) }
      else if (o.command === 'configure-backups') result = await provider.configure(state.databaseId)
      else if (o.command === 'restore') {
        if (state.phase !== 'recovering' || inspected.activeOperations || [o.control,state.databaseId,'(default)'].includes(o.target) || !o.approval) throw Error('Drained maintenance, a separate target and external HS recovery-point approval are required.')
        // Prepublish the reviewed identity-fenced Rules to the new name. Any
        // restored marker contains the source identity and cannot grant access.
        await assertRules(o.target, ruleContent)
        const journal = control.doc(`recoveryTargets/${o.target}`)
        await journal.create({ status: 'submitting', operationId, generation, approval: o.approval, revision: o.revision, source: state.databaseId, requestedBackup: o.backup ?? null, requestedSnapshotTime: o['snapshot-time'] ?? null })
        result = await provider.restore({ source: state.databaseId, target: o.target, backup: o.backup, snapshotTime: o['snapshot-time'] })
        await journal.update({ status: 'submitted', restoreOperation: result.operation.name, recoveryPoint: result.recoveryPoint })
        result = { operation: result.operation.name, recoveryPoint: result.recoveryPoint }
      } else if (o.command === 'restore-status') {
        const journal = control.doc(`recoveryTargets/${o.target}`), entry = (await journal.get()).data()
        if (!entry || entry.generation !== generation || entry.restoreOperation && entry.restoreOperation !== o['restore-operation'] || !entry.restoreOperation && !o['confirm-worker-stopped']) throw Error('Restore journal does not match or the original submitter is not confirmed stopped.')
        const expected={source:entry.source,backup:entry.requestedBackup,snapshotTime:entry.requestedSnapshotTime}
        result = await provider.operation(o['restore-operation'], o.target, expected)
        const recoveryPoint=entry.recoveryPoint ?? await provider.recoveryPoint(expected)
        await journal.update({ status: result.done ? 'restored' : 'submitted', restoreDone: result.done, restoreOperation: o['restore-operation'], recoveryPoint })
      }
    }
    console.log(JSON.stringify({ mode: o.apply ? 'apply' : 'inspect', command: o.command, projectId: o.project, result }))
  } finally { for (const instance of instances.values()) await instance.terminate(); await deleteApp(app) }
}
main().catch(error => { console.error(JSON.stringify({ status: 'failed', code: String(error?.code ?? error?.status ?? 'recovery-failed'), message: error?.status ? 'Cloud request failed; inspect the target and operation journal before retrying.' : error.message })); process.exitCode = 1 })
