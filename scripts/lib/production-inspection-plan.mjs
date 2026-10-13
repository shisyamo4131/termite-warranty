// Read-only inspection of a recorded published artifact, not the inspecting workflow's build.
import {validateProductionTarget} from './production-deployment-plan.mjs'
const refuse=()=>{throw Error('Production inspection prerequisites incomplete.')}
export function productionInspectionPlan(target,receipt,env){
  target=validateProductionTarget(target)
  const keys=['project','site','revision','runId','artifactId','digest','providerVersion']
  if(!receipt||Object.keys(receipt).length!==keys.length||keys.some(k=>typeof receipt[k]!=='string')||Object.keys(receipt).some(k=>!keys.includes(k)))refuse()
  if(receipt.project!==target.project||receipt.site!==target.site||!/^[a-f0-9]{40}$/.test(receipt.revision)||!/^[a-f0-9]{64}$/.test(receipt.digest)||![receipt.runId,receipt.artifactId].every(v=>/^[1-9]\d*$/.test(v)&&Number.isSafeInteger(Number(v)))||!new RegExp(`^sites/${target.site}/versions/[-a-zA-Z0-9]+$`).test(receipt.providerVersion))refuse()
  if(env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_REPOSITORY_ID!==target.repositoryId||env.GITHUB_REPOSITORY_OWNER_ID!==target.ownerId||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')||env.PRODUCTION_ENVIRONMENT!=='production'||env.PRODUCTION_APP_DEPLOY_ENABLED!=='false'||env.PRODUCTION_PROVIDER_VERSION!==receipt.providerVersion)refuse()
  return Object.freeze({...receipt,workflowRevision:env.GITHUB_SHA,cloudWrites:false,project:target.project,serviceAccount:target.serviceAccount,provider:target.audience.slice('//iam.googleapis.com/'.length)})
}
