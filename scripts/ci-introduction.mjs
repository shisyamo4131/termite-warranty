import {readFile,appendFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {classifyDocumentation} from './documentation-changes.mjs'
import {repository,repositoryId,ownerId,git,githubReader,assertRun,completeList} from './lib/verification-evidence.mjs'
import {mergedSourcePR,assertSuccessfulJob} from './lib/development-verification.mjs'
import {introductionGateSteps} from './lib/ci-introduction-workflow.mjs'

export async function resolveCIIntroduction(read,{eventName,event,revision,current,ref}){
  if(event.repository?.id!==repositoryId||event.repository.owner?.id!==ownerId)throw Error('Foreign CI introduction.')
  const pr=event.pull_request
  if(eventName==='pull_request'&&pr?.base?.ref==='dev'){
    if(pr.head?.repo?.id!==repositoryId||pr.base.repo?.id!==repositoryId||pr.head.ref!=='codex/document-artifact-routing'||(await read('/git/commits/'+pr.head.sha)).tree?.sha!==current)throw Error('CI introduction PR differs from tested tree.')
    return {reuse:false,tree:current,reason:'first-ci-introduction-comprehensive'}
  }
  let devRevision
  if(eventName==='pull_request'&&pr?.base?.ref==='main'&&pr.head?.ref==='dev'&&pr.head.repo?.id===repositoryId&&pr.base.repo?.id===repositoryId)devRevision=pr.head.sha
  else if(eventName==='push'&&ref==='refs/heads/dev')devRevision=revision
  else if(eventName==='push'&&ref==='refs/heads/main'){
    const promotion=await mergedSourcePR(read,revision,'main')
    if(promotion.head.ref!=='dev')throw Error('CI introduction requires dev promotion.')
    devRevision=promotion.head.sha
  }else throw Error('Unexpected CI introduction event.')
  if((await read('/git/commits/'+devRevision)).tree?.sha!==current)throw Error('CI introduction promotion tree mismatch.')
  const source=await mergedSourcePR(read,devRevision,'dev')
  if(source.head.ref!=='codex/document-artifact-routing'||(await read('/git/commits/'+source.head.sha)).tree?.sha!==current)throw Error('CI introduction source changed.')
  const runs=await completeList(read,`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${source.head.sha}`,'workflow_runs')
  const run=runs.filter(x=>x.head_sha===source.head.sha&&x.head_branch===source.head.ref).sort((a,b)=>b.id-a.id)[0]
  if(!run)throw Error('CI introduction verification missing.')
  assertRun(run,{event:'pull_request',branch:source.head.ref,revision:source.head.sha})
  const jobs=await completeList(read,`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`,'jobs')
  assertSuccessfulJob(jobs,run,'Verify CI introduction',['Verify CI introduction scope','Resolve CI introduction verification',...introductionGateSteps])
  assertSuccessfulJob(jobs,run,'Verify development deployment',['Require CI introduction verification'])
  return {reuse:true,tree:current,runId:run.id,attempt:run.run_attempt,gates:introductionGateSteps,reason:'same-tree-ci-introduction-no-deployment'}
}
async function main(){
  if(process.env.GITHUB_REPOSITORY!==repository||!(await classifyDocumentation()).ciIntroduction)throw Error('Approved CI introduction scope required.')
  const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'))
  const proof=await resolveCIIntroduction(githubReader(process.env.GH_TOKEN),{eventName:process.env.GITHUB_EVENT_NAME,event,revision:process.env.GITHUB_SHA,current:git('rev-parse','HEAD^{tree}'),ref:process.env.GITHUB_REF})
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`reuse=${proof.reuse}\n`)
  console.log(JSON.stringify(proof))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1})
