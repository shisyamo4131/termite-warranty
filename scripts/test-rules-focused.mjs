// Iteration aid only. The complete test:rules gate remains mandatory when selected.
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runEmulatorCommand,assertFocusedEnvironment,runNode} from './lib/test-emulators.mjs'
export {DEMO_PROJECT,assertFocusedEnvironment,assertEmulatorPortsFree,runNode} from './lib/test-emulators.mjs'

const profiles=Object.freeze({
  'excel-dates': Object.freeze({
    file:'test/emulator/property-warranty.test.mjs',
    name:'Excel CSV dates preview and persist as ISO while source dates and atomic rejection stay intact',
  }),
})
export function focusedProfile(id) {
  if(!Object.hasOwn(profiles,id))throw Error('Unknown focused test profile.')
  return profiles[id]
}
export function focusedEventResult(events,profile,root) {
  const result={passed:0,failed:0,selectedSkipped:0,unexpected:0}
  const expected=resolve(root,profile.file).toLowerCase()
  for(const {type,data} of events) {
    if(!['test:pass','test:fail'].includes(type))continue
    const selected=data.name===profile.name&&typeof data.file==='string'&&resolve(data.file).toLowerCase()===expected
    if(type==='test:fail'){result.failed++;continue}
    if(selected) {if(data.skip||data.todo)result.selectedSkipped++;else result.passed++}
    else if(!data.skip)result.unexpected++
  }
  return result
}
export function assertFocusedResult(result) {
  if(!result||result.passed!==1||result.failed!==0||result.selectedSkipped!==0||result.unexpected!==0)throw Error('Focused test did not execute exactly one passing selected test.')
}
export function readFocusedReceipt(output,id,nonce) {
  const lines=output.split(/\r?\n/).filter(line=>line.startsWith('FOCUSED_RESULT '))
  if(lines.length!==1)throw Error('Missing or duplicate focused test receipt.')
  const result=JSON.parse(lines[0].slice('FOCUSED_RESULT '.length))
  if(result.profile!==id||result.nonce!==nonce)throw Error('Focused test receipt mismatch.')
  assertFocusedResult(result)
  return result
}

export async function runFocused(id,options={}) {
  focusedProfile(id)
  const {output,nonce}=await runEmulatorCommand(`node scripts/test-rules-focused.mjs --child ${id}`,options)
  return readFocusedReceipt(output,id,nonce)
}

async function main(args) {
  if(args.length===1) {
    const result=await runFocused(args[0])
    console.log(JSON.stringify({focusedTest:args[0],passed:result.passed,emulatorsStopped:true,completionGate:false}))
    return
  }
  if(args.length!==2||args[0]!=='--child')throw Error('Usage: node scripts/test-rules-focused.mjs excel-dates')
  const id=args[1],profile=focusedProfile(id),root=fileURLToPath(new URL('..',import.meta.url))
  assertFocusedEnvironment(process.env,{child:true})
  if(!/^[0-9a-f-]{36}$/.test(process.env.FOCUSED_TEST_NONCE??''))throw Error('Parent run identity missing.')
  const pattern='^'+profile.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'
  const result=await runNode(['--test','--test-concurrency=1','--test-name-pattern='+pattern,
    '--test-reporter=./scripts/lib/focused-test-reporter.mjs',profile.file],{root,env:{...process.env,FOCUSED_TEST_PROFILE:id}})
  if(result.code!==0)throw Error('Focused child test failed.')
  readFocusedReceipt(result.output,id,process.env.FOCUSED_TEST_NONCE)
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(()=>{
  console.error('Focused test failed or refused. Check the child result and local emulator ports; no completion gate is satisfied.')
  process.exitCode=1
})
