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
export function validatePipeline(text,policy,kind){
  if(kind==='development')return validateIntegration(text)
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
  {
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

export function validateIntegration(text){
  const w=parse(text),j=w.jobs?.verify
  need(JSON.stringify(w.on)===JSON.stringify({pull_request:{branches:['dev','main'],types:['opened','synchronize','reopened','edited']}}),'Integration must not deploy on push; body edits must refresh the check.')
  need(j?.name==='Verify development deployment'&&Object.keys(w.jobs).length===1&&!j.if,'Required integration check must always run.')
  need(w.permissions?.contents==='read'&&w.permissions?.actions==='read'&&Object.values(w.permissions).every(v=>v==='read'),'Read-only integration permissions required.')
  need(!j.environment&&!j.secrets&&!j.permissions&&!j['continue-on-error'],'Integration must not receive deployment authority.')
  need(!/secrets\.|google-github-actions\/auth|firebase\s+deploy|npm (test|run|ci)/.test(JSON.stringify(w)),'Integration must not deploy or repeat functional tests.')
  for(const command of ['./scripts/check-governance.ps1','git diff --check HEAD^1 HEAD','node scripts/pipeline.mjs scope'])required(j,command)
  const checkout=j.steps.find(s=>s.uses?.startsWith('actions/checkout@'))
  need(checkout?.with?.['fetch-depth']===0&&!checkout.with.ref&&checkout.with['persist-credentials']===false,'Exact merge checkout required.')
  need(j.steps.every(s=>!s.if&&!s['continue-on-error']),'Integration checks cannot be skipped.')
  return true
}

export function validateManualDevelopment(text){
  const w=parse(text),b=w.jobs?.build,d=w.jobs?.deploy
  need(Object.keys(w.on??{}).join()==='workflow_dispatch'&&w['run-name']==='Dev ${{ inputs.source_sha }}','Only explicit dispatch with native commit label is allowed.')
  for(const key of ['source_branch','source_sha','local_verified','verification_reference'])need(w.on.workflow_dispatch.inputs?.[key]?.required===true,'Missing dispatch input.')
  need(b&&d&&Object.keys(w.jobs).length===2&&d.needs==='build'&&d.name==='Deploy to termite-warranty-dev','Build and successful deployment required.')
  need(w.permissions?.contents==='read'&&w.permissions?.actions==='read'&&Object.values(w.permissions).every(v=>v==='read'),'Read-only token required.')
  need(w.concurrency?.group==='development-deployment'&&w.concurrency['cancel-in-progress']===false,'Serialize Dev without cancellation.')
  need(!b.environment&&!b.secrets&&!b.permissions&&!/secrets\.|google-github-actions\/auth/.test(JSON.stringify(b)),'Candidate build must not receive Cloud credentials.')
  need(d.environment==='development'&&!d.permissions&&!d.secrets,'Keep existing development environment authority.')
  for(const cancelled of [false,true])for(const branch of ['dev','main','feature'])for(const enabled of ['true','false'])for(const result of ['success','failure','skipped','cancelled']){
    const c={cancelled:()=>cancelled,github:{ref:'refs/heads/'+branch},vars:{DEVELOPMENT_BRANCH_DEPLOY_ENABLED:enabled},needs:{build:{result}}}
    need(evaluate(b.if,c)===(branch==='dev'&&enabled==='true'),'Build controller guard failed.')
    need(evaluate(d.if,c)===(!cancelled&&result==='success'&&branch==='dev'&&enabled==='true'),'Deployment guard failed.')
  }
  for(const j of [b,d]){need(!j['continue-on-error']&&j.steps.every(s=>!s.if&&!s['continue-on-error']),'No skipped safety steps.');required(j,'node scripts/development-candidate.mjs')}
  for(const j of [b,d])need(j.steps.some(s=>s.run==='npx --yes npm@11.19.1 ci'&&s['working-directory']==='candidate'),'Candidate dependencies must match its lock.')
  const source=d.steps.find(s=>s.with?.path==='candidate'&&s.uses?.startsWith('actions/checkout@'))
  need(source?.with?.ref==='${{ needs.build.outputs.revision }}'&&source.with['persist-credentials']===false,'Deployment source must match admitted build commit.')
  need(b.steps[0]?.uses?.startsWith('actions/checkout@')&&b.steps[0].with?.path==='controller'&&b.steps[0].with['fetch-depth']===0&&b.steps[0].with['persist-credentials']===false,'Build controller must be separate from the candidate and its ancestors.')
  need(b.steps[required(b,'node scripts/development-candidate.mjs')]['working-directory']==='controller'&&b.steps.find(s=>s.uses?.startsWith('actions/setup-node@'))?.with?.['cache-dependency-path']==='controller/package-lock.json','Controller guard and cache must use its checkout.')
  required(b,'npm run build');required(b,'npm run prepare:functions')
  const candidate=b.steps.find(s=>s.with?.path==='candidate'&&s.uses?.startsWith('actions/checkout@'))
  need(candidate?.with?.ref==='${{ steps.candidate.outputs.revision }}'&&candidate.with['persist-credentials']===false,'Build fixed admitted commit only.')
  const auth=d.steps.findIndex(s=>s.uses?.startsWith('google-github-actions/auth@'))
  need(d.steps.every((s,i)=>!s.run?.includes('npm@')||i<auth),'Dependency installation must precede Cloud authentication.')
  need(auth>required(d,'node scripts/development-candidate.mjs')&&d.steps[auth].with.credentials_json==='${{ secrets.FIREBASE_SERVICE_ACCOUNT_TERMITE_WARRANTY_DEV }}','Authenticate only after current candidate guard.')
  const pre=required(d,'node scripts/development-deployment.mjs prepare'),pub=required(d,'npx --no-install firebase deploy --config candidate/firebase.development.generated.json --project termite-warranty-dev --only firestore,functions,hosting --non-interactive'),post=required(d,'node scripts/development-deployment.mjs check')
  need(auth<pre&&pre<pub&&pub<post&&!/--force\b|npm run build/.test(JSON.stringify(d)),'Deployment order or rebuild unsafe.')
  const up=b.steps.find(s=>s.uses?.startsWith('actions/upload-artifact@')),down=d.steps.find(s=>s.uses?.startsWith('actions/download-artifact@'))
  need(up?.with?.name==='development-candidate-${{ github.run_id }}-${{ github.run_attempt }}'&&down?.with?.name===up.with.name&&down.with.path==='candidate'&&down.with['digest-mismatch']==='error'&&up.with['include-hidden-files']===true&&up.with['if-no-files-found']==='error','Same-run native artifact handoff required.')
  return true
}
