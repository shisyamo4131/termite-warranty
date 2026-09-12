import { cp, lstat, mkdir, mkdtemp, open, readdir, readFile, rename, rm } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
export const repositoryRoot = resolve(scriptDirectory, '..')
export const functionsDomainSource = resolve(repositoryRoot, 'src/domain')
export const functionsDomainOutput = resolve(repositoryRoot, 'functions/domain')

const comparePaths = (left, right) => left < right ? -1 : left > right ? 1 : 0
const displayPath = (value) => value.split(sep).join('/')
const PREPARATION_LOCK_TIMEOUT_MS = 10_000
const PREPARATION_LOCK_RETRY_MS = 50

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds))

const assertDistinctPaths = (sourceDirectory, outputDirectory) => {
  const source = resolve(sourceDirectory)
  const output = resolve(outputDirectory)
  const sourceToOutput = relative(source, output)
  const outputToSource = relative(output, source)
  const isDescendant = (relativePath) => relativePath !== ''
    && relativePath !== '..'
    && !relativePath.startsWith(`..${sep}`)
    && !isAbsolute(relativePath)
  if (sourceToOutput === '' || outputToSource === '' || isDescendant(sourceToOutput) || isDescendant(outputToSource)) {
    throw new Error('Functions domain source and output must be separate, non-nested directories.')
  }
}

export async function inventoryDirectory(rootDirectory) {
  const root = resolve(rootDirectory)
  const rootStat = await lstat(root)
  if (rootStat.isSymbolicLink()) throw new Error('Functions domain root cannot be a symbolic link.')
  if (!rootStat.isDirectory()) throw new Error('Functions domain root must be a directory.')
  const entries = new Map()
  const caseFoldedPaths = new Map()

  const visit = async (directory, prefix = '') => {
    const children = await readdir(directory, { withFileTypes: true })
    children.sort((left, right) => comparePaths(left.name, right.name))
    for (const child of children) {
      const relativePath = prefix ? `${prefix}/${child.name}` : child.name
      const foldedPath = relativePath.normalize('NFC').toLowerCase()
      const priorPath = caseFoldedPaths.get(foldedPath)
      if (priorPath && priorPath !== relativePath) {
        throw new Error(`Functions domain contains case-insensitive path collision: ${priorPath}, ${relativePath}`)
      }
      caseFoldedPaths.set(foldedPath, relativePath)

      const absolutePath = join(directory, child.name)
      if (child.isSymbolicLink()) {
        throw new Error(`Functions domain contains unsupported symbolic link: ${relativePath}`)
      }
      if (child.isDirectory()) {
        entries.set(relativePath, { type: 'directory' })
        await visit(absolutePath, relativePath)
        continue
      }
      if (child.isFile()) {
        entries.set(relativePath, { type: 'file', bytes: await readFile(absolutePath) })
        continue
      }
      throw new Error(`Functions domain contains unsupported filesystem entry: ${relativePath}`)
    }
  }

  await visit(root)
  return entries
}

export async function withFunctionsDomainStage(outputParent, operation) {
  const stageRoot = await mkdtemp(join(outputParent, '.domain-stage-'))
  try {
    return await operation(join(stageRoot, 'domain'))
  } finally {
    await rm(stageRoot, { recursive: true, force: true })
  }
}

const describeDifferences = (sourceEntries, outputEntries) => {
  const paths = [...new Set([...sourceEntries.keys(), ...outputEntries.keys()])].sort(comparePaths)
  const differences = []
  for (const path of paths) {
    const source = sourceEntries.get(path)
    const output = outputEntries.get(path)
    if (!source) differences.push(`extra: ${path}`)
    else if (!output) differences.push(`missing: ${path}`)
    else if (source.type !== output.type) differences.push(`type: ${path}`)
    else if (source.type === 'file' && !source.bytes.equals(output.bytes)) differences.push(`content: ${path}`)
  }
  return differences
}

export async function assertFunctionsDomainSynchronized({
  sourceDirectory = functionsDomainSource,
  outputDirectory = functionsDomainOutput,
} = {}) {
  assertDistinctPaths(sourceDirectory, outputDirectory)
  let sourceEntries
  let outputEntries
  try {
    sourceEntries = await inventoryDirectory(sourceDirectory)
  } catch (error) {
    throw new Error(`Cannot inventory authoritative Functions domain source: ${error.message}`, { cause: error })
  }
  try {
    outputEntries = await inventoryDirectory(outputDirectory)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('Generated Functions domain is missing. Run npm run prepare:functions.', { cause: error })
    }
    throw new Error(`Cannot inventory generated Functions domain: ${error.message}`, { cause: error })
  }

  const differences = describeDifferences(sourceEntries, outputEntries)
  if (differences.length > 0) {
    const shown = differences.slice(0, 20)
    const suffix = differences.length > shown.length ? `\n... ${differences.length - shown.length} more difference(s)` : ''
    throw new Error(`Generated Functions domain differs from src/domain:\n${shown.join('\n')}${suffix}`)
  }
  return { entryCount: sourceEntries.size }
}

export async function prepareFunctionsDomain({
  sourceDirectory = functionsDomainSource,
  outputDirectory = functionsDomainOutput,
  lockTimeoutMs = PREPARATION_LOCK_TIMEOUT_MS,
  lockRetryMs = PREPARATION_LOCK_RETRY_MS,
  onLockContention,
} = {}) {
  const source = resolve(sourceDirectory)
  const output = resolve(outputDirectory)
  assertDistinctPaths(source, output)
  await inventoryDirectory(source)

  try {
    const result = await assertFunctionsDomainSynchronized({ sourceDirectory: source, outputDirectory: output })
    return { ...result, changed: false }
  } catch {
    // Missing or stale generated content is repaired by a full staged replacement.
  }

  const outputParent = dirname(output)
  await mkdir(outputParent, { recursive: true })
  const lockPath = join(outputParent, '.domain-sync.lock')
  const deadline = Date.now() + lockTimeoutMs
  let lock
  let contentionReported = false
  while (!lock) {
    try {
      const candidate = await open(lockPath, 'wx')
      try {
        await candidate.writeFile(`${process.pid}\n`)
        lock = candidate
      } catch (error) {
        await candidate.close()
        await rm(lockPath, { force: true })
        throw error
      }
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
      if (!contentionReported) {
        contentionReported = true
        await onLockContention?.()
      }
      if (Date.now() >= deadline) {
        throw new Error('Timed out waiting for another Functions domain preparation. If no preparation is running, remove functions/.domain-sync.lock and retry.')
      }
      await wait(lockRetryMs)
    }
  }

  try {
    try {
      const result = await assertFunctionsDomainSynchronized({ sourceDirectory: source, outputDirectory: output })
      return { ...result, changed: false }
    } catch {
      // The process holding the lock owns the complete staged replacement.
    }

    return await withFunctionsDomainStage(outputParent, async (stagedOutput) => {
      await cp(source, stagedOutput, { recursive: true, force: false, errorOnExist: true })
      await assertFunctionsDomainSynchronized({ sourceDirectory: source, outputDirectory: stagedOutput })
      await rm(output, { recursive: true, force: true })
      await rename(stagedOutput, output)
      const result = await assertFunctionsDomainSynchronized({ sourceDirectory: source, outputDirectory: output })
      return { ...result, changed: true }
    })
  } finally {
    try {
      await lock.close()
    } finally {
      await rm(lockPath, { force: true })
    }
  }
}

export const repositoryRelativePath = (path) => displayPath(relative(repositoryRoot, path))
