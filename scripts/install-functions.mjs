// The Functions package is also the Cloud Build installation root.
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const npm = process.env.npm_execpath
const expected = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).packageManager
if (!npm || `npm@${spawnSync(process.execPath, [npm, '--version'], { encoding: 'utf8' }).stdout?.trim()}` !== expected) {
  throw Error(`Install the repository with ${expected}; Functions must use the same npm.`)
}
const result = spawnSync(process.execPath, [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
  cwd: fileURLToPath(new URL('../functions', import.meta.url)), stdio: 'inherit',
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
