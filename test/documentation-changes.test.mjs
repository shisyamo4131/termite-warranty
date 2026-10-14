import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {parse,stringify} from 'yaml'
import vm from 'node:vm'
import {documentationDiff,documentationPaths,comparisonBase,classifyDocumentation} from '../scripts/documentation-changes.mjs'
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
        for(const name of kind==='development'?['source','rules']:['reuse','rules','verify'])assert.equal(vm.runInNewContext(w.jobs[name].if.slice(3,-2),context),false)
        if(kind==='development')for(const name of ['Publish comprehensive verification evidence','Upload comprehensive verification evidence','Upload verified Hosting artifact'])assert.equal(vm.runInNewContext(w.jobs.verify.steps.find(s=>s.name===name).if.slice(3,-2),context),false)
      }
    }
  }
})
test('required Dev check accepts docs only after successful scope; normal failures remain failures',()=>{
  const command=workflow('development').jobs.verify.steps[0].run
  for(const scope of ['success','failure','skipped'])for(const docs of ['true','false','']){
    const run=command.replaceAll('${{ needs.scope.result }}',scope).replaceAll('${{ needs.scope.outputs.documentationOnly }}',docs).replaceAll('${{ needs.source.outputs.reuse }}','false').replaceAll('${{ needs.source.result }}','skipped').replaceAll('${{ needs.rules.result }}','skipped')
    const result=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',run],{encoding:'utf8',windowsHide:true})
    assert.ifError(result.error);assert.equal(result.status===0,scope==='success'&&docs==='true')
  }
})
test('workflow guards reject forged classification, missing doc checks, credentials or bypass conditions',()=>{
  for(const kind of ['development','production'])for(const mutate of [w=>w.jobs.scope.outputs.documentationOnly='true',w=>w.jobs.scope.steps.at(-1).run='echo true',w=>w.jobs.scope.steps[0].with['fetch-depth']=1,w=>w.jobs.scope.permissions={'id-token':'write'},w=>w.jobs.deploy.if='true',w=>w.jobs.deploy.needs=['verify'],w=>{(w.jobs.documentation??w.jobs.verify).steps.pop()},w=>{(w.jobs.documentation??w.jobs.verify).steps.at(-1)['continue-on-error']=true}]){
    const w=workflow(kind);mutate(w);assert.throws(()=>(kind==='development'?validateDevelopmentWorkflow:validateProductionWorkflow)(stringify(w),policy))
  }
})
