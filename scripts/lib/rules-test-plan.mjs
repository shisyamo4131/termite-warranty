import {readdir} from 'node:fs/promises'
import {resolve} from 'node:path'

// Shared default DB, Auth and rule definitions stay serial. Only guarded named DBs overlap.
export const rulesWorkers = Object.freeze([
  Object.freeze({id:'shared',files:Object.freeze([
    'test/firestore-rules.test.mjs','test/firestore-control-rules.test.mjs',
    'test/emulator/firestore-metrics.test.mjs','test/emulator/reference-store.test.mjs',
    'test/emulator/bounded-list.test.mjs','test/emulator/registration.test.mjs',
    'test/emulator/callable-profile-registration.test.mjs','test/emulator/case-edit.test.mjs',
    'test/emulator/callable-applied-warranty.test.mjs','test/emulator/company-portal.test.mjs',
    'test/emulator/staff-account-management.test.mjs','test/emulator/property-warranty.test.mjs',
    'test/emulator/property-address-migration.test.mjs','test/emulator/property-name-migration.test.mjs',
    'test/emulator/recovery.test.mjs','test/emulator/fixed-runtime.test.mjs','test/emulator/default-recovery.test.mjs',
  ])}),
  Object.freeze({id:'isolated-import',files:Object.freeze(['test/emulator/isolated-property-import.test.mjs'])}),
])

export function assertRulesInventory(inventory, workers=rulesWorkers) {
  const files=workers.flatMap(worker=>worker.files)
  if(new Set(workers.map(worker=>worker.id)).size!==workers.length || new Set(files).size!==files.length || new Set(inventory).size!==inventory.length ||
    files.length!==inventory.length || inventory.some(file=>!files.includes(file)))throw Error('Rules test inventory is incomplete or duplicated.')
}
export async function validateRulesInventory(root) {
  const files=(await readdir(resolve(root,'test/emulator'))).filter(name=>name.endsWith('.test.mjs')).map(name=>'test/emulator/'+name)
  const top=(await readdir(resolve(root,'test'))).filter(name=>/^firestore.*\.test\.mjs$/.test(name)).map(name=>'test/'+name)
  assertRulesInventory([...top,...files])
}
export function rulesWorker(id) {
  const worker=rulesWorkers.find(worker=>worker.id===id)
  if(!worker)throw Error('Unknown rules worker.')
  return worker
}
export function rulesEventResult(events,worker,root) {
  const byFile=Object.fromEntries(worker.files.map(file=>[file,{passed:0,failed:0,skipped:0}]))
  const paths=new Map(worker.files.map(file=>[resolve(root,file).toLowerCase(),file]))
  let unexpected=0
  for(const {type,data} of events) {
    if(!['test:pass','test:fail'].includes(type))continue
    const file=typeof data.file==='string'&&paths.get(resolve(data.file).toLowerCase())
    if(!file){unexpected++;continue}
    if(type==='test:pass' && typeof data.name==='string' && resolve(root,data.name).toLowerCase()===resolve(root,file).toLowerCase()){unexpected++;continue}
    if(type==='test:fail')byFile[file].failed++
    else if(data.skip||data.todo)byFile[file].skipped++
    else if(data.details?.type!=='suite')byFile[file].passed++
  }
  return {byFile,unexpected}
}
export function assertRulesResult(result,worker) {
  if(!result || result.unexpected!==0 || !result.byFile || Object.keys(result.byFile).length!==worker.files.length)throw Error('Rules result inventory mismatch.')
  for(const file of worker.files) {
    const row=result.byFile[file]
    if(!row || !Number.isSafeInteger(row.passed) || row.passed<1 || row.failed!==0 || row.skipped!==0)throw Error('Missing, failed or skipped rules tests: '+file)
  }
}
export function readRulesReceipt(output,worker,nonce) {
  const lines=output.split(/\r?\n/).filter(line=>line.startsWith('RULES_WORKER_RESULT '))
  if(lines.length!==1)throw Error('Missing or duplicate rules worker result.')
  const result=JSON.parse(lines[0].slice('RULES_WORKER_RESULT '.length))
  if(result.worker!==worker.id || result.nonce!==nonce)throw Error('Foreign rules worker result.')
  assertRulesResult(result,worker)
  return result
}
