import test from 'node:test'
import assert from 'node:assert/strict'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {createServer} from 'node:net'
import {mkdtemp,mkdir,writeFile,readFile,access,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {randomUUID} from 'node:crypto'
import {prepareTestStage,populateTestStage,cleanupTestStage} from '../scripts/lib/test-emulator-stage.mjs'
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
 const child={FIRESTORE_EMULATOR_HOST:'127.0.0.1:38080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:39099',FIREBASE_EMULATOR_HUB:'127.0.0.1:34400',GCLOUD_PROJECT:'demo-termite-warranty-test',GOOGLE_CLOUD_PROJECT:'demo-termite-warranty-test',TERMITE_TEST_RUN:'12345678-1234-1234-1234-123456789abc'}
 assert.doesNotThrow(()=>assertFocusedEnvironment(child,{child:true}))
 assert.throws(()=>assertFocusedEnvironment({...child,FIREBASE_AUTH_EMULATOR_HOST:'localhost:9099'},{child:true}))
})
test('port guard refuses an occupied local port without stopping its owner',async()=>{
 const server=createServer()
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok))
 try {await assert.rejects(()=>assertEmulatorPortsFree([server.address().port]));assert.ok(server.listening)}
 finally {await new Promise(ok=>server.close(ok))}
})
test('focused orchestration isolates generated files and preserves failures',async()=>{
 let launched=false;
 await assert.rejects(()=>runFocused('excel-dates',{root,env:{},prepare:async()=>{throw Error('preparation failure')},run:async()=>{launched=true},checkPorts:async()=>{}}));
 assert.equal(launched,false);
 const shared=await readFile(resolve(root,'firebase.json'));
 for(const mode of ['child-failure','functions-failure','no-receipt','cleanup-failure','success']) {
  let stage,cliConfig,checks=0;
  const action=()=>runFocused('excel-dates',{root,env:{},checkPorts:async()=>{if(++checks===3&&mode==='cleanup-failure')throw Error('still occupied')},
   run:async(args,{env,root:cwd})=>{
    stage=cwd;cliConfig=env.XDG_CONFIG_HOME;
    assert.equal(env.TERMITE_TEST_RUN,env.FOCUSED_TEST_NONCE);
    assert.deepEqual(JSON.parse(await readFile(resolve(cliConfig,'configstore/firebase-tools.json'),'utf8')),{usage:false});
    const config=JSON.parse(await readFile(resolve(stage,'firebase.json'),'utf8'));
    assert.equal(config.emulators.firestore.port,38080);assert.equal(config.emulators.firestore.websocketPort,39150);
    assert.equal(config.functions.source,'functions');assert.equal(config.hosting,undefined);
    assert.ok(args.includes('demo-termite-warranty-test'));assert.ok(!args.some(a=>a.includes('--import')||a.includes('--export')));
    await access(resolve(stage,'functions/domain/recovery.mjs'));
    return {code:mode==='child-failure'?1:0,stderr:mode==='functions-failure'?'Failed to load function definition':'',output:mode==='no-receipt'?'': 'FOCUSED_RESULT '+JSON.stringify({profile:'excel-dates',nonce:env.FOCUSED_TEST_NONCE,passed:1,failed:0,selectedSkipped:0,unexpected:0})};
   }});
  if(mode==='success')assert.equal((await action()).passed,1);else await assert.rejects(action);
  assert.equal(checks,3);
  if(mode==='cleanup-failure'){
   await access(stage);
   const {cleanupTestStage}=await import('../scripts/lib/test-emulator-stage.mjs');
   const nonce=JSON.parse(await readFile(resolve(stage,'owner.json'),'utf8')).nonce;
   await cleanupTestStage({stage,parent:resolve(root,'tmp/emulator-runs'),lock:resolve(root,'tmp/emulator-runs/active.lock'),nonce});
  }
  await assert.rejects(()=>access(stage));
 }
 assert.deepEqual(await readFile(resolve(root,'firebase.json')),shared);
 await assert.rejects(()=>runFocused('excel-dates',{root,env:{},checkPorts:async()=>{throw Error('occupied')},run:async()=>{launched=true}}));
 assert.equal(launched,false);
});

test('stage lock excludes a second runner and direct imports use only the owned generated Functions',async()=>{
 const nonce=randomUUID(),owned=await prepareTestStage(root,nonce);
 try {
  await assert.rejects(()=>prepareTestStage(root,randomUUID()),{code:'EEXIST'});
  await populateTestStage(owned,root);
  await assert.rejects(()=>cleanupTestStage({...owned,nonce:randomUUID()}),/ownership/);
  await writeFile(resolve(owned.stage,'functions/local-runtime.js'),'export const onlyInStage = 42;');
  const env={...process.env,TERMITE_TEST_RUN:nonce,TERMITE_TEST_STAGE:owned.stage,
   GCLOUD_PROJECT:'demo-termite-warranty-test',GOOGLE_CLOUD_PROJECT:'demo-termite-warranty-test',
   FIRESTORE_EMULATOR_HOST:'127.0.0.1:38080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:39099',FIREBASE_EMULATOR_HUB:'127.0.0.1:34400'};
  delete env.NODE_TEST_CONTEXT;
  const args=['--import','./scripts/lib/test-functions-register.mjs','--input-type=module','-e',"import {onlyInStage} from './functions/local-runtime.js'; if(onlyInStage!==42)throw Error('wrong source');"];
  assert.equal((await runNode(args,{root,env,echo:false})).code,0);
  assert.notEqual((await runNode(args,{root,env:{...env,FIRESTORE_EMULATOR_HOST:'127.0.0.1:28080'},echo:false})).code,0);
 } finally {await cleanupTestStage(owned);}
});

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
