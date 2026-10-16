// Integration checks, not a second test runner or artifact attestation system.
import {readFile,appendFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {git,classifyDiff,pathKind} from './lib/change-scope.mjs'
import {repository,repositoryId,ownerId,githubReader,completeList} from './lib/verification-evidence.mjs'
import {mergedSourcePR} from './lib/development-verification.mjs'
export const manualWorkflow='.github/workflows/deploy-development-manual.yml'
export const sha=x=>/^[a-f0-9]{40}$/.test(x??'')
export function compareEvent(event,env,parents){
  if(env.GITHUB_REPOSITORY!==repository||event.repository?.id!==repositoryId||event.repository?.owner?.id!==ownerId||!sha(env.GITHUB_SHA))throw Error('Unexpected repository or revision.')
  if(env.GITHUB_EVENT_NAME==='pull_request'){
    const p=event.pull_request
    if(!p||p.base?.repo?.id!==repositoryId||p.head?.repo?.id!==repositoryId||!['dev','main'].includes(p.base.ref)||!sha(p.base.sha)||!sha(p.head.sha)||parents.join(' ')!==[p.base.sha,p.head.sha].join(' '))throw Error('Untrusted synthetic merge comparison.')
    return p.base.sha
  }
  if(env.GITHUB_EVENT_NAME==='push'&&env.GITHUB_REF==='refs/heads/main'&&event.after===env.GITHUB_SHA&&sha(event.before)&&event.forced===false&&event.deleted===false&&parents.length===2&&parents[0]===event.before)return event.before
  throw Error('A protected PR merge comparison is required.')
}
export function sameProduct(a,b,run=git){
  if(!sha(a)||!sha(b))throw Error('Invalid comparison revision.')
  return run('diff','--name-only','-z','--no-renames',a,b,'--').split('\0').filter(Boolean).every(p=>['documentation','test','ci'].includes(pathKind(p)))
}
export function reviewedLocal(pr){
  // Conventional owner-reviewed checklist, explicitly not remote execution proof.
  if(pr.user?.id!==ownerId||!/^\s*- \[x\] Local verification reviewed\s*$/im.test(pr.body??'')||!/^Local verification: \S.+$/m.test(pr.body??''))throw Error('Owner PR must reference and review the applicable Local verification record.')
}
export async function acceptedDeployment(read,pr,candidate,run=git){
  const body=pr.body??''
  if(pr.user?.id!==ownerId||!/^\s*- \[x\] Dev acceptance reviewed\s*$/im.test(body)||!/^Dev acceptance: \S.+$/m.test(body))throw Error('Owner Dev acceptance and its scope are required.')
  const matches=[...body.matchAll(/^Dev run: https:\/\/github\.com\/shisyamo4131\/termite-warranty\/actions\/runs\/(\d+)\s*$/gm)]
  if(matches.length!==1)throw Error('Reference exactly one accepted Dev run.')
  const id=Number(matches[0][1]);if(!Number.isSafeInteger(id)||id<1)throw Error('Invalid Dev run.')
  const r=await read('/actions/runs/'+id)
  if(r.id!==id||r.repository?.id!==repositoryId||r.head_repository?.id!==repositoryId||r.repository?.owner?.id!==ownerId||r.head_branch!=='dev'||r.status!=='completed'||r.conclusion!=='success'||!sha(r.head_sha)||!Number.isSafeInteger(r.run_attempt)||r.run_attempt<1)throw Error('Dev run is incomplete, failed or foreign.')
  let revision
  if(r.path===manualWorkflow&&r.event==='workflow_dispatch')revision=/^Dev ([a-f0-9]{40})$/.exec(r.display_title??'')?.[1]
  else if(r.path==='.github/workflows/deploy-development.yml'&&r.event==='push')revision=r.head_sha
  if(!sha(revision))throw Error('Not an admitted Dev deployment run.')
  const jobs=await completeList(read,'/actions/runs/'+id+'/attempts/'+r.run_attempt+'/jobs','jobs')
  const deployed=jobs.filter(j=>j.name==='Deploy to termite-warranty-dev')
  if(deployed.length!==1||deployed[0].run_id!==id||deployed[0].run_attempt!==r.run_attempt||deployed[0].status!=='completed'||deployed[0].conclusion!=='success')throw Error('Dev deployment was skipped or did not finish.')
  if(!sameProduct(revision,candidate,run))throw Error('Product changed after Dev acceptance. Return to Local and Dev verification.')
  return {deploymentRunId:id,revision}
}
export async function successfulPR(read,pr){
  const runs=await completeList(read,'/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha='+pr.head.sha,'workflow_runs')
  const r=runs.filter(r=>r.head_sha===pr.head.sha&&r.head_branch===pr.head.ref).sort((a,b)=>b.id-a.id)[0]
  if(!r||r.repository?.id!==repositoryId||r.head_repository?.id!==repositoryId||r.path!=='.github/workflows/deploy-development.yml'||r.event!=='pull_request'||r.status!=='completed'||r.conclusion!=='success')throw Error('Latest promotion PR check did not succeed.')
}
export async function resolveScope(read,event,env=process.env,run=git){
  if(run('rev-parse','HEAD')!==env.GITHUB_SHA)throw Error('Checkout differs from event.')
  const base=compareEvent(event,env,run('show','-s','--format=%P','HEAD').split(' '))
  const raw=run('diff','--raw','-z','--no-renames',base,'HEAD','--')
  const kind=raw?classifyDiff(raw):'documentation'
  let pr=event.pull_request
  const result={kind,reuse:false,local:false,hostingName:'',hostingArtifactId:'',sourceRunId:''}
  if(!pr){
    if(kind!=='product')return result
    pr=await mergedSourcePR(read,env.GITHUB_SHA,'main')
    pr=await read('/pulls/'+pr.number)
    await successfulPR(read,pr)
  }
  if(kind!=='documentation')reviewedLocal(pr)
  if(kind==='product'){
    if(pr.base.ref==='main'&&pr.head.ref!=='dev')throw Error('Products must be promoted from dev.')
    if(pr.base.ref==='dev'&&pr.head.ref==='main')throw Error('Main synchronization must not change the Dev product.')
    Object.assign(result,await acceptedDeployment(read,pr,env.GITHUB_SHA,run),{reuse:true})
  }
  return result
}
export function assertCurrentBranch(actual,env,branch){
  if(branch!=='main'||env.GITHUB_EVENT_NAME!=='push'||env.GITHUB_REF!=='refs/heads/main'||!sha(env.GITHUB_SHA)||actual.commit?.sha!==env.GITHUB_SHA)throw Error('Obsolete or foreign production candidate.')
}
async function main(mode){
  const read=githubReader(process.env.GH_TOKEN)
  if(mode==='current-main'){assertCurrentBranch(await read('/branches/main'),process.env,'main');return}
  if(mode!=='scope')throw Error('Unknown pipeline command.')
  const scope=await resolveScope(read,JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8')))
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,Object.entries({...scope,proof:JSON.stringify(scope)}).map(([k,v])=>k+'='+v+'\n').join(''))
  console.log(JSON.stringify(scope))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv[2]).catch(e=>{console.error(e.message);process.exitCode=1})
