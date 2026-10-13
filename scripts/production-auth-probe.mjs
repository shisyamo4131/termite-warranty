// Fixed, non-secret identifiers read back from the approved production setup.
// Only authentication POSTs and project/site metadata GETs. Never deploys.
import {pathToFileURL} from 'node:url'

export const target=Object.freeze({project:'termite-warranty-prod',number:'988295873733',repository:'shisyamo4131/termite-warranty',repositoryId:'1363463339',ownerId:'72244713',serviceAccount:'prod-deployer@termite-warranty-prod.iam.gserviceaccount.com',audience:'//iam.googleapis.com/projects/988295873733/locations/global/workloadIdentityPools/github-production/providers/github'})
const fail=()=>{throw Error('Production authentication probe failed; credentials and response bodies suppressed.')}
const token=value=>typeof value==='string'&&value.length>0&&!/\s/.test(value)
export function checkContext(env,mode) {
  if(!['allow','deny'].includes(mode)||env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_REPOSITORY!==target.repository||env.GITHUB_REPOSITORY_ID!==target.repositoryId||env.GITHUB_REPOSITORY_OWNER_ID!==target.ownerId||! /^[a-f0-9]{40}$/.test(env.GITHUB_SHA??''))fail()
  const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL)
  if(url.protocol!=='https:'||!url.hostname.endsWith('.actions.githubusercontent.com')||url.username||url.password||url.port||!token(env.ACTIONS_ID_TOKEN_REQUEST_TOKEN))fail()
  url.searchParams.set('audience',target.audience)
  return url
}
export function checkClaims(jwt,mode,now=Date.now()) {
  const parts=jwt.split('.')
  if(parts.length!==3)fail()
  const c=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'))
  const sub=`repo:${target.repository}:${mode==='allow'?'environment:production':'ref:refs/heads/main'}`
  if(c.iss!=='https://token.actions.githubusercontent.com'||c.aud!==target.audience||c.repository_id!==target.repositoryId||c.repository_owner_id!==target.ownerId||c.ref!=='refs/heads/main'||c.event_name!=='workflow_dispatch'||c.sub!==sub||!Number.isFinite(c.exp)||c.exp*1000<now+30000)fail()
  // Local claims are a safety check, not signature verification; Google STS verifies the JWT.
}
export async function probe(mode,{env=process.env,fetcher=fetch,now=Date.now}={}) {
  try {
    const oidcUrl=checkContext(env,mode)
    const request=async(url,options={})=>{
      const response=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)})
      if(Number(response.headers.get('content-length')??0)>1048576)fail()
      const body=await response.text()
      if(body.length>1048576)fail()
      return {ok:response.ok,status:response.status,body:JSON.parse(body)}
    }
    for(let attempt=0;attempt<(mode==='allow'?2:1);attempt++) {
      const oidc=await request(oidcUrl,{headers:{Authorization:`Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`}})
      if(!oidc.ok||!token(oidc.body.value))fail()
      checkClaims(oidc.body.value,mode,now())
      const exchanged=await request('https://sts.googleapis.com/v1/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audience:target.audience,grantType:'urn:ietf:params:oauth:grant-type:token-exchange',requestedTokenType:'urn:ietf:params:oauth:token-type:access_token',scope:'https://www.googleapis.com/auth/cloud-platform',subjectTokenType:'urn:ietf:params:oauth:token-type:jwt',subjectToken:oidc.body.value})})
      if(mode==='deny') {
        if(exchanged.status!==400||exchanged.body.error!=='invalid_grant'||! /attribute condition/i.test(exchanged.body.error_description??'')||exchanged.body.access_token)fail()
        return {mode,result:'pass',reason:'provider-attribute-condition-rejected',cloudResourceWrites:false}
      }
      if(!exchanged.ok||!token(exchanged.body.access_token)||!(exchanged.body.expires_in>0))fail()
      const impersonated=await request(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${target.serviceAccount}:generateAccessToken`,{method:'POST',headers:{Authorization:`Bearer ${exchanged.body.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({scope:['https://www.googleapis.com/auth/cloud-platform'],lifetime:'600s'})})
      if(!impersonated.ok||!token(impersonated.body.accessToken)||!(Date.parse(impersonated.body.expireTime)>now()))fail()
      const headers={Authorization:`Bearer ${impersonated.body.accessToken}`}
      const project=await request(`https://firebase.googleapis.com/v1beta1/projects/${target.project}`,{headers})
      const site=await request(`https://firebasehosting.googleapis.com/v1beta1/projects/${target.project}/sites/${target.project}`,{headers})
      if(!project.ok||project.body.projectId!==target.project||String(project.body.projectNumber)!==target.number||!site.ok||![target.project,target.number].some(id=>site.body.name===`projects/${id}/sites/${target.project}`))fail()
    }
    return {mode,result:'pass',freshExchanges:2,project:target.project,cloudResourceWrites:false,expiryRefreshTested:false}
  }catch{fail()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    if(process.argv.length!==4||process.argv[3]!=='--execute-approved')fail()
    console.log(JSON.stringify(await probe(process.argv[2])))
  }catch{console.error('Production authentication probe failed; credentials and response bodies suppressed.');process.exitCode=1}
}
