import {isDeepStrictEqual} from 'node:util'

const beforeRules=['Set up Java','Check feature PR admission','Install dependencies','Check project governance','Run domain tests','Type-check the application','Build the application']
const afterRules=['Check Functions syntax','Check Emulator seed syntax']
const hosting=['Check Hosting artifact','Upload verified Hosting artifact']
const moved=[...beforeRules,...afterRules]
const fallback="${{ needs.scope.outputs.documentationOnly != 'true' && (needs.source.outputs.reuse != 'true') }}"
const reusedHosting="${{ needs.scope.outputs.documentationOnly != 'true' && (needs.source.outputs.reuse == 'true' && github.event_name != 'pull_request') }}"
const admissionSuffix=" if ('${{ needs.scope.outputs.documentationOnly }}' -eq 'true' -or '${{ needs.source.outputs.reuse }}' -eq 'true') { if ('${{ needs.application.result }}' -ne 'skipped' -or '${{ needs.rules.result }}' -ne 'skipped') { throw 'Unexpected verification producer execution.' } } elseif ('${{ needs.application.result }}' -ne 'success') { throw 'Application verification failed.' }"
const proofStep={name:'Verify application results and Hosting artifact',if:fallback,env:{GH_TOKEN:'${{ github.token }}',APPLICATION_VERIFICATION_PROOF:'${{ needs.application.outputs.proof }}',APPLICATION_HOSTING_ARTIFACT_ID:'${{ needs.application.outputs.artifactId }}'},run:'node scripts/verification-evidence.mjs check-application'}
const publishStep={name:'Publish application identity',id:'evidence',if:fallback,run:'node scripts/verification-evidence.mjs publish-application'}

// The exact inverse plus round-trip check rejects unrecognised jobs, conditions,
// permissions and producer steps before the existing full contract is checked.
export function parallelizeDevelopmentWorkflow(input){
  const w=structuredClone(input),v=w.jobs.verify
  const take=names=>names.map(name=>structuredClone(v.steps.find(s=>s.name===name)))
  const host=take(hosting)
  for(const s of host)s.if=fallback
  host[1].id='hosting'
  const application={name:'Verify application gates',needs:[...w.jobs.rules.needs],if:w.jobs.rules.if,'runs-on':'windows-latest',outputs:{proof:'${{ steps.evidence.outputs.proof }}',artifactId:'${{ steps.hosting.outputs.artifact-id }}'},steps:[...v.steps.filter(s=>['actions/checkout@v7','actions/setup-node@v7'].includes(s.uses)).map(s=>structuredClone(s)),...take(beforeRules),...take(afterRules),structuredClone(publishStep),...host]}
  v.needs.push('application')
  v.steps[0].run+=admissionSuffix
  v.steps=v.steps.filter(s=>!moved.includes(s.name))
  v.steps.splice(v.steps.findIndex(s=>s.name==='Record verified source evidence'),0,structuredClone(proofStep))
  for(const s of v.steps)if(hosting.includes(s.name))s.if=reusedHosting
  const {scope,source,rules,verify,deploy}=w.jobs
  w.jobs={scope,source,rules,application,verify,deploy,...Object.fromEntries(Object.entries(w.jobs).filter(([k])=>!['scope','source','rules','verify','deploy'].includes(k)))}
  return w
}

export function withoutParallelVerification(input){
  const w=structuredClone(input),v=w.jobs?.verify,a=w.jobs?.application
  const fail=()=>{throw Error('Parallel verification contract violated.')}
  if(!a||!v||!Array.isArray(v.needs)||v.needs.at(-1)!=='application'||!v.steps[0]?.run?.endsWith(admissionSuffix))fail()
  v.needs.pop();v.steps[0].run=v.steps[0].run.slice(0,-admissionSuffix.length)
  const take=names=>names.map(name=>{const rows=a.steps.filter(s=>s.name===name);if(rows.length!==1)fail();return structuredClone(rows[0])})
  v.steps=v.steps.filter(s=>s.name!==proofStep.name)
  v.steps.splice(3,0,...take(beforeRules))
  const rules=v.steps.findIndex(s=>s.name==='Run Firestore and Callable Emulator tests')
  if(rules<0)fail()
  v.steps.splice(rules+1,0,...take(afterRules))
  for(const s of v.steps)if(hosting.includes(s.name))s.if="${{ needs.scope.outputs.documentationOnly != 'true' && (github.event_name != 'pull_request' || github.base_ref != 'main') }}"
  delete w.jobs.application
  if(!isDeepStrictEqual(parallelizeDevelopmentWorkflow(w),input))fail()
  return w
}
