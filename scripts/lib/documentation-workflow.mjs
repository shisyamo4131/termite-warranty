import {isDeepStrictEqual} from 'node:util'
const expression=s=>s?.startsWith('${{ ')?s.slice(4,-3):s
const condition="needs.scope.result == 'success' && needs.scope.outputs.documentationOnly != 'true'"
const wrap=s=>'${{ '+condition+' && ('+expression(s)+') }}'
const stepWrap=s=>"${{ needs.scope.outputs.documentationOnly != 'true' && ("+(expression(s)??'true')+") }}"
const docsCondition="${{ needs.scope.result == 'success' && needs.scope.outputs.documentationOnly == 'true' }}"
const checkout={uses:'actions/checkout@v7',with:{'fetch-depth':0}}
const node={uses:'actions/setup-node@v7',with:{'node-version':22}}
const scope={name:'Classify documentation scope','runs-on':'windows-latest',outputs:{documentationOnly:'${{ steps.scope.outputs.documentationOnly }}'},steps:[checkout,node,{id:'scope',run:'node scripts/documentation-changes.mjs classify'}]}
const docsSteps=[{name:'Check documentation governance',if:docsCondition,run:'./scripts/check-governance.ps1'},{name:'Verify documentation scope and whitespace',if:docsCondition,run:'node scripts/documentation-changes.mjs verify'}]
const admissionPrefix="if ('${{ needs.scope.result }}' -ne 'success') { throw 'Change scope failed.' } elseif ('${{ needs.scope.outputs.documentationOnly }}' -ne 'true') { "
const jobNames=kind=>kind==='development'?['source','rules','deploy']:['reuse','rules','verify','deploy']
export function addDocumentationRouting(input,kind){
  const w=structuredClone(input)
  w.jobs={scope:structuredClone(scope),...w.jobs}
  if(kind==='production')w.jobs.scope.if="${{ vars.PRODUCTION_APP_DEPLOY_ENABLED == 'true' }}"
  for(const name of jobNames(kind)){
    const j=w.jobs[name];j.if=wrap(j.if);j.needs=[...(j.needs?Array.isArray(j.needs)?j.needs:[j.needs]:[]),'scope']
  }
  if(kind==='development'){
    const v=w.jobs.verify;v.needs.push('scope')
    v.steps[0].run=admissionPrefix+v.steps[0].run+' }'
    for(const s of v.steps.slice(1)){
      if(s.uses==='actions/checkout@v7')s.with={'fetch-depth':0}
      else if(s.uses!=='actions/setup-node@v7')s.if=stepWrap(s.if)
    }
    v.steps.push(...structuredClone(docsSteps))
  }else w.jobs.documentation={name:'Verify documentation without deployment',needs:'scope',if:docsCondition,'runs-on':'windows-latest',steps:[structuredClone(checkout),structuredClone(node),...structuredClone(docsSteps)]}
  return w
}
// Validate the entire added routing, then validate the unchanged full-deploy
// contract separately. No unchecked removal of conditions or steps is allowed.
export function withoutDocumentationRouting(input,kind){
  const w=structuredClone(input),fail=()=>{throw Error('Documentation routing contract violated.')}
  if(!w.jobs?.scope)fail()
  delete w.jobs.scope
  for(const name of jobNames(kind)){
    const j=w.jobs[name],prefix='${{ '+condition+' && ('
    if(!j?.if?.startsWith(prefix)||!j.if.endsWith(') }}')||!Array.isArray(j.needs)||j.needs.at(-1)!=='scope')fail()
    const inner=j.if.slice(prefix.length,-4)
    j.if=kind==='development'&&name==='source'?inner:'${{ '+inner+' }}'
    j.needs.pop();if(!j.needs.length)delete j.needs;else if(j.needs.length===1)j.needs=j.needs[0]
  }
  if(kind==='development'){
    const v=w.jobs.verify
    if(v.needs?.at(-1)!=='scope'||!v.steps[0]?.run?.startsWith(admissionPrefix)||!v.steps[0].run.endsWith(' }'))fail()
    v.needs.pop();v.steps[0].run=v.steps[0].run.slice(admissionPrefix.length,-2)
    if(!isDeepStrictEqual(v.steps.slice(-2),docsSteps))fail()
    v.steps.splice(-2)
    for(const s of v.steps.slice(1)){
      if(s.uses==='actions/checkout@v7'){
        if(!isDeepStrictEqual(s.with,{'fetch-depth':0}))fail();delete s.with
      }else if(s.uses!=='actions/setup-node@v7'){
        const p="${{ needs.scope.outputs.documentationOnly != 'true' && ("
        if(!s.if?.startsWith(p)||!s.if.endsWith(') }}'))fail()
        const inner=s.if.slice(p.length,-4);if(inner==='true')delete s.if;else s.if='${{ '+inner+' }}'
      }
    }
  }else delete w.jobs.documentation
  if(!isDeepStrictEqual(addDocumentationRouting(w,kind),input))fail()
  return w
}
