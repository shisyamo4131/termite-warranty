import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {rulesWorkers,assertRulesResult} from './rules-test-plan.mjs'
export const policy=JSON.parse(readFileSync(new URL('../../governance/verification-policy.json',import.meta.url)))
export const requiredCommands=[...policy.comprehensiveGateIds.map(id=>({id,command:policy.gates.find(g=>g.id===id).command})),
  ...policy.focusedRegressions.filter(r=>r.completionRequired).map(r=>({id:r.id,command:r.command}))]
export function receiptDigest(receipt){return createHash('sha256').update(JSON.stringify(receipt)).digest('hex')}
export function validateLocalReceipt(receipt,inputs){
  if(receipt?.schema!==1||receipt.kind!=='termite-local-verification'||receipt.verification!==inputs.verification||receipt.product!==inputs.product)throw Error('Local verification inputs differ from the merge candidate.')
  const r=receipt.runtime
  if(r?.platform!=='win32'||!/^v22\./.test(r.node)||r.npm!=='11.19.1'||r.javaMajor!==21||r.powershellMajor!==7)throw Error('Unsupported Local verification runtime.')
  if(receipt.install?.command!=='npx --yes npm@11.19.1 ci'||receipt.install.exitCode!==0)throw Error('Clean locked dependency installation is required.')
  if(!Array.isArray(receipt.gates)||receipt.gates.length!==requiredCommands.length)throw Error('Incomplete Local gate inventory.')
  for(const {id,command} of requiredCommands){
    const matches=receipt.gates.filter(g=>g.id===id),g=matches[0]
    if(matches.length!==1||g.command!==command||g.exitCode!==0||!Number.isFinite(g.elapsedMs)||g.elapsedMs<0)throw Error('Local gate incomplete: '+id)
    if(id==='domain-test'||policy.focusedRegressions.some(r=>r.id===id)){
      const t=g.tests
      if(!t||!Number.isSafeInteger(t.passed)||t.passed<1||t.failed!==0||t.skipped!==0||t.cancelled!==0||t.total!==t.passed)throw Error('Local test inventory is incomplete: '+id)
    }
    if(id==='firestore-rules-test'){
      if(!Number.isSafeInteger(g.tests?.passed)||g.tests.passed<1||g.emulatorsStopped!==true||g.suite!=='baseline'||g.workers?.length!==rulesWorkers.length)throw Error('Local Emulator suite is incomplete.')
      const cases=[]
      for(const worker of rulesWorkers){
        const rows=g.workers.filter(row=>row.worker===worker.id),row=rows[0]
        if(rows.length!==1||row.exitCode!==0)throw Error('Local Rules worker incomplete.')
        assertRulesResult(row,worker)
        if(!Array.isArray(row.cases))throw Error('Local Rules test identities missing.')
        for(const file of worker.files)if(row.cases.filter(c=>JSON.parse(c)[0]===file).length!==row.byFile[file].passed)throw Error('Local Rules test identity count mismatch.')
        cases.push(...row.cases)
      }
      if(cases.length!==g.tests.passed||new Set(cases).size!==cases.length)throw Error('Local Rules count or identity mismatch.')
    }
  }
  return receipt
}
export function readOwnerRecord(comments,ownerId,kind){
  // A comment is itself the explicit owner attestation. PR authorship, run actor,
  // a claimed user ID in JSON, and other users' comments are not approvals.
  const prefix='TERMITE '+kind+'\n'
  const rows=comments.filter(c=>c.user?.id===ownerId&&c.body?.startsWith(prefix)).sort((a,b)=>b.id-a.id)
  if(!rows.length)return null
  const latest=rows[0]
  if(latest.body.length>60000)throw Error('Owner record too large.')
  let record
  try{record=JSON.parse(latest.body.slice(prefix.length))}catch{throw Error('Latest owner record is malformed.')}
  return {record,commentId:latest.id,url:latest.html_url}
}
