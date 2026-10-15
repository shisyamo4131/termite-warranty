import {spawnSync} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {git,inputsAt} from './lib/change-scope.mjs'
import {requiredCommands,validateLocalReceipt} from './lib/local-verification.mjs'
import {readRulesSummary} from './test-rules.mjs'

export function tapSummary(output){
  const value=key=>{const rows=[...output.matchAll(new RegExp('^# '+key+' (\\d+)\\s*$','gm'))];return rows.length===1?Number(rows[0][1]):NaN}
  return {total:value('tests'),passed:value('pass'),failed:value('fail'),skipped:value('skipped'),cancelled:value('cancelled')}
}
async function main(){
  if(git('status','--porcelain'))throw Error('Commit the candidate before creating reusable Local evidence.')
  const inputs=inputsAt(),revision=git('rev-parse','HEAD'),runtime={platform:process.platform}
  const probe=command=>{const x=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true});if(x.error||x.status!==0)throw Error('Runtime probe failed.');return (x.stdout+x.stderr).trim()}
  runtime.node=probe('node --version');runtime.npm=probe('npm --version');runtime.powershellMajor=Number(probe('$PSVersionTable.PSVersion.Major'))
  runtime.java=probe('java -version');runtime.javaMajor=Number(/version "(\d+)/.exec(runtime.java)?.[1])
  const receipt={schema:1,kind:'termite-local-verification',...inputs,revision,runtime,gates:[]}
  mkdirSync('tmp/local-verification',{recursive:true})
  for(const gate of [{id:'install',command:'npx --yes npm@11.19.1 ci'},...requiredCommands]){
    const start=performance.now()
    const result=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',gate.command+'\nif ($LASTEXITCODE) { exit $LASTEXITCODE }'],{
      encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024,env:{...process.env,CI:'true',FORCE_COLOR:'0',NODE_OPTIONS:'',RULES_TEST_RECEIPTS:''}})
    const output=(result.stdout??'')+'\n'+(result.stderr??'')
    writeFileSync('tmp/local-verification/'+gate.id+'.log',output)
    const row={...gate,exitCode:result.status,elapsedMs:Math.round(performance.now()-start)}
    if(gate.id==='domain-test'||gate.command.startsWith('node --test'))row.tests=tapSummary(output)
    if(gate.id==='firestore-rules-test'){
      const lines=output.split(/\r?\n/).filter(x=>x.startsWith('{"rulesSuite":'))
      const results=output.split(/\r?\n/).filter(x=>x.startsWith('RULES_RESULT '))
      if(lines.length===1&&results.length===1){
        const s=JSON.parse(lines[0]),nonce=JSON.parse(results[0].slice('RULES_RESULT '.length)).nonce
        row.tests={passed:s.passed};row.suite=s.rulesSuite;row.emulatorsStopped=s.emulatorsStopped
        row.workers=readRulesSummary(output,nonce).workers
      }
    }
    if(gate.id==='install')receipt.install=row;else receipt.gates.push(row)
    console.log(JSON.stringify({id:row.id,exitCode:row.exitCode,elapsedMs:row.elapsedMs}))
    if(result.error||result.status!==0)throw Error('Gate failed: '+gate.id+' (see tmp/local-verification).')
  }
  if(git('status','--porcelain')||JSON.stringify(inputsAt())!==JSON.stringify(inputs))throw Error('Inputs changed during Local verification.')
  validateLocalReceipt(receipt,inputs)
  writeFileSync('tmp/local-verification/owner-comment.txt','TERMITE local-verification\n'+JSON.stringify(receipt,null,2)+'\n')
  console.log('Complete evidence saved. The owner may post owner-comment.txt verbatim on the candidate PR, then rerun PR verification.')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1})
