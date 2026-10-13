import {readFile,appendFile} from 'node:fs/promises'
import {isDeepStrictEqual} from 'node:util'
import {productionInspectionPlan} from './lib/production-inspection-plan.mjs'
import {verifyProductionBundle} from './lib/production-release-bundle.mjs'
import {inspectProductionRelease} from './lib/production-release-inspection.mjs'
import {proofDiagnostic} from './lib/default-recovery-diagnostics.mjs'
try {
  if(process.argv.length!==3||!['plan','local','cloud'].includes(process.argv[2]))throw Error('Explicit read-only mode required.')
  const target=JSON.parse(await readFile(new URL('../deliverables/production-bootstrap-2026-10-13/target.json',import.meta.url),'utf8'))
  if(!isDeepStrictEqual(target,JSON.parse(process.env.PRODUCTION_TARGET_JSON??'')))throw Error('Recorded target mismatch.')
  const receipt=JSON.parse(await readFile(new URL('../deliverables/production-bootstrap-2026-10-13/published-release.json',import.meta.url),'utf8'))
  const plan=productionInspectionPlan(target,receipt,process.env)
  if(process.argv[2]==='plan'){
    if(!process.env.GITHUB_OUTPUT)throw Error('GitHub output required.')
    await appendFile(process.env.GITHUB_OUTPUT,`project=${plan.project}\nprovider=${plan.provider}\nservice_account=${plan.serviceAccount}\nrun_id=${plan.runId}\nartifact_id=${plan.artifactId}\n`)
    console.log(JSON.stringify(plan))
  }else{
    const bundle=await verifyProductionBundle({directory:'.production-inspection',target,revision:plan.revision,digest:plan.digest})
    if(process.argv[2]==='local')console.log(JSON.stringify({verified:true,cloudWrites:false,revision:plan.revision,digest:plan.digest}))
    else{
      const result=await inspectProductionRelease(bundle,{providerVersion:plan.providerVersion})
      console.log(JSON.stringify({revision:plan.revision,...result}));if(!result.ready)process.exitCode=1
    }
  }
}catch(error){console.error(JSON.stringify({ready:false,cloudWrites:false,...proofDiagnostic(error,'release-proof')}));process.exitCode=1}
