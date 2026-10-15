import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {git,inputsAt,inputDigests,classifyDiff} from './lib/change-scope.mjs'
import {validateLocalReceipt,readOwnerRecord,receiptDigest} from './lib/local-verification.mjs'
import {repository,repositoryId,ownerId,githubReader,completeList,assertArtifact} from './lib/verification-evidence.mjs'
import {mergedSourcePR} from './lib/development-verification.mjs'
import {requireDevelopmentAcceptance} from './development-acceptance.mjs'

const workflow='.github/workflows/deploy-development.yml'
const legacyProducer='0dc6acaa99e27c90f2a18167d96d2f1cb737af23'
const sha=x=>/^[a-f0-9]{40}$/.test(x??'')
export const evidenceName=(inputs,attempt,local)=>`verification-v3-${inputs.verification}-${inputs.product}-${attempt}`+(local?`-local-${local.commentId}-${local.digest}`:'')
export const hostingName=(inputs,attempt)=>`hosting-v3-${inputs.verification}-${attempt}`
export function assertCurrentRun(run,{event,branch,revision}={}){
  if(run.repository?.id!==repositoryId||run.head_repository?.id!==repositoryId||run.repository?.owner?.id!==ownerId||run.path!==workflow||
    run.event!==event||run.head_branch!==branch||run.head_sha!==revision||!sha(revision)||run.status!=='completed'||run.conclusion!=='success'||
    !Number.isSafeInteger(run.id)||!Number.isSafeInteger(run.run_attempt)||run.run_attempt<1)throw Error('Latest workflow run is not a successful trusted run.')
}
export async function remoteInputs(read,revision){
  if(!sha(revision))throw Error('Invalid input revision.')
  const commit=await read('/git/commits/'+revision),data=await read('/git/trees/'+commit.tree?.sha+'?recursive=1')
  if(data.sha!==commit.tree?.sha||data.truncated!==false||!Array.isArray(data.tree))throw Error('Incomplete remote source inventory.')
  return inputDigests(data.tree.filter(e=>e.type!=='tree'))
}
export async function commentsFor(read,number){
  if(!Number.isSafeInteger(number)||number<1)throw Error('Invalid PR number.')
  const comments=await read(`/issues/${number}/comments?per_page=100`)
  if(!Array.isArray(comments)||comments.length>=100)throw Error('Comment inventory incomplete.')
  return comments
}
export async function prEvidence(read,pr,inputs,{hosting=false}={}){
  const runs=await completeList(read,`/actions/workflows/deploy-development.yml/runs?event=pull_request&head_sha=${pr.head.sha}`,'workflow_runs')
  const run=runs.filter(r=>r.head_sha===pr.head.sha&&r.head_branch===pr.head.ref).sort((a,b)=>b.id-a.id)[0]
  if(!run)throw Error('Source PR evidence missing; verify the candidate PR. No downstream full-test fallback.')
  assertCurrentRun(run,{event:'pull_request',branch:pr.head.ref,revision:pr.head.sha})
  const artifacts=await completeList(read,`/actions/runs/${run.id}/artifacts`,'artifacts')
  const base=evidenceName(inputs,run.run_attempt),matches=artifacts.filter(a=>a.name===base||a.name.startsWith(base+'-local-'))
  if(matches.length!==1)throw Error('Source verification artifact missing or duplicated.')
  let local
  if(matches[0].name!==base){
    const current=readOwnerRecord(await commentsFor(read,pr.number),ownerId,'local-verification')
    if(!current)throw Error('Owner Local attestation was removed.')
    validateLocalReceipt(current.record,inputs)
    local={commentId:current.commentId,digest:receiptDigest(current.record)}
  }
  const evidence=assertArtifact(artifacts,run,evidenceName(inputs,run.run_attempt,local))
  const bundle=hosting?assertArtifact(artifacts,run,hostingName(inputs,run.run_attempt),Date.now(),128*1024*1024):null
  return {runId:run.id,attempt:run.run_attempt,artifactId:evidence.id,hostingArtifactId:bundle?.id??'',...inputs}
}
export async function deploymentEvidence(read,id,product){
  if(!Number.isSafeInteger(id)||id<1)throw Error('Invalid deployment run.')
  const run=await read('/actions/runs/'+id)
  assertCurrentRun(run,{event:'push',branch:'dev',revision:run.head_sha})
  const inputs=await remoteInputs(read,run.head_sha)
  if(inputs.product!==product)throw Error('Accepted product differs from the candidate.')
  const artifacts=await completeList(read,`/actions/runs/${id}/artifacts`,'artifacts')
  assertArtifact(artifacts,run,evidenceName(inputs,run.run_attempt))
  assertArtifact(artifacts,run,`deployment-v3-${inputs.product}-${run.run_attempt}`)
  const pr=await mergedSourcePR(read,run.head_sha,'dev')
  await prEvidence(read,pr,inputs,{hosting:true})
  return {deploymentRunId:id,revision:run.head_sha,...inputs}
}
export async function acceptanceFor(read,pr,inputs){
  const explicit=readOwnerRecord(await commentsFor(read,pr.number),ownerId,'dev-acceptance')
  if(explicit){
    const a=explicit.record
    if(a.schema!==1||a.accepted!==true||a.product!==inputs.product||typeof a.reference!=='string'||!a.reference.trim())throw Error('Latest owner acceptance does not approve this product.')
    return {...await deploymentEvidence(read,a.deploymentRunId,inputs.product),commentId:explicit.commentId,reference:a.reference}
  }
  // Only the already approved v2 producer may bridge the migration. Check the
  // historical producer, never demand byte equality with today's consumer.
  const legacyInputs=await remoteInputs(read,legacyProducer)
  if(legacyInputs.product!==inputs.product)throw Error('Explicit owner Dev acceptance is required on this promotion PR.')
  const legacyTree=(await read('/git/commits/'+legacyProducer)).tree.sha
  const legacyRead=async path=>path.startsWith('/actions/workflows/record-development-acceptance.yml/runs?')
    ?{total_count:1,workflow_runs:[await read('/actions/runs/38675079811')]}
    :read(path)
  const legacy=await requireDevelopmentAcceptance(legacyRead,legacyTree,legacyProducer,{blob:path=>git('rev-parse',legacyProducer+':'+path)})
  return {legacy:true,...legacy,product:legacyInputs.product,verification:legacyInputs.verification}
}
export function compareEvent(event,env,parents){
  if(env.GITHUB_REPOSITORY!==repository||event.repository?.id!==repositoryId||event.repository?.owner?.id!==ownerId||!sha(env.GITHUB_SHA))throw Error('Unexpected repository or revision.')
  if(env.GITHUB_EVENT_NAME==='pull_request'){
    const p=event.pull_request
    if(!p||p.base?.repo?.id!==repositoryId||p.head?.repo?.id!==repositoryId||!['dev','main'].includes(p.base.ref)||!sha(p.base.sha)||!sha(p.head.sha)||parents.join(' ')!==[p.base.sha,p.head.sha].join(' '))throw Error('Untrusted synthetic merge comparison.')
    return p.base.sha
  }
  if(env.GITHUB_EVENT_NAME==='push'&&['refs/heads/dev','refs/heads/main'].includes(env.GITHUB_REF)&&event.after===env.GITHUB_SHA&&sha(event.before)&&event.forced===false&&event.deleted===false&&parents.length===2&&parents[0]===event.before)return event.before
  throw Error('A protected PR merge comparison is required.')
}
export async function resolveScope(read,event,env=process.env,run=git){
  if(run('rev-parse','HEAD')!==env.GITHUB_SHA)throw Error('Checkout differs from the event.')
  const base=compareEvent(event,env,run('show','-s','--format=%P','HEAD').trim().split(' '))
  const kind=classifyDiff(run('diff','--raw','-z','--no-renames',base,'HEAD','--'))
  const inputs=inputsAt('HEAD',run),pr=event.pull_request
  const result={kind,...inputs,reuse:false,local:false,hostingArtifactId:'',sourceRunId:''}
  if(pr){
    if(kind==='product'&&pr.base.ref==='main'&&pr.head.ref!=='dev')throw Error('Products must be promoted from dev.')
    if(kind!=='product'&&pr.base.ref!=='main')throw Error('Non-product changes use one PR to main.')
    if(kind==='product'&&pr.base.ref==='main'){
      const acceptance=await acceptanceFor(read,pr,inputs)
      // Technical evidence can change independently of a still-valid business acceptance.
      result.acceptance=acceptance
      if(acceptance.verification===inputs.verification){result.reuse=true;result.sourceRunId=acceptance.deploymentRunId??acceptance.deployment?.runId;return result}
    }
    if(kind!=='documentation'){
      const local=readOwnerRecord(await commentsFor(read,pr.number),ownerId,'local-verification')
      if(local){validateLocalReceipt(local.record,inputs);result.local=true;result.localAttestation={commentId:local.commentId,digest:receiptDigest(local.record)}}
    }
  }else if(kind==='product'&&env.GITHUB_REF==='refs/heads/dev'){
    const source=await mergedSourcePR(read,env.GITHUB_SHA,'dev'),proof=await prEvidence(read,source,inputs,{hosting:true})
    result.reuse=true;result.hostingArtifactId=proof.hostingArtifactId;result.sourceRunId=proof.runId
  }else if(kind==='product'&&env.GITHUB_REF==='refs/heads/main'){
    const source=await mergedSourcePR(read,env.GITHUB_SHA,'main')
    if(source.head.ref!=='dev')throw Error('Product promotion requires dev.')
    await prEvidence(read,source,inputs)
    result.acceptance=await acceptanceFor(read,source,inputs);result.reuse=true
  }
  return result
}
export function assertAggregate(scope,needs,event){
  if(needs.scope?.result!=='success'||!['documentation','test','ci','product'].includes(scope.kind))throw Error('Scope failed.')
  const produces=event==='pull_request'&&scope.kind!=='documentation'&&!scope.reuse
  if(needs.application?.result!==(produces?'success':'skipped'))throw Error('Application verification incomplete.')
  if(needs.rules?.result!==(produces&&!scope.local?'success':'skipped'))throw Error('Rules verification incomplete.')
  if(event==='push'&&scope.kind==='product'&&!scope.reuse)throw Error('Source PR verification required.')
}
export function assertCurrentBranch(actual,env,branch){
  if(!['dev','main'].includes(branch)||env.GITHUB_EVENT_NAME!=='push'||env.GITHUB_REF!=='refs/heads/'+branch||!sha(env.GITHUB_SHA)||actual.commit?.sha!==env.GITHUB_SHA)throw Error('Obsolete or foreign deployment candidate.')
}
const output=async values=>{if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,Object.entries(values).map(([k,v])=>`${k}=${typeof v==='object'?JSON.stringify(v):v}\n`).join(''))}
async function main(mode){
  if(process.env.GITHUB_REPOSITORY!==repository||git('rev-parse','HEAD')!==process.env.GITHUB_SHA)throw Error('Repository/event checkout mismatch.')
  const inputs=inputsAt()
  if(mode==='scope'){
    const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'))
    const scope=await resolveScope(githubReader(process.env.GH_TOKEN),event)
    await output({...scope,proof:scope,hostingName:hostingName(inputs,process.env.GITHUB_RUN_ATTEMPT)})
    console.log(JSON.stringify(scope));return
  }
  if(mode==='aggregate'){
    const needs=JSON.parse(process.env.PIPELINE_NEEDS),scope=JSON.parse(needs.scope.outputs.proof)
    if(scope.verification!==inputs.verification||scope.product!==inputs.product)throw Error('Verification checkout changed.')
    assertAggregate(scope,needs,process.env.GITHUB_EVENT_NAME)
    if(scope.kind!=='documentation'){
      const receipt={schema:3,...inputs,revision:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,scope}
      await mkdir('tmp',{recursive:true});await writeFile('tmp/verification-evidence.json',JSON.stringify(receipt))
      await output({name:evidenceName(inputs,process.env.GITHUB_RUN_ATTEMPT,scope.localAttestation)})
    }
    console.log(JSON.stringify({verified:true,...inputs,mode:scope.reuse?'reused':scope.local?'owner-attested-local':scope.kind==='documentation'?'documentation':'ci'}));return
  }
  if(mode==='current-dev'||mode==='current-main'){
    const branch=mode.slice(8),actual=await githubReader(process.env.GH_TOKEN)('/branches/'+branch)
    assertCurrentBranch(actual,process.env,branch)
    console.log('Current protected branch candidate confirmed.');return
  }
  if(mode==='publish-deployment'){
    if(process.env.GITHUB_EVENT_NAME!=='push'||process.env.GITHUB_REF!=='refs/heads/dev')throw Error('Dev deployment record is push-only.')
    await mkdir('tmp',{recursive:true})
    await writeFile('tmp/deployment-verification.json',JSON.stringify({schema:3,...inputs,revision:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT}))
    await output({name:`deployment-v3-${inputs.product}-${process.env.GITHUB_RUN_ATTEMPT}`});return
  }
  throw Error('Unknown pipeline command.')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv[2]).catch(e=>{console.error(e.message);process.exitCode=1})
