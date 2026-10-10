import {readFile,writeFile,stat} from 'node:fs/promises'
import {prepareHistoricalIntake} from './lib/historical-intake-plan.mjs'
const args=process.argv.slice(2)
if(args.length!==6||args[0]!=='--input'||args[2]!=='--date'||args[4]!=='--output') {
  console.error('Usage: node scripts/prepare-historical-intake.mjs --input <private-json> --date YYYY-MM-DD --output <private-plan>');process.exitCode=1
}else try {
  if((await stat(args[1])).size>32*1024*1024)throw Error('INPUT_SIZE')
  const plan=prepareHistoricalIntake(JSON.parse(await readFile(args[1],'utf8')),{today:args[3]})
  await writeFile(args[5],JSON.stringify(plan,null,2),{flag:'wx'})
  console.log(JSON.stringify({...plan.summary,planDigest:plan.planDigest,cloudWrites:false}))
  process.exitCode=plan.summary.errors.length?2:0
} catch {console.error('PREPARATION_FAILED: check private input; no record values logged');process.exitCode=1}
