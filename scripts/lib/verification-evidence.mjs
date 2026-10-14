import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'

export const repository='shisyamo4131/termite-warranty'
const target=JSON.parse(readFileSync(new URL('../../deliverables/production-bootstrap-2026-10-13/target.json',import.meta.url)))
export const repositoryId=Number(target.repositoryId),ownerId=Number(target.ownerId)
export const verificationWorkflow='.github/workflows/deploy-development.yml'
export const gateSteps=['Check project governance','Run domain tests','Type-check the application','Build the application',
  'Run Firestore and Callable Emulator tests','Check Functions syntax','Check Emulator seed syntax']
export const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim()
export const tree=()=>git('rev-parse','HEAD^{tree}')
export const evidenceName=(tree,attempt)=>`comprehensive-${tree}-${attempt}`
const sha=value=>/^[a-f0-9]{40}$/.test(value??'')
export function githubReader(token,fetcher=fetch){
  if(!token)throw Error('GitHub read token unavailable.')
  return async path=>{
    if(!path.startsWith('/')||path.includes('..')||path.includes('://'))throw Error('Unscoped GitHub API request.')
    const response=await fetcher(`https://api.github.com/repos/${repository}${path}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(20000)})
    if(!response.ok)throw Error('GitHub metadata unavailable: '+response.status)
    return response.json()
  }
}
export function assertRun(run,{event,branch,revision,path=verificationWorkflow,now=Date.now(),maxAge=86400000}={}){
  if(run.repository?.id!==repositoryId||run.head_repository?.id!==repositoryId||run.repository?.owner?.id!==ownerId||
    run.path!==path||run.event!==event||run.head_branch!==branch||run.head_sha!==revision||!sha(revision)||
    run.status!=='completed'||run.conclusion!=='success'||!Number.isSafeInteger(run.id)||!Number.isSafeInteger(run.run_attempt)||run.run_attempt<1||
    !Number.isFinite(Date.parse(run.updated_at))||Date.parse(run.updated_at)>now+60000||now-Date.parse(run.updated_at)>maxAge)throw Error('Untrusted, unsuccessful or stale workflow run.')
}
export function assertJobs(jobs,run,{deployment=false}={}){
  if(!Array.isArray(jobs))throw Error('Job evidence missing.')
  const verify=jobs.filter(job=>job.name==='Verify development deployment')
  if(verify.length!==1)throw Error('Verification job missing or duplicated.')
  const successful=job=>job.run_id===run.id&&job.run_attempt===run.run_attempt&&job.conclusion==='success'&&job.status==='completed'
  if(!successful(verify[0]))throw Error('Verification job did not succeed.')
  for(const name of [...gateSteps,'Publish comprehensive verification evidence','Upload comprehensive verification evidence']){
    const steps=verify[0].steps.filter(step=>step.name===name)
    if(steps.length!==1||steps[0].conclusion!=='success'||steps[0].status!=='completed')throw Error('A comprehensive gate is missing, skipped or failed: '+name)
  }
  for(const id of ['shard-property-warranty','shard-default-recovery','shard-historical-intake']){
    const rows=jobs.filter(job=>job.name===`rules / shard (${id})`)
    if(rows.length!==1||!successful(rows[0]))throw Error('A Rules shard is incomplete.')
  }
  if(deployment){
    const rows=jobs.filter(job=>job.name==='Deploy to termite-warranty-dev')
    if(rows.length!==1||!successful(rows[0])||!rows[0].steps.some(step=>step.name==='Deploy Firestore, Functions, and Hosting'&&step.conclusion==='success'))throw Error('Dev deployment did not succeed.')
  }
}
export function assertArtifact(artifacts,run,name,now=Date.now()){
  const rows=artifacts.filter(artifact=>artifact.name===name)
  if(rows.length!==1)throw Error('Evidence artifact missing or duplicated.')
  const artifact=rows[0],binding=artifact.workflow_run
  if(artifact.expired!==false||!Number.isSafeInteger(artifact.id)||artifact.size_in_bytes<=0||artifact.size_in_bytes>65536||
    Date.parse(artifact.expires_at)<=now||!Number.isFinite(Date.parse(artifact.expires_at))||
    binding?.id!==run.id||binding.repository_id!==repositoryId||binding.head_repository_id!==repositoryId||binding.head_sha!==run.head_sha)throw Error('Evidence artifact is unavailable or foreign.')
  return artifact
}
export async function completeList(read,path,key){
  const result=await read(path+(path.includes('?')?'&':'?')+'per_page=100')
  if(!Array.isArray(result[key])||result.total_count!==result[key].length)throw Error('Metadata pagination is incomplete.')
  return result[key]
}
export async function validateVerification(read,run,targetTree,{event,branch,revision,deployment=false,maxAge=86400000}={}){
  assertRun(run,{event,branch,revision,maxAge})
  const commit=await read('/git/commits/'+revision)
  if(commit.tree?.sha!==targetTree)throw Error('Verified source tree differs from deployment tree.')
  const jobs=await completeList(read,`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,'jobs')
  assertJobs(jobs,run,{deployment})
  const artifacts=await completeList(read,`/actions/runs/${run.id}/artifacts`,'artifacts')
  const artifact=assertArtifact(artifacts,run,evidenceName(targetTree,run.run_attempt))
  return {runId:run.id,attempt:run.run_attempt,artifactId:artifact.id,revision,tree:targetTree,gates:gateSteps}
}
