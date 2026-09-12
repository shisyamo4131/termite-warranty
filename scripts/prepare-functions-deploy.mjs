import { functionsDomainOutput, prepareFunctionsDomain, repositoryRelativePath } from './functions-domain.mjs'

try {
  const result = await prepareFunctionsDomain()
  console.log(`${repositoryRelativePath(functionsDomainOutput)} is synchronized (${result.entryCount} entries, ${result.changed ? 'replaced' : 'unchanged'}).`)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Functions domain preparation failed.')
  process.exitCode = 1
}
