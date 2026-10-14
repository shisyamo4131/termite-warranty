import {parse} from 'yaml'
import {withoutDocumentationRouting} from './lib/documentation-workflow.mjs'
import {validateProductionReuseWorkflow,productionVerifyCondition,fallbackCondition} from './lib/verification-reuse-workflow.mjs'
const fail=()=>{throw Error('Production workflow does not preserve deployment gates.')}
export function validateProductionWorkflow(text,policy){
  const w=withoutDocumentationRouting(parse(text),'production'),v=w.jobs?.verify,d=w.jobs?.deploy
  if(!v||!d||JSON.stringify(w.on)!==JSON.stringify({push:{branches:['main']}})||w.permissions?.['id-token']||w.permissions?.contents!=='read'||w.concurrency?.group!=='production-bootstrap'||w.concurrency?.['cancel-in-progress']!==false)fail()
  if(v['runs-on']!=='windows-latest'||d['runs-on']!=='windows-latest'||v.if!==productionVerifyCondition||d.needs!=='verify'||d.environment!=='production'||d.permissions?.['id-token']!=='write'||d.if!=="${{ !cancelled() && needs.verify.result == 'success' && vars.PRODUCTION_APP_DEPLOY_ENABLED == 'true' }}")fail()
  if(v['continue-on-error']||d['continue-on-error']||v.permissions?.['id-token'])fail()
  for(const step of [...v.steps,...d.steps])if(step['continue-on-error'])fail()
  for(const step of d.steps)if(step.if)fail()
  if(v.steps.some(s=>s.uses?.startsWith('google-github-actions/auth')||/firebase deploy|secrets\./.test(JSON.stringify(s))))fail()
  let last=-1
  for(const id of policy.comprehensiveGateIds){const gate=policy.gates.find(g=>g.id===id),matches=v.steps.map((s,i)=>s.run===gate?.command?i:-1).filter(i=>i>=0);if(matches.length!==1||matches[0]<=last||v.steps[matches[0]].if!==fallbackCondition)fail();last=matches[0]}
  const build=v.steps.findIndex(s=>s.run==='node scripts/prepare-production-release.mjs .production-release')
  if(build<=last||v.outputs?.digest!=='${{ steps.bundle.outputs.digest }}'||v.steps[build].id!=='bundle')fail()
  const upload=v.steps.find(s=>s.uses==='actions/upload-artifact@v7'),download=d.steps.find(s=>s.uses==='actions/download-artifact@v8')
  if(upload?.with?.name!=='production-release-${{ github.sha }}'||download?.with?.name!==upload.with.name||upload.with.path!=='.production-release'||download.with.path!=='.production-release'||upload.with['include-hidden-files']!==true||upload.with['if-no-files-found']!=='error')fail()
  if(d.env?.PRODUCTION_RELEASE_DIGEST!=='${{ needs.verify.outputs.digest }}'||d.env?.PRODUCTION_PROVIDER_VERSION!=='${{ vars.PRODUCTION_PROVIDER_VERSION }}')fail()
  const auth=d.steps.map((s,i)=>s.uses==='google-github-actions/auth@v3'?i:-1).filter(i=>i>=0),guard=d.steps.findIndex(s=>s.run==='node scripts/check-production-deployment.mjs --application'),local=d.steps.findIndex(s=>s.run==='node scripts/check-production-release.mjs local .production-release')
  const deployments=d.steps.map((s,i)=>s.run?.includes('firebase deploy')?i:-1).filter(i=>i>=0),cloud=d.steps.findIndex(s=>s.run==='node scripts/check-production-release.mjs cloud .production-release')
  const stage=d.steps.findIndex(s=>s.run==='node scripts/check-production-release.mjs stage .production-release'),predeploy=d.steps.findIndex(s=>s.run==='node scripts/check-production-release.mjs predeploy .production-release')
  if(auth.length!==2||deployments.length!==1||!(guard>=0&&local>guard&&auth[0]>local&&deployments[0]>auth[0]&&auth[1]>deployments[0]&&cloud>auth[1]))fail()
  if(!(stage>local&&stage<auth[0]&&predeploy>auth[0]&&predeploy<deployments[0]))fail()
  if(d.steps[deployments[0]].run!=='npx --no-install firebase deploy --non-interactive --project $env:TARGET_PROJECT --config .production-deploy/firebase.json --only firestore,functions,hosting'||d.steps.some(s=>/nuxt generate|npm run build|prepare-production-release|prepare:functions/.test(s.run??'')))fail()
  for(const i of auth)if(d.steps[i].with?.project_id!=='${{ steps.target.outputs.project }}'||d.steps[i].with?.service_account!=='${{ steps.target.outputs.service_account }}'||d.steps[i].with?.workload_identity_provider!=='${{ steps.target.outputs.provider }}'||d.steps[i].with?.credentials_json)fail()
  validateProductionReuseWorkflow(w,policy)
  return true
}
