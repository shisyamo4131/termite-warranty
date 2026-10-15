import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {repository,ownerId,git,githubReader,completeList,validateVerification,assertRun,assertArtifact} from './lib/verification-evidence.mjs'
import {validateDevelopmentDeployment,assertSuccessfulJob} from './lib/development-verification.mjs'
import {documentationPaths} from './documentation-changes.mjs'

export const acceptanceWorkflow='.github/workflows/record-development-acceptance.yml'
const trustedFiles=[acceptanceWorkflow,'scripts/development-acceptance.mjs','scripts/lib/verification-evidence.mjs',
  'scripts/verification-evidence.mjs','scripts/lib/development-verification.mjs','scripts/development-deployment.mjs','.github/workflows/deploy-development.yml','governance/verification-policy.json','scripts/documentation-changes.mjs']

// Owner-approved bootstrap on 2026-10-15. Only the next Dev merge after this
// confirmed documentation head may bridge the acceptance protocol repair.
// It needs its own complete verification AND successful Dev deployment.
export const repairBaseline='22d5bac7c47f101fdf8b0522f8108edf16d06330'
export const repairParent='bb9e2f97fcaf09242349b9f6a6f256acbf003047'
const repairPaths=new Set([...documentationPaths,acceptanceWorkflow,
  'scripts/development-acceptance.mjs','scripts/verification-evidence.mjs','scripts/lib/verification-evidence.mjs',
  'test/verification-evidence.test.mjs','docs/decisions/0046-verification-reuse-and-dev-acceptance.md'])
const validSha=x=>/^[a-f0-9]{40}$/.test(x??'')

export async function verifyContinuation(read,from,to,{repair=false}={}){
  if(!validSha(from)||!validSha(to))throw Error('Invalid continuation revision.')
  const before=await read('/git/commits/'+from),after=from===to?before:await read('/git/commits/'+to)
  if(!validSha(before.tree?.sha)||!validSha(after.tree?.sha))throw Error('Missing continuation tree.')
  if(from===to)return after.tree.sha
  const comparison=await read(`/compare/${from}...${to}`)
  if(!['ahead','identical'].includes(comparison.status)||comparison.merge_base_commit?.sha!==from)throw Error('Continuation is not a descendant.')
  if(repair&&(from!==repairBaseline||after.parents?.length!==2||after.parents[0].sha!==repairParent))throw Error('Repair is outside the approved bootstrap.')
  async function entries(sha){
    const data=await read(`/git/trees/${sha}?recursive=1`)
    if(data.sha!==sha||data.truncated!==false||!Array.isArray(data.tree))throw Error('Incomplete continuation tree.')
    const map=new Map()
    for(const e of data.tree){
      if(typeof e.path!=='string'||map.has(e.path)||!validSha(e.sha)||!['tree','blob','commit'].includes(e.type))throw Error('Invalid continuation tree entry.')
      map.set(e.path,e)
    }
    return map
  }
  const a=await entries(before.tree.sha),b=await entries(after.tree.sha),allowed=repair?repairPaths:documentationPaths
  for(const path of new Set([...a.keys(),...b.keys()])){
    const x=a.get(path),y=b.get(path)
    if(x?.type==='tree'&&y?.type==='tree')continue
    if(x&&y&&x.sha===y.sha&&x.type===y.type&&x.mode===y.mode)continue
    if(!allowed.has(path)||!x||!y||x.type!=='blob'||y.type!=='blob'||x.mode!=='100644'||y.mode!=='100644')throw Error('Non-document or unapproved repair change: '+path)
  }
  return after.tree.sha
}

async function verifyDocumentPush(read,revision){
  const runs=await completeList(read,`/actions/workflows/deploy-development.yml/runs?event=push&head_sha=${revision}`,'workflow_runs')
  const run=runs.filter(x=>x.head_sha===revision).sort((a,b)=>b.id-a.id)[0]
  if(!run)throw Error('Document verification missing.')
  assertRun(run,{event:'push',branch:'dev',revision,maxAge:30*86400000})
  const jobs=await completeList(read,`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,'jobs')
  assertSuccessfulJob(jobs,run,'Verify development deployment',['Check documentation governance','Verify documentation scope and whitespace'])
  const deploy=jobs.filter(x=>x.name==='Deploy to termite-warranty-dev')
  if(deploy.length!==1||deploy[0].conclusion!=='skipped')throw Error('Document continuation unexpectedly deployed.')
}

export async function continuationProof(read,acceptedRunId,candidateRunId,recordRevision,targetRevision){
  const acceptedRun=await read('/actions/runs/'+acceptedRunId),acceptedRevision=acceptedRun.head_sha
  const acceptedTree=(await read('/git/commits/'+acceptedRevision)).tree?.sha
  const accepted=await validateDevelopmentDeployment(read,acceptedRun,acceptedTree,acceptedRevision)
  let deployment=accepted
  if(candidateRunId!==acceptedRunId){
    const candidate=await read('/actions/runs/'+candidateRunId)
    const candidateTree=await verifyContinuation(read,acceptedRevision,candidate.head_sha,{repair:true})
    deployment=await validateDevelopmentDeployment(read,candidate,candidateTree,candidate.head_sha)
  }
  const recordTree=await verifyContinuation(read,deployment.revision,recordRevision)
  if(deployment.revision!==recordRevision)await verifyDocumentPush(read,recordRevision)
  const targetTree=await verifyContinuation(read,recordRevision,targetRevision)
  if(recordRevision!==targetRevision)await verifyDocumentPush(read,targetRevision)
  return {accepted,deployment,recordTree,promotion:{revision:targetRevision,tree:targetTree}}
}

export async function recordDevelopmentAcceptance(read,input,{actorId,actor,runId,attempt,checkout,now=Date.now()}={}){
  if(Number(actorId)!==ownerId||input.confirm!=='true'||!/^\d+$/.test(input.deployment_run_id??'')||
    !/^[a-f0-9]{40}$/.test(input.accepted_revision??'')||typeof input.acceptance_reference!=='string'||
    input.acceptance_reference.trim().length<1||input.acceptance_reference.length>500)throw Error('Explicit owner acceptance and exact deployment revision are required.')
  const run=await read('/actions/runs/'+input.deployment_run_id)
  const head=await read('/git/commits/'+input.accepted_revision)
  const current=await read('/branches/dev')
  if(checkout&&current.commit?.sha!==checkout)throw Error('Dev advanced during acceptance recording.')
  if(current.commit?.sha!==input.accepted_revision||input.candidate_deployment_run_id){
    const candidateId=Number(input.candidate_deployment_run_id||input.deployment_run_id)
    if(!Number.isSafeInteger(candidateId)||candidateId<1)throw Error('Invalid candidate deployment.')
    if(run.head_sha!==input.accepted_revision)throw Error('Accepted deployment revision mismatch.')
    const proof=await continuationProof(read,Number(input.deployment_run_id),candidateId,current.commit.sha,current.commit.sha)
    return {schema:2,kind:'development-acceptance',tree:proof.recordTree,revision:input.accepted_revision,...proof,
      actor,actorId:Number(actorId),recordRunId:runId,attempt,acceptedAt:new Date(now).toISOString(),reference:input.acceptance_reference.trim()}
  }
  const proof=await validateDevelopmentDeployment(read,run,head.tree.sha,input.accepted_revision)
  return {schema:1,kind:'development-acceptance',tree:head.tree.sha,revision:input.accepted_revision,deployment:proof,
    actor,actorId:Number(actorId),recordRunId:runId,attempt,acceptedAt:new Date(now).toISOString(),reference:input.acceptance_reference.trim()}
}

export async function requireDevelopmentAcceptance(read,targetTree,revision,{blob=path=>git('rev-parse','HEAD:'+path)}={}){
  try{
    const runs=await completeList(read,'/actions/workflows/record-development-acceptance.yml/runs?event=workflow_dispatch','workflow_runs')
    for(const run of runs.sort((a,b)=>b.id-a.id)){
      if(run.conclusion!=='success')continue
      try{
        assertRun(run,{event:'workflow_dispatch',branch:'dev',revision:run.head_sha,path:acceptanceWorkflow,maxAge:30*86400000})
        if(run.actor?.id!==ownerId||run.triggering_actor?.id!==ownerId)throw Error('Foreign acceptance actor.')
        const artifacts=await completeList(read,`/actions/runs/${run.id}/artifacts`,'artifacts')
        const pattern=new RegExp(`^dev-acceptance-${targetTree}-(\\d+)-${run.run_attempt}$`)
        const v2=new RegExp(`^dev-acceptance-v2-([a-f0-9]{40})-(\\d+)-(\\d+)-${run.run_attempt}$`)
        const matched=artifacts.filter(row=>pattern.test(row.name)||v2.test(row.name))
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
        const extended=v2.exec(matched[0].name)
        if(extended){
          const proof=await continuationProof(read,Number(extended[2]),Number(extended[3]),run.head_sha,revision)
          if(proof.recordTree!==extended[1]||proof.promotion.tree!==targetTree)throw Error('Continuation evidence tree mismatch.')
          return {recordRunId:run.id,artifactId:matched[0].id,actorId:ownerId,...proof}
        }
        if(run.head_sha!==revision)throw Error('Legacy acceptance requires exact revision.')
        const deploymentRunId=Number(pattern.exec(matched[0].name)[1]),deployment=await read('/actions/runs/'+deploymentRunId)
        // Revalidate deployment and full CI; a human record alone never substitutes for them.
        const proof=await validateDevelopmentDeployment(read,deployment,targetTree,revision)
        return {recordRunId:run.id,artifactId:matched[0].id,actorId:ownerId,deployment:proof}
      }catch{continue}
    }
  }catch{ /* Missing/unreadable acceptance never becomes an automatic approval. */ }
  throw Error('Dev acceptance required: no valid owner record for this exact deployed tree.')
}

async function main(){
  if(process.env.GITHUB_REPOSITORY!==repository||process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'||process.env.GITHUB_REF!=='refs/heads/dev')throw Error('Acceptance recording is Dev manual-only.')
  const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'))
  if(git('rev-parse','HEAD')!==process.env.GITHUB_SHA)throw Error('Acceptance checkout mismatch.')
  const receipt=await recordDevelopmentAcceptance(githubReader(process.env.GH_TOKEN),event.inputs,{checkout:process.env.GITHUB_SHA,actorId:process.env.GITHUB_ACTOR_ID,actor:process.env.GITHUB_ACTOR,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT})
  await mkdir('tmp',{recursive:true});await writeFile('tmp/development-acceptance.json',JSON.stringify(receipt,null,2))
  const name=receipt.schema===2?`dev-acceptance-v2-${receipt.tree}-${receipt.accepted.runId}-${receipt.deployment.runId}-${process.env.GITHUB_RUN_ATTEMPT}`:`dev-acceptance-${receipt.tree}-${receipt.deployment.runId}-${process.env.GITHUB_RUN_ATTEMPT}`
  await appendFile(process.env.GITHUB_OUTPUT,'name='+name+'\n')
  console.log(JSON.stringify({recorded:true,tree:receipt.tree,revision:receipt.revision,deploymentRunId:receipt.deployment.runId,actorId:receipt.actorId}))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1})
