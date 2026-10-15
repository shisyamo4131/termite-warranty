import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {parse,stringify} from 'yaml'
import {validateDevelopmentWorkflow} from '../scripts/development-workflow-contract.mjs'
import {validateProductionWorkflow} from '../scripts/production-workflow-contract.mjs'
const policy=JSON.parse(readFileSync(new URL('../governance/verification-policy.json',import.meta.url)))
const load=kind=>parse(readFileSync(new URL('../.github/workflows/deploy-'+kind+'.yml',import.meta.url),'utf8'))
const validate=(kind,w)=>(kind==='development'?validateDevelopmentWorkflow:validateProductionWorkflow)(stringify(w),policy)
test('current workflows satisfy safety contracts; display names and independent gate order are not contracts',()=>{
  for(const kind of ['development','production']){
    const w=load(kind);assert.equal(validate(kind,w),true)
    for(const [id,j] of Object.entries(w.jobs)){if(kind!=='development'||id!=='verify')j.name='Readable label';for(const s of j.steps??[])if(s.name)s.name='Readable step'}
    if(kind==='development'){
      const steps=w.jobs.application.steps,indexes=steps.map((s,i)=>['npm test','npm run typecheck'].includes(s.run)?i:-1).filter(i=>i>=0)
      ;[steps[indexes[0]],steps[indexes[1]]]=[steps[indexes[1]],steps[indexes[0]]]
    }
    assert.equal(validate(kind,w),true)
  }
})
test('every common gate and focused regression is required in PR verification',()=>{
  for(const command of [...policy.comprehensiveGateIds.filter(id=>id!=='firestore-rules-test').map(id=>policy.gates.find(g=>g.id===id).command),...policy.focusedRegressions.map(r=>r.command)]){
    const w=load('development');for(const job of [w.jobs.application,w.jobs.verify])job.steps=job.steps.filter(s=>s.run!==command);assert.throws(()=>validate('development',w))
  }
})
test('both environments refuse target, permission, cancellation, status and rebuild bypasses',()=>{
  for(const kind of ['development','production'])for(const mutate of [w=>w.jobs.deploy.needs=[],w=>w.jobs.deploy.if='true',w=>w.jobs.deploy.environment='foreign',w=>w.jobs.deploy.concurrency['cancel-in-progress']=true,w=>w.jobs.scope.outputs.kind='documentation',w=>w.jobs.scope.steps.at(-1).run='echo success',w=>w.jobs.scope.steps[0].with['fetch-depth']=1,w=>w.jobs.scope.permissions={'id-token':'write'},w=>w.jobs.verify.steps.push({uses:'google-github-actions/auth@v3'}),w=>w.jobs.deploy.steps.push({run:'npm run build'}),w=>w.jobs.deploy.steps.find(s=>s.run?.includes('firebase deploy')).run+=' --force',w=>w.jobs.deploy.steps.find(s=>s.run?.includes('current-')).if='false']){
    const w=load(kind);mutate(w);assert.throws(()=>validate(kind,w))
  }
})
test('Local reuse cannot skip admission, Rules aggregation, Hosting binding or Dev post-checks',()=>{
  for(const mutate of [w=>w.jobs.application.steps.find(s=>s.run==='npm test').if='false',w=>w.jobs.rules.if='false',w=>w.jobs.rules.secrets='inherit',w=>w.jobs.verify.steps.find(s=>s.run==='node scripts/pipeline.mjs aggregate').env={},w=>w.jobs.verify.steps.find(s=>s.run==='npm run test:rules').env={},w=>w.jobs.verify.steps.find(s=>s.uses?.startsWith('actions/download-artifact')).with.pattern='foreign-*',w=>w.jobs.deploy.steps.find(s=>s.uses?.startsWith('actions/download-artifact')).with['digest-mismatch']='warn',w=>w.jobs.deploy.steps.find(s=>s.run==='node scripts/development-deployment.mjs check').run='echo pass',w=>w.jobs.deploy.steps.find(s=>s.run==='node scripts/pipeline.mjs publish-deployment').if='always()']){
    const w=load('development');mutate(w);assert.throws(()=>validate('development',w))
  }
})
test('cancelled deployments are refused even when every producer succeeded',()=>{
  for(const kind of ['development','production']){
    const w=load(kind);w.jobs.deploy.if=w.jobs.deploy.if.replace('!cancelled()','always()')
    assert.throws(()=>validate(kind,w))
  }
})
test('the external required-check identity stays stable without freezing other display names',()=>{
  const w=load('development');w.jobs.verify.name='Different check';assert.throws(()=>validate('development',w))
  for(const condition of ["${{ needs.scope.outputs.kind == 'documentation' }}","${{ needs.scope.outputs.local != 'true' }}","${{ needs.scope.outputs.reuse != 'true' }}"]){
    const w=load('development');w.jobs.verify.steps.find(s=>s.run==='./scripts/check-governance.ps1').if=condition
    assert.throws(()=>validate('development',w))
  }
})
