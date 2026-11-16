import { readFile, realpath, symlink, lstat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

export function assertFunctionsLock(manifestBytes, lockBytes) {
  if (!manifestBytes || !lockBytes) throw Error('Functions package and lock are required.')
  const manifest = JSON.parse(manifestBytes), lock = JSON.parse(lockBytes)
  const locked = lock.packages?.['']
  const same = (a, b) => JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort())
  if (lock.lockfileVersion !== 3 || !locked || manifest.workspaces || locked.workspaces ||
      manifest.name !== locked.name || !same(manifest.dependencies, locked.dependencies) ||
      !same(manifest.optionalDependencies, locked.optionalDependencies) || !same(manifest.engines, locked.engines)) {
    throw Error('Functions lock does not match its standalone package.')
  }
  for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
    const entry = lock.packages[`node_modules/${name}`]
    if (!entry || entry.link || entry.version !== version || !entry.resolved?.startsWith('https://registry.npmjs.org/') || !entry.integrity) {
      throw Error('Functions direct dependency must have an exact registry lock.')
    }
  }
  return lock
}

export async function readFunctionsLock(directory) {
  return assertFunctionsLock(await readFile(join(directory, 'package.json')), await readFile(join(directory, 'package-lock.json')))
}

// Isolated test sources reuse precisely the installed Functions dependency tree.
// They never link source, user data, or the root application's node_modules.
export async function linkFunctionsDependencies(source, destination) {
  const sourceRoot = await realpath(source), destinationRoot = await realpath(destination)
  for (const name of ['package.json', 'package-lock.json']) {
    if (!(await readFile(join(sourceRoot, name))).equals(await readFile(join(destinationRoot, name)))) throw Error('Functions stage dependency inputs differ.')
  }
  const lock = await readFunctionsLock(sourceRoot)
  const modules = join(sourceRoot, 'node_modules')
  if ((await lstat(modules)).isSymbolicLink() || await realpath(modules) !== modules) throw Error('Functions dependencies must be installed locally.')
  for (const name of Object.keys(lock.packages[''].dependencies)) {
    const path = await realpath(join(modules, name, 'package.json'))
    if (!path.startsWith(modules + sep)) throw Error('Functions dependency escaped its package.')
    const installed = JSON.parse(await readFile(path))
    if (installed.version !== lock.packages[`node_modules/${name}`].version) throw Error('Functions dependencies are stale; run npm ci.')
  }
  if (sourceRoot === destinationRoot || !resolve(destinationRoot).includes(`${sep}emulator-runs${sep}`)) throw Error('Only isolated test stages may link dependencies.')
  await symlink(modules, join(destinationRoot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
}
