// Local artifacts only. This command neither authenticates nor deploys.
import {fileURLToPath} from 'node:url'
import {buildReleaseArtifacts,assertFreshBuild} from './lib/default-recovery-build.mjs'
export function releaseRevision(args) {
 if(args.length!==2||args[0]!=='--revision'||!/^[a-f0-9]{40}$/.test(args[1]??''))throw Error('Explicit exact revision required.')
 return args[1]
}
async function main() {
 const revision=releaseRevision(process.argv.slice(2)),root=fileURLToPath(new URL('..',import.meta.url))
 const receipt=await buildReleaseArtifacts({root,revision})
 await assertFreshBuild(receipt,{root,revision})
 console.log(JSON.stringify({localArtifactBuild:true,deterministicRecoveryProfile:true,revision,cloudWrites:false}))
}
if(process.argv[1]&&fileURLToPath(import.meta.url).toLowerCase()===process.argv[1].toLowerCase())main().catch(()=>{console.error('Local recovery release build refused or failed. No deployment performed.');process.exitCode=1})
