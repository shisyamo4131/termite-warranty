import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareFunctionsDomain } from './functions-domain.mjs'
import { discoverFunctionsModules, toFunctionsRelativePath } from './functions-syntax.mjs'

await prepareFunctionsDomain()

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const functionsRoot = path.join(repositoryRoot, 'functions')
const files = await discoverFunctionsModules(functionsRoot)
if (files.length === 0) throw new Error('No Functions JavaScript modules were discovered.')

for (const file of files) {
  process.stdout.write(`Checking ${toFunctionsRelativePath(repositoryRoot, file)}\n`)
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
