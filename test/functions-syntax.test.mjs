import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { discoverFunctionsModules, toFunctionsRelativePath } from '../scripts/functions-syntax.mjs'

const temporaryRoots = []
afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

const createRoot = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'termite-functions-syntax-'))
  temporaryRoots.push(root)
  return root
}

test('discovers supported Functions modules recursively in stable order and excludes dependencies', async () => {
  const root = await createRoot()
  await mkdir(path.join(root, 'nested'), { recursive: true })
  await mkdir(path.join(root, 'node_modules', 'ignored'), { recursive: true })
  await writeFile(path.join(root, 'z.js'), '')
  await writeFile(path.join(root, 'nested', 'a.mjs'), '')
  await writeFile(path.join(root, 'nested', 'b.cjs'), '')
  await writeFile(path.join(root, 'nested', 'notes.txt'), '')
  await writeFile(path.join(root, 'node_modules', 'ignored', 'dependency.js'), '')

  const modules = await discoverFunctionsModules(root)
  assert.deepEqual(modules.map(file => toFunctionsRelativePath(root, file)), [
    'nested/a.mjs',
    'nested/b.cjs',
    'z.js',
  ])
})

test('repository discovery includes every maintained Functions service module', async () => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const functionsRoot = path.join(repositoryRoot, 'functions')
  const modules = await discoverFunctionsModules(functionsRoot)
  const relative = new Set(modules.map(file => toFunctionsRelativePath(functionsRoot, file)))
  for (const expected of [
    'index.js',
    'register-case.js',
    'master-management.js',
    'applied-warranty-management.js',
    'local-runtime.js',
  ]) {
    assert.equal(relative.has(expected), true, `${expected} must be syntax checked`)
  }
})

test('rejects a symbolic link instead of following it', async (context) => {
  const root = await createRoot()
  const target = path.join(root, 'target.js')
  const link = path.join(root, 'linked.js')
  await writeFile(target, '')
  try {
    await symlink(target, link, 'file')
  } catch (error) {
    if (error?.code === 'EPERM') return context.skip('Host does not permit the symlink fixture.')
    throw error
  }
  await assert.rejects(discoverFunctionsModules(root), /Symbolic links are not supported/)
})
