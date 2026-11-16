import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { assertFunctionsLock, readFunctionsLock, linkFunctionsDependencies } from '../scripts/lib/functions-dependencies.mjs'
import { collectFunctionsSource } from '../scripts/lib/default-recovery-release-proof.mjs'
import * as sdkLoader from '../scripts/lib/functions-sdk-loader.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = { name: 'fixture', dependencies: { 'fictional-sdk': '1.0.0' }, engines: { node: '22' } }
const locked = { lockfileVersion: 3, packages: { '': manifest,
  'node_modules/fictional-sdk': { version: '1.0.0', resolved: 'https://registry.npmjs.org/fictional-sdk/-/fictional-sdk-1.0.0.tgz', integrity: 'sha512-fixture' } } }
const bytes = value => Buffer.from(JSON.stringify(value))

test('Functions requires a standalone matching lock and exact direct dependencies', () => {
  assertFunctionsLock(bytes(manifest), bytes(locked))
  for (const change of [value => delete value.packages[''], value => value.lockfileVersion = 2,
    value => value.packages[''].dependencies = {}, value => value.packages[''].workspaces = ['nested'],
    value => value.packages['node_modules/fictional-sdk'].version = '2.0.0',
    value => value.packages['node_modules/fictional-sdk'].link = true]) {
    const value = structuredClone(locked); change(value)
    assert.throws(() => assertFunctionsLock(bytes(manifest), bytes(value)))
  }
  assert.throws(() => assertFunctionsLock(bytes(manifest)))
})

test('Functions source contains its lock, excludes installed dependencies and refuses missing lock', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'functions-lock-source-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(join(directory, 'node_modules'), { recursive: true })
  await writeFile(join(directory, 'node_modules', 'do-not-ship'), 'dependency')
  await writeFile(join(directory, 'package.json'), bytes(manifest))
  await writeFile(join(directory, 'index.js'), 'export const fixture=1')
  await assert.rejects(collectFunctionsSource(directory))
  await writeFile(join(directory, 'package-lock.json'), bytes(locked))
  const files = await collectFunctionsSource(directory)
  assert.deepEqual([...files.keys()].sort(), ['index.js', 'package-lock.json', 'package.json'])
  assert.deepEqual(files.get('package-lock.json'), bytes(locked))
})

test('isolated stage refuses different dependency inputs before linking', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'functions-lock-stage-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await writeFile(join(directory, 'package.json'), bytes({ ...manifest, name: 'different' }))
  await writeFile(join(directory, 'package-lock.json'), bytes(locked))
  await assert.rejects(linkFunctionsDependencies(join(root, 'functions'), directory), /inputs differ/)
})

test('test SDK resolution matches native Functions ESM exports and Admin registry', () => {
  const specifiers = ['firebase-admin/app', 'firebase-admin/firestore', 'firebase-functions/params', 'firebase-functions/v2/https']
  const native = spawnSync(process.execPath, ['--input-type=module', '-e',
    `console.log(JSON.stringify(${JSON.stringify(specifiers)}.map(name=>import.meta.resolve(name))))`],
    { cwd: join(root, 'functions'), encoding: 'utf8' })
  assert.equal(native.status, 0, native.stderr)
  const nativeUrls = JSON.parse(native.stdout)
  const script = `
    import assert from 'node:assert/strict';
    import {initializeApp,getApps,deleteApp} from 'firebase-admin/app';
    import {Timestamp,FieldValue} from 'firebase-admin/firestore';
    import {defineString} from 'firebase-functions/params';
    import {HttpsError,onCall} from 'firebase-functions/v2/https';
    const urls=${JSON.stringify(nativeUrls)};
    assert.deepEqual(${JSON.stringify(specifiers)}.map(name=>import.meta.resolve(name)),urls);
    const [actualApp,actualStore,actualParams,actualHttps]=await Promise.all(urls.map(url=>import(url)));
    assert.equal(defineString,actualParams.defineString);assert.equal(HttpsError,actualHttps.HttpsError);assert.equal(onCall,actualHttps.onCall);
    assert.equal(Timestamp,actualStore.Timestamp);assert.equal(FieldValue,actualStore.FieldValue);
    const app=initializeApp({projectId:'demo-termite-warranty-test'},'identity-only');
    assert.equal(actualApp.getApps().find(a=>a.name===app.name),app);await deleteApp(app);
    assert.equal(getApps().length,actualApp.getApps().length);
  `
  const result = spawnSync(process.execPath, ['--import', './scripts/lib/functions-sdk-register.mjs', '--input-type=module', '-e', script], { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
})

test('missing Functions installation cannot silently use the root SDK', async () => {
  sdkLoader.initialize({ packageUrl: new URL('../tmp/uninstalled-functions/package.json', import.meta.url).href })
  await assert.rejects(sdkLoader.resolve('firebase-admin/app', { conditions: ['node', 'import'] }, async (specifier, context) => {
    assert.equal(specifier, 'firebase-admin/app')
    assert.deepEqual(context.conditions, ['node', 'import'])
    assert.equal(context.parentURL, new URL('../tmp/uninstalled-functions/package.json', import.meta.url).href)
    return { url: new URL('../node_modules/firebase-admin/lib/esm/app/index.js', import.meta.url).href }
  }), /refusing root dependency fallback/)
})

test('repository Functions lock is independently installed and has no workspace dependency', async () => {
  const directory = join(root, 'functions'), lock = await readFunctionsLock(directory)
  const requireFunctions = createRequire(join(directory, 'package.json'))
  for (const name of Object.keys(lock.packages[''].dependencies)) {
    assert.ok(requireFunctions.resolve(name).startsWith(resolve(directory, 'node_modules')))
    const packagePath = join(directory, 'node_modules', name, 'package.json')
    assert.equal(JSON.parse(await readFile(packagePath)).version, lock.packages[`node_modules/${name}`].version)
  }
  assert.equal(JSON.parse(await readFile(join(root, 'package.json'))).workspaces, undefined)
})
