import {mkdir,writeFile,appendFile,readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {repository,repositoryId,ownerId,tree,git,evidenceName,githubReader,completeList,validateVerification,assertRun,assertArtifact,assertApplicationJob,gateSteps} from './lib/verification-evidence.mjs'
import {requireDevelopmentAcceptance} from './development-acceptance.mjs'
import {findDevelopmentVerification} from './lib/development-verification.mjs'

const output=async values=>{
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,Object.entries(values).map(([key,value])=>key+'='+String(value)+'\n').join(''))
}
export function applicationIdentity(env,current,checkout){
  if(env.GITHUB_REPOSITORY!==repository||!['pull_request','push','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||
    !/^[a-f0-9]{40}$/.test(current)||!/^[a-f0-9]{40}$/.test(checkout)||checkout!==env.GITHUB_SHA||
    !/^[1-9]\d*$/.test(env.GITHUB_RUN_ID??'')||!/^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT??''))throw Error('Application checkout/run identity mismatch.')
  return {repository,tree:current,revision:checkout,runId:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT,hostingName:`firebase-hosting-${current}-${env.GITHUB_RUN_ATTEMPT}`}
}
export async function verifyApplication(read,proof,expected,artifactId){
  if(!proof||Object.keys(proof).length!==Object.keys(expected).length||Object.entries(expected).some(([k,v])=>proof[k]!==v)||!/^[1-9]\d*$/.test(artifactId??''))throw Error('Application producer identity mismatch.')
  const run=await read('/actions/runs/'+expected.runId)
  if(String(run.id)!==expected.runId||String(run.run_attempt)!==expected.attempt||run.repository?.id!==repositoryId||run.head_repository?.id!==repositoryId||run.repository?.owner?.id!==ownerId||run.path!=='.github/workflows/deploy-development.yml')throw Error('Application run identity mismatch.')
  const jobs=await completeList(read,`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,'jobs')
  assertApplicationJob(jobs,run)
  const artifacts=await completeList(read,`/actions/runs/${run.id}/artifacts`,'artifacts')
  const artifact=assertArtifact(artifacts,run,expected.hostingName,Date.now(),128*1024*1024)
  if(String(artifact.id)!==artifactId)throw Error('Application Hosting artifact identity mismatch.')
  return expected
}
export async function resolveDevelopmentPromotion(read,current,event,options){
  const pr=event.pull_request
  if(pr?.head?.ref!=='dev'||pr?.base?.ref!=='main')throw Error('Main promotion requires a Dev PR.')
  if(pr.head.repo?.id!==repositoryId||pr.base.repo?.id!==repositoryId)throw Error('Foreign Dev promotion.')
  const acceptance=await requireDevelopmentAcceptance(read,current,pr.head.sha,options)
  return {reuse:true,reason:'accepted-dev-comprehensive-success',...acceptance.deployment,acceptance}
}
export async function validatePromotionVerification(read,run,current,revision,acceptance){
  assertRun(run,{event:'pull_request',branch:'dev',revision})
  const commit=await read('/git/commits/'+revision)
  if(commit.tree?.sha!==current||acceptance?.deployment?.tree!==current||acceptance.deployment.revision!==revision)throw Error('Promotion tree differs from accepted Dev.')
  const jobs=await completeList(read,`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,'jobs')
  for(const [name,steps] of [['Resolve verified source',['Resolve source verification']],['Verify development deployment',['Require verification or source evidence','Record verified source evidence','Publish comprehensive verification evidence','Upload comprehensive verification evidence']]]){
    const rows=jobs.filter(j=>j.name===name),job=rows[0]
    if(rows.length!==1||job.run_id!==run.id||job.run_attempt!==run.run_attempt||job.status!=='completed'||job.conclusion!=='success')throw Error('Promotion job did not succeed.')
    for(const name of steps){const rows=job.steps.filter(s=>s.name===name);if(rows.length!==1||rows[0].status!=='completed'||rows[0].conclusion!=='success')throw Error('Promotion proof step did not succeed.')}
  }
  const artifacts=await completeList(read,`/actions/runs/${run.id}/artifacts`,'artifacts')
  const artifact=assertArtifact(artifacts,run,evidenceName(current,run.run_attempt))
  return {runId:run.id,attempt:run.run_attempt,artifactId:artifact.id,revision,tree:current,gates:gateSteps,source:'accepted-dev'}
}
export async function findReusableVerification(read,current,revision,options){
  const pulls=await read('/commits/'+revision+'/pulls?per_page=100')
  if(!Array.isArray(pulls)||pulls.length>=100)throw Error('Associated PR inventory unavailable.')
  const candidates=pulls.filter(pr=>pr.merged_at&&pr.merge_commit_sha===revision&&pr.base?.ref==='main'&&pr.base?.repo?.id===repositoryId&&pr.head?.repo?.id===repositoryId)
  if(candidates.length!==1)throw Error('Promotion admission unavailable: no unique merged PR.')
  const pr=candidates[0]
  if(!/^[a-f0-9]{40}$/.test(pr.head.sha??''))throw Error('Invalid PR revision.')
  if(pr.head.ref!=='dev')throw Error('Main promotion requires a Dev PR.')
  // Full CI cannot substitute for a missing human acceptance when promoting dev.
  const acceptance=pr.head.ref==='dev'?await requireDevelopmentAcceptance(read,current,pr.head.sha,options):null
  let runs
  try{runs=await completeList(read,`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${pr.head.sha}`,'workflow_runs')}
  catch{return {reuse:false,reason:'pr-run-unavailable'}}
  // Never select an older successful attempt after the latest run failed.
  const matching=runs.filter(run=>run.event==='pull_request'&&run.head_sha===pr.head.sha&&run.head_branch===pr.head.ref).sort((a,b)=>b.id-a.id)
  if(!matching.length)return {reuse:false,reason:'pr-run-unavailable'}
  try{
    const proof=acceptance?await validatePromotionVerification(read,matching[0],current,pr.head.sha,acceptance):await validateVerification(read,matching[0],current,{event:'pull_request',branch:pr.head.ref,revision:pr.head.sha})
    return {reuse:true,reason:'same-tree-comprehensive-success',pr:pr.number,...proof,acceptance}
  }catch{return {reuse:false,reason:'verification-evidence-unavailable-or-invalid'}}
}
async function main(mode){
  if(process.env.GITHUB_REPOSITORY!==repository)throw Error('Unexpected repository.')
  const current=tree()
  if(mode==='publish-application'||mode==='check-application'){
    const expected=applicationIdentity(process.env,current,git('rev-parse','HEAD'))
    if(mode==='publish-application')await output({proof:JSON.stringify(expected),hostingName:expected.hostingName})
    else await verifyApplication(githubReader(process.env.GH_TOKEN),JSON.parse(process.env.APPLICATION_VERIFICATION_PROOF??'null'),expected,process.env.APPLICATION_HOSTING_ARTIFACT_ID)
    console.log(JSON.stringify({application:mode,...expected}));return
  }
  if(mode==='resolve-development'){
    if(git('rev-parse','HEAD')!==process.env.GITHUB_SHA)throw Error('Exact verification checkout required.')
    const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'))
    const read=githubReader(process.env.GH_TOKEN)
    let proof
    if(process.env.GITHUB_EVENT_NAME==='pull_request')proof=await resolveDevelopmentPromotion(read,current,event)
    else if(['push','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)&&process.env.GITHUB_REF==='refs/heads/dev')proof=await findDevelopmentVerification(read,current,process.env.GITHUB_SHA)
    else throw Error('Expected a Dev push or Dev-to-main PR.')
    await output({reuse:proof.reuse,proof:JSON.stringify(proof),hostingArtifactId:proof.hostingArtifactId??'',sourceRunId:proof.hostingArtifactId?proof.runId:''})
    console.log(JSON.stringify(proof));return
  }
  if(mode==='publish'){
    if(!['pull_request','push','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)||git('rev-parse','HEAD')!==process.env.GITHUB_SHA)throw Error('Evidence checkout identity mismatch.')
    const receipt={schema:1,repository,tree:current,revision:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT}
    await mkdir('tmp',{recursive:true});await writeFile('tmp/verification-evidence.json',JSON.stringify(receipt))
    await output({name:evidenceName(current,process.env.GITHUB_RUN_ATTEMPT),hostingName:`firebase-hosting-${current}-${process.env.GITHUB_RUN_ATTEMPT}`})
    console.log(JSON.stringify(receipt));return
  }
  if(mode==='resolve'){
    if(process.env.GITHUB_EVENT_NAME!=='push'||process.env.GITHUB_REF!=='refs/heads/main'||git('rev-parse','HEAD')!==process.env.GITHUB_SHA)throw Error('Reuse is main-push only.')
    const proof=await findReusableVerification(githubReader(process.env.GH_TOKEN),current,process.env.GITHUB_SHA)
    await output({reuse:proof.reuse,proof:JSON.stringify(proof)})
    console.log(JSON.stringify(proof));return
  }
  if(mode==='report'){
    const proof=JSON.parse(process.env.VERIFICATION_REUSE_PROOF??'null')
    if(proof?.reuse!==true||proof.tree!==current||!Number.isSafeInteger(proof.runId)||proof.gates?.length!==7)throw Error('Verified reuse proof required.')
    console.log(JSON.stringify({verification:'reused',...proof}));return
  }
  if(mode==='check-pr'){
    const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'))
    if(event.pull_request&&(event.pull_request.base?.ref!=='dev'||event.pull_request.head?.repo?.id!==repositoryId||event.pull_request.base?.repo?.id!==repositoryId))throw Error('Comprehensive PR verification requires same-repository feature-to-dev admission.')
    console.log('Feature-to-Dev admission or non-PR verification confirmed.')
    return
  }
  throw Error('Unknown verification evidence command.')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv[2]).catch(error=>{console.error(error.message);process.exitCode=1})
