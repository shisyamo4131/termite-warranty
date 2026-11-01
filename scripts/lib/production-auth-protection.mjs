// Secret material remains in the authenticated worker and the private bucket.
import {isDeepStrictEqual} from 'node:util'
import {authImportOptions,readPrivateAuthObject} from './auth-recovery.mjs'
import {protectionBucket,configureProductionProtection} from './production-protection.mjs'
const refuse=()=>{throw Error('Auth protection refused; retain private evidence and inspect before retrying.')}
export function authProtectionRequestAllowed(url,method,t,operation,body){
  try{
    const u=new URL(url),bucket=protectionBucket(t),object=`hash-configuration/${operation}.json`
    if(u.username||u.password||u.hash)return false
    if(method==='GET'&&url===`https://identitytoolkit.googleapis.com/admin/v2/projects/${t.project}/config`)return true
    if(u.origin!=='https://storage.googleapis.com')return false
    if(method==='POST'){
      if(u.pathname!==`/upload/storage/v1/b/${bucket}/o`||u.search!==`?uploadType=media&name=${encodeURIComponent(object)}&ifGenerationMatch=0`)return false
      authImportOptions(body,t.project)
      return Object.keys(body).sort().join()==='hashConfig,project,schemaVersion'
    }
    return method==='GET'&&u.pathname===`/storage/v1/b/${bucket}/o/${encodeURIComponent(object)}`&&/^\?(?:alt=media&)?generation=\d+$/.test(u.search)
  }catch{return false}
}
export async function preserveProductionAuthConfiguration(o,c){
  const bucket=protectionBucket(o.target),object=`hash-configuration/${o.operation}.json`,evidence=c.database(o.target.control).doc('recovery/hashConfigurationEvidence')
  let config
  async function inspect(){
    if(!(await c.protection.inspect()).foundationReady)refuse()
    const source=await c.request(`https://identitytoolkit.googleapis.com/admin/v2/projects/${o.target.project}/config`)
    if(![`projects/${o.target.project}/config`,`projects/${o.target.projectNumber}/config`].includes(source.name))refuse()
    const h=source.signIn?.hashConfig
    config={schemaVersion:1,project:o.target.project,hashConfig:{algorithm:h?.algorithm,signerKey:h?.signerKey,saltSeparator:h?.saltSeparator,rounds:h?.rounds,memoryCost:h?.memoryCost}}
    authImportOptions(config,o.target.project)
    const prior=await evidence.get()
    if(!prior.exists)return {foundationReady:false}
    const meta=prior.data()
    if(meta.object!==object||meta.operation!==o.operation)refuse()
    const saved=await readPrivateAuthObject(meta,c.requestRaw,{expectedBucket:bucket,requirePinned:true})
    if(!isDeepStrictEqual(JSON.parse(saved.bytes),config))refuse()
    return {foundationReady:true}
  }
  const protection={inspect,configure:async()=>{
    const result=await c.request(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(object)}&ifGenerationMatch=0`,'POST',config)
    if(result.bucket!==bucket||result.name!==object||!/^\d+$/.test(result.generation??''))refuse()
    const meta={bucket,object,generation:result.generation,operation:o.operation}
    const saved=await readPrivateAuthObject(meta,c.requestRaw,{expectedBucket:bucket,requirePinned:true})
    if(!isDeepStrictEqual(JSON.parse(saved.bytes),config))refuse()
    await evidence.create(meta)
    return inspect()
  }}
  await configureProductionProtection(o,{...c,protection})
  return {hashConfigurationVerified:true}
}
