import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {mkdir,writeFile,access} from 'node:fs/promises'
import {runEmulatorCommand,assertFocusedEnvironment,runNode,assertEmulatorPortsFree} from './lib/test-emulators.mjs'
import {rulesWorkers,rulesShards,validateRulesInventory,readRulesReceipt,assertRulesResult} from './lib/rules-test-plan.mjs'
import {aggregateRulesReceipts} from './lib/rules-test-receipts.mjs'

const root=fileURLToPath(new URL('..',import.meta.url))
export async function runRulesWorkers({run=runNode,env=process.env,directory=root,serial=false,plan=rulesWorkers}={}) {
  const launch=async worker=>{
    const result=await run(['--import','./scripts/lib/test-functions-register.mjs','--test','--test-concurrency=1','--test-reporter=./scripts/lib/rules-test-reporter.mjs',...worker.files],
      {root:directory,env:{...env,RULES_TEST_WORKER:worker.id}})
    if(result.code!==0)throw Error(worker.id+' worker exited with code '+result.code)
    const receipt=readRulesReceipt(result.output,worker,env.FOCUSED_TEST_NONCE)
    return {worker:worker.id,exitCode:result.code,byFile:receipt.byFile,unexpected:receipt.unexpected,cases:receipt.cases}
  }
  let results
  if(serial) {
    results=[]
    for(const worker of plan)results.push(await launch(worker))
  } else {
    // A failure must not let emulator shutdown race a still-running sibling.
    const settled=await Promise.allSettled(plan.map(launch))
    const failures=settled.filter(result=>result.status==='rejected')
    if(failures.length)throw new AggregateError(failures.map(result=>result.reason),'Rules workers failed.')
    results=settled.map(result=>result.value)
  }
  return results
}
export function readRulesSummary(output,nonce,plan=rulesWorkers) {
  const lines=output.split(/\r?\n/).filter(line=>line.startsWith('RULES_RESULT '))
  if(lines.length!==1)throw Error('Rules suite result missing or duplicated.')
  const result=JSON.parse(lines[0].slice('RULES_RESULT '.length))
  if(result.nonce!==nonce || !Array.isArray(result.workers) || result.workers.length!==plan.length)throw Error('Rules suite identity mismatch.')
  for(const worker of plan) {
    const found=result.workers.filter(row=>row.worker===worker.id)
    if(found.length!==1 || found[0].exitCode!==0)throw Error('Rules worker incomplete.')
    assertRulesResult(found[0],worker)
  }
  return result
}
async function main(args) {
  if(JSON.stringify(args)===JSON.stringify(['--child','--failure-probe'])){
    assertFocusedEnvironment(process.env,{child:true})
    throw Error('INTENTIONAL_RULES_FAILURE_PROBE')
  }
  if(JSON.stringify(args)===JSON.stringify(['--failure-probe'])){
    let observed=false,rejected=false
    try{
      await runEmulatorCommand('node scripts/test-rules.mjs --child --failure-probe',{run:async(args,options)=>{
        const result=await runNode(args,options)
        observed=result.code!==0 && (result.output+'\n'+result.stderr).includes('INTENTIONAL_RULES_FAILURE_PROBE')
        return result
      }})
    }catch(error){
      if(!observed||error.message!=='Focused emulator command failed; completion evidence unavailable.')throw error
      rejected=true
    }
    if(!rejected)throw Error('Intentional failure was not detected.')
    await assertEmulatorPortsFree()
    try{await access(resolve(root,'tmp/emulator-runs/active.lock'));throw Error('Failure probe lock remains.')}
    catch(error){if(error.code!=='ENOENT')throw error}
    console.log(JSON.stringify({intentionalFailureDetected:true,emulatorsStopped:true,lockRemoved:true}))
    return
  }
  if(args.length===0 && process.env.RULES_TEST_RECEIPTS){
    console.log(JSON.stringify(await aggregateRulesReceipts(process.env.RULES_TEST_RECEIPTS,process.env)))
    return
  }
  const child=args[0]==='--child',options=child?args.slice(1):args
  const shard=options.length===2&&options[0]==='--shard'&&rulesShards.find(row=>row.id===options[1])
  if(!shard && (options.length>1 || options.length===1&&!['--serial','--baseline'].includes(options[0])))throw Error('Unknown rules runner mode.')
  const serial=options[0]==='--serial',plan=shard?[shard]:rulesWorkers
  await validateRulesInventory(root)
  if(child) {
    assertFocusedEnvironment(process.env,{child:true})
    if(!/^[0-9a-f-]{36}$/.test(process.env.FOCUSED_TEST_NONCE??''))throw Error('Parent identity missing.')
    const workers=await runRulesWorkers({serial,plan})
    console.log('RULES_RESULT '+JSON.stringify({nonce:process.env.FOCUSED_TEST_NONCE,workers}))
  } else {
    const start=performance.now()
    const result=await runEmulatorCommand('node scripts/test-rules.mjs --child'+(shard?' --shard '+shard.id:serial?' --serial':''))
    const summary=readRulesSummary(result.output,result.nonce,plan)
    const passed=summary.workers.flatMap(worker=>Object.values(worker.byFile)).reduce((n,row)=>n+row.passed,0)
    const receipt={...summary,id:shard?.id??'baseline',revision:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,
      runner:process.env.RUNNER_NAME,exitCode:0,passed,emulatorsStopped:true,elapsedMs:Math.round(performance.now()-start)}
    if(shard||options[0]==='--baseline'){
      await mkdir(resolve(root,'tmp/rules-receipts'),{recursive:true})
      await writeFile(resolve(root,'tmp/rules-receipts',receipt.id+'.json'),JSON.stringify(receipt))
    }
    console.log(JSON.stringify({rulesSuite:receipt.id,passed,emulatorsStopped:true,elapsedMs:receipt.elapsedMs}))
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{
  console.error(error.message)
  if(error instanceof AggregateError)for(const cause of error.errors)console.error(cause.message)
  process.exitCode=1
})
