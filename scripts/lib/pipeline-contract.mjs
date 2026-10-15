import vm from 'node:vm'
import {parse} from 'yaml'
const checked=new Set()
const need=(v,m)=>{if(!v)throw Error(m)}
const evaluate=(s,c)=>{need(typeof s==='string','Missing safety condition.');return !!vm.runInNewContext(s.startsWith('${{')?s.slice(3,-2):s,c,{timeout:50,contextCodeGeneration:{strings:false,wasm:false}})}
const matches=(j,c)=>j.steps.filter(s=>s.run===c)
function required(j,c){const a=matches(j,c);need(a.length===1&&!a[0].if&&!a[0]['continue-on-error'],'Missing or conditional command: '+c);return j.steps.indexOf(a[0])}
function deployGuard(j,kind){
  const key=kind+j.if;if(checked.has(key))return
  for(const cancelled of [false,true])for(const scope of ['success','failure','cancelled','skipped'])for(const verified of ['success','failure','cancelled','skipped'])for(const change of ['product','ci','test','documentation',''])for(const event of ['push','pull_request','workflow_dispatch'])for(const branch of ['dev','main','other'])for(const enabled of ['true','false']){
    const c={cancelled:()=>cancelled,always:()=>true,needs:{scope:{result:scope,outputs:{kind:change}},verify:{result:verified}},github:{event_name:event,ref:'refs/heads/'+branch},vars:{DEVELOPMENT_BRANCH_DEPLOY_ENABLED:enabled,PRODUCTION_APP_DEPLOY_ENABLED:enabled}}
    need(evaluate(j.if,c)===(!cancelled&&scope==='success'&&verified==='success'&&change==='product'&&event==='push'&&branch===(kind==='development'?'dev':'main')&&enabled==='true'),'Deployment admission/target condition is invalid.')
  }
  checked.add(key)
}
function gateCondition(s,build=false){for(const local of ['true','false',''])for(const kind of ['product','ci','test'])need(evaluate(s.if,{needs:{scope:{outputs:{local,kind}}}})===(local!=='true'||build&&kind==='product'),'Gate condition permits missing verification.')}
export function validatePipeline(text,policy,kind){
  const w=parse(text),{scope,verify,deploy,application,rules}=w.jobs??{}
  need(scope&&verify&&deploy,'Missing pipeline stages.')
  need(w.permissions?.contents==='read'&&w.permissions?.actions==='read'&&Object.values(w.permissions).every(v=>v==='read'),'Workflow permissions must be read-only.')
  need(!w.concurrency,'PR verification must not share deployment concurrency.')
  const expected=kind==='development'?{pull_request:{branches:['dev','main']},push:{branches:['dev']}}:{push:{branches:['main']}}
  need(JSON.stringify(w.on)===JSON.stringify(expected),'Unexpected branch routing.')
  for(const [id,j] of Object.entries(w.jobs)){
    need(!j['continue-on-error'],'Job must not bypass failure.')
    if(id!=='deploy'){
      need(!j.environment&&!j.secrets&&!j.permissions?.['id-token']&&!/secrets\.|google-github-actions\/auth|firebase\s+deploy/.test(JSON.stringify(j)),'Verification must not receive Cloud credentials or deploy.')
      need(Object.values(j.permissions??{}).every(v=>v==='read'),'Verification write permissions are forbidden.')
    }
    for(const s of j.steps??[])need(!s['continue-on-error'],'Step must not bypass failure.')
  }
  required(scope,'node scripts/pipeline.mjs scope')
  const checkout=scope.steps.find(s=>s.uses?.startsWith('actions/checkout@'))
  need(checkout?.with?.['fetch-depth']===0&&!checkout.with.ref,'Scope requires exact event checkout and complete history.')
  for(const k of ['kind','local','reuse','proof','hostingName','hostingArtifactId','sourceRunId'])need(scope.outputs[k]==='${{ steps.scope.outputs.'+k+' }}','Forged scope output.')
  need(!scope.if&&scope.steps.every(s=>!s.if),'Scope cannot be skipped.')
  need(deploy.environment===(kind==='development'?'development':'production'),'Wrong deployment environment.')
  need(Array.isArray(deploy.needs)&&deploy.needs.includes('scope')&&deploy.needs.includes('verify'),'Deploy requires scope and verify.')
  need(deploy.concurrency?.group===(kind==='development'?'development-deployment':'production-bootstrap')&&deploy.concurrency['cancel-in-progress']===false,'Deployment concurrency must serialize without cancellation.')
  deployGuard(deploy,kind)
  need(deploy.steps.every(s=>!s.if),'Deployment safety steps cannot be optional.')
  need(!/--force\b/.test(JSON.stringify(w)),'Deployment must not use unconditional --force.')
  need(!deploy.steps.some(s=>/nuxt generate|npm run build|prepare-production-release|prepare:functions/.test(s.run??'')),'Deploy must not rebuild the verified artifact.')
  const auth=deploy.steps.map((s,i)=>s.uses?.startsWith('google-github-actions/auth@')?i:-1).filter(i=>i>=0)
  const current=required(deploy,'node scripts/pipeline.mjs current-'+(kind==='development'?'dev':'main'))
  need(auth.length>0&&current<auth[0],'Current branch check must precede authentication.')
  required(deploy,'npx --yes npm@11.19.1 ci')
  if(kind==='development'){
    need(verify.name==='Verify development deployment','Protected branch required-check name must remain stable.')
    need(application&&rules,'Missing verification producers.')
    need(application.needs==='scope'&&rules.needs==='scope','Producers require admission.')
    for(const event of ['push','pull_request'])for(const k of ['documentation','ci','test','product'])for(const reuse of ['true','false'])for(const local of ['true','false'])for(const result of ['success','failure']){
      const c={github:{event_name:event},needs:{scope:{result,outputs:{kind:k,reuse,local}}}},full=result==='success'&&event==='pull_request'&&k!=='documentation'&&reuse!=='true'
      need(evaluate(application.if,c)===full&&evaluate(rules.if,c)===(full&&local!=='true'),'Producer condition permits missing or duplicate tests.')
    }
    required(application,'npx --yes npm@11.19.1 ci')
    for(const id of policy.comprehensiveGateIds.filter(x=>!['firestore-rules-test','governance-check'].includes(x))){const a=matches(application,policy.gates.find(g=>g.id===id)?.command);need(a.length===1,'Missing comprehensive gate: '+id);gateCondition(a[0],id==='app-build')}
    for(const r of policy.focusedRegressions.filter(r=>r.completionRequired)){const a=matches(application,r.command);need(a.length===1,'Missing focused regression: '+r.id);gateCondition(a[0])}
    need(rules.uses==='./.github/workflows/verify-rules.yml'&&!rules.secrets,'Rules must use the isolated suite.')
    need(Array.isArray(verify.needs)&&['scope','rules','application'].every(x=>verify.needs.includes(x))&&verify.if==='${{ always() }}','Required check must aggregate all producer states.')
    const aggregate=required(verify,'node scripts/pipeline.mjs aggregate')
    need(verify.steps[aggregate].env?.PIPELINE_NEEDS==='${{ toJSON(needs) }}','Aggregate must receive actual results.')
    const download=verify.steps.find(s=>s.uses?.startsWith('actions/download-artifact@')),gate=verify.steps.find(s=>s.run==='npm run test:rules')
    need(download?.with?.pattern==='rules-${{ github.sha }}-${{ github.run_attempt }}-*'&&download.with.path==='tmp/rules-receipts'&&download.with['merge-multiple']===true&&gate?.env?.RULES_TEST_RECEIPTS==='tmp/rules-receipts','Incomplete Rules handoff.')
    for(const result of ['success','failure','skipped','cancelled'])for(const s of [download,gate])need(evaluate(s.if,{needs:{rules:{result}}})===(result==='success'),'Rules aggregation must match producer result.')
    need(verify.steps.indexOf(download)<verify.steps.indexOf(gate)&&verify.steps.indexOf(gate)<aggregate,'Rules evidence must precede admission.')
    const docs=matches(verify,'./scripts/check-governance.ps1');need(docs.length===1,'Missing document governance gate.')
    need(matches(application,'./scripts/check-governance.ps1').length===0,'Governance must run once at PR aggregation.')
    for(const event of ['pull_request','push'])for(const k of ['documentation','test','ci','product'])for(const local of ['true','false'])for(const reuse of ['true','false'])need(evaluate(docs[0].if,{github:{event_name:event},needs:{scope:{outputs:{kind:k,local,reuse}}}})===(event==='pull_request'),'Current PR documentation must be checked even when technical results are reused.')
    const host=application.steps.find(s=>s.uses?.startsWith('actions/upload-artifact@'))
    need(host?.with?.name==='${{ needs.scope.outputs.hostingName }}'&&host.with.path==='.output/public'&&host.with['include-hidden-files']===true&&host.with['if-no-files-found']==='error','Missing verified Hosting handoff.')
    const hd=deploy.steps.find(s=>s.uses?.startsWith('actions/download-artifact@'))
    need(hd?.with?.['artifact-ids']==='${{ needs.scope.outputs.hostingArtifactId }}'&&hd.with['run-id']==='${{ needs.scope.outputs.sourceRunId }}'&&hd.with['digest-mismatch']==='error'&&hd.with.path==='.output/public','Deploy must download the verified Hosting artifact.')
    const command='npx firebase deploy --config firebase.development.generated.json --project termite-warranty-dev --only firestore,functions,hosting --non-interactive'
    const before=required(deploy,'node scripts/development-deployment.mjs prepare'),publish=required(deploy,command),after=required(deploy,'node scripts/development-deployment.mjs check')
    need(before<publish&&publish<after&&auth[0]<before,'Dev safety order is invalid.')
    const recorded=required(deploy,'node scripts/pipeline.mjs publish-deployment')
    const upload=deploy.steps.find(s=>s.uses?.startsWith('actions/upload-artifact@'))
    need(recorded>after&&upload?.with?.path==='tmp/deployment-verification.json'&&upload.with.name==='${{ steps.deployed.outputs.name }}'&&upload.with['if-no-files-found']==='error'&&deploy.steps.indexOf(upload)>recorded,'Deployment marker must follow all post-checks.')
    need(deploy.steps.filter(s=>s.run?.includes('firebase deploy')).length===1,'Unexpected deployment command.')
  }else{
    need(!rules&&!application,'Production must not rerun common tests.')
    need(verify.needs==='scope','Production build requires source admission.')
    for(const result of ['success','failure','skipped'])for(const k of ['product','ci','documentation'])for(const reuse of ['true','false'])for(const enabled of ['true','false'])need(evaluate(verify.if,{needs:{scope:{result,outputs:{kind:k,reuse}}},vars:{PRODUCTION_APP_DEPLOY_ENABLED:enabled}})===(result==='success'&&k==='product'&&reuse==='true'&&enabled==='true'),'Production build admission is invalid.')
    required(verify,'npx --yes npm@11.19.1 ci');required(verify,'node scripts/prepare-production-release.mjs .production-release')
    need(verify.outputs.digest==='${{ steps.bundle.outputs.digest }}'&&deploy.env.PRODUCTION_RELEASE_DIGEST==='${{ needs.verify.outputs.digest }}','Bundle digest must come from successful builder.')
    const guard=required(deploy,'node scripts/check-production-deployment.mjs --application'),local=required(deploy,'node scripts/check-production-release.mjs local .production-release'),stage=required(deploy,'node scripts/check-production-release.mjs stage .production-release'),pre=required(deploy,'node scripts/check-production-release.mjs predeploy .production-release'),post=required(deploy,'node scripts/check-production-release.mjs cloud .production-release')
    const publish=required(deploy,'npx --no-install firebase deploy --non-interactive --project $env:TARGET_PROJECT --config .production-deploy/firebase.json --only firestore,functions,hosting')
    need(auth.length===2&&guard<local&&local<stage&&stage<auth[0]&&auth[0]<pre&&pre<publish&&publish<auth[1]&&auth[1]<post,'Production safety order is invalid.')
    need(deploy.steps.filter(s=>s.run?.includes('firebase deploy')).length===1,'Unexpected production deployment command.')
    for(const i of auth){const a=deploy.steps[i];need(a.with?.project_id==='${{ steps.target.outputs.project }}'&&a.with?.service_account==='${{ steps.target.outputs.service_account }}'&&a.with?.workload_identity_provider==='${{ steps.target.outputs.provider }}'&&!a.with.credentials_json,'Authentication target differs from guard.')}
  }
  return true
}
