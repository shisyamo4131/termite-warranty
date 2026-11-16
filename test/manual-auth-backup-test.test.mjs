import test from 'node:test'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { readFile, mkdir, mkdtemp, writeFile, readdir, access, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { manualAuthBackupProbe } from '../scripts/lib/manual-auth-backup-probe.mjs'
import { probeOptions, probeConfig, probeSource, verifyProbeFunction, verifyPrivateService, verifyProbeResult, invokeProbeOnce, runManualBackupTest } from '../scripts/manual-auth-backup-test.mjs'
import { assertPrivateAuthBucket } from '../src/domain/backup-health.mjs'

const sdkVersion = JSON.parse(await readFile(new URL('../functions/package.json', import.meta.url))).dependencies['firebase-admin']
const config = { ...probeConfig('s4-' + 'a'.repeat(24)), sdkVersion }
function fixture(options = {}) {
  const docs = new Map([
    ['recovery/runtime', { phase: 'normal', generation: 2 }],
    ['recovery/authBackupEpoch', { epoch: 4 }],
  ])
  if (options.lock) docs.set('recovery/authExportLock', { owner: 'other' })
  let stored, generation, readCount = 0, saved = 0, deleted = 0
  const calls = []
  const control = {
    doc: path => path,
    collection: () => ({ where: () => ({ limit: () => 'active' }) }),
    runTransaction: async fn => fn({
      get: async key => key === 'active' ? { size: options.active ? 1 : 0 } : { exists: docs.has(key), data: () => docs.get(key) },
      create: (key, value) => { assert.equal(docs.has(key), false); docs.set(key, value) },
      delete: key => docs.delete(key),
    }),
  }
  const metadata = { projectNumber: config.projectNumber, location: 'ASIA-NORTHEAST1', softDeletePolicy: { retentionDurationSeconds: '604800' }, iamConfiguration: { publicAccessPrevention: 'enforced', uniformBucketLevelAccess: { enabled: true } }, lifecycle: { rule: [{ action: { type: 'Delete' }, condition: { age: 30, matchesPrefix: ['auth/'] } }] } }
  const file = (path, opts = {}) => {
    assert.equal(path, `auth/sdk-verification/${config.operation}.json.gz`)
    return {
      save: async (value, settings) => {
        calls.push('save'); saved++
        assert.equal(settings.preconditionOpts.ifGenerationMatch, 0)
        if (options.saveError) throw Error('SECRET save')
        stored = value; generation = '42'
      },
      getMetadata: async () => {
        if (!stored) { const error = Error('SECRET absent'); error.code = 404; throw error }
        if (options.generationError) throw Error('SECRET metadata')
        return [{ generation, metadata: { operation: config.operation } }]
      },
      download: async () => {
        calls.push('download'); assert.equal(opts.generation, '42')
        if (options.epochChanged) docs.set('recovery/authBackupEpoch', { epoch: 5 })
        if (options.ownerChanged) docs.set('recovery/authExportLock', { owner: 'other' })
        return [options.mismatch ? gzipSync('SECRET DIFFERENT') : stored]
      },
      delete: async settings => {
        calls.push('delete'); assert.equal(opts.generation, '42'); assert.equal(settings.ifGenerationMatch, '42'); deleted++
        if (options.deleteError) throw Error('SECRET delete')
        stored = undefined
      },
    }
  }
  const storage = { bucket: name => {
    assert.equal(name, config.bucket)
    return { file, getMetadata: async () => [options.badBucket ? { ...metadata, softDeletePolicy: {} } : metadata], iam: {
      getPolicy: async () => [{ bindings: options.public ? [{ members: ['allUsers'] }] : [] }],
      testPermissions: async permissions => [Object.fromEntries(permissions.map(p => [p, !options.permissionDenied]))],
    } }
  } }
  const auth = { listUsers: async () => {
    calls.push('auth'); readCount++
    if (options.authError) throw Error('SECRET password')
    return { users: [{ providerData: [{ providerId: 'password' }], passwordHash: options.hashMissing ? '' : 'SECRET HASH', passwordSalt: 'SECRET SALT', toJSON: () => ({ uid: 'PRIVATE UID', passwordHash: 'SECRET HASH' }) }] }
  } }
  return { run: () => manualAuthBackupProbe({ config, project: options.project ?? config.project, sdkVersion: options.sdkVersion ?? sdkVersion, auth, storage, control, assertPrivateAuthBucket }), docs, calls, counts: () => ({ readCount, saved, deleted }) }
}

test('only explicit Dev and account options are accepted', () => {
  assert.deepEqual(probeOptions(['dev', '--account', 'owner@example.com']), { account: 'owner@example.com' })
  for (const args of [[], ['prod','--account','owner@example.com'], ['dev','--account','owner@example.com','--force'], ['dev','--account','']]) assert.throws(() => probeOptions(args))
  assert.throws(() => probeConfig('../object'))
})
test('stage is a private isolated HTTP function with the approved runtime identity', () => {
  const source = probeSource(config)
  assert.match(source, /invoker:'private'/)
  assert.match(source, /SDK_VERSION/)
  assert.match(source, /if\(invocation\)/)
  assert.match(source, /serviceAccount:config.serviceAccount/)
  assert.doesNotMatch(source, /console\.|logger\.|onCall|recoveryBackupMonitor/)
})
test('Cloud Auth bytes save/read/delete exactly one generation; response contains no user data', async () => {
  const f = fixture(), result = await f.run()
  assert.equal(result.status, 'pass'); assert.equal(result.sdkVersion, sdkVersion)
  assert.equal(result.softDeleteSeconds, 604800)
  assert.equal(f.docs.has('recovery/authExportLock'), false)
  assert.deepEqual(f.counts(), { readCount: 1, saved: 1, deleted: 1 })
  assert.deepEqual(f.calls, ['auth', 'save', 'download', 'delete'])
  assert.equal(verifyProbeResult(result, config), result)
  assert.doesNotMatch(JSON.stringify(result), /SECRET|PRIVATE UID/)
  assert.deepEqual([...f.docs.keys()].sort(), ['recovery/authBackupEpoch','recovery/runtime'])
})
for (const [name, options, phase] of [
  ['wrong project', { project: 'prod' }, 'target'], ['wrong SDK', { sdkVersion: '0' }, 'target'],
  ['public bucket', { public: true }, 'bucket'], ['changed retention', { badBucket: true }, 'bucket'],
  ['missing storage permission', { permissionDenied: true }, 'bucket'], ['another lock', { lock: true }, 'lock'], ['active Auth mutation', { active: true }, 'lock'],
]) test(`${name} rejects before Auth reads`, async () => {
  const f = fixture(options), result = await f.run()
  assert.equal(result.status, 'failed'); assert.equal(result.phase, phase)
  assert.equal(f.counts().readCount, 0); assert.equal(f.counts().saved, 0)
  if (options.lock) assert.equal(f.docs.get('recovery/authExportLock').owner, 'other')
})
for (const options of [{ authError: true }, { hashMissing: true }]) test('Auth export failure releases only the owned lock and reveals no secrets', async () => {
  const f = fixture(options), result = await f.run()
  assert.equal(result.status, 'failed'); assert.equal(result.cleanupComplete, true)
  assert.equal(f.docs.has('recovery/authExportLock'), false)
  assert.doesNotMatch(JSON.stringify(result), /SECRET|PRIVATE/)
})
for (const [name, options, phase] of [
  ['unknown save', { saveError: true }, 'save'], ['unknown generation', { generationError: true }, 'generation'],
  ['mismatch', { mismatch: true }, 'readback'], ['changed epoch', { epochChanged: true }, 'consistency'],
  ['changed owner', { ownerChanged: true }, 'consistency'], ['failed delete', { deleteError: true }, 'delete'],
]) test(`${name} retains precise cleanup state without blind deletion`, async () => {
  const f = fixture(options), result = await f.run()
  assert.equal(result.status, 'failed'); assert.equal(result.phase, phase); assert.equal(result.cleanupComplete, false)
  assert.equal(f.docs.get('recovery/authExportLock').owner, options.ownerChanged ? 'other' : config.operation)
  assert.equal(f.counts().deleted, options.deleteError ? 1 : 0)
  assert.doesNotMatch(JSON.stringify(result), /SECRET|PRIVATE/)
})
test('unknown POST outcome is attempted once, never retried', async () => {
  let calls = 0
  await assert.rejects(invokeProbeOnce({ url: 'https://probe.run.app/', token: 'private-token', config, fetcher: async () => { calls++; throw Error('timeout') } }))
  assert.equal(calls, 1)
})
test('unexpected payload cannot enter the metadata receipt', () => {
  const result = { operation: config.operation, status: 'pass', phase: 'complete', generation: '42', cleanupComplete: true, softDeleteSeconds: 604800, sdkVersion }
  assert.throws(() => verifyProbeResult({ ...result, users: ['PRIVATE'] }, config))
  assert.throws(() => verifyProbeResult({ ...result, operation: 'other' }, config))
  assert.throws(() => verifyProbeResult({ ...result, sdkVersion: '0' }, config))
  assert.throws(() => verifyProbeResult({ ...result, cleanupComplete: false }, config))
})
test('Cloud resource must match operation, runtime, account, source entry and private IAM', () => {
  const base = `projects/${config.project}/locations/${config.region}`
  const fn = { name: `${base}/functions/${config.functionName}`, state: 'ACTIVE', environment: 'GEN_2', labels: { 'firebase-functions-codebase': config.codebase }, buildConfig: { entryPoint: config.functionName, runtime: 'nodejs22' }, serviceConfig: { serviceAccountEmail: config.serviceAccount, service: `${base}/services/probe`, allTrafficOnLatestRevision: true, uri: 'https://probe.run.app' } }
  assert.equal(verifyProbeFunction(fn, config), 'https://probe.run.app/')
  assert.throws(() => verifyProbeFunction({ ...fn, labels: {} }, config))
  assert.throws(() => verifyProbeFunction({ ...fn, serviceConfig: { ...fn.serviceConfig, serviceAccountEmail: 'other' } }, config))
  const service = { template: { serviceAccount: config.serviceAccount } }
  verifyPrivateService(service, { bindings: [] }, config)
  assert.throws(() => verifyPrivateService({ ...service, invokerIamDisabled: true }, { bindings: [] }, config))
  assert.throws(() => verifyPrivateService(service, { bindings: [{ members: ['allUsers'] }] }, config))
})

async function runnerFixture(t, fault) {
  const repository = fileURLToPath(new URL('..', import.meta.url)), parent = join(repository, 'tmp')
  await mkdir(parent, { recursive: true })
  const directoryRoot = await mkdtemp(join(parent, 'manual-probe-unit-'))
  t.after(async () => { assert.ok(resolve(directoryRoot).startsWith(resolve(parent) + '\\manual-probe-unit-') || resolve(directoryRoot).startsWith(resolve(parent) + '/manual-probe-unit-')); await rm(directoryRoot, { recursive: true, force: true }) })
  for (const path of ['functions/package.json','functions/package-lock.json','src/domain/backup-health.mjs','scripts/lib/manual-auth-backup-probe.mjs']) {
    await mkdir(join(directoryRoot, path, '..'), { recursive: true }); await writeFile(join(directoryRoot, path), await readFile(join(repository, path)))
  }
  for (const [path, value] of [['package.json',{ packageManager: 'npm@11.19.1' }],['package-lock.json',{ packages: { 'node_modules/firebase-tools': { version: 'fixture' } } }],['node_modules/firebase-tools/package.json',{ version: 'fixture' }]]) {
    await mkdir(join(directoryRoot, path, '..'), { recursive: true }); await writeFile(join(directoryRoot, path), JSON.stringify(value))
  }
  const calls = []; let deployed = false, current, files, beforeCount = 0
  const deps = {
    directoryRoot, env: { npm_execpath: 'fixture-npm', LOCALAPPDATA: 'fixture-local' }, revisionOf: async () => 'a'.repeat(40),
    snapshot: async () => ({ parameters: { RECOVERY_AUTH_BACKUP_BUCKET: config.bucket }, stable: fault === 'stale' && ++beforeCount > 1 ? 2 : 1 }),
    credentialsOf: async () => ({ verifyIdentity: async () => {}, credential: { getAccessToken: async () => ({ access_token: 'fictional' }) } }),
    unpack: () => files,
    run: async (_executable, args) => {
      if (args.includes('ci')) { calls.push('ci'); return { stdout: '' } }
      if (args.includes('deploy')) {
        calls.push('deploy')
        const directory = join(args[args.indexOf('--config') + 1], '..', 'functions')
        const source = await readFile(join(directory, 'index.js'), 'utf8')
        current = JSON.parse(source.match(/const config=(.*)\n/)[1])
        files = new Map(await Promise.all((await readdir(directory)).map(async name => [name, await readFile(join(directory, name))])))
        deployed = true
        if (fault === 'deploy') throw Error('SECRET CLI error')
        return { stdout: '' }
      }
      if (args.includes('functions:delete')) { calls.push('delete-function'); deployed = false; return { stdout: '' } }
      calls.push('token')
      const claims = { email: fault === 'identity' ? 'other@example.com' : 'owner@example.com', exp: Date.now() / 1000 + 3600, iss: 'https://accounts.google.com' }
      return { stdout: 'header.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.signature' }
    },
    fetcher: async (url, options) => {
      if (options.method === 'POST') {
        calls.push('POST')
        if (fault === 'timeout') throw Error('SECRET timeout')
        return Response.json({ operation: current.operation, status: 'pass', phase: 'complete', generation: '42', cleanupComplete: true, softDeleteSeconds: 604800, sdkVersion })
      }
      if (url.includes('cloudfunctions.googleapis.com')) {
        if (!deployed) return new Response('', { status: 404 })
        const base = `projects/${current.project}/locations/${current.region}`
        return Response.json({ name: `${base}/functions/${current.functionName}`, state: 'ACTIVE', environment: 'GEN_2', labels: { 'firebase-functions-codebase': current.codebase }, buildConfig: { entryPoint: current.functionName, runtime: 'nodejs22', source: { storageSource: { bucket: `gcf-v2-sources-${current.projectNumber}-${current.region}`, object: 'source.zip', generation: '1' } } }, serviceConfig: { serviceAccountEmail: current.serviceAccount, service: `${base}/services/probe`, allTrafficOnLatestRevision: true, uri: 'https://probe.run.app' } })
      }
      if (url.endsWith(':getIamPolicy')) return Response.json({ bindings: fault === 'public' ? [{ members: ['allUsers'] }] : [] })
      if (url.includes('run.googleapis.com')) return Response.json({ template: { serviceAccount: current.serviceAccount } })
      if (url.includes('storage.googleapis.com')) return new Response('fixture-archive')
      throw Error('Unexpected mock request')
    },
  }
  return { calls, deps, directoryRoot, execute: () => runManualBackupTest({ account: 'owner@example.com' }, deps) }
}
test('runner creates only the isolated function, invokes once, deletes it and releases local lock', async t => {
  const f = await runnerFixture(t), result = await f.execute()
  assert.equal(result.status, 'pass'); assert.equal(result.functionDeleted, true)
  assert.deepEqual(f.calls, ['ci','deploy','token','POST','delete-function'])
  await assert.rejects(access(join(f.directoryRoot, 'tmp/manual-auth-backup/dev.lock')))
  assert.doesNotMatch(await readFile(result.receipt, 'utf8'), /fictional|signature|SECRET/)
})
for (const fault of ['deploy','identity','public','timeout']) test(`runner ${fault} retains cleanup state and never retries or blindly deletes`, async t => {
  const f = await runnerFixture(t, fault)
  await assert.rejects(f.execute(), error => !error.message.includes('SECRET') && /manualRecoveryRequired=true/.test(error.message))
  assert.equal(f.calls.filter(x => x === 'deploy').length, 1)
  assert.equal(f.calls.filter(x => x === 'POST').length, fault === 'timeout' ? 1 : 0)
  assert.equal(f.calls.includes('delete-function'), false)
  await access(join(f.directoryRoot, 'tmp/manual-auth-backup/dev.lock'))
  await assert.rejects(f.execute()) // Same-environment second invocation cannot enter.
  assert.equal(f.calls.filter(x => x === 'deploy').length, 1)
})
test('runner refuses changed baseline before any Cloud creation', async t => {
  const f = await runnerFixture(t, 'stale')
  await assert.rejects(f.execute(), /manualRecoveryRequired=false/)
  assert.deepEqual(f.calls, ['ci'])
  await assert.rejects(access(join(f.directoryRoot, 'tmp/manual-auth-backup/dev.lock')))
})
test('runner accepts reordered metadata keys at both baseline checks, preserving value and array checks', async t => {
  for (const change of ['keys', 'value', 'array']) {
    const f = await runnerFixture(t)
    let reads = 0
    f.deps.snapshot = async () => ++reads === 1
      ? { parameters: { RECOVERY_AUTH_BACKUP_BUCKET: config.bucket }, metadata: { name: 'dev', enabled: true }, order: ['first', 'second'] }
      : { order: change === 'array' ? ['second', 'first'] : ['first', 'second'], metadata: { enabled: change !== 'value', name: 'dev' }, parameters: { RECOVERY_AUTH_BACKUP_BUCKET: config.bucket } }
    if (change === 'keys') {
      assert.equal((await f.execute()).status, 'pass')
      assert.equal(reads, 3)
    } else {
      await assert.rejects(f.execute(), /manualRecoveryRequired=false/)
      assert.deepEqual(f.calls, ['ci'])
    }
  }
})
