import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {repository,ownerId,git,githubReader,completeList,validateVerification,assertRun,assertArtifact} from './lib/verification-evidence.mjs'

export const acceptanceWorkflow='.github/workflows/record-development-acceptance.yml'
const trustedFiles=[acceptanceWorkflow,'scripts/development-acceptance.mjs','scripts/lib/verification-evidence.mjs',
  'scripts/verification-evidence.mjs','scripts/development-deployment.mjs','.github/workflows/deploy-development.yml','governance/verification-policy.json']

export async function recordDevelopmentAcceptance(read,input,{actorId,actor,runId,attempt,now=Date.now()}={}){
  if(Number(actorId)!==ownerId||input.confirm!=='true'||!/^\d+$/.test(input.deployment_run_id??'')||
    !/^[a-f0-9]{40}$/.test(input.accepted_revision??'')||typeof input.acceptance_reference!=='string'||
    input.acceptance_reference.trim().length<1||input.acceptance_reference.length>500)throw Error('Explicit owner acceptance and exact deployment revision are required.')
  const run=await read('/actions/runs/'+input.deployment_run_id)
  const head=await read('/git/commits/'+input.accepted_revision)
  const current=await read('/branches/dev')
  if(current.commit?.sha!==input.accepted_revision)throw Error('Dev advanced after the accepted deployment.')
  const proof=await validateVerification(read,run,head.tree.sha,{event:'push',branch:'dev',revision:input.accepted_revision,deployment:true,maxAge:30*86400000})
  return {schema:1,kind:'development-acceptance',tree:head.tree.sha,revision:input.accepted_revision,deployment:proof,
    actor,actorId:Number(actorId),recordRunId:runId,attempt,acceptedAt:new Date(now).toISOString(),reference:input.acceptance_reference.trim()}
}

export async function requireDevelopmentAcceptance(read,targetTree,revision,{blob=path=>git('rev-parse','HEAD:'+path)}={}){
  try{
    const runs=await completeList(read,'/actions/workflows/record-development-acceptance.yml/runs?event=workflow_dispatch','workflow_runs')
    for(const run of runs.sort((a,b)=>b.id-a.id)){
      if(run.conclusion!=='success')continue
      try{
        assertRun(run,{event:'workflow_dispatch',branch:'main',revision:run.head_sha,path:acceptanceWorkflow,maxAge:30*86400000})
        if(run.actor?.id!==ownerId||run.triggering_actor?.id!==ownerId)throw Error('Foreign acceptance actor.')
        const artifacts=await completeList(read,`/actions/runs/${run.id}/artifacts`,'artifacts')
        const pattern=new RegExp(`^dev-acceptance-${targetTree}-(\\d+)-${run.run_attempt}$`)
        const matched=artifacts.filter(row=>pattern.test(row.name))
        if(matched.length!==1)continue
        assertArtifact(artifacts,run,matched[0].name)
        for(const file of trustedFiles){
          const source=await read('/contents/'+file+'?ref='+run.head_sha)
          if(source.sha!==blob(file))throw Error('Acceptance implementation changed.')
        }
        const jobs=await completeList(read,`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,'jobs')
        const records=jobs.filter(row=>row.name==='Record development acceptance'),job=records[0]
        if(records.length!==1||job.run_id!==run.id||job.run_attempt!==run.run_attempt||job.status!=='completed'||job.conclusion!=='success'||
          !['Validate and record explicit acceptance','Upload acceptance record'].every(name=>{
            const steps=job.steps.filter(step=>step.name===name)
            return steps.length===1&&steps[0].status==='completed'&&steps[0].conclusion==='success'
          }))throw Error('Acceptance job evidence missing.')
        const deploymentRunId=Number(pattern.exec(matched[0].name)[1]),deployment=await read('/actions/runs/'+deploymentRunId)
        // Revalidate deployment and full CI; a human record alone never substitutes for them.
        const proof=await validateVerification(read,deployment,targetTree,{event:'push',branch:'dev',revision,deployment:true,maxAge:30*86400000})
        return {recordRunId:run.id,artifactId:matched[0].id,actorId:ownerId,deployment:proof}
      }catch{continue}
    }
  }catch{ /* Missing/unreadable acceptance never becomes an automatic approval. */ }
  throw Error('Dev acceptance required: no valid owner record for this exact deployed tree.')
}

async function main(){
  if(process.env.GITHUB_REPOSITORY!==repository||process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Acceptance recording is main manual-only.')
  const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'))
  const receipt=await recordDevelopmentAcceptance(githubReader(process.env.GH_TOKEN),event.inputs,{actorId:process.env.GITHUB_ACTOR_ID,actor:process.env.GITHUB_ACTOR,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT})
  await mkdir('tmp',{recursive:true});await writeFile('tmp/development-acceptance.json',JSON.stringify(receipt,null,2))
  const name=`dev-acceptance-${receipt.tree}-${receipt.deployment.runId}-${process.env.GITHUB_RUN_ATTEMPT}`
  await appendFile(process.env.GITHUB_OUTPUT,'name='+name+'\n')
  console.log(JSON.stringify({recorded:true,tree:receipt.tree,revision:receipt.revision,deploymentRunId:receipt.deployment.runId,actorId:receipt.actorId}))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1})
