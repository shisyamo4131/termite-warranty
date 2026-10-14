import {readFile,appendFile} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {buildReleaseArtifacts,assertFreshBuild} from './lib/default-recovery-build.mjs'
import {localReleaseInputs} from './lib/default-recovery-release-proof.mjs'
import {writeProductionBundle,readHostingFiles} from './lib/production-release-bundle.mjs'
import {validateProductionTarget} from './lib/production-deployment-plan.mjs'
import {prepareFunctionsDomain} from './functions-domain.mjs'
export async function prepareProductionRelease({root=process.cwd(),directory,target,revision,parameters,build=buildReleaseArtifacts}) {
  target=validateProductionTarget(target)
  // No credentials are required for this build. All production values are public identifiers.
  if(Object.keys(process.env).some(k=>k.startsWith('NUXT_PUBLIC_FIREBASE_')||k.endsWith('_EMULATOR_HOST')&&process.env[k])||process.env.GOOGLE_APPLICATION_CREDENTIALS)throw Error('Release build requires an isolated credential-free environment.')
  // A fresh runner must not depend on npm test/pretest to materialize release inputs.
  // Prepare before capturing the fresh-build input hash; later mutations remain rejected.
  await prepareFunctionsDomain({sourceDirectory:join(root,'src/domain'),outputDirectory:join(root,'functions/domain')})
  const environment={...process.env,TERMITE_DEPLOYMENT_ENVIRONMENT:'production',TERMITE_PRODUCTION_PROJECT:target.project,TERMITE_PRODUCTION_APP_ID:target.appId}
  const receipt=await build({root,revision,environment})
  const inputs=await localReleaseInputs(root,{receipt,revision})
  inputs.hostingConfig=JSON.parse(await readFile(join(root,'firebase.json'),'utf8')).hosting
  const rules={default:await readFile(join(root,'firestore.rules'),'utf8'),control:await readFile(join(root,'firestore.control.rules'),'utf8')}
  const indexes=JSON.parse(await readFile(join(root,'firestore.indexes.json'),'utf8'))
  const result=await writeProductionBundle({directory,target,revision,inputs,hostingFiles:await readHostingFiles(root),rules,indexes,parameters})
  await assertFreshBuild(receipt,{root,revision})
  return result
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  (async()=>{
    if(process.argv.length!==3)throw Error('Output directory required.')
    const result=await prepareProductionRelease({directory:process.argv[2],target:JSON.parse(process.env.PRODUCTION_TARGET_JSON??''),revision:process.env.GITHUB_SHA,parameters:JSON.parse(process.env.PRODUCTION_RECOVERY_PARAMETERS_JSON??'')})
    if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`digest=${result.digest}\n`)
    console.log(JSON.stringify(result))
  })().catch(()=>{console.error('Production release preparation refused. No deployment performed.');process.exitCode=1})
}
