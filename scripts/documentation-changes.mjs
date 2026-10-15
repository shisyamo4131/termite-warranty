import {execFileSync} from 'node:child_process'
import {readFile,appendFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

// Deliberately bounded: these reviewed documentation files are not application,
// Functions, Hosting, dependency or executable configuration inputs.
export const documentationPaths = new Set([
  'CHANGELOG.md','docs/README.md','docs/operations.md',
  'docs/design/tr-003-verification-deploy-gates.md',
  'docs/requirements/environment-configuration.md',
  'docs/roadmaps/production-readiness.md','docs/roadmaps/technical-remediation.md',
  'docs/runbooks/application-deployment.md',
  'deliverables/production-schedule-2026-10-05/README.md',
  'deliverables/production-schedule-2026-10-05/build_pdf.py',
  'output/pdf/HS_本番稼働に向けた目標スケジュール_2026-10-13.pdf',
  'docs/roadmaps/2026-initial-delivery.md','docs/roadmaps/historical-property-intake.md',
])
// Owner-approved, one-time introduction. Subsequent bases cannot enter this route.
export const introductionBases=new Set(['482cbfd5c04b646c9fa54965344addfdf420df78','8b65dc9bc6ba2cef356bdee3e054bba1c5ae3377'])
export const introductionNewPaths=new Set(['scripts/ci-introduction.mjs','scripts/lib/ci-introduction-workflow.mjs'])
export const introductionPaths=new Set([...documentationPaths,...introductionNewPaths,
  'scripts/documentation-changes.mjs','test/documentation-changes.test.mjs',
  'test/development-workflow-contract.test.mjs','test/rules-runner.test.mjs','test/verification-evidence.test.mjs',
  'scripts/development-workflow-contract.mjs','scripts/production-workflow-contract.mjs',
  '.github/workflows/deploy-development.yml','.github/workflows/deploy-production.yml',
  'docs/decisions/0046-verification-reuse-and-dev-acceptance.md'])
export function introductionDiff(raw,base){
  if(!introductionBases.has(base))return false
  const fields=raw.split('\0');if(fields.pop()!==''||!fields.length||fields.length%2)return false
  let tooling=false
  for(let i=0;i<fields.length;i+=2){
    const path=fields[i+1],m=/^:(000000|100644) 100644 [a-f0-9]+ [a-f0-9]+ ([MA])$/.exec(fields[i])
    if(!m||!introductionPaths.has(path)|| (m[2]==='A'?(m[1]!=='000000'||!introductionNewPaths.has(path)):m[1]!=='100644'))return false
    tooling ||= !documentationPaths.has(path)
  }
  return tooling
}
const sha=x=>/^[a-f0-9]{40}$/.test(x??'')&&!/^0+$/.test(x)
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true})
export function documentationDiff(raw){
  const fields=raw.split('\0');if(fields.pop()!==''||!fields.length||fields.length%2)return false
  for(let i=0;i<fields.length;i+=2){
    if(!/^:100644 100644 [a-f0-9]+ [a-f0-9]+ M$/.test(fields[i])||!documentationPaths.has(fields[i+1]))return false
  }
  return true
}
export function comparisonBase(event,env,parents){
  if(env.GITHUB_REPOSITORY!=='shisyamo4131/termite-warranty'||event.repository?.id!==1363463339||event.repository?.owner?.id!==72244713||!sha(env.GITHUB_SHA))throw Error('Unknown repository or revision.')
  if(env.GITHUB_EVENT_NAME==='pull_request'){
    const p=event.pull_request
    if(!p||p.base?.repo?.id!==1363463339||p.head?.repo?.id!==1363463339||!['dev','main'].includes(p.base.ref)||(p.base.ref==='main'&&p.head.ref!=='dev')||!sha(p.base.sha)||!sha(p.head.sha)||parents.join(' ')!==[p.base.sha,p.head.sha].join(' '))throw Error('Unknown PR comparison.')
    return p.base.sha
  }
  if(env.GITHUB_EVENT_NAME==='push'&&['refs/heads/dev','refs/heads/main'].includes(env.GITHUB_REF)&&event.after===env.GITHUB_SHA&&sha(event.before)&&event.forced===false&&event.deleted===false&&parents.length===2&&parents[0]===event.before)return event.before
  throw Error('No bounded PR or merge-push comparison.')
}
export async function classifyDocumentation(env=process.env,run=git){
  try{
    const head=run('rev-parse','HEAD').trim()
    if(head!==env.GITHUB_SHA)throw Error('Checkout mismatch.')
    const event=JSON.parse(await readFile(env.GITHUB_EVENT_PATH,'utf8'))
    const parents=run('show','-s','--format=%P',head).trim().split(' ')
    const base=comparisonBase(event,env,parents)
    const raw=run('diff','--raw','-z','--no-renames',base,head,'--')
    const documentationOnly=documentationDiff(raw),ciIntroduction=!documentationOnly&&introductionDiff(raw,base)
    return {documentationOnly,ciIntroduction,base,revision:head,reason:documentationOnly?'bounded-document-modifications':ciIntroduction?'approved-ci-introduction':'mixed-or-unrecognized-paths'}
  }catch{return {documentationOnly:false,ciIntroduction:false,reason:'comparison-unavailable'}}
}
async function main(){
  const result=await classifyDocumentation()
  if(['verify','verify-ci'].includes(process.argv[2])){
    if(process.argv[2]==='verify'?!result.documentationOnly:!result.ciIntroduction)throw Error('Requested scope no longer proven.')
    git('diff','--check',result.base,result.revision,'--')
  }else if(process.argv[2]!=='classify')throw Error('Unknown documentation command.')
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`documentationOnly=${result.documentationOnly}\nciIntroduction=${result.ciIntroduction}\n`)
  console.log(JSON.stringify(result))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1})
