import { copyFile, mkdir, readdir, writeFile, readFile, rm, realpath, lstat } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { prepareFunctionsDomain } from '../functions-domain.mjs'
import { TEST_RUNTIME as profile } from '../../functions/test-emulator-profile.js'

export async function prepareTestStage(root, nonce) {
  const parent = resolve(root, 'tmp/emulator-runs')
  await mkdir(parent, { recursive: true })
  if (await realpath(parent) !== parent) throw Error('Test output directory must not redirect outside the repository.')
  const stage = join(parent, nonce), lock = join(parent, 'active.lock')
  // No stale-lock removal or foreign process termination. The owner releases it.
  await writeFile(lock, JSON.stringify({ nonce, pid: process.pid }), { flag: 'wx' })
  await mkdir(stage)
  await writeFile(join(stage, 'owner.json'), JSON.stringify({ nonce }))
  return { stage, parent, lock, nonce }
}

export async function populateTestStage({ stage, nonce }, root) {
  await mkdir(join(stage, 'functions'))
  for (const item of await readdir(join(root, 'functions'), { withFileTypes: true })) {
    if (!/\.(js|mjs)$/.test(item.name) && item.name !== 'package.json') continue
    if (!item.isFile()) throw Error('Functions input must be a regular file.')
    await copyFile(join(root, 'functions', item.name), join(stage, 'functions', item.name))
  }
  await prepareFunctionsDomain({ sourceDirectory: join(root, 'src/domain'), outputDirectory: join(stage, 'functions/domain') })
  // Firebase discovery deliberately strips inherited custom variables.
  await writeFile(join(stage, 'functions/.env.local'), `TERMITE_TEST_RUN=${nonce}\n`)
  for (const name of ['firestore.rules', 'firestore.indexes.json']) await copyFile(join(root, name), join(stage, name))
  const config = { firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' },
    functions: { source: 'functions' }, emulators: { singleProjectMode: true } }
  for (const [name, port] of Object.entries({ auth: profile.authPort, firestore: profile.firestorePort,
    functions: profile.functionsPort, hub: profile.emulatorHubPort, logging: profile.emulatorLoggingPort, ui: profile.emulatorUiPort,
    eventarc: profile.eventarcPort, tasks: profile.tasksPort })) {
    config.emulators[name] = { host: profile.host, port }
  }
  config.emulators.firestore.websocketPort = profile.websocketPort
  config.emulators.ui.enabled = false
  await writeFile(join(stage, 'firebase.json'), JSON.stringify(config))
  await mkdir(join(stage, 'cli/configstore'), { recursive: true })
  await writeFile(join(stage, 'cli/configstore/firebase-tools.json'), JSON.stringify({ usage: false }))
}

export async function cleanupTestStage({ stage, parent, lock, nonce }) {
  if (dirname(stage) !== parent || await realpath(stage) !== stage || (await lstat(lock)).isSymbolicLink() ||
    JSON.parse(await readFile(lock, 'utf8')).nonce !== nonce || JSON.parse(await readFile(join(stage, 'owner.json'), 'utf8')).nonce !== nonce) {
    throw Error('Test stage cleanup ownership mismatch.')
  }
  // Both absolute paths have been checked above; never delete an inferred foreign target.
  await rm(stage, { recursive: true, force: true })
  await rm(lock)
}
