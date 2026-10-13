import { inspectHistoricalIntakePackage } from './lib/historical-intake-package.mjs'

// Do not print raw inputs, filenames, IDs, decisions, or exception messages.
const args = process.argv.slice(2)
if (args.length !== 2 || args[0] !== '--manifest' || !args[1]) {
  console.error(JSON.stringify({ error: 'USAGE', usage: 'node scripts/check-historical-intake.mjs --manifest <private-json>' }))
  process.exitCode = 1
} else {
  try {
    const result = await inspectHistoricalIntakePackage(args[1])
    console.log(JSON.stringify(result))
    process.exitCode = result.packageConsistent ? result.pendingQuestions.length ? 2 : 0 : 1
  } catch {
    console.error(JSON.stringify({ error: 'PACKAGE_CHECK_FAILED' }))
    process.exitCode = 1
  }
}
