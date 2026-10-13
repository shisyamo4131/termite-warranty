// No credential discovery at import time; callers choose the authentication mode.
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
const scopes=['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase']
const refuse=()=>{throw Error('Operator credentials unavailable or invalid.')}

export function tokenBridge(client,{now=Date.now}={}) {
  if(typeof client?.getAccessToken!=='function')refuse()
  return {authClient:client,credential:{async getAccessToken(){
    try {
      const result=await client.getAccessToken()
      const token=typeof result==='string'?result:result?.token
      const seconds=Math.floor((client.credentials?.expiry_date-now())/1000)
      if(typeof token!=='string'||!token||/[\s\r\n]/.test(token)||!Number.isSafeInteger(seconds)||seconds<=0)refuse()
      return {access_token:token,expires_in:seconds}
    }catch{refuse()}
  }}}
}

export function validateFederationConfig(config,{audience,serviceAccount}) {
  if(!/^\/\/iam.googleapis.com\/projects\/[1-9]\d*\/locations\/global\/workloadIdentityPools\/[\w-]+\/providers\/[\w-]+$/.test(audience??'')||!/^[-a-z0-9]+@[-a-z0-9]+\.iam\.gserviceaccount\.com$/.test(serviceAccount??''))refuse()
  const endpoint=`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`
  if(config?.type!=='external_account'||config.audience!==audience||config.service_account_impersonation_url!==endpoint||config.token_url!=='https://sts.googleapis.com/v1/token'||config.subject_token_type!=='urn:ietf:params:oauth:token-type:jwt'||config.credential_source?.executable)refuse()
  return config
}

export async function operatorCredentials({mode='firebase-cli',environment=process.env,audience,serviceAccount}={}) {
  if(Object.keys(environment).some(key=>key.endsWith('_EMULATOR_HOST')&&environment[key]))refuse()
  try {
    const {GoogleAuth,OAuth2Client}=await import('google-auth-library')
    if(mode==='adc') {
      // Explicit WIF file only: never fall back to a developer's default account or key.
      if(!environment.GOOGLE_APPLICATION_CREDENTIALS)refuse()
      const config=validateFederationConfig(JSON.parse(await readFile(environment.GOOGLE_APPLICATION_CREDENTIALS,'utf8')),{audience,serviceAccount})
      const auth=new GoogleAuth({credentials:config,scopes})
      return tokenBridge(await auth.getClient())
    }
    if(mode!=='firebase-cli')refuse()
    const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js'),api=require('firebase-tools/lib/api.js')
    const account=auth.getGlobalDefaultAccount()
    if(!account?.tokens?.refresh_token)refuse()
    const client=new OAuth2Client(api.clientId(),api.clientSecret())
    client.setCredentials({refresh_token:account.tokens.refresh_token})
    return tokenBridge(client)
  }catch{refuse()}
}
