import test from 'node:test'
import assert from 'node:assert/strict'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {createServer} from 'node:net'
import {mkdtemp,mkdir,writeFile,readFile,access,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {focusedProfile,focusedEventResult,assertFocusedResult,readFocusedReceipt,assertFocusedEnvironment,
  assertEmulatorPortsFree,runFocused,runNode} from '../scripts/test-rules-focused.mjs'

const root=fileURLToPath(new URL('..',import.meta.url)),profile=focusedProfile('excel-dates')
const passed={type:'test:pass',data:{name:profile.name,file:resolve(root,profile.file)}}
test('focused selection requires exact file/name and exactly one executed test',()=>{
 const summary=events=>focusedEventResult(events,profile,root)
 assert.doesNotThrow(()=>assertFocusedResult(summary([passed,{type:'test:pass',data:{name:'excluded',skip:true}}])))
 for(const events of [[],[passed,passed],[{...passed,data:{...passed.data,skip:true}}],
  [{...passed,data:{...passed.data,file:resolve(root,'other.mjs')}}],[{...passed,data:{...passed.data,name:profile.name+' suffix'}}],
  [passed,{type:'test:fail',data:{name:'before hook'}}],[passed,{type:'test:pass',data:{name:'unintended'}}]]) {
  assert.throws(()=>assertFocusedResult(summary(events)))
 }
 assert.throws(()=>focusedProfile('constructor'));assert.throws(()=>focusedProfile('../any-file'))
})
test('focused receipts reject no tests, foreign runs and duplicates',()=>{
 const receipt='FOCUSED_RESULT '+JSON.stringify({profile:'excel-dates',nonce:'run1',passed:1,failed:0,selectedSkipped:0,unexpected:0})+'\n'
 assert.equal(readFocusedReceipt(receipt,'excel-dates','run1').passed,1)
 for(const output of ['',receipt+receipt,receipt.replace('run1','run2'),receipt.replace('"passed":1','"passed":0')])assert.throws(()=>readFocusedReceipt(output,'excel-dates','run1'))
})
test('focused environments cannot attach to existing emulators or real projects',()=>{
 assert.doesNotThrow(()=>assertFocusedEnvironment({}))
 for(const env of [{FIRESTORE_EMULATOR_HOST:'127.0.0.1:28080'},{GCLOUD_PROJECT:'real-project'},{NODE_OPTIONS:'--require secret'}])assert.throws(()=>assertFocusedEnvironment(env))
 const child={FIRESTORE_EMULATOR_HOST:'127.0.0.1:28080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:29099',FIREBASE_EMULATOR_HUB:'127.0.0.1:24400'}
 assert.doesNotThrow(()=>assertFocusedEnvironment(child,{child:true}))
 assert.throws(()=>assertFocusedEnvironment({...child,FIREBASE_AUTH_EMULATOR_HOST:'localhost:9099'},{child:true}))
})
test('port guard refuses an occupied local port without stopping its owner',async()=>{
 const server=createServer()
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok))
 try {await assert.rejects(()=>assertEmulatorPortsFree([server.address().port]));assert.ok(server.listening)}
 finally {await new Promise(ok=>server.close(ok))}
})
test('focused orchestration preserves preparation/child failures and validates cleanup',async()=>{
 let calls=0,checks=0
 await assert.rejects(()=>runFocused('excel-dates',{root,env:{},checkPorts:async()=>{checks++},run:async()=>{calls++;return {code:1}}}))
 assert.equal(calls,1);assert.equal(checks,1)
 for(const mode of ['child-failure','no-receipt','cleanup-failure','success']) {
  let cliConfig
  calls=0;checks=0
  const action=()=>runFocused('excel-dates',{root,env:{},checkPorts:async()=>{if(++checks===3&&mode==='cleanup-failure')throw Error('still occupied')},
   run:async(args,{env})=>{
    if(++calls===1)return {code:0}
    cliConfig=env.XDG_CONFIG_HOME
    assert.deepEqual(JSON.parse(await readFile(resolve(cliConfig,'configstore/firebase-tools.json'),'utf8')),{usage:false})
    assert.ok(args.includes('demo-termite-warranty'));assert.ok(!args.some(a=>a.includes('--import')||a.includes('--export')))
    return {code:mode==='child-failure'?1:0,output:mode==='no-receipt'?'': 'FOCUSED_RESULT '+JSON.stringify({profile:'excel-dates',nonce:env.FOCUSED_TEST_NONCE,passed:1,failed:0,selectedSkipped:0,unexpected:0})}
   }})
  if(mode==='success')assert.equal((await action()).passed,1);else await assert.rejects(action)
  assert.equal(checks,3)
  await assert.rejects(()=>access(cliConfig))
 }
 let launched=false
 await assert.rejects(()=>runFocused('excel-dates',{root,env:{},checkPorts:async()=>{throw Error('occupied')},run:async()=>{launched=true}}))
 assert.equal(launched,false)
})

test('real Node reporter rejects zero matches, selected skip and failed tests',async()=>{
 const directory=await mkdtemp(resolve(tmpdir(),'focused-reporter-'))
 const file=resolve(directory,profile.file),reporter=pathToFileURL(resolve(root,'scripts/lib/focused-test-reporter.mjs')).href
 const childEnvironment={...process.env,FOCUSED_TEST_PROFILE:'excel-dates',FOCUSED_TEST_NONCE:'reporter-test'}
 delete childEnvironment.NODE_TEST_CONTEXT
 try {
  await mkdir(resolve(directory,'test/emulator'),{recursive:true})
  for(const mode of ['pass','zero','skip','fail']) {
   await writeFile(file,"import test from 'node:test'; test("+JSON.stringify(mode==='zero'?'another test':profile.name)+",{skip:"+(mode==='skip')+"},()=>{"+(mode==='fail'?"throw Error('intentional failure');":"")+"});")
   const result=await runNode(['--test','--test-name-pattern=^Excel CSV dates','--test-reporter='+reporter,profile.file],
    {root:directory,env:childEnvironment,echo:false})
   if(mode==='pass') {
    assert.equal(result.code,0,result.stderr);assert.equal(readFocusedReceipt(result.output,'excel-dates','reporter-test').passed,1)
   } else {
    assert.notEqual(result.code,0,mode+' must fail')
    if(mode==='fail')assert.match(result.output,/intentional failure/)
   }
  }
 } finally {
  if(!directory.startsWith(resolve(tmpdir(),'focused-reporter-')))throw Error('Fixture cleanup scope mismatch')
  await rm(directory,{recursive:true,force:true})
 }
})
