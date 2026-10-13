import {verifyProductionBundle,stageProductionBundle} from './lib/production-release-bundle.mjs'
import {inspectProductionRelease} from './lib/production-release-inspection.mjs'
try {
  if(process.argv.length!==4||!['local','stage','predeploy','cloud'].includes(process.argv[2]))throw Error('Explicit verification mode required.')
  const options={directory:process.argv[3],target:JSON.parse(process.env.PRODUCTION_TARGET_JSON??''),revision:process.env.GITHUB_SHA,digest:process.env.PRODUCTION_RELEASE_DIGEST}
  const bundle=await verifyProductionBundle(options)
  if(process.argv[2]==='local')console.log(JSON.stringify({verified:true,revision:bundle.revision,cloudWrites:false}))
  else if(process.argv[2]==='stage'){await stageProductionBundle(options,'.production-deploy');console.log('Verified deployment copy prepared; no Cloud writes.')}
  else {
    const result=await inspectProductionRelease(bundle,{providerVersion:process.env.PRODUCTION_PROVIDER_VERSION,predeploy:process.argv[2]==='predeploy'})
    console.log(JSON.stringify(result));if(!result.ready)process.exitCode=1
  }
}catch{console.error('Production release verification refused or incomplete. No Cloud writes performed.');process.exitCode=1}
