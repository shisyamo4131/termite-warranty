import test from 'node:test'
import './production-auth-probe.test.mjs'
import './production-sdk-probe.test.mjs'
import assert from 'node:assert/strict'
import {tokenBridge,validateFederationConfig,operatorCredentials} from '../scripts/lib/operator-credentials.mjs'
import {options} from '../scripts/default-recovery.mjs'
import {readFile} from 'node:fs/promises'
import {parse} from 'yaml'

const target={project:'fictional-prod',projectNumber:'123456',site:'fictional-site',appId:'1:123456:web:aaaa',control:'recovery-control',serviceAccount:'deploy@fictional-prod.iam.gserviceaccount.com',audience:'//iam.googleapis.com/projects/123456/locations/global/workloadIdentityPools/fictional/providers/github',repositoryId:'123',ownerId:'456'}

import './production-bootstrap.test.mjs'

test('auth probe workflow is manual, separates jobs and has no deployment or persistent credential steps',async()=>{
  const w=parse(await readFile(new URL('../.github/workflows/verify-production-auth.yml',import.meta.url),'utf8'))
  assert.deepEqual(w.on,{workflow_dispatch:null})
  assert.deepEqual(w.permissions,{contents:'read'})
  assert.equal(w.jobs.authenticate.if,"github.ref == 'refs/heads/main'")
  assert.equal(w.jobs.reauthenticate.needs,'authenticate')
  assert.equal(w.jobs['deny-without-environment'].needs,'reauthenticate')
  for(const [name,job] of Object.entries(w.jobs)){
    assert.equal(job.environment,name==='deny-without-environment'?undefined:'production')
    assert.deepEqual(job.permissions,{contents:'read','id-token':'write'})
    for(const step of job.steps){
      if(step.uses){assert.ok(['actions/checkout@v7','actions/setup-node@v7'].includes(step.uses));if(step.uses.includes('checkout'))assert.equal(step.with['persist-credentials'],false)}
      else assert.ok(['node --test test/production-auth-probe.test.mjs',`node scripts/production-auth-probe.mjs ${name==='deny-without-environment'?'deny':'allow'} --execute-approved`].includes(step.run))
      assert.equal(step['continue-on-error'],undefined)
    }
  }
})
const config=()=>({type:'external_account',audience:target.audience,service_account_impersonation_url:`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${target.serviceAccount}:generateAccessToken`,token_url:'https://sts.googleapis.com/v1/token',subject_token_type:'urn:ietf:params:oauth:token-type:jwt'})

test('token bridge refreshes through provider and refuses absent/expired lifetime without leaking errors',async()=>{
  let count=0
  const client={credentials:{},async getAccessToken(){this.credentials.expiry_date=10000+300000;return {token:'fictional-'+(++count)}}}
  const bridge=tokenBridge(client,{now:()=>10000})
  assert.deepEqual(await bridge.credential.getAccessToken(),{access_token:'fictional-1',expires_in:300})
  assert.equal((await bridge.credential.getAccessToken()).access_token,'fictional-2')
  for(const expiry of [undefined,NaN,10000,9999])await assert.rejects(()=>tokenBridge({credentials:{expiry_date:expiry},getAccessToken:async()=>({token:'private-token'})},{now:()=>10000}).credential.getAccessToken(),/unavailable or invalid/)
  await assert.rejects(()=>tokenBridge({getAccessToken:async()=>{throw Error('private-canary')}}).credential.getAccessToken(),e=>!e.message.includes('private-canary'))
})
test('federation identity refuses keys, user ADC, foreign SA/provider and executable sources',()=>{
  assert.equal(validateFederationConfig(config(),target).type,'external_account')
  for(const patch of [{type:'service_account'},{type:'authorized_user'},{audience:'foreign'},{service_account_impersonation_url:'https://evil.invalid/token'},{token_url:'https://evil.invalid/token'},{credential_source:{executable:{command:'never'}}}])assert.throws(()=>validateFederationConfig({...config(),...patch},target))
})
test('ADC has no implicit local credential fallback or emulator mixing',async()=>{
  await assert.rejects(()=>operatorCredentials({mode:'adc',environment:{}}))
  await assert.rejects(()=>operatorCredentials({mode:'adc',environment:{FIRESTORE_EMULATOR_HOST:'127.0.0.1:1'}}))
  const base=['status','--project','termite-warranty-dev','--control','recovery-control','--revision','a'.repeat(40),'--source','(default)','--generation','1','--dev-inspect']
  assert.equal(options([...base,'--auth','adc','--wif-audience',target.audience,'--service-account',target.serviceAccount]).auth,'adc')
  assert.throws(()=>options([...base,'--auth','adc']))
  assert.throws(()=>options([...base,'--auth','adc','--wif-audience',target.audience,'--service-account',target.serviceAccount,'--dev-execute']))
})
