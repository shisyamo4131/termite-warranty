import {readFileSync} from 'node:fs'
import {parse} from 'yaml'
import {rulesShards} from './rules-test-plan.mjs'
import {devAdmissionCommand,devRulesCondition} from './verification-reuse-workflow.mjs'

export const developmentVerifyCondition="github.event_name != 'push' || github.ref != 'refs/heads/main'"
export function validateRulesHandoff(workflow,condition){
  const {rules,verify}=workflow.jobs
  const gate=verify?.steps?.find(step=>step.run==='npm run test:rules')
  const downloads=verify?.steps?.filter(step=>step.uses==='actions/download-artifact@v8'&&step.with?.path==='tmp/rules-receipts')??[]
  const development=condition===developmentVerifyCondition
  if(development && verify.steps[0]?.run!==devAdmissionCommand)throw Error('Required PR check must fail when a shard fails or is cancelled.')
  if(rules?.uses!=='./.github/workflows/verify-rules.yml'||rules.if!==(development?devRulesCondition:condition)||(development?rules.needs!=='source':rules.needs)||rules.secrets||rules.with||rules['continue-on-error']||
    (development?JSON.stringify(verify.needs)!==JSON.stringify(['rules','source']):verify.needs!=='rules')||verify.if!==(development?'${{ always() && ('+condition+') }}':condition)||gate?.env?.RULES_TEST_RECEIPTS!=='tmp/rules-receipts'||downloads.length!==1||
    downloads[0].with?.pattern!=='rules-${{ github.sha }}-${{ github.run_attempt }}-*'||downloads[0].with?.path!=='tmp/rules-receipts'||
    downloads[0].with?.['merge-multiple']!==true||verify.steps.indexOf(downloads[0])>verify.steps.indexOf(gate))throw Error('Rules handoff must preserve all successful shards and the current revision/run.')
}
export function validateRulesProducer(text=readFileSync(new URL('../../.github/workflows/verify-rules.yml',import.meta.url),'utf8')){
  const workflow=parse(text),job=workflow.jobs?.shard
  if(JSON.stringify(workflow.on)!==JSON.stringify({workflow_call:null})||JSON.stringify(workflow.permissions)!==JSON.stringify({contents:'read'})||
    Object.keys(workflow.jobs??{}).length!==1||job?.['runs-on']!=='windows-latest'||job.if||job['continue-on-error']||
    job.strategy?.['fail-fast']!==false||JSON.stringify(job.strategy.matrix)!==JSON.stringify({shard:rulesShards.map(row=>row.id)})||
    job.steps.some(step=>step.if||step['continue-on-error']||step.env||/secrets\.|google-github-actions\/auth/.test(JSON.stringify(step))))throw Error('Unsafe rules producer.')
  const runs=job.steps.filter(step=>step.run).map(step=>step.run)
  const upload=job.steps.find(step=>step.uses==='actions/upload-artifact@v7')
  if(JSON.stringify(runs)!==JSON.stringify(['npx --yes npm@11.19.1 ci','node scripts/test-rules.mjs --shard ${{ matrix.shard }}'])||
    upload?.with?.name!=='rules-${{ github.sha }}-${{ github.run_attempt }}-${{ matrix.shard }}'||
    upload.with.path!=='tmp/rules-receipts/${{ matrix.shard }}.json'||upload.with['if-no-files-found']!=='error'||
    job.steps.find(step=>step.uses==='actions/setup-node@v7')?.with?.['node-version']!==22||
    job.steps.find(step=>step.uses==='actions/setup-java@v6')?.with?.['java-version']!=='21')throw Error('Incomplete rules producer.')
  return true
}
