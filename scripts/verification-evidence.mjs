import {mkdir,writeFile,appendFile,readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {repository,repositoryId,tree,git,evidenceName,githubReader,completeList,validateVerification} from './lib/verification-evidence.mjs'
import {requireDevelopmentAcceptance} from './development-acceptance.mjs'

const output=async values=>{
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,Object.entries(values).map(([key,value])=>key+'='+String(value)+'\n').join(''))
}
export async function findReusableVerification(read,current,revision){
  const pulls=await read('/commits/'+revision+'/pulls?per_page=100')
  if(!Array.isArray(pulls)||pulls.length>=100)throw Error('Associated PR inventory unavailable.')
  const candidates=pulls.filter(pr=>pr.merged_at&&pr.merge_commit_sha===revision&&pr.base?.ref==='main'&&pr.base?.repo?.id===repositoryId&&pr.head?.repo?.id===repositoryId)
  if(candidates.length!==1)throw Error('Promotion admission unavailable: no unique merged PR.')
  const pr=candidates[0]
  if(!/^[a-f0-9]{40}$/.test(pr.head.sha??''))throw Error('Invalid PR revision.')
  // Full CI cannot substitute for a missing human acceptance when promoting dev.
  const acceptance=pr.head.ref==='dev'?await requireDevelopmentAcceptance(read,current,pr.head.sha):null
  let runs
  try{runs=await completeList(read,`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${pr.head.sha}`,'workflow_runs')}
  catch{return {reuse:false,reason:'pr-run-unavailable'}}
  // Never select an older successful attempt after the latest run failed.
  const matching=runs.filter(run=>run.event==='pull_request'&&run.head_sha===pr.head.sha&&run.head_branch===pr.head.ref).sort((a,b)=>b.id-a.id)
  if(!matching.length)return {reuse:false,reason:'pr-run-unavailable'}
  try{
    const proof=await validateVerification(read,matching[0],current,{event:'pull_request',branch:pr.head.ref,revision:pr.head.sha})
    return {reuse:true,reason:'same-tree-comprehensive-success',pr:pr.number,...proof,acceptance}
  }catch{return {reuse:false,reason:'verification-evidence-unavailable-or-invalid'}}
}
async function main(mode){
  if(process.env.GITHUB_REPOSITORY!==repository)throw Error('Unexpected repository.')
  const current=tree()
  if(mode==='publish'){
    if(!['pull_request','push','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)||git('rev-parse','HEAD')!==process.env.GITHUB_SHA)throw Error('Evidence checkout identity mismatch.')
    const receipt={schema:1,repository,tree:current,revision:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT}
    await mkdir('tmp',{recursive:true});await writeFile('tmp/verification-evidence.json',JSON.stringify(receipt))
    await output({name:evidenceName(current,process.env.GITHUB_RUN_ATTEMPT)})
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
    if(event.pull_request?.head?.ref==='dev'&&event.pull_request?.base?.ref==='main'){
      await requireDevelopmentAcceptance(githubReader(process.env.GH_TOKEN),current,event.pull_request.head.sha)
      console.log('Dev acceptance matches the PR tree.')
    }else console.log('Dev promotion acceptance is not applicable to this event.')
    return
  }
  throw Error('Unknown verification evidence command.')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv[2]).catch(error=>{console.error(error.message);process.exitCode=1})
