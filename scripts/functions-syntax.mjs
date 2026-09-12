import { lstat, readdir } from 'node:fs/promises'
import path from 'node:path'

const MODULE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs'])
const EXCLUDED_DIRECTORIES = new Set(['node_modules'])

const relativePosix = (root, target) => path.relative(root, target).split(path.sep).join('/')

export async function discoverFunctionsModules(rootDirectory) {
  const root = path.resolve(rootDirectory)
  const rootStat = await lstat(root)
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error(`Functions source must be a regular directory: ${root}`)
  }

  const modules = []
  const visit = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))
    for (const entry of entries) {
      if (EXCLUDED_DIRECTORIES.has(entry.name)) continue
      const target = path.join(directory, entry.name)
      const stat = await lstat(target)
      if (stat.isSymbolicLink()) {
        throw new Error(`Symbolic links are not supported in Functions source: ${relativePosix(root, target)}`)
      }
      if (stat.isDirectory()) {
        await visit(target)
      } else if (stat.isFile()) {
        if (MODULE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) modules.push(target)
      } else {
        throw new Error(`Unsupported Functions source entry: ${relativePosix(root, target)}`)
      }
    }
  }

  await visit(root)
  return modules.sort((left, right) => relativePosix(root, left).localeCompare(relativePosix(root, right), 'en'))
}

export const toFunctionsRelativePath = (rootDirectory, target) => relativePosix(path.resolve(rootDirectory), target)
