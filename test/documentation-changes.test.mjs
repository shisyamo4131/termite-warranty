import assert from 'node:assert/strict'
import {test} from 'node:test'
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,dirname} from 'node:path'
import {execFileSync} from 'node:child_process'
import {classifyDiff,inputDigests} from '../scripts/lib/change-scope.mjs'
import {compareEvent,sameProduct,reviewedLocal,acceptedDeployment,successfulPR,resolveScope,assertCurrentBranch,manualWorkflow} from '../scripts/pipeline.mjs'
import {admitCandidate} from '../scripts/development-candidate.mjs'
import {activeInventory,protectionHeld,developmentConfig} from '../scripts/development-deployment.mjs'
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),repo={id:1363463339,owner:{id:72244713}},repository='shisyamo4131/termite-warranty'
const raw=path=>':100644 100644 '+a+' '+b+' M\0'+path+'\0'
const body='- [x] Local verification reviewed\nLocal verification: operations record, commands and exit codes\n- [x] Dev acceptance reviewed\nDev acceptance: owner non-mutating screen review\nDev run: https://github.com/'+repository+'/actions/runs/10'
const pr={number:1,user:repo.owner,body,head:{repo,ref:'feature',sha:b},base:{repo,ref:'dev',sha:a}}
const env={GITHUB_REPOSITORY:repository,GITHUB_SHA:c,GITHUB_REF:'refs/heads/dev',GITHUB_EVENT_NAME:'pull_request'}
function fixture(){
 const r={id:10,run_attempt:1,repository:repo,head_repository:repo,path:manualWorkflow,event:'workflow_dispatch',head_branch:'dev',head_sha:a,display_title:'Dev '+b,status:'completed',conclusion:'success'}
 const jobs=[{name:'Deploy to termite-warranty-dev',run_id:10,run_attempt:1,status:'completed',conclusion:'success'}]
 const f={r,jobs}
 f.read=async p=>p.includes('/jobs')?{total_count:f.jobs.length,jobs:f.jobs}:f.r
 return f
}
test('existing classification treats delivery controllers as CI, unknown changes fail closed',()=>{
 for(const [p,k] of [['app/a.vue','product'],['functions/a.js','product'],['scripts/development-candidate.mjs','ci'],['scripts/development-deployment.mjs','ci'],['test/a.mjs','test'],['docs/a.md','documentation']])assert.equal(classifyDiff(raw(p)),k)
 for(const p of ['unknown.file','docs/../app/a.vue'])assert.throws(()=>classifyDiff(raw(p)))
})
test('record-only and technical changes preserve product; application or unknown changes do not',()=>{
 for(const paths of ['','docs/operations.md\0','test/a.mjs\0.github/workflows/a.yml\0'])assert.equal(sameProduct(a,b,()=>paths),true)
 for(const paths of ['app/a.vue\0','package-lock.json\0','unknown\0','functions/a.js\0'])assert.equal(sameProduct(a,b,()=>paths),false)
 assert.throws(()=>sameProduct('HEAD',b))
 const entries=[{path:'app/a.vue',sha:a,mode:'100644'},{path:'docs/a.md',sha:a,mode:'100644'}]
 const next=structuredClone(entries);next[1].sha=b;assert.deepEqual(inputDigests(entries),inputDigests(next))
})
test('integration compares actual synthetic parents; dev pushes and forced main pushes are rejected',()=>{
 const event={repository:repo,pull_request:pr}
 assert.equal(compareEvent(event,env,[a,b]),a)
 for(const parents of [[b,a],[a],[]])assert.throws(()=>compareEvent(event,env,parents))
 const push={repository:repo,before:a,after:c,forced:false,deleted:false}
 assert.throws(()=>compareEvent(push,{...env,GITHUB_EVENT_NAME:'push'},[a,b]))
 assert.equal(compareEvent(push,{...env,GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main'},[a,b]),a)
 assert.throws(()=>compareEvent({...push,forced:true},{...env,GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main'},[a,b]))
})
test('ordinary Local record replaces full-suite JSON attestation; unchecked or foreign review stops',()=>{
 reviewedLocal(pr)
 for(const p of [{...pr,user:{id:0}},{...pr,body:body.replace('[x]','[ ]')},{...pr,body:'- [x] Local verification reviewed'}])assert.throws(()=>reviewedLocal(p))
})
test('accepted native Dev run is sufficient without proof artifacts; documents do not invalidate acceptance',async()=>{
 const f=fixture()
 assert.equal((await acceptedDeployment(f.read,pr,c,()=> 'docs/operations.md\0')).revision,b)
 f.r.path='.github/workflows/deploy-development.yml';f.r.event='push'
 assert.equal((await acceptedDeployment(f.read,pr,c,()=> '')).revision,a)
})
test('failed, skipped, foreign and malformed deployment runs cannot approve a candidate',async()=>{
 for(const mutate of [f=>f.r.conclusion='failure',f=>f.r.status='in_progress',f=>f.r.event='pull_request',f=>f.r.path='other.yml',f=>f.r.display_title='Dev HEAD',f=>f.r.head_repository={id:0},f=>f.r.head_branch='feature',f=>f.jobs[0].conclusion='skipped',f=>f.jobs[0].run_attempt=2,f=>f.jobs=[]]){
  const f=fixture();mutate(f);await assert.rejects(acceptedDeployment(f.read,pr,c,()=> ''))
 }
 for(const p of [{...pr,body:body.replace('Dev acceptance reviewed','withdrawn')},{...pr,body:body+'\nDev run: https://github.com/'+repository+'/actions/runs/11'},{...pr,user:{id:0}}])await assert.rejects(acceptedDeployment(fixture().read,p,c,()=> ''))
 await assert.rejects(acceptedDeployment(fixture().read,pr,c,()=> 'app/a.vue\0'))
})
test('latest failed PR check is not replaced with older success',async()=>{
 const r={...fixture().r,path:'.github/workflows/deploy-development.yml',head_sha:b,head_branch:'feature',event:'pull_request'}
 await successfulPR(async()=>({total_count:1,workflow_runs:[r]}),pr)
 await assert.rejects(successfulPR(async()=>({total_count:2,workflow_runs:[r,{...r,id:11,conclusion:'failure'}]}),pr))
})
test('PR routing requires acceptance only for product, uses no test fallback, and rejects direct product promotion',async()=>{
 for(const [path,kind] of [['docs/a.md','documentation'],['test/a.mjs','test'],['scripts/pipeline.mjs','ci'],['app/a.vue','product']]){
  const f=fixture(),run=(...args)=>args[0]==='rev-parse'?c:args[0]==='show'?a+' '+b:args.includes('--raw')?raw(path):''
  const result=await resolveScope(f.read,{repository:repo,pull_request:pr},env,run)
  assert.equal(result.kind,kind);assert.equal(result.reuse,kind==='product')
  if(kind==='product')await assert.rejects(resolveScope(f.read,{repository:repo,pull_request:{...pr,base:{...pr.base,ref:'main'}}},env,run))
 }
})
test('manual candidate binds controller, branch head and current dev ancestor before credentials',async()=>{
 const e={repository:repo,inputs:{source_branch:'codex/change',source_sha:b,local_verified:'true',verification_reference:'operations record'}}
 const n={...env,GITHUB_SHA:a,GITHUB_EVENT_NAME:'workflow_dispatch'}
 const read=async p=>({commit:{sha:p==='/branches/dev'?a:b}})
 const run=(...args)=>args[0]==='rev-parse'?a:a
 assert.equal((await admitCandidate(read,e,n,run)).revision,b)
 for(const patch of [{source_sha:'HEAD'},{source_branch:'main'},{source_branch:'../other'},{local_verified:'false'},{verification_reference:''},{verification_reference:'bad\nvalue'}])await assert.rejects(admitCandidate(read,{...e,inputs:{...e.inputs,...patch}},n,run))
 for(const patch of [{GITHUB_REF:'refs/heads/main'},{GITHUB_EVENT_NAME:'push'},{GITHUB_REPOSITORY:'foreign/repo'}])await assert.rejects(admitCandidate(read,e,{...n,...patch},run))
 await assert.rejects(admitCandidate(async()=>({commit:{sha:c}}),e,n,run))
 await assert.rejects(admitCandidate(read,e,n,(...args)=>args[0]==='merge-base'?c:a))
})
test('current-main guard preserves production branch and stale candidate restrictions',()=>{
 const n={...env,GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main'}
 assertCurrentBranch({commit:{sha:c}},n,'main')
 for(const patch of [{GITHUB_SHA:a},{GITHUB_EVENT_NAME:'workflow_dispatch'},{GITHUB_REF:'refs/heads/dev'}])assert.throws(()=>assertCurrentBranch({commit:{sha:c}},{...n,...patch},'main'))
})
test('light Dev checks retain protection hold and refuse incomplete inventories and candidate deployment hooks',()=>{
 protectionHeld({pointInTimeRecoveryEnablement:'POINT_IN_TIME_RECOVERY_DISABLED'},{})
 for(const [db,schedules] of [[{},{}],[{pointInTimeRecoveryEnablement:'POINT_IN_TIME_RECOVERY_DISABLED'},{backupSchedules:[{}]}],[{pointInTimeRecoveryEnablement:'POINT_IN_TIME_RECOVERY_DISABLED'},{nextPageToken:'more'}]])assert.throws(()=>protectionHeld(db,schedules))
 for(const inventory of [{nextPageToken:'more'},{unreachable:['region']},{functions:[]}])assert.throws(()=>activeInventory(inventory))
 assert.throws(()=>developmentConfig({hosting:{public:'.output/public',predeploy:'danger'}}))
 assert.throws(()=>developmentConfig({hosting:{public:'../outside'}}))
})

test('main push refreshes the merged promotion, checks latest PR result and accepts a deleted source branch',async()=>{
 const f=fixture(),promotion={...pr,merged_at:'2026-10-16T00:00:00Z',merge_commit_sha:c,head:{...pr.head,ref:'dev'},base:{...pr.base,ref:'main'}}
 const latest={...f.r,path:'.github/workflows/deploy-development.yml',event:'pull_request',head_sha:b,head_branch:'dev'}
 let withdrawn=false,failed=false
 const calls=[],read=async p=>{
  calls.push(p)
  if(p==='/commits/'+c+'/pulls?per_page=100')return [promotion]
  if(p==='/pulls/1')return {...promotion,body:withdrawn?'withdrawn':body}
  if(p.includes('/actions/workflows/'))return {total_count:1,workflow_runs:[{...latest,conclusion:failed?'failure':'success'}]}
  return f.read(p)
 }
 const run=(...args)=>args[0]==='rev-parse'?c:args[0]==='show'?a+' '+b:args.includes('--raw')?raw('app/a.vue'):''
 const e={repository:repo,before:a,after:c,forced:false,deleted:false},n={...env,GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main'}
 assert.equal((await resolveScope(read,e,n,run)).reuse,true)
 assert.ok(calls.includes('/pulls/1'));assert.ok(!calls.some(p=>p.startsWith('/branches/')))
 withdrawn=true;await assert.rejects(resolveScope(read,e,n,run));withdrawn=false
 failed=true;await assert.rejects(resolveScope(read,e,n,run));failed=false
 f.r.path='.github/workflows/deploy-development.yml';f.r.event='push'
 assert.equal((await resolveScope(read,e,n,run)).reuse,true)
})

test('real Git compares accepted product through record commits and rejects merge-result product edits',()=>{
 const temporaryRoot=resolve(tmpdir()),root=mkdtempSync(join(temporaryRoot,'termite-diff-test-'))
 const run=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trimEnd()
 const commit=()=>{run('add','.');run('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');return run('rev-parse','HEAD')}
 try{
  run('init','-q');mkdirSync(join(root,'app'));mkdirSync(join(root,'docs'))
  writeFileSync(join(root,'app/a.vue'),'accepted\n');writeFileSync(join(root,'docs/record.md'),'before\n');const accepted=commit()
  writeFileSync(join(root,'docs/record.md'),'after\n');const recorded=commit()
  assert.equal(sameProduct(accepted,recorded,run),true)
  writeFileSync(join(root,'app/a.vue'),'conflict resolution\n');const changed=commit()
  assert.equal(sameProduct(accepted,changed,run),false)
 }finally{if(dirname(resolve(root))!==temporaryRoot)throw Error('Unexpected fixture cleanup path.');rmSync(root,{recursive:true,force:true})}
})

test('reviewed HS billing guide is documentation with adjacent and mixed changes guarded',()=>{
 const paths=['deliverables/hs-cloud-billing-guide-2026-10-20/README.md', 'deliverables/hs-cloud-billing-guide-2026-10-20/build_pdf.py', 'deliverables/hs-cloud-billing-guide-2026-10-20/screenshots/01-home.png', 'deliverables/hs-cloud-billing-guide-2026-10-20/screenshots/02-menu.png', 'deliverables/hs-cloud-billing-guide-2026-10-20/screenshots/03-linked.png', 'deliverables/hs-cloud-billing-guide-2026-10-20/screenshots/04-billing-list.png', 'deliverables/hs-cloud-billing-guide-2026-10-20/screenshots/05-trial-step1.png']
 for(const path of paths)assert.equal(classifyDiff(raw(path)),'documentation')
 assert.equal(sameProduct(a,b,()=>paths.join('\0')+'\0'),true)
 assert.equal(classifyDiff(raw(paths[0])+raw('app/a.vue')),'product')
 assert.equal(classifyDiff(raw('deliverables/hs-cloud-billing-guide-2026-10-20/other.py')),'product')
 assert.throws(()=>classifyDiff(raw('output/pdf/unreviewed-billing.pdf')))
})

test('combined account guide and retired schedule remain bounded documents',()=>{
 const paths=['deliverables/hs-prod-account-2026-10-21/README.md','deliverables/hs-prod-account-2026-10-21/build_pdf.py','deliverables/hs-prod-account-2026-10-21/combine_pdf.py','output/pdf/HS_本番管理アカウントと請求先登録ガイド.pdf','output/pdf/HS_本番稼働に向けた目標スケジュール_2026-10-05.pdf']
 for(const path of paths)assert.equal(classifyDiff(raw(path)),'documentation')
 assert.equal(sameProduct(a,b,()=>paths.join('\0')+'\0'),true)
 assert.equal(classifyDiff(raw(paths[0])+raw('functions/index.js')),'product')
 assert.equal(classifyDiff(raw('deliverables/hs-prod-account-2026-10-21/other.py')),'product')
 assert.throws(()=>classifyDiff(raw('output/pdf/unreviewed-account-guide.pdf')))
 const removed=':100644 000000 '+a+' '+'0'.repeat(40)+' D\0'+paths[4]+'\0'
 assert.equal(classifyDiff(removed),'documentation')
})
