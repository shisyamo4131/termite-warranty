import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {parse,stringify} from 'yaml'
import vm from 'node:vm'
import {documentationDiff,documentationPaths,comparisonBase,classifyDocumentation,introductionDiff,introductionBases,introductionNewPaths} from '../scripts/documentation-changes.mjs'
import {resolveCIIntroduction} from '../scripts/ci-introduction.mjs'
import {introductionGateSteps} from '../scripts/lib/ci-introduction-workflow.mjs'
import {validateDevelopmentWorkflow} from '../scripts/development-workflow-contract.mjs'
import {validateProductionWorkflow} from '../scripts/production-workflow-contract.mjs'
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40)
const env={GITHUB_REPOSITORY:'shisyamo4131/termite-warranty',GITHUB_EVENT_NAME:'pull_request',GITHUB_SHA:c}
const event=()=>({repository:{id:1363463339,owner:{id:72244713}},pull_request:{base:{sha:a,ref:'dev',repo:{id:1363463339}},head:{sha:b,ref:'codex/docs',repo:{id:1363463339}}}})
const raw=(path,mode='100644',status='M')=>`:100644 ${mode} ${a} ${b} ${status}\0${path}\0`
const workflow=kind=>parse(readFileSync(new URL(`../.github/workflows/deploy-${kind}.yml`,import.meta.url),'utf8'))
const policy=JSON.parse(readFileSync(new URL('../governance/verification-policy.json',import.meta.url),'utf8'))
test('only explicitly reviewed existing regular document modifications qualify',()=>{
  for(const path of documentationPaths)assert.equal(documentationDiff(raw(path)),true)
  for(const path of ['AGENTS.md','governance/common-governance.md','docs/new.md','public/README.md','functions/README.md','.github/workflows/deploy-development.yml','package-lock.json','docs/../app/a.md'])assert.equal(documentationDiff(raw(path)),false,path)
  for(const value of ['',raw('docs/operations.md')+raw('firebase.json'),raw('docs/operations.md','120000'),raw('docs/operations.md','100755'),raw('docs/operations.md','100644','D'),raw('docs/operations.md','100644','A'),raw('docs/operations.md','100644','R100')+'docs/README.md\0',raw('docs/README.md').slice(0,-1)])assert.equal(documentationDiff(value),false)
})
test('comparison binds exact same-repository PR base/head and merge parents',()=>{
  assert.equal(comparisonBase(event(),env,[a,b]),a)
  for(const mutate of [e=>e.repository.id=0,e=>e.repository.owner.id=0,e=>e.pull_request.head.repo.id=0,e=>e.pull_request.base.ref='other',e=>e.pull_request.base.sha=b,e=>e.pull_request.base.ref='main']){const e=event();mutate(e);assert.throws(()=>comparisonBase(e,env,[a,b]))}
  for(const parents of [[],[a],[b,a],[a,b,c]])assert.throws(()=>comparisonBase(event(),env,parents))
  const promotion=event();promotion.pull_request.base.ref='main';promotion.pull_request.head.ref='dev';assert.equal(comparisonBase(promotion,env,[a,b]),a)
})
test('push includes all merged changes and refuses unknown before, force, dispatch and direct push',()=>{
  const e={repository:event().repository,before:a,after:c,forced:false,deleted:false},n={...env,GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main'}
  assert.equal(comparisonBase(e,n,[a,b]),a)
  for(const patch of [{before:'0'.repeat(40)},{before:b},{after:a},{forced:true},{deleted:true}])assert.throws(()=>comparisonBase({...e,...patch},n,[a,b]))
  assert.throws(()=>comparisonBase(e,n,[a]));assert.throws(()=>comparisonBase(e,{...n,GITHUB_EVENT_NAME:'workflow_dispatch'},[a,b]))
})
test('classifier falls back on missing history or mismatched checkout; document verification rejects mixed changes',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'termite-doc-scope-'))
  try{
    const file=join(dir,'event.json');writeFileSync(file,JSON.stringify(event()))
    const n={...env,GITHUB_EVENT_PATH:file}
    const run=(...args)=>args[0]==='rev-parse'?c:args[0]==='show'?a+' '+b:raw('docs/operations.md')
    assert.equal((await classifyDocumentation(n,run)).documentationOnly,true)
    assert.equal((await classifyDocumentation(n,()=>{throw Error('missing history')})).documentationOnly,false)
    assert.equal((await classifyDocumentation(n,()=>a)).documentationOnly,false)
    assert.equal((await classifyDocumentation(n,(...args)=>args[0]==='diff'?raw('package.json'):run(...args))).documentationOnly,false)
    const child=spawnSync(process.execPath,['scripts/documentation-changes.mjs','verify'],{encoding:'utf8',env:{...process.env,...n},windowsHide:true});assert.equal(child.status,1)
  }finally{rmSync(dir,{recursive:true,force:true})}
})
test('documentation or scope failure never reaches either environment or comprehensive evidence publication',()=>{
  for(const kind of ['development','production']){
    const w=workflow(kind)
    for(const status of ['success','failure','cancelled','skipped'])for(const docs of ['true','false','']){
      const context={always:()=>true,cancelled:()=>false,vars:{DEVELOPMENT_BRANCH_DEPLOY_ENABLED:'true',PRODUCTION_APP_DEPLOY_ENABLED:'true'},github:{event_name:'push',ref:'refs/heads/'+(kind==='development'?'dev':'main'),base_ref:''},needs:{scope:{result:status,outputs:{documentationOnly:docs}},verify:{result:'success'},source:{result:'success',outputs:{reuse:'true'}},reuse:{result:'success',outputs:{reuse:'true'}},rules:{result:'skipped'}}}
      assert.equal(vm.runInNewContext(w.jobs.deploy.if.slice(3,-2),context),status==='success'&&docs!=='true')
      if(docs==='true'&&status==='success'){
      for(const name of kind==='development'?['source','rules','application']:['reuse','rules','verify'])assert.equal(vm.runInNewContext(w.jobs[name].if.slice(3,-2),context),false)
        if(kind==='development')for(const name of ['Publish comprehensive verification evidence','Upload comprehensive verification evidence','Upload verified Hosting artifact'])assert.equal(vm.runInNewContext(w.jobs.verify.steps.find(s=>s.name===name).if.slice(3,-2),context),false)
      }
    }
  }
})
test('required Dev check accepts docs only after successful scope; normal failures remain failures',()=>{
  const command=workflow('development').jobs.verify.steps[0].run
  for(const scope of ['success','failure','skipped'])for(const docs of ['true','false','']){
    const run=command.replaceAll('${{ needs.scope.result }}',scope).replaceAll('${{ needs.scope.outputs.documentationOnly }}',docs).replaceAll('${{ needs.source.outputs.reuse }}','false').replaceAll('${{ needs.source.result }}','skipped').replaceAll('${{ needs.rules.result }}','skipped').replaceAll('${{ needs.application.result }}','skipped')
    const result=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',run],{encoding:'utf8',windowsHide:true})
    assert.ifError(result.error);assert.equal(result.status===0,scope==='success'&&docs==='true')
  }
})
test('workflow guards reject forged classification, missing doc checks, credentials or bypass conditions',()=>{
  for(const kind of ['development','production'])for(const mutate of [w=>w.jobs.scope.outputs.documentationOnly='true',w=>w.jobs.scope.steps.at(-1).run='echo true',w=>w.jobs.scope.steps[0].with['fetch-depth']=1,w=>w.jobs.scope.permissions={'id-token':'write'},w=>w.jobs.deploy.if='true',w=>w.jobs.deploy.needs=['verify'],w=>{(w.jobs.documentation??w.jobs.verify).steps.pop()},w=>{(w.jobs.documentation??w.jobs.verify).steps.at(-1)['continue-on-error']=true}]){
    const w=workflow(kind);mutate(w);assert.throws(()=>(kind==='development'?validateDevelopmentWorkflow:validateProductionWorkflow)(stringify(w),policy))
  }
})

test('PDF and generator exceptions are exact paths; mixed inputs and special files still fail closed',()=>{
  assert.equal(documentationPaths.size,13)
  for(const path of ['deliverables/production-schedule-2026-10-05/build_pdf.py','output/pdf/HS_本番稼働に向けた目標スケジュール_2026-10-13.pdf']){
    assert.equal(documentationDiff(raw(path)),true)
    for(const mode of ['100755','120000'])assert.equal(documentationDiff(raw(path,mode)),false)
    assert.equal(documentationDiff(raw(path)+raw('nuxt.config.ts')),false)
  }
  for(const path of ['output/pdf/other.pdf','deliverables/production-schedule-2026-10-05/run.py','public/HS.pdf','scripts/documentation-changes.mjs','scripts/ci-introduction.mjs'])assert.equal(documentationDiff(raw(path)),false)
})
test('CI introduction is limited to approved initial bases and paths, never ordinary documentation',()=>{
  for(const base of introductionBases){
    assert.equal(introductionDiff(raw('scripts/documentation-changes.mjs'),base),true)
    assert.equal(introductionDiff(raw('docs/operations.md'),base),false)
    for(const path of introductionNewPaths)assert.equal(introductionDiff(`:000000 100644 ${'0'.repeat(40)} ${b} A\0${path}\0`,base),true)
    for(const path of ['app/pages/index.vue','functions/index.js','firebase.json','package-lock.json','governance/verification-policy.json','.github/workflows/verify-rules.yml'])assert.equal(introductionDiff(raw('scripts/documentation-changes.mjs')+raw(path),base),false)
    for(const value of ['',raw('scripts/documentation-changes.mjs','100755'),raw('scripts/documentation-changes.mjs','120000'),raw('scripts/documentation-changes.mjs','100644','D'),raw('scripts/documentation-changes.mjs','100644','R100')])assert.equal(introductionDiff(value,base),false)
  }
  assert.equal(introductionDiff(raw('scripts/documentation-changes.mjs'),a),false)
})
test('CI introduction cannot authenticate, deploy, or publish application evidence',()=>{
  for(const kind of ['development','production']){
    const w=workflow(kind),ctx={always:()=>true,cancelled:()=>false,github:{event_name:'push',ref:'refs/heads/'+(kind==='development'?'dev':'main')},needs:{scope:{result:'success',outputs:{documentationOnly:'false',ciIntroduction:'true'}}}}
    for(const [name,j] of Object.entries(w.jobs)){
      if(['scope','ci-introduction'].includes(name)||kind==='development'&&name==='verify')continue
      assert.equal(vm.runInNewContext(j.if.slice(3,-2),ctx),false,name)
    }
    assert.equal(vm.runInNewContext(w.jobs['ci-introduction'].if.slice(3,-2),ctx),true)
    assert.equal(w.jobs['ci-introduction'].environment,undefined)
    assert.deepEqual(w.jobs['ci-introduction'].permissions,{contents:'read',actions:'read'})
    for(const mutate of [j=>j.steps.pop(),j=>j.steps.at(-1)['continue-on-error']=true,j=>j.environment='production',j=>j.permissions['id-token']='write',j=>j.steps[0].with['fetch-depth']=1,j=>j.steps[3].run='echo reuse=true']){
      const bad=structuredClone(w);mutate(bad.jobs['ci-introduction']);assert.throws(()=>(kind==='development'?validateDevelopmentWorkflow:validateProductionWorkflow)(stringify(bad),policy))
    }
    if(kind==='development'){
      for(const s of w.jobs.verify.steps.slice(0,-1))assert.equal(vm.runInNewContext(s.if.slice(3,-2),ctx),false)
      for(const state of ['success','failure','cancelled','skipped','']){
        const command=w.jobs.verify.steps.at(-1).run.replaceAll('${{ needs.ci-introduction.result }}',state)
        const result=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true})
        assert.ifError(result.error);assert.equal(result.status===0,state==='success')
      }
    }
  }
})
function ciFixture(){
  const repo={id:1363463339,owner:{id:72244713}},branch='codex/document-artifact-routing'
  const run={id:910,run_attempt:1,repository:repo,head_repository:repo,path:'.github/workflows/deploy-development.yml',event:'pull_request',head_branch:branch,head_sha:a,status:'completed',conclusion:'success',updated_at:new Date().toISOString()}
  const source={number:31,merged_at:'2026-10-15',merge_commit_sha:b,base:{ref:'dev',repo},head:{ref:branch,sha:a,repo}}
  const promotion={number:32,merged_at:'2026-10-15',merge_commit_sha:c,base:{ref:'main',repo},head:{ref:'dev',sha:b,repo}}
  const job=(name,steps)=>({name,run_id:910,run_attempt:1,status:'completed',conclusion:'success',steps:steps.map(name=>({name,status:'completed',conclusion:'success'}))})
  const jobs=[job('Verify CI introduction',['Verify CI introduction scope','Resolve CI introduction verification',...introductionGateSteps]),job('Verify development deployment',['Require CI introduction verification'])]
  const data={run,source,promotion,jobs,runs:[run],tree:b}
  data.read=async path=>{
    if(path.startsWith('/git/commits/'))return {tree:{sha:data.tree}}
    if(path.startsWith('/commits/'+c+'/pulls'))return [data.promotion]
    if(path.startsWith('/commits/'+b+'/pulls'))return [data.source]
    if(path.startsWith('/actions/workflows/'))return {total_count:data.runs.length,workflow_runs:data.runs}
    if(path.startsWith('/actions/runs/'))return {total_count:data.jobs.length,jobs:data.jobs}
    throw Error('Unexpected fixture route '+path)
  }
  data.input={eventName:'push',event:{repository:repo},revision:b,current:b,ref:'refs/heads/dev'}
  return data
}
test('only initial feature PR runs full CI; Dev/main promotion revalidates same-tree seven gates',async()=>{
  const f=ciFixture()
  assert.equal((await resolveCIIntroduction(f.read,f.input)).reuse,true)
  assert.equal((await resolveCIIntroduction(f.read,{...f.input,revision:c,ref:'refs/heads/main'})).reuse,true)
  assert.equal((await resolveCIIntroduction(f.read,{...f.input,eventName:'pull_request',event:{repository:f.run.repository,pull_request:f.promotion}})).reuse,true)
  assert.equal((await resolveCIIntroduction(f.read,{...f.input,eventName:'pull_request',event:{repository:f.run.repository,pull_request:f.source}})).reuse,false)
})
for(const [name,mutate] of [
  ['different tree',f=>f.tree=c],['wrong owner',f=>f.run.repository.owner.id=0],
  ['latest failed run',f=>f.runs.push({...f.run,id:911,conclusion:'failure'})],
  ['stale run',f=>f.run.updated_at='2000-01-01T00:00:00Z'],
  ['wrong attempt',f=>f.jobs[0].run_attempt=2],['skipped gate',f=>f.jobs[0].steps.at(-1).conclusion='skipped'],
  ['missing gate',f=>f.jobs[0].steps.pop()],['duplicate gate',f=>f.jobs[0].steps.push(f.jobs[0].steps[0])],
  ['aggregate failure',f=>f.jobs[1].conclusion='failure'],['different feature branch',f=>f.source.head.ref='other'],
  ['wrong workflow',f=>f.run.path='other.yml'],['missing run',f=>f.runs=[]],
])test('CI introduction reuse rejects '+name,async()=>{const f=ciFixture();mutate(f);await assert.rejects(resolveCIIntroduction(f.read,f.input))})
