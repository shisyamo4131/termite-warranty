import { register } from 'node:module'
import { readFile, realpath } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isIsolatedTestEnvironment } from '../../functions/test-emulator-profile.js'
const root = fileURLToPath(new URL('../..', import.meta.url))
const stage = await realpath(process.env.TERMITE_TEST_STAGE ?? '')
const runs = await realpath(resolve(root, 'tmp/emulator-runs'))
if (!isIsolatedTestEnvironment() || dirname(stage) !== runs ||
  JSON.parse(await readFile(resolve(stage, 'owner.json'), 'utf8')).nonce !== process.env.TERMITE_TEST_RUN) throw Error('Unowned test Functions stage.')
register('./test-functions-loader.mjs', import.meta.url, { data: {
  source: pathToFileURL(resolve(root, 'functions') + sep).href,
  target: pathToFileURL(resolve(stage, 'functions') + sep).href,
} })
