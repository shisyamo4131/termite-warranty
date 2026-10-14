import {readFile,readdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {rulesShards,rulesWorkers,assertRulesResult,validateRulesInventory} from './rules-test-plan.mjs'

export function validateRulesReceipts(receipts,env,{baseline=false}={}) {
  if(!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'') || !/^\d+$/.test(env.GITHUB_RUN_ID??'') || !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT??''))throw Error('CI receipt identity required.')
  const plans=baseline?[{id:'baseline',workers:rulesWorkers}]:rulesShards.map(worker=>({id:worker.id,workers:[worker]}))
  if(receipts.length!==plans.length)throw Error('Missing or extra shard receipts.')
  const cases=[],nonces=new Set()
  for(const plan of plans){
    const found=receipts.filter(row=>row.id===plan.id)
    if(found.length!==1)throw Error('Duplicate or missing shard.')
    const row=found[0]
    if(row.revision!==env.GITHUB_SHA||row.runId!==env.GITHUB_RUN_ID||row.attempt!==env.GITHUB_RUN_ATTEMPT||
      row.exitCode!==0||row.emulatorsStopped!==true||!Number.isSafeInteger(row.elapsedMs)||row.elapsedMs<=0||
      !/^[a-f0-9-]{36}$/.test(row.nonce??'')||nonces.has(row.nonce)||!row.runner||row.workers?.length!==plan.workers.length)throw Error('Invalid shard identity, execution or cleanup evidence.')
    nonces.add(row.nonce)
    let passed=0
    for(const worker of plan.workers){
      const results=row.workers.filter(result=>result.worker===worker.id)
      if(results.length!==1||results[0].exitCode!==0)throw Error('Missing successful worker.')
      const result=results[0];assertRulesResult(result,worker)
      const count=Object.values(result.byFile).reduce((n,item)=>n+item.passed,0)
      if(!Array.isArray(result.cases)||result.cases.length!==count)throw Error('Test identities missing.')
      for(const file of worker.files){
        if(result.cases.filter(value=>JSON.parse(value)[0]===file).length!==result.byFile[file].passed)throw Error('Test identity count mismatch.')
      }
      cases.push(...result.cases);passed+=count
    }
    if(row.passed!==passed)throw Error('Passed count mismatch.')
  }
  if(new Set(cases).size!==cases.length)throw Error('Duplicate test identity.')
  return {passed:cases.length,cases:cases.sort(),emulatorsStopped:true,elapsedMs:Math.max(...receipts.map(row=>row.elapsedMs))}
}

export async function aggregateRulesReceipts(directory,env,{compare=false}={}) {
  await validateRulesInventory(process.cwd())
  const files=await readdir(directory)
  const expected=[...rulesShards.map(row=>row.id+'.json'),...(compare?['baseline.json']:[])].sort()
  if(JSON.stringify(files.sort())!==JSON.stringify(expected))throw Error('Receipt directory inventory mismatch.')
  const receipts=await Promise.all(files.map(file=>readFile(resolve(directory,file),'utf8').then(JSON.parse)))
  const result=validateRulesReceipts(receipts.filter(row=>row.id!=='baseline'),env)
  if(compare){
    const old=validateRulesReceipts(receipts.filter(row=>row.id==='baseline'),env,{baseline:true})
    if(JSON.stringify(old.cases)!==JSON.stringify(result.cases))throw Error('Baseline and shards differ in test identity.')
    return {passed:result.passed,identical:true,emulatorsStopped:true,baselineMs:old.elapsedMs,parallelMs:result.elapsedMs,
      shardMs:Object.fromEntries(receipts.filter(row=>row.id!=='baseline').map(row=>[row.id,row.elapsedMs]))}
  }
  return {passed:result.passed,emulatorsStopped:true,shards:rulesShards.length}
}
