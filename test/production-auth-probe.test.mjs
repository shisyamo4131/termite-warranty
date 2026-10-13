import test from 'node:test'
import assert from 'node:assert/strict'
import {checkContext,probe,target} from '../scripts/production-auth-probe.mjs'
const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:target.repository,GITHUB_REPOSITORY_ID:target.repositoryId,GITHUB_REPOSITORY_OWNER_ID:target.ownerId,GITHUB_SHA:'a'.repeat(40),ACTIONS_ID_TOKEN_REQUEST_URL:'https://runner.actions.githubusercontent.com/token',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'fictional-request-token'}
const now=()=>1700000000000
const jwt=mode=>['header',Buffer.from(JSON.stringify({iss:'https://token.actions.githubusercontent.com',aud:target.audience,repository_id:target.repositoryId,repository_owner_id:target.ownerId,ref:'refs/heads/main',event_name:'workflow_dispatch',sub:`repo:${target.repository}:${mode==='allow'?'environment:production':'ref:refs/heads/main'}`,exp:1700000600})).toString('base64url'),'signature'].join('.')
function server(mode,override={}) {
  const calls=[]
  const fetcher=async(url,options)=>{
    url=String(url);calls.push({url,options})
    let body=url.includes('actions.githubusercontent.com')?{value:jwt(mode)}:url.includes('sts.googleapis.com')?(mode==='deny'?{error:'invalid_grant',error_description:'The given credential is rejected by the attribute condition.'}:{access_token:'fictional-sts',expires_in:600}):url.includes('iamcredentials.googleapis.com')?{accessToken:'fictional-sa',expireTime:'2023-11-14T22:23:20Z'}:url.includes('firebasehosting.googleapis.com')?{name:`projects/${target.project}/sites/${target.project}`}:{projectId:target.project,projectNumber:target.number}
    let status=mode==='deny'&&url.includes('sts.googleapis.com')?400:200
    if(override.match?.(url)){body=override.body;status=override.status??200}
    return new Response(JSON.stringify(body),{status})
  }
  return {fetcher,calls}
}
test('wrong repository/ref/event/owner or credential destination stops before any request',async()=>{
  for(const change of [{GITHUB_REF:'refs/heads/dev'},{GITHUB_EVENT_NAME:'pull_request'},{GITHUB_REPOSITORY_ID:'1'},{GITHUB_REPOSITORY_OWNER_ID:'2'},{ACTIONS_ID_TOKEN_REQUEST_URL:'https://example.com/token'},{ACTIONS_ID_TOKEN_REQUEST_URL:'http://runner.actions.githubusercontent.com/token'}]) {
    const s=server('allow');await assert.rejects(()=>probe('allow',{env:{...env,...change},now,fetcher:s.fetcher}));assert.equal(s.calls.length,0)
  }
  assert.throws(()=>checkContext(env,'other'))
})
test('successful probe performs two fresh exchanges and only metadata GETs',async()=>{
  const s=server('allow'),r=await probe('allow',{env,now,fetcher:s.fetcher})
  assert.equal(r.freshExchanges,2);assert.equal(r.cloudResourceWrites,false);assert.equal(r.expiryRefreshTested,false)
  assert.equal(s.calls.length,10)
  assert.equal(s.calls.filter(x=>x.options.method==='POST').length,4)
  assert.ok(s.calls.every(x=>x.options.redirect==='error'))
  assert.ok(!JSON.stringify(r).includes('fictional-'))
})
test('negative probe requires attribute-condition rejection, not just any failure',async()=>{
  const s=server('deny');assert.equal((await probe('deny',{env,now,fetcher:s.fetcher})).reason,'provider-attribute-condition-rejected');assert.equal(s.calls.length,2)
  for(const body of [{error:'invalid_grant',error_description:'expired token'},{access_token:'unexpected-token'},{error:'permission_denied'}]){
    const bad=server('deny',{match:u=>u.includes('sts.googleapis.com'),body,status:400});await assert.rejects(()=>probe('deny',{env,now,fetcher:bad.fetcher}))
  }
})
test('wrong resource identity and untrusted token claims fail without leaking bodies',async()=>{
  for(const override of [{match:u=>u.includes('firebasehosting'),body:{name:'another-site'}},{match:u=>u.includes('actions.githubusercontent.com'),body:{value:jwt('deny')}},{match:u=>u.includes('iamcredentials'),body:{accessToken:'secret-value',expireTime:'2000-01-01'}}]){
    const s=server('allow',override);await assert.rejects(()=>probe('allow',{env,now,fetcher:s.fetcher}),e=>!e.message.includes('secret-value'))
  }
})
