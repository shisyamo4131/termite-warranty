import {execFileSync} from 'node:child_process'
import {readFile,appendFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

// Deliberately bounded: these existing Markdown files are not application,
// Functions, Hosting, dependency or executable configuration inputs.
export const documentationPaths = new Set([
  'CHANGELOG.md','docs/README.md','docs/operations.md',
  'docs/design/tr-003-verification-deploy-gates.md',
  'docs/requirements/environment-configuration.md',
  'docs/roadmaps/production-readiness.md','docs/roadmaps/technical-remediation.md',
  'docs/runbooks/application-deployment.md',
])
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
    return {documentationOnly:documentationDiff(raw),base,revision:head,reason:documentationDiff(raw)?'bounded-document-modifications':'mixed-or-unrecognized-paths'}
  }catch{return {documentationOnly:false,reason:'comparison-unavailable'}}
}
async function main(){
  const result=await classifyDocumentation()
  if(process.argv[2]==='verify'){
    if(!result.documentationOnly)throw Error('Documentation scope no longer proven.')
    git('diff','--check',result.base,result.revision,'--')
  }else if(process.argv[2]!=='classify')throw Error('Unknown documentation command.')
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`documentationOnly=${result.documentationOnly}\n`)
  console.log(JSON.stringify(result))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1})
