import {appendFile,readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {git} from './lib/change-scope.mjs'
import {githubReader,repository,repositoryId,ownerId} from './lib/verification-evidence.mjs'
import {sha} from './pipeline.mjs'
export async function admitCandidate(read,event,env,run=git){
  if(env.GITHUB_REPOSITORY!==repository||env.GITHUB_REF!=='refs/heads/dev'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||event.repository?.id!==repositoryId||event.repository?.owner?.id!==ownerId||!sha(env.GITHUB_SHA)||run('rev-parse','HEAD')!==env.GITHUB_SHA)throw Error('Protected Dev controller required.')
  const {source_branch:branch,source_sha:revision,local_verified:verified,verification_reference:reference}=event.inputs??{}
  if(!sha(revision)||typeof branch!=='string'||!/^[-a-zA-Z0-9_./]+$/.test(branch)||branch.startsWith('-')||branch.includes('..')||branch==='main'||branch==='dev'||String(verified)!=='true'||typeof reference!=='string'||!reference.trim()||reference.length>1000||/[\r\n]/.test(reference))throw Error('Explicit feature branch, commit and Local verification reference required.')
  const dev=await read('/branches/dev'),source=await read('/branches/'+encodeURIComponent(branch))
  if(dev.commit?.sha!==env.GITHUB_SHA||source.commit?.sha!==revision)throw Error('Controller or candidate changed; inspect and explicitly dispatch again.')
  if(run('merge-base',env.GITHUB_SHA,revision)!==env.GITHUB_SHA)throw Error('Candidate must include current dev before Local verification.')
  return {revision,branch,reference}
}
async function main(){
  const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'))
  const result=await admitCandidate(githubReader(process.env.GH_TOKEN),event,process.env)
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'revision='+result.revision+'\n')
  console.log(JSON.stringify({candidate:result.revision,branch:result.branch,localVerification:result.reference}))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1})
