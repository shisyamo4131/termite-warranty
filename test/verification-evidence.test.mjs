import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {parse,stringify} from 'yaml'
import vm from 'node:vm'
import {repositoryId,ownerId,verificationWorkflow,gateSteps,evidenceName,githubReader,validateVerification} from '../scripts/lib/verification-evidence.mjs'
import {findReusableVerification} from '../scripts/verification-evidence.mjs'
import {recordDevelopmentAcceptance,requireDevelopmentAcceptance,acceptanceWorkflow} from '../scripts/development-acceptance.mjs'
import {validateProductionWorkflow} from '../scripts/production-workflow-contract.mjs'
import {validateDevelopmentWorkflow} from '../scripts/development-workflow-contract.mjs'

const revision='a'.repeat(40),merged='b'.repeat(40),tree='c'.repeat(40),blob='d'.repeat(40)
const policy=JSON.parse(readFileSync(new URL('../governance/verification-policy.json',import.meta.url)))
const workflow=name=>parse(readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8'))
const step=name=>({name,status:'completed',conclusion:'success'})
function fixture({dev=false}={}){
  const run={id:101,run_attempt:1,repository:{id:repositoryId,owner:{id:ownerId}},head_repository:{id:repositoryId},path:verificationWorkflow,event:dev?'push':'pull_request',head_branch:dev?'dev':'codex/change',head_sha:revision,status:'completed',conclusion:'success',updated_at:new Date().toISOString()}
  const job=name=>({name,run_id:run.id,run_attempt:1,status:'completed',conclusion:'success',steps:[]})
  const jobs=[{...job('Verify development deployment'),steps:[...gateSteps,'Publish comprehensive verification evidence','Upload comprehensive verification evidence'].map(step)},...['shard-property-warranty','shard-default-recovery','shard-historical-intake'].map(id=>job(`rules / shard (${id})`))]
  if(dev)jobs.push({...job('Deploy to termite-warranty-dev'),steps:[step('Deploy Firestore, Functions, and Hosting')]})
  const artifact=(name,r=run)=>({id:200+r.id,name,expired:false,size_in_bytes:500,expires_at:new Date(Date.now()+86400000).toISOString(),workflow_run:{id:r.id,repository_id:repositoryId,head_repository_id:repositoryId,head_sha:r.head_sha}})
  const artifacts=[artifact(evidenceName(tree,1))]
  const pulls=[{number:15,merged_at:new Date().toISOString(),merge_commit_sha:merged,base:{ref:'main',repo:{id:repositoryId}},head:{ref:run.head_branch,sha:revision,repo:{id:repositoryId}}}]
  const data=new Map([
    [`/commits/${merged}/pulls?per_page=100`,pulls],
    [`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${revision}&per_page=100`,{total_count:1,workflow_runs:[run]}],
    [`/git/commits/${revision}`,{tree:{sha:tree}}],
    [`/actions/runs/${run.id}`,run],
    [`/actions/runs/${run.id}/attempts/1/jobs?per_page=100`,{total_count:jobs.length,jobs}],
    [`/actions/runs/${run.id}/artifacts?per_page=100`,{total_count:1,artifacts}],
    ['/branches/dev',{commit:{sha:revision}}],
  ])
  const read=async path=>{assert.ok(data.has(path),'Unexpected API path: '+path);return data.get(path)}
  return {run,jobs,artifacts,pulls,data,read,artifact}
}
const verify=f=>validateVerification(f.read,f.run,tree,{event:'pull_request',branch:'codex/change',revision})

test('same complete source tree reuses successful PR despite different merge SHA',async()=>{
  const f=fixture(),proof=await findReusableVerification(f.read,tree,merged)
  assert.equal(proof.reuse,true);assert.equal(proof.revision,revision);assert.notEqual(proof.revision,merged)
  assert.deepEqual(proof.gates,gateSteps);assert.equal(proof.artifactId,f.artifacts[0].id)
})
for(const [name,mutate] of [
  ['foreign repository',f=>{f.run.repository.id++}],
  ['foreign source repository',f=>{f.run.head_repository.id++}],
  ['foreign owner',f=>{f.run.repository.owner.id++}],
  ['different workflow',f=>{f.run.path='other.yml'}],
  ['different branch',f=>{f.run.head_branch='other'}],
  ['different event',f=>{f.run.event='push'}],
  ['failed run',f=>{f.run.conclusion='failure'}],
  ['unfinished run',f=>{f.run.status='in_progress'}],
  ['old evidence',f=>{f.run.updated_at=new Date(Date.now()-86400001).toISOString()}],
  ['different tree',f=>{f.data.get(`/git/commits/${revision}`).tree.sha=merged}],
  ['failed shard',f=>{f.jobs[1].conclusion='failure'}],
  ['wrong job attempt',f=>{f.jobs[0].run_attempt=2}],
  ['missing job',f=>{f.jobs[0].name='unknown'}],
  ['expired artifact',f=>{f.artifacts[0].expired=true}],
  ['different tested merge tree',f=>{f.artifacts[0].name=evidenceName(merged,1)}],
  ['wrong artifact run',f=>{f.artifacts[0].workflow_run.id++}],
  ['wrong artifact source',f=>{f.artifacts[0].workflow_run.head_sha=merged}],
  ['incomplete inventory',f=>{f.data.get(`/actions/runs/101/artifacts?per_page=100`).total_count=101}],
])test('rejects '+name,async()=>{const f=fixture();mutate(f);await assert.rejects(verify(f))})
for(const name of gateSteps)test('rejects skipped comprehensive gate '+name,async()=>{
  const f=fixture();f.jobs[0].steps.find(s=>s.name===name).conclusion='skipped';await assert.rejects(verify(f))
})
test('latest failed PR run does not reuse an older passing run',async()=>{
  const f=fixture(),list=f.data.get(`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${revision}&per_page=100`)
  list.workflow_runs.push({...f.run,id:102,conclusion:'failure'});list.total_count=2
  assert.equal((await findReusableVerification(f.read,tree,merged)).reuse,false)
})
test('missing CI proof selects complete fallback; unknown promotion cannot bypass acceptance',async()=>{
  const f=fixture();f.artifacts[0].expired=true
  assert.equal((await findReusableVerification(f.read,tree,merged)).reuse,false)
  f.pulls.length=0;await assert.rejects(findReusableVerification(f.read,tree,merged),/Promotion admission/)
})
test('dev promotion without acceptance stops instead of substituting full CI',async()=>{
  const f=fixture();f.pulls[0].head.ref='dev'
  await assert.rejects(findReusableVerification(f.read,tree,merged),/Dev acceptance required/)
})

const inputs=()=>({confirm:'true',deployment_run_id:'101',accepted_revision:revision,acceptance_reference:'Fictional local test acceptance'})
const identity={actorId:ownerId,actor:'fixture-owner',runId:102,attempt:1}
test('explicit owner acceptance binds exact successful Dev push deployment',async()=>{
  const f=fixture({dev:true}),receipt=await recordDevelopmentAcceptance(f.read,inputs(),identity)
  assert.equal(receipt.tree,tree);assert.equal(receipt.deployment.runId,101);assert.equal(receipt.actorId,ownerId)
})
for(const [name,change] of [
  ['no confirmation',(f,i,a)=>{i.confirm='false'}],
  ['other actor',(f,i,a)=>{a.actorId++}],
  ['missing record reference',(f,i)=>{i.acceptance_reference=''}],
  ['Dev advanced',f=>{f.data.get('/branches/dev').commit.sha=merged}],
  ['failed deployment',f=>{f.jobs.at(-1).conclusion='failure'}],
  ['skipped deployment',f=>{f.jobs.at(-1).steps[0].conclusion='skipped'}],
])test('acceptance refuses '+name,async()=>{const f=fixture({dev:true}),i=inputs(),a={...identity};change(f,i,a);await assert.rejects(recordDevelopmentAcceptance(f.read,i,a))})

function acceptedFixture(){
  const f=fixture({dev:true}),record={...f.run,id:102,path:acceptanceWorkflow,event:'workflow_dispatch',head_branch:'main',head_sha:merged,actor:{id:ownerId},triggering_actor:{id:ownerId}}
  f.data.set('/actions/workflows/record-development-acceptance.yml/runs?event=workflow_dispatch&per_page=100',{total_count:1,workflow_runs:[record]})
  f.record=record;f.recordArtifact=f.artifact(`dev-acceptance-${tree}-101-1`,record)
  f.data.set('/actions/runs/102/artifacts?per_page=100',{total_count:1,artifacts:[f.recordArtifact]})
  f.recordJob={name:'Record development acceptance',run_id:102,run_attempt:1,status:'completed',conclusion:'success',steps:['Validate and record explicit acceptance','Upload acceptance record'].map(step)}
  f.data.set('/actions/runs/102/attempts/1/jobs?per_page=100',{total_count:1,jobs:[f.recordJob]})
  const original=f.read;f.read=async path=>path.startsWith('/contents/')?{sha:f.sourceBlob??blob}:original(path)
  return f
}
test('promotion consumes matching owner record and independently revalidates Dev deployment',async()=>{
  const f=acceptedFixture(),proof=await requireDevelopmentAcceptance(f.read,tree,revision,{blob:()=>blob})
  assert.equal(proof.recordRunId,102);assert.equal(proof.deployment.runId,101)
})
for(const [name,change] of [
  ['other approver',f=>{f.record.actor={id:0}}],
  ['foreign rerun actor',f=>{f.record.triggering_actor={id:0}}],
  ['changed acceptance implementation',f=>{f.sourceBlob=revision}],
  ['expired record',f=>{f.recordArtifact.expired=true}],
  ['different accepted tree',f=>{f.recordArtifact.name=`dev-acceptance-${merged}-101-1`}],
  ['old record attempt',f=>{f.recordJob.run_attempt=2}],
  ['skipped validation',f=>{f.recordJob.steps[0].conclusion='skipped'}],
  ['Dev CI later failed',f=>{f.run.conclusion='failure'}],
])test('promotion rejects '+name,async()=>{const f=acceptedFixture();change(f);await assert.rejects(requireDevelopmentAcceptance(f.read,tree,revision,{blob:()=>blob}),/Dev acceptance required/)})

test('main routing: reuse skips only comprehensive repeats; missing proof falls back; failures stop',()=>{
  const w=workflow('deploy-production.yml')
  assert.equal(validateProductionWorkflow(stringify(w),policy),true)
  for(const enabled of ['true','false'])for(const reuseResult of ['success','failure','skipped','cancelled'])for(const proof of ['true','false',''])for(const rules of ['success','failure','skipped','cancelled']){
    const context={always:()=>true,vars:{PRODUCTION_APP_DEPLOY_ENABLED:enabled},needs:{reuse:{result:reuseResult,outputs:{reuse:proof}},rules:{result:rules}}}
    const allowed=enabled==='true'&&reuseResult==='success'&&(proof==='true'||rules==='success')
    assert.equal(vm.runInNewContext(w.jobs.verify.if.slice(3,-2),context),allowed)
    for(const gate of policy.comprehensiveGateIds){const s=w.jobs.verify.steps.find(s=>s.run===policy.gates.find(g=>g.id===gate).command);assert.equal(vm.runInNewContext(s.if.slice(3,-2),context),proof!=='true')}
  }
})
test('workflow mutation guards prevent bypassing fallback, proof, or production checks',()=>{
  for(const mutate of [
    w=>{w.jobs.reuse.steps.at(-1)['continue-on-error']=true},
    w=>{w.jobs.rules['continue-on-error']=true},
    w=>{w.jobs.rules.with={bypass:true}},
    w=>{w.jobs.reuse.permissions={'id-token':'write'}},
    w=>{w.jobs.verify.if='always()'},
    w=>{w.jobs.verify.steps.find(s=>s.run==='npm test').if='false'},
    w=>{w.jobs.verify.steps.find(s=>s.run==='node scripts/verification-evidence.mjs report').env={}},
    w=>{w.jobs.verify.steps.find(s=>s.id==='bundle').if='false'},
    w=>{w.jobs.deploy.steps.find(s=>s.name==='Verify deployed Rules indexes Functions and Hosting').if='false'},
  ]){const w=workflow('deploy-production.yml');mutate(w);assert.throws(()=>validateProductionWorkflow(stringify(w),policy))}
  for(const mutate of [
    w=>{w.jobs.verify.steps.find(s=>s.id==='evidence').if='always()'},
    w=>{w.jobs.verify.steps.find(s=>s.name==='Upload comprehensive verification evidence').with.path='other'},
    w=>{w.jobs.verify.steps.find(s=>s.run==='node scripts/verification-evidence.mjs check-pr')['continue-on-error']=true},
  ]){const w=workflow('deploy-development.yml');mutate(w);assert.throws(()=>validateDevelopmentWorkflow(stringify(w),policy))}
})
test('deployment after intentional shard skip requires successful verification and refuses cancellation',()=>{
  const w=workflow('deploy-production.yml'),condition=w.jobs.deploy.if
  // An explicit status function prevents Actions applying implicit success() to
  // skipped ancestors. The immediate verification result still must be success.
  assert.ok(condition.includes('!cancelled()'))
  for(const cancelled of [true,false])for(const result of ['success','failure','skipped','cancelled'])for(const enabled of ['true','false']){
    assert.equal(vm.runInNewContext(condition.slice(3,-2),{cancelled:()=>cancelled,needs:{verify:{result}},vars:{PRODUCTION_APP_DEPLOY_ENABLED:enabled}}),!cancelled&&result==='success'&&enabled==='true')
  }
  w.jobs.deploy.if=condition.replace('!cancelled() && ','')
  assert.throws(()=>validateProductionWorkflow(stringify(w),policy))
})
test('acceptance workflow is explicit, read-only, main-only and does not deploy',()=>{
  const w=workflow('record-development-acceptance.yml')
  assert.deepEqual(Object.keys(w.on),['workflow_dispatch']);assert.equal(w.on.workflow_dispatch.inputs.confirm.default,false)
  assert.deepEqual(w.permissions,{contents:'read',actions:'read'});assert.equal(w.jobs.record.if,"github.ref == 'refs/heads/main'")
  assert.equal(w.jobs.record.steps.filter(s=>s.run).length,1);assert.equal(w.jobs.record.steps.find(s=>s.run).run,'node scripts/development-acceptance.mjs')
  assert.ok(!/google-github-actions|firebase deploy|secrets\.|continue-on-error/.test(JSON.stringify(w)))
})
test('metadata reader limits token to repository API and disables redirects',async()=>{
  let calls=0
  const read=githubReader('fixture-not-a-secret',async(url,options)=>{calls++;assert.ok(url.startsWith('https://api.github.com/repos/'));assert.equal(options.redirect,'error');return {ok:false,status:403}})
  for(const path of ['https://other.invalid','/../other'])await assert.rejects(read(path),/Unscoped/)
  assert.equal(calls,0);await assert.rejects(read('/actions/runs/1'),/^Error: GitHub metadata unavailable: 403$/);assert.equal(calls,1)
})
