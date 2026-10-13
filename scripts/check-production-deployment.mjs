// CI pre-authentication guard; no external calls and no caller-provided commands.
import {appendFile} from 'node:fs/promises'
import {productionDeploymentPlan,validateProductionTarget} from './lib/production-deployment-plan.mjs'
try {
  const e=process.env,target=validateProductionTarget(JSON.parse(e.PRODUCTION_TARGET_JSON??''))
  if(process.argv.length>3||process.argv[2]!==undefined&&process.argv[2]!=='--application')throw Error('Unknown deployment mode.')
  if(process.argv[2]!=='--application'&&e.PRODUCTION_BOOTSTRAP_REVISION!==e.GITHUB_SHA)throw Error('Approved bootstrap revision missing or mismatched.')
  if(process.argv[2]==='--application'&&(e.PRODUCTION_APP_DEPLOY_ENABLED!=='true'||!new RegExp(`^sites/${target.site}/versions/[-a-zA-Z0-9]+$`).test(e.PRODUCTION_PROVIDER_VERSION??'')))throw Error('Application deployment activation or provider baseline missing.')
  const plan=productionDeploymentPlan(target,{event:e.GITHUB_EVENT_NAME,ref:e.GITHUB_REF,repositoryId:e.GITHUB_REPOSITORY_ID,ownerId:e.GITHUB_REPOSITORY_OWNER_ID,revision:e.GITHUB_SHA,artifactRevision:e.PRODUCTION_ARTIFACT_REVISION,environment:e.PRODUCTION_ENVIRONMENT,verified:e.PRODUCTION_VERIFY_RESULT==='success'})
  if(!e.GITHUB_OUTPUT)throw Error('GitHub output missing.')
  await appendFile(e.GITHUB_OUTPUT,`project=${target.project}\nsite=${target.site}\nprovider=${target.audience.slice('//iam.googleapis.com/'.length)}\nservice_account=${target.serviceAccount}\n`)
  console.log(JSON.stringify(plan))
}catch{console.error('Production deployment guard refused. No authentication or deployment performed.');process.exitCode=1}
