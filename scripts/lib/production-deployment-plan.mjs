// Pure planning contract. This module never authenticates, deploys or changes IAM.
import {validateFederationConfig} from './operator-credentials.mjs'
const refuse=()=>{throw Error('Production deployment prerequisites incomplete.')}
export function validateProductionTarget(target) {
  const keys=['project','projectNumber','site','appId','control','serviceAccount','audience','repositoryId','ownerId']
  if(!target||Object.keys(target).some(k=>!keys.includes(k))||keys.some(k=>typeof target[k]!=='string'||!target[k]))refuse()
  if(!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(target.project)||target.project==='termite-warranty-dev'||target.project.startsWith('demo-')||!/^[-a-z0-9]+$/.test(target.site)||!(/^[1-9]\d*$/.test(target.projectNumber))||!new RegExp(`^1:${target.projectNumber}:web:[a-f0-9]+$`).test(target.appId)||!/^[a-z][a-z0-9-]{2,62}$/.test(target.control))refuse()
  if(!target.serviceAccount.endsWith(`@${target.project}.iam.gserviceaccount.com`)||!target.audience.startsWith(`//iam.googleapis.com/projects/${target.projectNumber}/`)||!/^\d+$/.test(target.repositoryId)||!/^\d+$/.test(target.ownerId))refuse()
  validateFederationConfig({type:'external_account',audience:target.audience,service_account_impersonation_url:`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${target.serviceAccount}:generateAccessToken`,token_url:'https://sts.googleapis.com/v1/token',subject_token_type:'urn:ietf:params:oauth:token-type:jwt'},target)
  return Object.freeze({...target})
}
export function productionDeploymentPlan(target,context) {
  target=validateProductionTarget(target)
  if(context?.event!=='push'||context.ref!=='refs/heads/main'||context.repositoryId!==target.repositoryId||context.ownerId!==target.ownerId||context.environment!=='production'||!(/^[a-f0-9]{40}$/.test(context.revision??''))||context.artifactRevision!==context.revision||context.verified!==true)refuse()
  return Object.freeze({mode:'plan-only',liveMutationAvailable:false,revision:context.revision,project:target.project,site:target.site,concurrency:`production-${target.project}`,cancelInProgress:false,steps:['verify-without-credentials','download-same-revision-artifact','authenticate-wif','deploy-explicit-target','reauthenticate-wif','verify-full-release'],missingExternalEvidence:['WIF trust and IAM','repository protection','initial provider baseline','Cloud release verification']})
}
