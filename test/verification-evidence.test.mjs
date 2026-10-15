import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {parse,stringify} from 'yaml'
import vm from 'node:vm'
import {spawnSync} from 'node:child_process'
import {repository,repositoryId,ownerId,verificationWorkflow,gateSteps,evidenceName,githubReader,validateVerification} from '../scripts/lib/verification-evidence.mjs'
import {findReusableVerification,resolveDevelopmentPromotion,validatePromotionVerification,applicationIdentity,verifyApplication} from '../scripts/verification-evidence.mjs'
import {recordDevelopmentAcceptance,requireDevelopmentAcceptance,acceptanceWorkflow,verifyContinuation,continuationProof,repairBaseline,repairParent} from '../scripts/development-acceptance.mjs'
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
  ['future evidence timestamp',f=>{f.run.updated_at=new Date(Date.now()+120000).toISOString()}],
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

test('metadata reader limits token to repository API and disables redirects',async()=>{
  let calls=0
  const read=githubReader('fixture-not-a-secret',async(url,options)=>{calls++;assert.ok(url.startsWith('https://api.github.com/repos/'));assert.equal(options.redirect,'error');return {ok:false,status:403}})
  for(const path of ['https://other.invalid','/../other',`/compare/${revision}...main`,`/compare/${revision}...${merged}/../other`])await assert.rejects(read(path),/Unscoped/)
  assert.equal(calls,0);await assert.rejects(read('/actions/runs/1'),/^Error: GitHub metadata unavailable: 403$/);assert.equal(calls,1)
  await assert.rejects(read(`/compare/${revision}...${merged}`),/^Error: GitHub metadata unavailable: 403$/);assert.equal(calls,2)
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
const documentTree='8'.repeat(40),candidateRevision='f'.repeat(40),candidateTree='1'.repeat(40)
function continuationTrees(f,from,to,beforeTree,afterTree,path='docs/operations.md'){
  const before={sha:beforeTree,truncated:false,tree:[{path,type:'blob',mode:'100644',sha:blob},{path:'app.vue',type:'blob',mode:'100644',sha:'7'.repeat(40)}]}
  const after=structuredClone(before);after.sha=afterTree;after.tree[0].sha='6'.repeat(40)
  f.data.set('/git/commits/'+to,{tree:{sha:afterTree},parents:[{sha:repairParent},{sha:'5'.repeat(40)}]})
  f.data.set(`/compare/${from}...${to}`,{status:'ahead',merge_base_commit:{sha:from}})
  f.data.set(`/git/trees/${beforeTree}?recursive=1`,before);f.data.set(`/git/trees/${afterTree}?recursive=1`,after)
  return {before,after}
}
function documentAcceptanceFixture(){
  const f=acceptedFixture(),trees=continuationTrees(f,revision,merged,tree,documentTree)
  f.data.get('/branches/dev').commit.sha=merged
  const run={...f.run,id:104,head_sha:merged},jobs=[{name:'Verify development deployment',run_id:104,run_attempt:1,status:'completed',conclusion:'success',steps:['Check documentation governance','Verify documentation scope and whitespace'].map(step)},{name:'Deploy to termite-warranty-dev',conclusion:'skipped'}]
  f.data.set(`/actions/workflows/deploy-development.yml/runs?event=push&head_sha=${merged}&per_page=100`,{total_count:1,workflow_runs:[run]})
  f.data.set('/actions/runs/104/attempts/1/jobs?per_page=100',{total_count:2,jobs})
  f.record.head_sha=merged;f.recordArtifact.workflow_run.head_sha=merged
  f.recordArtifact.name=`dev-acceptance-v2-${documentTree}-101-101-1`
  return Object.assign(f,trees,{documentRun:run,documentJobs:jobs})
}
test('v2 records the original accepted deployment after validated document-only continuation',async()=>{
  const f=documentAcceptanceFixture(),r=await recordDevelopmentAcceptance(f.read,inputs(),{...identity,checkout:merged})
  assert.equal(r.schema,2);assert.equal(r.revision,revision);assert.equal(r.accepted.revision,revision)
  assert.equal(r.promotion.revision,merged);assert.equal(r.tree,documentTree);assert.equal(r.deployment.tree,tree)
  const proof=await requireDevelopmentAcceptance(f.read,documentTree,merged,{blob:()=>blob})
  assert.equal(proof.accepted.runId,101);assert.equal(proof.promotion.tree,documentTree)
  const event=promotionEvent();event.pull_request.head.sha=merged
  const promoted=await resolveDevelopmentPromotion(f.read,documentTree,event,{blob:()=>blob})
  assert.equal(promoted.tree,documentTree);assert.equal(promoted.verificationTree,tree)
})
for(const [name,change] of [
  ['runtime change',f=>{f.after.tree[1].sha=revision}],
  ['document deletion',f=>{f.after.tree.shift()}],
  ['new document',f=>{f.after.tree.push({path:'docs/new.md',type:'blob',mode:'100644',sha:blob})}],
  ['executable document',f=>{f.after.tree[0].mode='100755'}],
  ['symlink document',f=>{f.after.tree[0].mode='120000'}],
  ['truncated tree',f=>{f.after.truncated=true}],
  ['duplicate entry',f=>{f.after.tree.push(f.after.tree[0])}],
  ['diverged history',f=>{f.data.get(`/compare/${revision}...${merged}`).status='diverged'}],
  ['wrong ancestor',f=>{f.data.get(`/compare/${revision}...${merged}`).merge_base_commit.sha=blob}],
  ['failed document run',f=>{f.documentRun.conclusion='failure'}],
  ['skipped document check',f=>{f.documentJobs[0].steps[1].conclusion='skipped'}],
  ['unexpected deployment',f=>{f.documentJobs[1].conclusion='success'}],
  ['failed original deployment',f=>{f.run.conclusion='failure'}],
])test('v2 document continuation rejects '+name,async()=>{
  const f=documentAcceptanceFixture();change(f)
  await assert.rejects(recordDevelopmentAcceptance(f.read,inputs(),{...identity,checkout:merged}))
  await assert.rejects(requireDevelopmentAcceptance(f.read,documentTree,merged,{blob:()=>blob}))
})
test('recording rejects an advanced checkout and an incorrect accepted run revision',async()=>{
  const f=documentAcceptanceFixture()
  await assert.rejects(recordDevelopmentAcceptance(f.read,inputs(),{...identity,checkout:revision}))
  await assert.rejects(recordDevelopmentAcceptance(f.read,{...inputs(),accepted_revision:blob},{...identity,checkout:merged}))
})
function repairFixture(){
  const initial=fixture({dev:true})
  function clone(value,candidate){
    if(typeof value==='number')return candidate&&[100,101].includes(value)?value+200:value
    if(typeof value==='string')return value.replaceAll(revision,candidate?candidateRevision:repairBaseline).replaceAll(tree,candidate?candidateTree:tree).replaceAll('e'.repeat(40),candidate?'2'.repeat(40):'e'.repeat(40)).replace(/(\/actions\/runs\/)(100|101)(?=\/|$)/g,(_,p,n)=>p+(candidate?Number(n)+200:n))
    if(Array.isArray(value))return value.map(x=>clone(x,candidate))
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clone(v,candidate)]))
    return value
  }
  const data=new Map()
  for(const candidate of [false,true])for(const [k,v] of initial.data)data.set(clone(k,candidate),clone(v,candidate))
  const f={data,read:async p=>{assert.ok(data.has(p),'Missing fixture '+p);return data.get(p)}}
  const trees=continuationTrees(f,repairBaseline,candidateRevision,tree,candidateTree,'scripts/development-acceptance.mjs')
  return {...f,...trees}
}
test('approved bootstrap keeps original acceptance and requires fresh candidate full CI and deployment',async()=>{
  const f=repairFixture(),proof=await continuationProof(f.read,101,301,candidateRevision,candidateRevision)
  assert.equal(proof.accepted.revision,repairBaseline);assert.equal(proof.deployment.revision,candidateRevision)
  assert.equal(proof.promotion.tree,candidateTree)
  const receipt=await recordDevelopmentAcceptance(f.read,{...inputs(),accepted_revision:repairBaseline,candidate_deployment_run_id:'301'},{...identity,checkout:candidateRevision})
  assert.equal(receipt.revision,repairBaseline);assert.equal(receipt.schema,2)
})
for(const [name,change] of [
  ['later merge',f=>{f.data.get('/git/commits/'+candidateRevision).parents[0].sha=revision}],
  ['candidate full CI failed',f=>{f.data.get('/actions/runs/301/attempts/1/jobs?per_page=100').jobs[1].conclusion='failure'}],
  ['candidate deployment failed',f=>{f.data.get('/actions/runs/301/attempts/1/jobs?per_page=100').jobs.at(-1).conclusion='failure'}],
  ['original deployment failed',f=>{f.data.get('/actions/runs/101').conclusion='failure'}],
  ['build setting changed',f=>{f.after.tree[1]={path:'firebase.json',type:'blob',mode:'100644',sha:blob}}],
  ['runtime changed',f=>{f.after.tree[1].sha=revision}],
])test('approved bootstrap rejects '+name,async()=>{const f=repairFixture();change(f);await assert.rejects(continuationProof(f.read,101,301,candidateRevision,candidateRevision))})
test('repair allowance is never used for ordinary document continuation',async()=>{
  const f=repairFixture();await assert.rejects(verifyContinuation(f.read,repairBaseline,candidateRevision))
})

test('main revalidates v2 document promotion without claiming the document tree was deployed',async()=>{
  const f=documentAcceptanceFixture(),run={...f.run,id:103,event:'pull_request',head_sha:merged}
  const job=(name,names)=>({name,run_id:103,run_attempt:1,status:'completed',conclusion:'success',steps:names.map(step)})
  const jobs=[job('Resolve verified source',['Resolve source verification']),job('Verify development deployment',['Require verification or source evidence','Record verified source evidence','Publish comprehensive verification evidence','Upload comprehensive verification evidence'])]
  f.data.set('/actions/runs/103/attempts/1/jobs?per_page=100',{total_count:2,jobs})
  f.data.set('/actions/runs/103/artifacts?per_page=100',{total_count:1,artifacts:[f.artifact(evidenceName(documentTree,1),run)]})
  const acceptance=await requireDevelopmentAcceptance(f.read,documentTree,merged,{blob:()=>blob})
  assert.equal((await validatePromotionVerification(f.read,run,documentTree,merged,acceptance)).source,'accepted-dev')
  assert.equal(acceptance.deployment.revision,revision)
  acceptance.promotion.tree=tree
  await assert.rejects(validatePromotionVerification(f.read,run,documentTree,merged,acceptance))
})
test('v2 cannot conceal a different original run, forged record tree or changed producer',async()=>{
  for(const change of [f=>{f.recordArtifact.name=`dev-acceptance-v2-${tree}-101-101-1`},f=>{f.recordArtifact.name=`dev-acceptance-v2-${documentTree}-999-101-1`},f=>{f.sourceBlob=revision}]){
    const f=documentAcceptanceFixture();change(f);await assert.rejects(requireDevelopmentAcceptance(f.read,documentTree,merged,{blob:()=>blob}))
  }
})
test('a second document continuation requires its own successful document verification',async()=>{
  const f=documentAcceptanceFixture(),next='9'.repeat(40),nextTree='4'.repeat(40)
  continuationTrees(f,merged,next,documentTree,nextTree)
  await assert.rejects(requireDevelopmentAcceptance(f.read,nextTree,next,{blob:()=>blob}))
  const run={...f.documentRun,id:105,head_sha:next}
  f.data.set(`/actions/workflows/deploy-development.yml/runs?event=push&head_sha=${next}&per_page=100`,{total_count:1,workflow_runs:[run]})
  const jobs=structuredClone(f.documentJobs);jobs[0].run_id=105
  f.data.set('/actions/runs/105/attempts/1/jobs?per_page=100',{total_count:2,jobs})
  const r=await requireDevelopmentAcceptance(f.read,nextTree,next,{blob:()=>blob})
  assert.equal(r.accepted.revision,revision);assert.equal(r.promotion.revision,next)
})
