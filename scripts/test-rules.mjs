import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runEmulatorCommand,assertFocusedEnvironment,runNode} from './lib/test-emulators.mjs'
import {rulesWorkers,validateRulesInventory,readRulesReceipt,assertRulesResult} from './lib/rules-test-plan.mjs'

const root=fileURLToPath(new URL('..',import.meta.url))
export async function runRulesWorkers({run=runNode,env=process.env,directory=root,serial=false}={}) {
  const launch=async worker=>{
    const result=await run(['--import','./scripts/lib/test-functions-register.mjs','--test','--test-concurrency=1','--test-reporter=./scripts/lib/rules-test-reporter.mjs',...worker.files],
      {root:directory,env:{...env,RULES_TEST_WORKER:worker.id}})
    if(result.code!==0)throw Error(worker.id+' worker exited with code '+result.code)
    const receipt=readRulesReceipt(result.output,worker,env.FOCUSED_TEST_NONCE)
    return {worker:worker.id,exitCode:result.code,byFile:receipt.byFile,unexpected:receipt.unexpected}
  }
  let results
  if(serial) {
    results=[]
    for(const worker of rulesWorkers)results.push(await launch(worker))
  } else {
    // A failure must not let emulator shutdown race a still-running sibling.
    const settled=await Promise.allSettled(rulesWorkers.map(launch))
    const failures=settled.filter(result=>result.status==='rejected')
    if(failures.length)throw new AggregateError(failures.map(result=>result.reason),'Rules workers failed.')
    results=settled.map(result=>result.value)
  }
  return results
}
export function readRulesSummary(output,nonce) {
  const lines=output.split(/\r?\n/).filter(line=>line.startsWith('RULES_RESULT '))
  if(lines.length!==1)throw Error('Rules suite result missing or duplicated.')
  const result=JSON.parse(lines[0].slice('RULES_RESULT '.length))
  if(result.nonce!==nonce || !Array.isArray(result.workers) || result.workers.length!==rulesWorkers.length)throw Error('Rules suite identity mismatch.')
  for(const worker of rulesWorkers) {
    const found=result.workers.filter(row=>row.worker===worker.id)
    if(found.length!==1 || found[0].exitCode!==0)throw Error('Rules worker incomplete.')
    assertRulesResult(found[0],worker)
  }
  return result
}
async function main(args) {
  const child=args[0]==='--child',options=child?args.slice(1):args
  if(options.length>1 || options.length===1&&options[0]!=='--serial')throw Error('Usage: node scripts/test-rules.mjs [--serial]')
  const serial=options.length===1
  await validateRulesInventory(root)
  if(child) {
    assertFocusedEnvironment(process.env,{child:true})
    if(!/^[0-9a-f-]{36}$/.test(process.env.FOCUSED_TEST_NONCE??''))throw Error('Parent identity missing.')
    const workers=await runRulesWorkers({serial})
    console.log('RULES_RESULT '+JSON.stringify({nonce:process.env.FOCUSED_TEST_NONCE,workers}))
  } else {
    const start=performance.now()
    const result=await runEmulatorCommand('node scripts/test-rules.mjs --child'+(serial?' --serial':''))
    const summary=readRulesSummary(result.output,result.nonce)
    const passed=summary.workers.flatMap(worker=>Object.values(worker.byFile)).reduce((n,row)=>n+row.passed,0)
    console.log(JSON.stringify({rulesSuite:serial?'serial':'isolated-parallel',passed,emulatorsStopped:true,elapsedMs:Math.round(performance.now()-start)}))
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{
  console.error(error.message)
  if(error instanceof AggregateError)for(const cause of error.errors)console.error(cause.message)
  process.exitCode=1
})
