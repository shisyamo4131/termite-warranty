import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertFunctionsDomainSynchronized, functionsDomainOutput, repositoryRelativePath } from './functions-domain.mjs'

export async function main(options = {}) {
  try {
    const result = await assertFunctionsDomainSynchronized(options)
    const displayOutput = options.outputDirectory ? 'generated Functions domain' : repositoryRelativePath(functionsDomainOutput)
    console.log(`${displayOutput} matches src/domain (${result.entryCount} entries).`)
    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Functions domain comparison failed.')
    process.exitCode = 1
    return 1
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main()
}
