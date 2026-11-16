import { readFile, writeFile, mkdir, mkdtemp, open, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify, isDeepStrictEqual } from 'node:util'
import { developmentTarget } from './development-deployment.mjs'
import { deploymentCredentials } from './lib/direct-deployment-credentials.mjs'
import { assertFunctionsLock } from './lib/functions-dependencies.mjs'
import { readSourceZip, collectFunctionsSource, ARCHIVE_LIMIT } from './lib/default-recovery-release-proof.mjs'
import { assertDeploymentEnvironment, deploymentEnvironment, cleanRevision, metadataReader, deploymentSnapshot } from './deploy-application.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), exec = promisify(execFile)
export const probeTarget = Object.freeze({ ...developmentTarget, region: 'asia-northeast1', bucket: 'termite-warranty-dev-recovery-auth', serviceAccount: '1039792105037-compute@developer.gserviceaccount.com' })
export function probeOptions(args) {
  if (args.length !== 3 || args[0] !== 'dev' || args[1] !== '--account' || !/^[-a-zA-Z0-9._+]+@[-a-zA-Z0-9.]+$/.test(args[2] ?? '')) throw Error('Usage: npm run test:backup:manual -- dev --account email')
  return { account: args[2] }
}
export function probeConfig(operation) {
  if (!/^s4-[a-f0-9]{24}$/.test(operation)) throw Error('Invalid probe operation.')
  return { ...probeTarget, operation, codebase: operation, functionName: 's4AuthProbe' + operation.slice(3) }
}
export function probeSource(config) {
  return `import {initializeApp,SDK_VERSION} from 'firebase-admin/app'\nimport {getAuth} from 'firebase-admin/auth'\nimport {getStorage} from 'firebase-admin/storage'\nimport {getFirestore} from 'firebase-admin/firestore'\nimport {onRequest} from 'firebase-functions/v2/https'\nimport {manualAuthBackupProbe} from './probe.mjs'\nimport {assertPrivateAuthBucket} from './backup-health.mjs'\nconst config=${JSON.stringify(config)}\ninitializeApp()\nlet invocation\nexport const ${config.functionName}=onRequest({region:config.region,invoker:'private',serviceAccount:config.serviceAccount,maxInstances:1,concurrency:1,timeoutSeconds:180},async(req,res)=>{\nif(req.method!=='POST'||req.body?.operation!==config.operation||Object.keys(req.body).length!==1){res.status(400).json({status:'rejected'});return}\nif(invocation){res.status(409).json({status:'rejected'});return}\ninvocation=manualAuthBackupProbe({config,project:process.env.GCLOUD_PROJECT,sdkVersion:SDK_VERSION,control:getFirestore(config.control),auth:getAuth(),storage:getStorage(),assertPrivateAuthBucket})\ntry{res.json(await invocation)}catch{res.status(500).json({operation:config.operation,status:'failed',phase:'handler',cleanupComplete:false})}\n})\n`
}
export function verifyProbeFunction(fn, config) {
  const base = `projects/${config.project}/locations/${config.region}`
  if (fn?.name !== `${base}/functions/${config.functionName}` || fn.state !== 'ACTIVE' || fn.environment !== 'GEN_2' || fn.labels?.['firebase-functions-codebase'] !== config.codebase || fn.buildConfig?.entryPoint !== config.functionName || fn.buildConfig.runtime !== 'nodejs22' || fn.serviceConfig?.serviceAccountEmail !== config.serviceAccount || fn.serviceConfig.allTrafficOnLatestRevision !== true || !fn.serviceConfig.service?.startsWith(`${base}/services/`)) throw Error('Temporary Function identity differs.')
  const url = new URL(fn.serviceConfig.uri)
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.run.app') || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Temporary Function URI differs.')
  return url.href
}
export function verifyPrivateService(service, policy, config) {
  if (service.invokerIamDisabled === true || service.template?.serviceAccount !== config.serviceAccount || policy.bindings?.some(b => b.members?.some(m => ['allUsers', 'allAuthenticatedUsers'].includes(m)))) throw Error('Temporary Function must require private IAM invocation.')
}
export function verifyProbeResult(value, config) {
  if (value?.sdkVersion !== undefined && value.sdkVersion !== config.sdkVersion) throw Error('Probe SDK version differs.')
  if (value?.operation !== config.operation || !['pass', 'failed'].includes(value.status) || !['target','bucket','lock','auth-read','save','generation','readback','consistency','delete','absence','unlock','complete'].includes(value.phase) || typeof value.cleanupComplete !== 'boolean' || value.softDeleteSeconds !== 604800 || value.generation !== null && !/^[1-9][0-9]*$/.test(value.generation) || Object.keys(value).some(k => !['operation','status','phase','generation','cleanupComplete','softDeleteSeconds','sdkVersion'].includes(k))) throw Error('Invalid probe response; body suppressed.')
  if (value.status === 'pass' && (value.phase !== 'complete' || !value.cleanupComplete || !value.generation || value.sdkVersion !== config.sdkVersion)) throw Error('Incomplete probe proof.')
  return value
}
export async function invokeProbeOnce({ url, token, config, fetcher = fetch }) {
  // Never retry: an HTTP failure or malformed response cannot prove no execution.
  const response = await fetcher(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: config.operation }), redirect: 'error', signal: AbortSignal.timeout(210000) })
  if (!response.ok) throw Error('Probe invocation outcome unknown.')
  const text = await response.text()
  if (text.length > 2048) throw Error('Probe invocation outcome unknown.')
  return verifyProbeResult(JSON.parse(text), config)
}
export async function command(executable, args, options = {}) {
  const pending = exec(executable, args, { cwd: root, windowsHide: true, timeout: 600000, maxBuffer: 4 * 1024 * 1024, ...options })
  // These commands are noninteractive; PowerShell scripts can otherwise await EOF.
  pending.child.stdin.end()
  return pending
}
export async function runManualBackupTest({ account }, { directoryRoot = root, env = process.env, run = command, credentialsOf = deploymentCredentials, fetcher = fetch, revisionOf = cleanRevision, snapshot = deploymentSnapshot, unpack = readSourceZip } = {}) {
  assertDeploymentEnvironment(env)
  const revision = await revisionOf(directoryRoot)
  if (!env.npm_execpath || JSON.parse(await readFile(join(directoryRoot, 'package.json'))).packageManager !== 'npm@11.19.1') throw Error('Use the project npm command.')
  const locked = JSON.parse(await readFile(join(directoryRoot, 'package-lock.json')))
  if (JSON.parse(await readFile(join(directoryRoot, 'node_modules/firebase-tools/package.json'))).version !== locked.packages['node_modules/firebase-tools'].version) throw Error('Installed Firebase CLI differs from the lock.')
  const temp = join(directoryRoot, 'tmp', 'manual-auth-backup'); await mkdir(temp, { recursive: true })
  const handle = await open(join(temp, 'dev.lock'), 'wx')
  let phase = 'prepare', uncertain = false, directory, config
  let receipt = {}
  const record = async extra => {
    receipt = { ...receipt, operation: config.operation, revision, ...extra, runnerPhase: phase }
    await writeFile(join(directory, 'result.json'), JSON.stringify(receipt, null, 2))
  }
  try {
    config = probeConfig('s4-' + randomBytes(12).toString('hex'))
    directory = await mkdtemp(join(temp, 'run-'))
    await handle.writeFile(JSON.stringify({ operation: config.operation, directory, revision }))
    await record({ status: 'running' })
    const credentials = await credentialsOf(account), read = metadataReader(credentials, fetcher)
    const before = await snapshot(probeTarget, 'dev', read)
    if (before.parameters.RECOVERY_AUTH_BACKUP_BUCKET !== config.bucket) throw Error('Dev Auth bucket differs.')
    const fnUrl = `https://cloudfunctions.googleapis.com/v2/projects/${config.project}/locations/${config.region}/functions/${config.functionName}`
    if (await read(fnUrl, { missing: true })) throw Error('Temporary Function already exists.')
    const source = join(directory, 'functions'); await mkdir(source)
    const manifest = await readFile(join(directoryRoot, 'functions/package.json')), lock = await readFile(join(directoryRoot, 'functions/package-lock.json'))
    assertFunctionsLock(manifest, lock)
    config.sdkVersion = JSON.parse(manifest).dependencies['firebase-admin']
    const files = new Map([
      ['package.json', manifest], ['package-lock.json', lock], ['index.js', Buffer.from(probeSource(config))],
      ['probe.mjs', await readFile(join(directoryRoot, 'scripts/lib/manual-auth-backup-probe.mjs'))],
      ['backup-health.mjs', await readFile(join(directoryRoot, 'src/domain/backup-health.mjs'))],
    ])
    for (const [name, bytes] of files) await writeFile(join(source, name), bytes, { flag: 'wx' })
    const configPath = join(directory, 'firebase.json')
    const firebaseConfig = JSON.stringify({ functions: [{ source: 'functions', codebase: config.codebase, runtime: 'nodejs22' }] })
    await writeFile(configPath, firebaseConfig, { flag: 'wx' })
    // Hash only immutable source; result.json deliberately lives outside the stage.
    const sourceHash = async () => {
      const actual = await collectFunctionsSource(source)
      if (actual.size !== files.size || [...files].some(([name, bytes]) => !actual.get(name)?.equals(bytes)) || await readFile(configPath, 'utf8') !== firebaseConfig) throw Error('Probe source changed.')
    }
    const cli = join(directoryRoot, 'node_modules/firebase-tools/lib/bin/firebase.js')
    const cliArgs = ['--account', account, '--project', config.project, '--config', configPath, '--non-interactive']
    const options = { cwd: directory, env: deploymentEnvironment(env) }
    phase = 'install'; await record({ status: 'running' })
    await run(process.execPath, [env.npm_execpath, 'exec', '--yes', '--package=npm@11.19.1', '--', 'npm', 'ci', '--prefix', source, '--ignore-scripts', '--no-audit', '--no-fund'], options)
    await sourceHash()
    await credentials.verifyIdentity()
    if (await revisionOf(directoryRoot) !== revision || !isDeepStrictEqual(await snapshot(probeTarget, 'dev', read), before)) throw Error('Probe source or Dev baseline changed.')
    if (await read(fnUrl, { missing: true })) throw Error('Temporary Function already exists.')
    phase = 'deploy'; uncertain = true; await record({ status: 'running', config })
    await run(process.execPath, [cli, 'deploy', '--only', `functions:${config.codebase}:${config.functionName}`, ...cliArgs], options)
    await sourceHash()
    phase = 'verify-private-source'; await record({ status: 'running', config })
    const fn = await read(fnUrl), url = verifyProbeFunction(fn, config)
    const serviceUrl = 'https://run.googleapis.com/v2/' + fn.serviceConfig.service
    verifyPrivateService(await read(serviceUrl), await read(serviceUrl + ':getIamPolicy'), config)
    const archive = fn.buildConfig.sourceProvenance?.resolvedStorageSource ?? fn.buildConfig.source?.storageSource
    if (!archive || ![`gcf-v2-sources-${config.projectNumber}-${config.region}`, `gcf-v2-uploads-${config.projectNumber}-${config.region}`].includes(archive.bucket) || !/^[1-9][0-9]*$/.test(String(archive.generation)) || !archive.object) throw Error('Probe source archive identity differs.')
    const archiveUrl = `https://storage.googleapis.com/storage/v1/b/${archive.bucket}/o/${encodeURIComponent(archive.object)}?generation=${archive.generation}&alt=media`
    const archiveResponse = await fetcher(archiveUrl, { headers: { Authorization: 'Bearer ' + (await credentials.credential.getAccessToken()).access_token }, redirect: 'error', signal: AbortSignal.timeout(60000) })
    if (!archiveResponse.ok || Number(archiveResponse.headers.get('content-length') ?? 0) > ARCHIVE_LIMIT) throw Error('Probe source archive unavailable.')
    const bytes = Buffer.from(await archiveResponse.arrayBuffer())
    if (bytes.length > ARCHIVE_LIMIT) throw Error('Probe source archive too large.')
    const cloudFiles = unpack(bytes)
    if (cloudFiles.size !== files.size || [...files].some(([name, value]) => !cloudFiles.get(name)?.equals(value))) throw Error('Cloud probe source differs.')
    phase = 'identity-token'; await record({ status: 'running', config })
    // gcloud's explicit account has no default-account fallback; stdout stays in memory.
    const gcloud = join(env.LOCALAPPDATA, 'Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd')
    const tokenResult = process.platform === 'win32'
      ? await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', gcloud.replace(/\.cmd$/, '.ps1'), 'auth', 'print-identity-token', account, '--quiet'], { env: deploymentEnvironment(env) })
      : await run('gcloud', ['auth', 'print-identity-token', account, '--quiet'], { env: deploymentEnvironment(env) })
    const token = tokenResult.stdout.trim(), claims = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url'))
    if (claims.email !== account || claims.exp * 1000 < Date.now() + 240000 || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) throw Error('Selected gcloud identity differs.')
    await credentials.verifyIdentity()
    phase = 'invoke'; await record({ status: 'outcome-unknown', config })
    const result = await invokeProbeOnce({ url, token, config, fetcher })
    phase = 'cleanup'; await record({ ...result, config })
    if (!result.cleanupComplete) throw Error('Probe requires bounded manual cleanup.')
    verifyProbeFunction(await read(fnUrl), config)
    await run(process.execPath, [cli, 'functions:delete', `${config.codebase}:${config.functionName}`, '--region', config.region, '--force', ...cliArgs], options)
    if (await read(fnUrl, { missing: true })) throw Error('Temporary Function still exists.')
    if (!isDeepStrictEqual(await snapshot(probeTarget, 'dev', read), before)) throw Error('Dev baseline changed during probe.')
    uncertain = false; phase = 'complete'; await record({ ...result, functionDeleted: true })
    if (result.status !== 'pass') throw Error('Probe completed with a failed check.')
    return { ...result, functionDeleted: true, receipt: join(directory, 'result.json') }
  } catch {
    if (directory) await record({ status: 'failed', manualRecoveryRequired: uncertain, config })
    throw Error(`Manual Auth backup test stopped at ${phase}; operation=${config?.operation ?? 'not-created'}; manualRecoveryRequired=${uncertain}; private output suppressed.`)
  } finally {
    await handle.close()
    if (!uncertain) await unlink(join(temp, 'dev.lock'))
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { console.log(JSON.stringify(await runManualBackupTest(probeOptions(process.argv.slice(2))))) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
