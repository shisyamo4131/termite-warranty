import {isDeepStrictEqual} from 'node:util'
const selected="needs.scope.result == 'success' && needs.scope.outputs.ciIntroduction == 'true'"
const normal="needs.scope.outputs.ciIntroduction != 'true'"
const wrap=value=>'${{ '+normal+' && ('+(value?.startsWith('${{ ')?value.slice(4,-3):value??'true')+') }}'
const full="${{ steps.source.outputs.reuse != 'true' }}"
const gates=[['Check project governance','./scripts/check-governance.ps1'],['Run domain tests','npm test'],['Type-check the application','npm run typecheck'],['Build the application','npm run build'],['Run Firestore and Callable Emulator tests','npm run test:rules'],['Check Functions syntax','node scripts/check-functions-syntax.mjs'],['Check Emulator seed syntax','node --check scripts/seed-emulator.mjs']]
export const introductionGateSteps=gates.map(([name])=>name)
const required={name:'Require CI introduction verification',if:'${{ '+selected+' }}',run:"if ('${{ needs.ci-introduction.result }}' -ne 'success') { throw 'CI introduction verification failed.' }"}
function job(kind){return {name:'Verify CI introduction',needs:'scope',if:'${{ '+selected+(kind==='development'?" && (github.event_name != 'push' || github.ref != 'refs/heads/main')":'')+' }}','runs-on':'windows-latest',permissions:{contents:'read',actions:'read'},steps:[
  {uses:'actions/checkout@v7',with:{'fetch-depth':0}},
  {uses:'actions/setup-node@v7',with:{'node-version':22}},
  {name:'Verify CI introduction scope',run:'node scripts/documentation-changes.mjs verify-ci'},
  {name:'Resolve CI introduction verification',id:'source',env:{GH_TOKEN:'${{ github.token }}'},run:'node scripts/ci-introduction.mjs'},
  {uses:'actions/setup-java@v6',if:full,with:{distribution:'temurin','java-version':'21'}},
  {name:'Install CI dependencies',if:full,run:'npx --yes npm@11.19.1 ci'},
  ...gates.map(([name,run])=>({name,if:full,run})),
]}}
export function addCIIntroduction(input,kind){
  const w=structuredClone(input)
  w.jobs.scope.outputs.ciIntroduction='${{ steps.scope.outputs.ciIntroduction }}'
  for(const [name,j] of Object.entries(w.jobs)){
    if(name==='scope')continue
    if(kind==='development'&&name==='verify'){
      j.needs.push('ci-introduction')
      for(const s of j.steps)s.if=wrap(s.if)
      j.steps.push(structuredClone(required))
    }else j.if=wrap(j.if)
  }
  w.jobs['ci-introduction']=job(kind)
  return w
}
export function withoutCIIntroduction(input,kind){
  const w=structuredClone(input),fail=()=>{throw Error('CI introduction contract violated.')}
  if(w.jobs?.scope?.outputs?.ciIntroduction!=='${{ steps.scope.outputs.ciIntroduction }}'||!isDeepStrictEqual(w.jobs['ci-introduction'],job(kind)))fail()
  delete w.jobs.scope.outputs.ciIntroduction;delete w.jobs['ci-introduction']
  const unwrap=value=>{const prefix='${{ '+normal+' && (';if(!value?.startsWith(prefix)||!value.endsWith(') }}'))fail();const inner=value.slice(prefix.length,-4);return inner==='true'?undefined:'${{ '+inner+' }}'}
  for(const [name,j] of Object.entries(w.jobs)){
    if(name==='scope')continue
    if(kind==='development'&&name==='verify'){
      if(j.needs.at(-1)!=='ci-introduction'||!isDeepStrictEqual(j.steps.at(-1),required))fail()
      j.needs.pop();j.steps.pop()
      for(const s of j.steps){const value=unwrap(s.if);if(value)s.if=value;else delete s.if}
    }else j.if=unwrap(j.if)
  }
  if(!isDeepStrictEqual(addCIIntroduction(w,kind),input))fail()
  return w
}
