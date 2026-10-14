import {withoutDocumentationRouting} from '../scripts/lib/documentation-workflow.mjs'
import {withoutParallelVerification} from '../scripts/lib/verification-parallel-workflow.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {rulesWorkers,assertRulesInventory,validateRulesInventory,rulesEventResult,assertRulesResult,readRulesReceipt} from '../scripts/lib/rules-test-plan.mjs'
import {runRulesWorkers,readRulesSummary} from '../scripts/test-rules.mjs'
import {runNode} from '../scripts/lib/test-emulators.mjs'
import {isolatedImportDatabase,isolatedImportAuth} from './helpers/isolated-import.mjs'
import {rulesShards} from '../scripts/lib/rules-test-plan.mjs'
import {validateRulesReceipts} from '../scripts/lib/rules-test-receipts.mjs'
import {validateRulesProducer,validateRulesHandoff,developmentVerifyCondition} from '../scripts/lib/rules-test-workflow.mjs'
import {readFile} from 'node:fs/promises'
import {parse} from 'yaml'
import {spawnSync} from 'node:child_process'

const root=fileURLToPath(new URL('..',import.meta.url)),worker=rulesWorkers[1],nonce='unit-run'
const passed=worker=>({byFile:Object.fromEntries(worker.files.map(file=>[file,{passed:1,failed:0,skipped:0}])),unexpected:0})
const receipt=worker=>'RULES_WORKER_RESULT '+JSON.stringify({worker:worker.id,nonce,...passed(worker)})+'\n'

test('every rules/emulator file belongs to exactly one reviewed worker',async()=>{
  await validateRulesInventory(root)
  const files=rulesWorkers.flatMap(row=>row.files)
  assert.doesNotThrow(()=>assertRulesInventory(files))
  for(const changed of [files.slice(1),[...files,'test/emulator/unregistered.test.mjs'],[...files.slice(1),files[1]]])assert.throws(()=>assertRulesInventory(changed))
  assert.throws(()=>assertRulesInventory(files,[...rulesWorkers,rulesWorkers[0]]))
  assertRulesInventory(files,rulesShards)
})

test('shard receipts fail closed on wrong run, missing tests, failure and incomplete cleanup',()=>{
  const env={GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1'}
  const rows=rulesShards.map((worker,index)=>({id:worker.id,revision:env.GITHUB_SHA,runId:'123',attempt:'1',runner:'vm-'+index,
    nonce:'00000000-0000-0000-0000-00000000000'+index,exitCode:0,emulatorsStopped:true,elapsedMs:100,passed:worker.files.length,
    workers:[{worker:worker.id,exitCode:0,...passed(worker),cases:worker.files.map(file=>JSON.stringify([file,1,1,'leaf']))}]}))
  assert.equal(validateRulesReceipts(rows,env).passed,rulesWorkers.flatMap(row=>row.files).length)
  for(const mutate of [copy=>copy.pop(),copy=>copy.push(copy[0]),copy=>copy[0].runId='999',copy=>copy[0].attempt='2',
    copy=>copy[0].revision='b'.repeat(40),copy=>copy[0].exitCode=1,copy=>copy[0].emulatorsStopped=false,
    copy=>copy[1].nonce=copy[0].nonce,copy=>copy[0].workers[0].cases.pop(),copy=>copy[0].workers[0].exitCode=1,
    copy=>copy[0].workers[0].byFile[rulesShards[0].files[0]].skipped=1,
    copy=>copy[0].workers[0].byFile[rulesShards[0].files[0]].failed=1]){
    const copy=structuredClone(rows);mutate(copy);assert.throws(()=>validateRulesReceipts(copy,env))
  }
})

test('CI shards preserve isolation, fail-fast off and required artifact dependencies',async()=>{
  const producer=await readFile(new URL('../.github/workflows/verify-rules.yml',import.meta.url),'utf8')
  assert.equal(validateRulesProducer(producer),true)
  for(const [from,to] of [['fail-fast: false','fail-fast: true'],['windows-latest','ubuntu-latest'],['shard-default-recovery, ',''],
    ['if-no-files-found: error','if-no-files-found: warn'],['node scripts/test-rules.mjs --shard','echo ignored --shard']]){
    assert.notEqual(producer.replace(from,to),producer);assert.throws(()=>validateRulesProducer(producer.replace(from,to)))
  }
  const workflow=withoutDocumentationRouting(withoutParallelVerification(parse(await readFile(new URL('../.github/workflows/deploy-development.yml',import.meta.url),'utf8'))),'development')
  validateRulesHandoff(workflow,developmentVerifyCondition)
  for(const result of ['success','failure','cancelled','skipped']){
    const command=workflow.jobs.verify.steps[0].run.replaceAll('${{ needs.rules.result }}',result).replaceAll('${{ needs.source.outputs.reuse }}','false').replaceAll('${{ needs.source.result }}','skipped')
    const processResult=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true})
    assert.ifError(processResult.error)
    assert.equal(processResult.status===0,result==='success','Required PR check: '+result)
  }
  for(const result of ['success','failure','cancelled','skipped']){
    const command=workflow.jobs.verify.steps[0].run.replaceAll('${{ needs.rules.result }}','skipped').replaceAll('${{ needs.source.outputs.reuse }}','true').replaceAll('${{ needs.source.result }}',result)
    const execution=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true})
    assert.ifError(execution.error);assert.equal(execution.status===0,result==='success','Accepted Dev admission: '+result)
  }
  for(const mutate of [copy=>delete copy.jobs.verify.needs,copy=>copy.jobs.verify.steps.shift(),copy=>copy.jobs.verify.if=developmentVerifyCondition,copy=>copy.jobs.rules.if='false',copy=>copy.jobs.rules.secrets='inherit',
    copy=>copy.jobs.verify.steps.find(row=>row.run==='npm run test:rules').env={},
    copy=>copy.jobs.verify.steps.find(row=>row.uses==='actions/download-artifact@v8').with.pattern='foreign-*']){
    const copy=structuredClone(workflow);mutate(copy);assert.throws(()=>validateRulesHandoff(copy,developmentVerifyCondition))
  }
})

test('isolated imports reject default/foreign DBs and every Auth access',()=>{
  const app={options:{projectId:'demo-termite-warranty-test'}},called=[]
  const get=(...args)=>{called.push(args);return 'named-db'}
  for(const id of ['test-external-keys','test-import-volume'])assert.equal(isolatedImportDatabase(get,app,id),'named-db')
  for(const id of [undefined,'(default)','test-sync-control','other'])assert.throws(()=>isolatedImportDatabase(get,app,id))
  assert.throws(()=>isolatedImportDatabase(get,{options:{projectId:'other'}},'test-import-volume'))
  assert.equal(called.length,2)
  for(const method of ['createUser','getUser','listUsers','deleteUser'])assert.throws(()=>isolatedImportAuth[method])
})

test('rules results reject missing, skipped, failed and foreign tests',()=>{
  const event={type:'test:pass',data:{file:resolve(root,worker.files[0]),name:'real test',details:{type:'test'}}}
  assertRulesResult(rulesEventResult([event],worker,root),worker)
  for(const events of [[],[{...event,data:{...event.data,skip:true}}],[{...event,type:'test:fail'}],
    [{...event,data:{...event.data,name:worker.files[0]}}],[{...event,data:{...event.data,file:resolve(root,'unexpected.mjs')}}]]){
    assert.throws(()=>assertRulesResult(rulesEventResult(events,worker,root),worker))
  }
  assert.equal(readRulesReceipt(receipt(worker),worker,nonce).byFile[worker.files[0]].passed,1)
  for(const output of ['',receipt(worker)+receipt(worker),receipt(worker).replace(nonce,'foreign')])assert.throws(()=>readRulesReceipt(output,worker,nonce))
})

test('parallel workers wait for every started process even when one fails',async()=>{
  let release,done=false,settled=false,calls=0
  const delayed=new Promise(resolve=>{release=resolve})
  const action=runRulesWorkers({env:{FOCUSED_TEST_NONCE:nonce},run:async(args,{env})=>{
    calls++
    if(env.RULES_TEST_WORKER==='shared')return {code:1,output:''}
    await delayed;done=true;return {code:0,output:receipt(worker)}
  }})
  const checked=assert.rejects(action,/workers failed/)
  action.catch(()=>{settled=true})
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(calls,2);assert.equal(settled,false)
  release();await checked;assert.equal(done,true)
})

test('worker aggregation requires exit zero plus matching complete results in both modes',async()=>{
  for(const serial of [false,true]){
    const workers=await runRulesWorkers({serial,env:{FOCUSED_TEST_NONCE:nonce},run:async(args,{env})=>{
      assert.ok(args.includes('--test-concurrency=1'));assert.ok(!args.some(arg=>arg.startsWith('--test-name-pattern')))
      const selected=rulesWorkers.find(row=>row.id===env.RULES_TEST_WORKER)
      return {code:0,output:receipt(selected)}
    }})
    const line='RULES_RESULT '+JSON.stringify({nonce,workers})
    assert.equal(readRulesSummary(line,nonce).workers.length,2)
    for(const invalid of [line+ '\n'+line,JSON.stringify({nonce,workers}),line.replace('unit-run','foreign'),
      'RULES_RESULT '+JSON.stringify({nonce,workers:[workers[0],workers[0]]}),
      'RULES_RESULT '+JSON.stringify({nonce,workers:[{...workers[0],exitCode:1},workers[1]]})])assert.throws(()=>readRulesSummary(invalid,nonce))
  }
  await assert.rejects(runRulesWorkers({env:{FOCUSED_TEST_NONCE:nonce},run:async()=>({code:0,output:''})}))
})

test('actual rules reporter exposes failures and rejects empty/skipped files',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'rules-reporter-'))
  const file=resolve(directory,worker.files[0]),reporter=pathToFileURL(resolve(root,'scripts/lib/rules-test-reporter.mjs')).href
  const env={...process.env,RULES_TEST_WORKER:worker.id,FOCUSED_TEST_NONCE:nonce};delete env.NODE_TEST_CONTEXT
  try {
    await mkdir(resolve(directory,'test/emulator'),{recursive:true})
    for(const mode of ['pass','suite','empty','skip','fail']){
      const body=mode==='empty'?'':mode==='suite'?"describe('suite',()=>{test('leaf',()=>{});});":
        "test('leaf',{skip:"+(mode==='skip')+"},()=>{"+(mode==='fail'?"throw Error('injected rules failure')":"")+"});"
      await writeFile(file,"import {test,describe} from 'node:test';"+body)
      const result=await runNode(['--test','--test-reporter='+reporter,worker.files[0]],{root:directory,env,echo:false})
      if(['pass','suite'].includes(mode)){
        assert.equal(result.code,0,result.stderr);assert.equal(readRulesReceipt(result.output,worker,nonce).byFile[worker.files[0]].passed,1)
      }else{
        assert.notEqual(result.code,0,mode)
        if(mode==='fail')assert.match(result.output,/injected rules failure/)
      }
    }
  }finally{
    if(!directory.startsWith(resolve(tmpdir(),'rules-reporter-')))throw Error('Fixture cleanup scope mismatch')
    await rm(directory,{recursive:true,force:true})
  }
})
