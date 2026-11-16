import {createRequire} from 'node:module'
import {tokenBridge} from './operator-credentials.mjs'

export function selectDeploymentAccount(accounts,email) {
  if(typeof email!=='string'||!/^[-a-zA-Z0-9._+]+@[-a-zA-Z0-9.]+$/.test(email))throw Error('An explicit Firebase CLI account email is required.')
  const matches=accounts.filter(account=>account.user?.email===email)
  if(matches.length!==1||!matches[0].tokens?.refresh_token)throw Error('Exactly one matching logged-in Firebase CLI account is required.')
  return matches[0]
}
export async function deploymentCredentials(email) {
  const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth.js'),api=require('firebase-tools/lib/api.js')
  const account=selectDeploymentAccount(auth.getAllAccounts(),email)
  const {OAuth2Client}=await import('google-auth-library')
  const client=new OAuth2Client(api.clientId(),api.clientSecret())
  client.setCredentials({refresh_token:account.tokens.refresh_token})
  const bridge=tokenBridge(client)
  const verifyIdentity=async()=>{
    if(selectDeploymentAccount(auth.getAllAccounts(),email).tokens.refresh_token!==account.tokens.refresh_token)throw Error('Selected Firebase CLI login changed.')
    const {access_token}=await bridge.credential.getAccessToken()
    if((await client.getTokenInfo(access_token)).email!==email)throw Error('OAuth identity differs from the selected Firebase CLI account.')
  }
  await verifyIdentity()
  return {...bridge,verifyIdentity}
}
