import assert from 'node:assert/strict'
import {test} from 'node:test'
import {classifyDiff,pathKind,inputDigests} from '../scripts/lib/change-scope.mjs'
import {compareEvent,prEvidence,assertAggregate,assertCurrentRun,evidenceName,hostingName,resolveScope,deploymentEvidence,acceptanceFor} from '../scripts/pipeline.mjs'
import {requiredCommands,validateLocalReceipt,readOwnerRecord,receiptDigest} from '../scripts/lib/local-verification.mjs'
import {rulesWorkers} from '../scripts/lib/rules-test-plan.mjs'
import {tapSummary} from '../scripts/local-verification.mjs'
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),repo={id:1363463339,owner:{id:72244713}}
const raw=(path,old='100644',next='100644',status='M')=>':'+old+' '+next+' '+a+' '+b+' '+status+'\0'+path+'\0'
const entries=[{path:'app/a.vue',sha:a,mode:'100644'},{path:'test/a.mjs',sha:a,mode:'100644'},{path:'docs/operations.md',sha:a,mode:'100644'}]
const inputs=inputDigests(entries)
test('four change classes distinguish deployed files, tests, CI and ordinary documentation',()=>{
  for(const [path,kind] of [['app/a.vue','product'],['functions/test-a.js','product'],['scripts/prepare-functions-deploy.mjs','product'],['test/a.mjs','test'],['scripts/pipeline.mjs','ci'],['.github/workflows/deploy-production.yml','ci'],['governance/verification-policy.json','ci'],['docs/new.md','documentation'],['deliverables/production-schedule-2026-10-05/build_pdf.py','documentation']])assert.equal(classifyDiff(raw(path)),kind,path)
  assert.equal(classifyDiff(raw('docs/new.md','000000','100644','A')),'documentation')
  assert.equal(classifyDiff(raw('docs/old.md','100644','000000','D')),'documentation')
  assert.equal(classifyDiff(raw('docs/new.md')+raw('app/a.vue')),'product')
  assert.equal(classifyDiff(raw('test/a.mjs')+raw('.github/workflows/a.yml')),'ci')
  for(const value of ['',raw('unknown.file'),raw('docs/../app/a.vue'),raw('docs/link.md','100644','120000'),raw('docs/a.md','100644','100755'),raw('docs/a.md').slice(0,-1)])assert.throws(()=>classifyDiff(value))
})
test('documentation changes preserve both identities; tests change verification only; application changes both',()=>{
  for(const [index,verification,product] of [[2,false,false],[1,true,false],[0,true,true]]){
    const next=structuredClone(entries);next[index].sha=b;const result=inputDigests(next)
    assert.equal(result.verification!==inputs.verification,verification);assert.equal(result.product!==inputs.product,product)
  }
  const previous=[...entries,{path:'legacy.bin',sha:a,mode:'100644'}],next=structuredClone(previous);next.at(-1).sha=b
  assert.notEqual(inputDigests(previous).product,inputDigests(next).product)
  assert.throws(()=>inputDigests([...entries,entries[0]]))
})
test('PR comparison binds the actual base/head and synthetic merge; direct/forced pushes are refused',()=>{
  const event={repository:repo,pull_request:{base:{repo,sha:a,ref:'main'},head:{repo,sha:b,ref:'codex/ci'}}},env={GITHUB_REPOSITORY:'shisyamo4131/termite-warranty',GITHUB_SHA:c,GITHUB_EVENT_NAME:'pull_request'}
  assert.equal(compareEvent(event,env,[a,b]),a)
  for(const parents of [[b,a],[a],[],[a,b,c]])assert.throws(()=>compareEvent(event,env,parents))
  const foreign=structuredClone(event);foreign.pull_request.head.repo.id=0;assert.throws(()=>compareEvent(foreign,env,[a,b]))
  const push={repository:repo,before:a,after:c,forced:false,deleted:false},n={...env,GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main'}
  assert.equal(compareEvent(push,n,[a,b]),a)
  for(const patch of [{forced:true},{deleted:true},{before:b},{after:a}])assert.throws(()=>compareEvent({...push,...patch},n,[a,b]))
  assert.throws(()=>compareEvent(push,n,[a]))
})
function local(){return {schema:1,kind:'termite-local-verification',...inputs,install:{command:'npx --yes npm@11.19.1 ci',exitCode:0},runtime:{platform:'win32',node:'v22.23.2',npm:'11.19.1',javaMajor:21,powershellMajor:7},gates:requiredCommands.map(g=>({...g,exitCode:0,elapsedMs:1,tests:{total:2,passed:g.id==='firestore-rules-test'?rulesWorkers.flatMap(w=>w.files).length:2,failed:0,skipped:0,cancelled:0},suite:'baseline',emulatorsStopped:true,workers:rulesWorkers.map(w=>({worker:w.id,exitCode:0,unexpected:0,byFile:Object.fromEntries(w.files.map(f=>[f,{passed:1,failed:0,skipped:0}])),cases:w.files.map(f=>JSON.stringify([f,1,1,'test']))}))}))}}
test('Local evidence requires all commands, complete tests, runtime compatibility and merge inputs',()=>{
  assert.equal(validateLocalReceipt(local(),inputs).schema,1)
  for(const mutate of [r=>r.verification='0'.repeat(64),r=>r.product='0'.repeat(64),r=>r.runtime.platform='linux',r=>r.runtime.npm='11.0.0',r=>delete r.install,r=>r.install.exitCode=1,r=>r.gates.pop(),r=>r.gates.push(r.gates[0]),r=>r.gates[0].exitCode=1,r=>r.gates[0].command='echo pass',r=>r.gates.find(g=>g.id==='domain-test').tests.skipped=2,r=>r.gates.find(g=>g.id==='domain-test').tests.total=3,r=>r.gates.find(g=>g.id==='firestore-rules-test').emulatorsStopped=false,r=>r.gates.find(g=>g.id==='firestore-rules-test').workers.pop(),r=>r.gates.find(g=>g.id==='firestore-rules-test').workers[0].byFile[rulesWorkers[0].files[0]].failed=1,r=>r.gates.find(g=>g.id==='firestore-rules-test').workers[0].byFile[rulesWorkers[0].files[0]].skipped=1,r=>r.gates.find(g=>g.id==='firestore-rules-test').workers[0].cases.pop()]){const r=local();mutate(r);assert.throws(()=>validateLocalReceipt(r,inputs))}
  assert.deepEqual(tapSummary('# tests 2\n# pass 2\n# fail 0\n# cancelled 0\n# skipped 0\n'),{total:2,passed:2,failed:0,cancelled:0,skipped:0})
})
test('only the latest owner comment is an attestation; forged authors and malformed replacements cannot approve',()=>{
  const comment=(id,owner,record)=>({id,user:{id:owner},body:'TERMITE local-verification\n'+JSON.stringify(record)})
  assert.equal(readOwnerRecord([comment(1,0,local())],repo.owner.id,'local-verification'),null)
  const result=readOwnerRecord([comment(1,repo.owner.id,local()),comment(2,repo.owner.id,{revoked:true})],repo.owner.id,'local-verification')
  assert.equal(result.commentId,2);assert.throws(()=>validateLocalReceipt(result.record,inputs))
  assert.throws(()=>readOwnerRecord([{...comment(1,repo.owner.id,{}),body:'TERMITE local-verification\ninvalid'}],repo.owner.id,'local-verification'))
})
function fixture(){
  const run={id:10,run_attempt:1,repository:repo,head_repository:repo,path:'.github/workflows/deploy-development.yml',event:'pull_request',head_branch:'feature',head_sha:a,status:'completed',conclusion:'success',updated_at:'2000-01-01T00:00:00Z'}
  const artifact=name=>({id:20,name,size_in_bytes:400,expired:false,expires_at:new Date(Date.now()+86400000).toISOString(),workflow_run:{id:10,repository_id:repo.id,head_repository_id:repo.id,head_sha:a}})
  const f={run,runs:[run],artifacts:[artifact(evidenceName(inputs,1)),{...artifact(hostingName(inputs,1)),id:21}],pr:{number:1,head:{sha:a,ref:'feature'}}}
  f.read=async path=>path.includes('/workflows/')?{total_count:f.runs.length,workflow_runs:f.runs}:{total_count:f.artifacts.length,artifacts:f.artifacts}
  return f
}
test('native successful PR evidence is reusable without arbitrary age; latest failure and wrong artifacts stop',async()=>{
  const f=fixture();assert.equal((await prEvidence(f.read,f.pr,inputs,{hosting:true})).hostingArtifactId,21)
  for(const mutate of [f=>f.runs.push({...f.run,id:11,conclusion:'failure'}),f=>f.run.run_attempt=2,f=>f.run.head_repository={id:0},f=>f.artifacts[0].name='forged',f=>f.artifacts[0].expired=true,f=>f.artifacts[0].workflow_run.head_sha=b,f=>f.artifacts.pop(),f=>f.runs=[]]){const f=fixture();mutate(f);await assert.rejects(prEvidence(f.read,f.pr,inputs,{hosting:true}))}
})
test('downstream Local reuse rejects edited, deleted or superseded owner attestations',async()=>{
  const f=fixture(),record=local(),comment={id:30,user:{id:repo.owner.id},body:'TERMITE local-verification\n'+JSON.stringify(record)}
  f.artifacts[0].name=evidenceName(inputs,1,{commentId:30,digest:receiptDigest(record)})
  let comments=[comment];const read=path=>path.startsWith('/issues/')?Promise.resolve(comments):f.read(path)
  assert.equal((await prEvidence(read,f.pr,inputs)).artifactId,20)
  for(const next of [[],[{...comment,body:'TERMITE local-verification\ninvalid'}],[{...comment,body:'TERMITE local-verification\n'+JSON.stringify({...record,revision:b})}],[comment,{...comment,id:31}]]){
    comments=next;await assert.rejects(prEvidence(read,f.pr,inputs))
  }
})
test('aggregate accepts only complete producers, intentional Local reuse, or admitted source reuse',()=>{
  for(const kind of ['documentation','test','ci','product'])for(const local of [true,false])for(const reuse of [true,false])for(const event of ['pull_request','push']){
    const scope={kind,local,reuse},full=event==='pull_request'&&kind!=='documentation'&&!reuse
    const needs={scope:{result:'success'},application:{result:full?'success':'skipped'},rules:{result:full&&!local?'success':'skipped'}}
    if(event==='push'&&kind==='product'&&!reuse){assert.throws(()=>assertAggregate(scope,needs,event));continue}
    assert.doesNotThrow(()=>assertAggregate(scope,needs,event))
    for(const key of ['scope','application','rules'])for(const result of ['failure','cancelled']){const n=structuredClone(needs);n[key].result=result;assert.throws(()=>assertAggregate(scope,n,event))}
  }
})
function routeFixture(path='app/a.vue',branch='dev',eventName='pull_request'){
  const f=fixture(),env={GITHUB_REPOSITORY:'shisyamo4131/termite-warranty',GITHUB_SHA:c,GITHUB_EVENT_NAME:eventName,GITHUB_REF:'refs/heads/'+branch}
  const source={number:1,merged_at:'2026-10-15T00:00:00Z',merge_commit_sha:c,base:{repo,sha:a,ref:branch},head:{repo,sha:b,ref:branch==='main'?'dev':'feature'}}
  const event=eventName==='pull_request'?{repository:repo,pull_request:source}:{repository:repo,before:a,after:c,forced:false,deleted:false}
  const state={entries:structuredClone(entries),comments:[],source,run:{...f.run,head_sha:b,head_branch:source.head.ref},deploy:{...f.run,id:11,event:'push',head_sha:c,head_branch:'dev'}}
  const artifact=(run,name,id)=>({...f.artifacts[0],id,name,workflow_run:{...f.artifacts[0].workflow_run,id:run.id,head_sha:run.head_sha}})
  state.prArtifacts=[artifact(state.run,evidenceName(inputs,1),20),artifact(state.run,hostingName(inputs,1),21)]
  state.deployArtifacts=[artifact(state.deploy,evidenceName(inputs,1),30),artifact(state.deploy,'deployment-v3-'+inputs.product+'-1',31)]
  const read=async p=>{
    if(p.startsWith('/issues/'))return state.comments
    if(p.startsWith('/git/commits/'))return {tree:{sha:a}}
    if(p.startsWith('/git/trees/'))return {sha:a,truncated:false,tree:entries.map(e=>({...e,type:'blob'}))}
    if(p.startsWith('/commits/'))return [{...state.source,base:{...state.source.base,ref:p.includes(c)?'dev':'main'}}]
    if(p==='/actions/runs/11')return state.deploy
    if(p.startsWith('/actions/workflows/'))return {total_count:1,workflow_runs:[state.run]}
    if(p.startsWith('/actions/runs/10/artifacts'))return {total_count:state.prArtifacts.length,artifacts:state.prArtifacts}
    if(p.startsWith('/actions/runs/11/artifacts'))return {total_count:state.deployArtifacts.length,artifacts:state.deployArtifacts}
    throw Error('Unexpected API '+p)
  }
  const run=(...args)=>{
    if(args[0]==='rev-parse')return c
    if(args[0]==='show')return a+' '+b
    if(args[0]==='diff')return raw(path)
    if(args[0]==='ls-tree')return state.entries.map(e=>e.mode+' blob '+e.sha+'\t'+e.path+'\0').join('')
    throw Error('Unexpected Git '+args)
  }
  return {state,env,event,read,run}
}
const accept=product=>({id:40,user:{id:repo.owner.id},body:'TERMITE dev-acceptance\n'+JSON.stringify({schema:1,accepted:true,product,deploymentRunId:11,reference:'owner acceptance fixture'})})
test('scope executes all four PR routes and non-product pushes without cloud work',async()=>{
  for(const [path,branch,kind] of [['app/a.vue','dev','product'],['test/a.mjs','main','test'],['scripts/pipeline.mjs','main','ci'],['docs/a.md','main','documentation']]){
    const f=routeFixture(path,branch),s=await resolveScope(f.read,f.event,f.env,f.run)
    assert.equal(s.kind,kind);assert.equal(s.reuse,false);assert.equal(s.local,false)
    if(kind!=='documentation'){
      f.state.comments=[{id:1,user:{id:repo.owner.id},body:'TERMITE local-verification\n'+JSON.stringify(local())}]
      assert.equal((await resolveScope(f.read,f.event,f.env,f.run)).local,true)
      f.state.entries[1].sha=b;await assert.rejects(resolveScope(f.read,f.event,f.env,f.run))
    }
    if(kind!=='product'){
      const push=routeFixture(path,'main','push'),s=await resolveScope(async()=>{throw Error('Non-product push must not query evidence')},push.event,push.env,push.run)
      assert.equal(s.kind,kind);assert.equal(s.reuse,false)
      const wrong=routeFixture(path,'dev');await assert.rejects(resolveScope(wrong.read,wrong.event,wrong.env,wrong.run))
    }
  }
  const wrong=routeFixture('app/a.vue','main');wrong.event.pull_request.head.ref='feature'
  await assert.rejects(resolveScope(wrong.read,wrong.event,wrong.env,wrong.run))
})
test('Dev push uses one exact source artifact; missing or failed source stops instead of rerunning tests',async()=>{
  const f=routeFixture('app/a.vue','dev','push'),s=await resolveScope(f.read,f.event,f.env,f.run)
  assert.equal(s.reuse,true);assert.equal(s.sourceRunId,10);assert.equal(s.hostingArtifactId,21)
  for(const change of [f=>f.state.run.conclusion='failure',f=>f.state.prArtifacts.pop(),f=>f.state.run.run_attempt=2]){
    const f=routeFixture('app/a.vue','dev','push');change(f);await assert.rejects(resolveScope(f.read,f.event,f.env,f.run))
  }
})
test('acceptance requires actual Dev post-check evidence and exact product; technical changes keep acceptance but rerun tests',async()=>{
  const f=routeFixture('app/a.vue','main');f.state.comments=[accept(inputs.product)]
  assert.equal((await deploymentEvidence(f.read,11,inputs.product)).deploymentRunId,11)
  assert.equal((await acceptanceFor(f.read,f.event.pull_request,inputs)).commentId,40)
  assert.equal((await resolveScope(f.read,f.event,f.env,f.run)).reuse,true)
  f.state.entries[1].sha=b
  const next=await resolveScope(f.read,f.event,f.env,f.run);assert.equal(next.reuse,false);assert.equal(next.acceptance.commentId,40)
  f.state.entries[0].sha=b;await assert.rejects(resolveScope(f.read,f.event,f.env,f.run))
  for(const change of [f=>f.state.deploy.conclusion='failure',f=>f.state.deployArtifacts.pop(),f=>f.state.comments=[accept('0'.repeat(64))],f=>f.state.comments=[{...accept(inputs.product),user:{id:0}}]]){
    const f=routeFixture('app/a.vue','main');f.state.comments=[accept(inputs.product)];change(f)
    await assert.rejects(acceptanceFor(f.read,f.event.pull_request,inputs))
  }
})
test('main product push rechecks both promotion PR proof and owner acceptance',async()=>{
  const f=routeFixture('app/a.vue','main','push');f.state.comments=[accept(inputs.product)]
  const read=p=>p===`/commits/${c}/pulls?per_page=100`?Promise.resolve([{...f.state.source,base:{...f.state.source.base,ref:'main'}}]):f.read(p)
  // The same commit cannot represent both promotion and Dev in this fixture;
  // route deployment association separately while retaining all API validation.
  let associations=0
  const routed=p=>p===`/commits/${c}/pulls?per_page=100`?(++associations===1?read(p):f.read(p)):read(p)
  assert.equal((await resolveScope(routed,f.event,f.env,f.run)).reuse,true)
  f.state.comments=[{...accept(inputs.product),body:'TERMITE dev-acceptance\n{"accepted":false}'}];associations=0
  await assert.rejects(resolveScope(routed,f.event,f.env,f.run))
})
