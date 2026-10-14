import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {parse,stringify} from 'yaml'
import vm from 'node:vm'
import {spawnSync} from 'node:child_process'
import {repository,repositoryId,ownerId,verificationWorkflow,gateSteps,evidenceName,githubReader,validateVerification} from '../scripts/lib/verification-evidence.mjs'
import {findReusableVerification,resolveDevelopmentPromotion,validatePromotionVerification,applicationIdentity,verifyApplication} from '../scripts/verification-evidence.mjs'
import {recordDevelopmentAcceptance,requireDevelopmentAcceptance,acceptanceWorkflow} from '../scripts/development-acceptance.mjs'
import {validateProductionWorkflow} from '../scripts/production-workflow-contract.mjs'
import {validateDevelopmentWorkflow} from '../scripts/development-workflow-contract.mjs'
import {findDevelopmentVerification,validateDevelopmentDeployment} from '../scripts/lib/development-verification.mjs'
import {preservedDevelopmentParameters,developmentConfig} from '../scripts/development-deployment.mjs'

const revision='a'.repeat(40),merged='b'.repeat(40),tree='c'.repeat(40),blob='d'.repeat(40)
const policy=JSON.parse(readFileSync(new URL('../governance/verification-policy.json',import.meta.url)))
const workflow=name=>parse(readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8'))
const step=name=>({name,status:'completed',conclusion:'success'})
function fixture({dev=false}={}){
  const run={id:101,run_attempt:1,repository:{id:repositoryId,owner:{id:ownerId}},head_repository:{id:repositoryId},path:verificationWorkflow,event:dev?'push':'pull_request',head_branch:dev?'dev':'codex/change',head_sha:revision,status:'completed',conclusion:'success',updated_at:new Date().toISOString()}
  const job=name=>({name,run_id:run.id,run_attempt:1,status:'completed',conclusion:'success',steps:[]})
  const jobs=[{...job('Verify development deployment'),steps:['Run Firestore and Callable Emulator tests','Verify application results and Hosting artifact','Require verification or source evidence','Publish comprehensive verification evidence','Upload comprehensive verification evidence','Check Hosting artifact','Upload verified Hosting artifact'].map(step)},...['shard-property-warranty','shard-default-recovery','shard-historical-intake'].map(id=>job(`rules / shard (${id})`)),{...job('Verify application gates'),steps:[...gateSteps.filter(n=>n!=='Run Firestore and Callable Emulator tests'),'Publish application identity','Check Hosting artifact','Upload verified Hosting artifact'].map(step)}]
  if(dev)jobs.push({...job('Resolve verified source'),steps:[step('Resolve source verification')]})
  if(dev)jobs.push({...job('Deploy to termite-warranty-dev'),steps:['Prepare explicit Dev deployment and preserve protection hold','Deploy Firestore, Functions, and Hosting','Verify deployed Dev release and protection hold'].map(step)})
  const artifact=(name,r=run)=>({id:200+r.id,name,expired:false,size_in_bytes:500,expires_at:new Date(Date.now()+86400000).toISOString(),workflow_run:{id:r.id,repository_id:repositoryId,head_repository_id:repositoryId,head_sha:r.head_sha}})
  const artifacts=[artifact(evidenceName(tree,1)),{...artifact(`firebase-hosting-${tree}-1`),id:401}]
  const pulls=[{number:15,merged_at:new Date().toISOString(),merge_commit_sha:merged,base:{ref:dev?'main':'dev',repo:{id:repositoryId}},head:{ref:run.head_branch,sha:revision,repo:{id:repositoryId}}}]
  const data=new Map([
    [`/commits/${merged}/pulls?per_page=100`,pulls],
    [`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${revision}&per_page=100`,{total_count:1,workflow_runs:[run]}],
    [`/git/commits/${revision}`,{tree:{sha:tree}}],
    [`/actions/runs/${run.id}`,run],
    [`/actions/runs/${run.id}/attempts/1/jobs?per_page=100`,{total_count:jobs.length,jobs}],
    [`/actions/runs/${run.id}/artifacts?per_page=100`,{total_count:2,artifacts}],
    ['/branches/dev',{commit:{sha:revision}}],
  ])
  if(dev){
    const sourceRevision='e'.repeat(40),sourceRun={...run,id:100,event:'pull_request',head_branch:'codex/change',head_sha:sourceRevision}
    const sourceJobs=structuredClone(jobs.slice(0,5)).map(j=>({...j,run_id:100}))
    const sourceArtifacts=[artifact(evidenceName(tree,1),sourceRun),{...artifact(`firebase-hosting-${tree}-1`,sourceRun),id:402}]
    data.set(`/commits/${revision}/pulls?per_page=100`,[{number:14,merged_at:new Date().toISOString(),merge_commit_sha:revision,base:{ref:'dev',repo:{id:repositoryId}},head:{ref:'codex/change',sha:sourceRevision,repo:{id:repositoryId}}}])
    data.set(`/git/commits/${sourceRevision}`,{tree:{sha:tree}})
    data.set(`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${sourceRevision}&per_page=100`,{total_count:1,workflow_runs:[sourceRun]})
    data.set('/actions/runs/100/attempts/1/jobs?per_page=100',{total_count:5,jobs:sourceJobs})
    data.set('/actions/runs/100/artifacts?per_page=100',{total_count:2,artifacts:sourceArtifacts})
  }
  const read=async path=>{assert.ok(data.has(path),'Unexpected API path: '+path);return data.get(path)}
  return {run,jobs,artifacts,pulls,data,read,artifact}
}
const verify=f=>validateVerification(f.read,f.run,tree,{event:'pull_request',branch:'codex/change',revision})

test('Dev deployment fixes both DB targets and retains disabled backup parameters',()=>{
  const fn=()=>({state:'ACTIVE',serviceConfig:{environmentVariables:{RECOVERY_CONTROL_DATABASE:'recovery-control',RECOVERY_BACKUP_AUTOMATION:'false',RECOVERY_AUTH_BACKUP_BUCKET:'retained-fixture'}}})
  const params=preservedDevelopmentParameters([fn(),fn()]);assert.equal(params.RECOVERY_BACKUP_AUTOMATION,'false');assert.equal(params.RECOVERY_AUTH_BACKUP_BUCKET,'retained-fixture')
  const config=developmentConfig({hosting:{public:'.output/public',rewrites:[]}})
  assert.deepEqual(config.firestore.map(x=>x.database),['(default)','recovery-control']);assert.equal(config.hosting.site,'termite-warranty-dev')
  for(const mutate of [x=>{x.state='FAILED'},x=>{x.serviceConfig.environmentVariables.RECOVERY_BACKUP_AUTOMATION='true'},x=>{x.serviceConfig.environmentVariables.RECOVERY_CONTROL_DATABASE='(default)'},x=>{x.serviceConfig.environmentVariables.RECOVERY_AUTH_BACKUP_BUCKET='other'},x=>{x.serviceConfig.environmentVariables.RECOVERY_AUTH_BACKUP_BUCKET='bad\nvalue'}]){const x=fn();mutate(x);assert.throws(()=>preservedDevelopmentParameters([fn(),x]))}
})
test('acceptance refuses Dev deploy without successful post-deployment and protection proof',async()=>{
  const f=fixture({dev:true});f.jobs.at(-1).steps.at(-1).conclusion='skipped'
  await assert.rejects(recordDevelopmentAcceptance(f.read,inputs(),identity))
})

test('Dev reuses feature PR full verification despite different merge SHA',async()=>{
  const f=fixture(),proof=await findDevelopmentVerification(f.read,tree,merged)
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
  const f=fixture();f.jobs.flatMap(j=>j.steps).find(s=>s.name===name).conclusion='skipped';await assert.rejects(verify(f))
})
test('latest failed PR run does not reuse an older passing run',async()=>{
  const f=fixture(),list=f.data.get(`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${revision}&per_page=100`)
  list.workflow_runs.push({...f.run,id:102,conclusion:'failure'});list.total_count=2
  assert.equal((await findDevelopmentVerification(f.read,tree,merged)).reuse,false)
})
test('missing CI proof selects complete fallback; unknown promotion cannot bypass acceptance',async()=>{
  const f=fixture();f.artifacts[0].expired=true
  assert.equal((await findDevelopmentVerification(f.read,tree,merged)).reuse,false)
  f.pulls.length=0;await assert.rejects(findDevelopmentVerification(f.read,tree,merged),/Promotion admission/)
})
test('dev promotion without acceptance stops instead of substituting full CI',async()=>{
  const f=fixture();f.pulls[0].head.ref='dev';f.pulls[0].base.ref='main'
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
  const f=fixture({dev:true}),record={...f.run,id:102,path:acceptanceWorkflow,event:'workflow_dispatch',head_branch:'dev',head_sha:revision,actor:{id:ownerId},triggering_actor:{id:ownerId}}
  f.data.set('/actions/workflows/record-development-acceptance.yml/runs?event=workflow_dispatch&per_page=100',{total_count:1,workflow_runs:[record]})
  f.record=record;f.recordArtifact=f.artifact(`dev-acceptance-${tree}-101-1`,record)
  f.data.set('/actions/runs/102/artifacts?per_page=100',{total_count:1,artifacts:[f.recordArtifact]})
  f.recordJob={name:'Record development acceptance',run_id:102,run_attempt:1,status:'completed',conclusion:'success',steps:['Validate and record explicit acceptance','Upload acceptance record'].map(step)}
  f.data.set('/actions/runs/102/attempts/1/jobs?per_page=100',{total_count:1,jobs:[f.recordJob]})
  const original=f.read;f.read=async path=>path.startsWith('/contents/')?{sha:f.sourceBlob??blob}:original(path)
  return f
}

const promotionEvent=()=>({pull_request:{head:{ref:'dev',sha:revision,repo:{id:repositoryId}},base:{ref:'main',repo:{id:repositoryId}}}})
test('accepted Dev promotion reuses the original full CI and deployment without running another suite',async()=>{
  const f=acceptedFixture(),proof=await resolveDevelopmentPromotion(f.read,tree,promotionEvent(),{blob:()=>blob})
  assert.equal(proof.reuse,true);assert.equal(proof.runId,101);assert.deepEqual(proof.gates,gateSteps)
})
for(const [name,change] of [
  ['foreign Dev branch',(f,e)=>{e.pull_request.head.repo.id++}],
  ['missing acceptance',f=>{f.recordJob.conclusion='failure'}],
  ['failed Dev suite',f=>{f.jobs[1].conclusion='failure'}],
  ['different accepted revision',(f,e)=>{e.pull_request.head.sha=merged}],
])test('PR reuse refuses '+name,async()=>{const f=acceptedFixture(),e=promotionEvent();change(f,e);await assert.rejects(resolveDevelopmentPromotion(f.read,tree,e,{blob:()=>blob}))})
test('feature PR never reuses Dev evidence',async()=>{
  const e=promotionEvent();e.pull_request.head.ref='codex/change'
  await assert.rejects(resolveDevelopmentPromotion(()=>{throw Error('Must not read')},tree,e),/Main promotion requires/)
})
function promotionFixture(){
  const f=acceptedFixture(),run={...f.run,id:103,event:'pull_request'},job=(name,names)=>({name,run_id:103,run_attempt:1,status:'completed',conclusion:'success',steps:names.map(step)})
  const jobs=[job('Resolve verified source',['Resolve source verification']),job('Verify development deployment',['Require verification or source evidence','Record verified source evidence','Publish comprehensive verification evidence','Upload comprehensive verification evidence'])]
  f.pulls[0].head.ref='dev'
  f.data.set(`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${revision}&per_page=100`,{total_count:1,workflow_runs:[run]})
  f.data.set('/actions/runs/103/attempts/1/jobs?per_page=100',{total_count:2,jobs})
  f.data.set('/actions/runs/103/artifacts?per_page=100',{total_count:1,artifacts:[f.artifact(evidenceName(tree,1),run)]})
  return {...f,promotionRun:run,promotionJobs:jobs}
}
test('main independently revalidates Dev acceptance and PR admission for transitive reuse',async()=>{
  const f=promotionFixture(),proof=await findReusableVerification(f.read,tree,merged,{blob:()=>blob})
  assert.equal(proof.reuse,true);assert.equal(proof.source,'accepted-dev');assert.equal(proof.acceptance.deployment.runId,101)
})
for(const [name,change] of [
  ['failed admission',f=>{f.promotionJobs[0].conclusion='failure'}],
  ['skipped proof',f=>{f.promotionJobs[1].steps[1].conclusion='skipped'}],
  ['wrong attempt',f=>{f.promotionJobs[1].run_attempt=2}],
  ['missing source',f=>{f.promotionJobs.shift();f.data.get('/actions/runs/103/attempts/1/jobs?per_page=100').total_count=1}],
])test('main falls back when promotion PR has '+name,async()=>{
  const f=promotionFixture();change(f);assert.equal((await findReusableVerification(f.read,tree,merged,{blob:()=>blob})).reuse,false)
})
test('main cannot replace invalidated Dev acceptance with full CI',async()=>{
  const f=promotionFixture();f.recordArtifact.expired=true
  await assert.rejects(findReusableVerification(f.read,tree,merged,{blob:()=>blob}),/Dev acceptance required/)
})
test('feature PR runs full CI, Dev reuses or falls back, and main PR requires acceptance',()=>{
  const w=workflow('deploy-development.yml')
  assert.deepEqual(workflow('compare-rules.yml').on.pull_request.branches,['dev'])
  for(const event of ['push','pull_request','workflow_dispatch'])for(const branch of ['main','dev','codex/change'])for(const base of ['dev','main',''])for(const reuse of ['true','false'])for(const result of ['success','failure','skipped']){
    const context={always:()=>true,github:{event_name:event,ref:'refs/heads/'+branch,base_ref:base},needs:{scope:{result:'success',outputs:{documentationOnly:'false'}},source:{result,outputs:{reuse}}}}
    assert.equal(vm.runInNewContext(w.jobs.source.if.slice(3,-2),context),event==='pull_request'&&base==='main'||['push','workflow_dispatch'].includes(event)&&branch==='dev')
    assert.equal(vm.runInNewContext(w.jobs.rules.if.slice(3,-2),context),!(event==='push'&&branch==='main')&&result!=='failure'&&reuse!=='true'&&!(event==='pull_request'&&base==='main'))
  }
  for(const mutate of [w=>{w.jobs.source.if='true'},w=>{w.jobs.source.steps[2].env={}},w=>{w.jobs.source.steps[2]['continue-on-error']=true},w=>{w.jobs.verify.steps[0].run='echo success'},w=>{w.jobs.verify.steps.find(s=>s.name==='Record verified source evidence').if='false'}]){
    const changed=workflow('deploy-development.yml');mutate(changed);assert.throws(()=>validateDevelopmentWorkflow(stringify(changed),policy))
  }
})
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
    const context={always:()=>true,vars:{PRODUCTION_APP_DEPLOY_ENABLED:enabled},needs:{scope:{result:'success',outputs:{documentationOnly:'false'}},reuse:{result:reuseResult,outputs:{reuse:proof}},rules:{result:rules}}}
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
    w=>{w.jobs.application.steps.find(s=>s.run==='node scripts/verification-evidence.mjs check-pr')['continue-on-error']=true},
  ]){const w=workflow('deploy-development.yml');mutate(w);assert.throws(()=>validateDevelopmentWorkflow(stringify(w),policy))}
})
test('deployment after intentional shard skip requires successful verification and refuses cancellation',()=>{
  const w=workflow('deploy-production.yml'),condition=w.jobs.deploy.if
  // An explicit status function prevents Actions applying implicit success() to
  // skipped ancestors. The immediate verification result still must be success.
  assert.ok(condition.includes('!cancelled()'))
  for(const cancelled of [true,false])for(const result of ['success','failure','skipped','cancelled'])for(const enabled of ['true','false']){
    assert.equal(vm.runInNewContext(condition.slice(3,-2),{cancelled:()=>cancelled,needs:{scope:{result:'success',outputs:{documentationOnly:'false'}},verify:{result}},vars:{PRODUCTION_APP_DEPLOY_ENABLED:enabled}}),!cancelled&&result==='success'&&enabled==='true')
  }
  w.jobs.deploy.if=condition.replace('!cancelled() && ','')
  assert.throws(()=>validateProductionWorkflow(stringify(w),policy))
})
test('acceptance workflow is explicit, read-only, Dev-only and does not deploy',()=>{
  const w=workflow('record-development-acceptance.yml')
  assert.deepEqual(Object.keys(w.on),['workflow_dispatch']);assert.equal(w.on.workflow_dispatch.inputs.confirm.default,false)
  assert.deepEqual(w.permissions,{contents:'read',actions:'read'});assert.equal(w.jobs.record.if,"github.ref == 'refs/heads/dev'")
  assert.equal(w.jobs.record.steps.filter(s=>s.run).length,1);assert.equal(w.jobs.record.steps.find(s=>s.run).run,'node scripts/development-acceptance.mjs')
  assert.ok(!/google-github-actions|firebase deploy|secrets\.|continue-on-error/.test(JSON.stringify(w)))
})
test('metadata reader limits token to repository API and disables redirects',async()=>{
  let calls=0
  const read=githubReader('fixture-not-a-secret',async(url,options)=>{calls++;assert.ok(url.startsWith('https://api.github.com/repos/'));assert.equal(options.redirect,'error');return {ok:false,status:403}})
  for(const path of ['https://other.invalid','/../other'])await assert.rejects(read(path),/Unscoped/)
  assert.equal(calls,0);await assert.rejects(read('/actions/runs/1'),/^Error: GitHub metadata unavailable: 403$/);assert.equal(calls,1)
})

function reusedDevFixture(){
  const f=promotionFixture(),verify=f.jobs.find(j=>j.name==='Verify development deployment')
  for(const s of verify.steps)if(gateSteps.includes(s.name)||s.name==='Verify application results and Hosting artifact')s.conclusion='skipped'
  const app=f.jobs.find(j=>j.name==='Verify application gates');app.conclusion='skipped';app.steps=[]
  verify.steps.push(step('Record verified source evidence'),step('Download source PR Hosting artifact'))
  return f
}
test('full feature PR to Dev to accepted promotion to main evidence chain succeeds',async()=>{
  const f=reusedDevFixture(),proof=await findReusableVerification(f.read,tree,merged,{blob:()=>blob})
  assert.equal(proof.reuse,true);assert.equal(proof.acceptance.deployment.source.source,'feature-pr');assert.equal(proof.acceptance.deployment.source.runId,100)
})
for(const [name,change] of [
  ['original feature PR failed',f=>{f.data.get('/actions/runs/100/attempts/1/jobs?per_page=100').jobs[1].conclusion='failure'}],
  ['original artifact expired',f=>{f.data.get('/actions/runs/100/artifacts?per_page=100').artifacts[0].expired=true}],
  ['Hosting source artifact missing',f=>{f.data.get('/actions/runs/100/artifacts?per_page=100').artifacts[1].name='foreign'}],
  ['source download skipped',f=>{f.jobs[0].steps.at(-1).conclusion='skipped'}],
  ['source resolver failed',f=>{f.jobs.find(j=>j.name==='Resolve verified source').conclusion='failure'}],
])test('transitive reuse refuses '+name,async()=>{const f=reusedDevFixture();change(f);await assert.rejects(findReusableVerification(f.read,tree,merged,{blob:()=>blob}),/Dev acceptance required/)})
test('Dev fallback executes its complete suite when source proof is unavailable',async()=>{
  const f=acceptedFixture();f.data.get('/actions/runs/100/artifacts?per_page=100').artifacts[1].expired=true
  const proof=await validateDevelopmentDeployment(f.read,f.run,tree,revision);assert.equal(proof.source,'dev-fallback')
})
test('direct Dev push without a merged feature PR cannot be admitted',async()=>{
  const f=acceptedFixture();f.data.set('/commits/'+revision+'/pulls?per_page=100',[])
  await assert.rejects(validateDevelopmentDeployment(f.read,f.run,tree,revision),/Promotion admission/)
})

const appEnv=()=>({GITHUB_REPOSITORY:repository,GITHUB_EVENT_NAME:'pull_request',GITHUB_SHA:revision,GITHUB_RUN_ID:'101',GITHUB_RUN_ATTEMPT:'1'})
test('aggregate binds application checkout, six successful gates and immutable Hosting artifact to this execution',async()=>{
  const f=fixture(),expected=applicationIdentity(appEnv(),tree,revision)
  assert.deepEqual(await verifyApplication(f.read,{...expected},expected,'401'),expected)
  for(const key of Object.keys(expected))await assert.rejects(verifyApplication(f.read,{...expected,[key]:'foreign'},expected,'401'))
  await assert.rejects(verifyApplication(f.read,{...expected},expected,'402'))
  for(const key of Object.keys(appEnv()))assert.throws(()=>applicationIdentity({...appEnv(),[key]:'foreign'},tree,revision))
  assert.throws(()=>applicationIdentity(appEnv(),merged,merged))
})
for(const [name,change] of [
  ['failed',j=>j.conclusion='failure'],['cancelled',j=>j.conclusion='cancelled'],['skipped',j=>j.conclusion='skipped'],
  ['unfinished',j=>j.status='in_progress'],['foreign run',j=>j.run_id++],['old attempt',j=>j.run_attempt++],
  ['missing',j=>j.name='other'],['Hosting upload skipped',j=>j.steps.at(-1).conclusion='skipped'],
])test('aggregate and downstream reuse refuse application producer '+name,async()=>{
  const f=fixture(),expected=applicationIdentity(appEnv(),tree,revision)
  change(f.jobs[4]);await assert.rejects(verifyApplication(f.read,expected,expected,'401'));await assert.rejects(verify(f))
})
test('aggregate refuses duplicate app job and stale, duplicate or foreign Hosting metadata',async()=>{
  for(const mutate of [
    f=>{f.jobs.push(structuredClone(f.jobs[4]));f.data.get('/actions/runs/101/attempts/1/jobs?per_page=100').total_count++},
    f=>f.artifacts[1].expired=true,f=>f.artifacts[1].name=`firebase-hosting-${merged}-1`,
    f=>f.artifacts[1].workflow_run.head_sha=merged,f=>f.artifacts[1].workflow_run.id++,
    f=>{f.artifacts.push(structuredClone(f.artifacts[1]));f.data.get('/actions/runs/101/artifacts?per_page=100').total_count++},
    f=>f.run.run_attempt++,f=>f.run.repository.id++,
  ]){const f=fixture(),expected=applicationIdentity(appEnv(),tree,revision);mutate(f);await assert.rejects(verifyApplication(f.read,expected,expected,'401'))}
})
test('Hosting artifact from a successful app cannot authorize reuse after Rules or aggregate failure',async()=>{
  for(const index of [0,1,2,3])for(const conclusion of ['failure','cancelled','skipped']){
    const f=fixture();f.jobs[index].conclusion=conclusion;await assert.rejects(verify(f))
  }
})
test('parallel topology and producer mutations cannot bypass the required aggregate',()=>{
  const w=workflow('deploy-development.yml')
  assert.deepEqual(w.jobs.application.needs,w.jobs.rules.needs)
  assert.equal(w.jobs.application.if,w.jobs.rules.if)
  assert.deepEqual(w.jobs.verify.needs,['rules','source','scope','application'])
  assert.equal(w.jobs.verify.name,'Verify development deployment')
  for(const mutate of [
    w=>w.jobs.application.if='true',w=>w.jobs.application.needs=['scope'],w=>w.jobs.application.permissions={'id-token':'write'},
    w=>w.jobs.application.environment='development',w=>w.jobs.application['continue-on-error']=true,
    w=>w.jobs.application.outputs.artifactId='401',w=>w.jobs.application.outputs.proof='forged',
    w=>w.jobs.application.steps.push({run:'echo extra'}),w=>w.jobs.application.steps.reverse(),
    w=>w.jobs.application.steps.find(s=>s.id==='hosting').with.path='other',
    w=>w.jobs.application.steps.find(s=>s.id==='evidence').run='echo success',
    w=>w.jobs.verify.needs.pop(),w=>w.jobs.verify.steps.find(s=>s.run==='node scripts/verification-evidence.mjs check-application').if='false',
    w=>w.jobs.verify.steps.find(s=>s.run==='node scripts/verification-evidence.mjs check-application').env.APPLICATION_HOSTING_ARTIFACT_ID='401',
    w=>w.jobs.verify.steps.find(s=>s.name==='Upload verified Hosting artifact').if='true',
  ]){const changed=structuredClone(w);mutate(changed);assert.throws(()=>validateDevelopmentWorkflow(stringify(changed),policy))}
})
test('actual aggregate admission refuses failed/cancelled/unexpected skips and admits only full, docs or reused paths',()=>{
  const command=workflow('deploy-development.yml').jobs.verify.steps[0].run
  const cases=[
    ['false','false','skipped','success','success',true],['false','false','success','success','success',true],
    ['true','false','skipped','skipped','skipped',true],['false','true','success','skipped','skipped',true],
    ...['failure','cancelled','skipped'].flatMap(bad=>[['false','false','skipped',bad,'success',false],['false','false','skipped','success',bad,false]]),
    ['false','true','failure','skipped','skipped',false],['false','true','skipped','skipped','skipped',false],
    ['false','true','success','success','skipped',false],['false','true','success','skipped','success',false],
    ['true','false','skipped','skipped','success',false],
  ]
  for(const [docs,reuse,source,rules,application,allowed] of cases){
    const values={'scope.result':'success','scope.outputs.documentationOnly':docs,'source.outputs.reuse':reuse,'source.result':source,'rules.result':rules,'application.result':application}
    const run=command.replace(/\$\{\{ needs\.([^} ]+) \}\}/g,(_,key)=>values[key])
    const result=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',run],{encoding:'utf8',windowsHide:true})
    assert.ifError(result.error);assert.equal(result.status===0,allowed,JSON.stringify({docs,reuse,source,rules,application,stderr:result.stderr}))
  }
})
