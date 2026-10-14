import {repositoryId,assertRun,assertArtifact,completeList,validateVerification,evidenceName,gateSteps} from './verification-evidence.mjs'

export async function mergedSourcePR(read,revision,base){
  const rows=await read('/commits/'+revision+'/pulls?per_page=100')
  if(!Array.isArray(rows)||rows.length>=100)throw Error('Associated PR inventory unavailable.')
  const matches=rows.filter(p=>p.merged_at&&p.merge_commit_sha===revision&&p.base?.ref===base&&p.base.repo?.id===repositoryId&&p.head?.repo?.id===repositoryId)
  if(matches.length!==1||!/^[a-f0-9]{40}$/.test(matches[0].head.sha??''))throw Error('Promotion admission unavailable: no unique merged PR.')
  return matches[0]
}
export async function findDevelopmentVerification(read,current,revision,{maxAge=86400000}={}){
  const pr=await mergedSourcePR(read,revision,'dev')
  try{
    const runs=await completeList(read,`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${pr.head.sha}`,'workflow_runs')
    const run=runs.filter(r=>r.event==='pull_request'&&r.head_sha===pr.head.sha&&r.head_branch===pr.head.ref).sort((a,b)=>b.id-a.id)[0]
    if(!run)throw Error('No source PR run.')
    const proof=await validateVerification(read,run,current,{event:'pull_request',branch:pr.head.ref,revision:pr.head.sha,hosting:true,maxAge})
    return {reuse:true,source:'feature-pr',pr:pr.number,...proof}
  }catch{return {reuse:false,reason:'source-pr-evidence-unavailable-or-invalid',pr:pr.number}}
}
export function assertSuccessfulJob(jobs,run,name,stepNames){
  const rows=jobs.filter(j=>j.name===name),job=rows[0]
  if(rows.length!==1||job.run_id!==run.id||job.run_attempt!==run.run_attempt||job.status!=='completed'||job.conclusion!=='success')throw Error('Required evidence job did not succeed: '+name)
  for(const name of stepNames){const rows=job.steps.filter(s=>s.name===name);if(rows.length!==1||rows[0].status!=='completed'||rows[0].conclusion!=='success')throw Error('Required evidence step did not succeed: '+name)}
  return job
}
export async function validateDevelopmentDeployment(read,run,current,revision){
  assertRun(run,{event:'push',branch:'dev',revision,maxAge:30*86400000})
  if((await read('/git/commits/'+revision)).tree?.sha!==current)throw Error('Dev deployed tree mismatch.')
  const jobs=await completeList(read,`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,'jobs')
  assertSuccessfulJob(jobs,run,'Resolve verified source',['Resolve source verification'])
  assertSuccessfulJob(jobs,run,'Deploy to termite-warranty-dev',['Prepare explicit Dev deployment and preserve protection hold','Deploy Firestore, Functions, and Hosting','Verify deployed Dev release and protection hold'])
  const verify=assertSuccessfulJob(jobs,run,'Verify development deployment',['Require verification or source evidence','Publish comprehensive verification evidence','Upload comprehensive verification evidence','Check Hosting artifact','Upload verified Hosting artifact'])
  const source=await findDevelopmentVerification(read,current,revision,{maxAge:30*86400000})
  if(gateSteps.every(name=>verify.steps.some(s=>s.name===name&&s.conclusion==='success'))){
    return {...await validateVerification(read,run,current,{event:'push',branch:'dev',revision,deployment:true,maxAge:30*86400000}),source:'dev-fallback'}
  }
  if(!source.reuse)throw Error('Original PR evidence unavailable for reused Dev verification.')
  assertSuccessfulJob(jobs,run,'Verify development deployment',['Record verified source evidence','Download source PR Hosting artifact'])
  const artifacts=await completeList(read,`/actions/runs/${run.id}/artifacts`,'artifacts')
  const artifact=assertArtifact(artifacts,run,evidenceName(current,run.run_attempt))
  return {runId:run.id,attempt:run.run_attempt,artifactId:artifact.id,revision,tree:current,gates:gateSteps,source}
}
