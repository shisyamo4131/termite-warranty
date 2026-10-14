export const fallbackCondition="${{ needs.reuse.outputs.reuse != 'true' }}"
export const productionVerifyCondition="${{ always() && vars.PRODUCTION_APP_DEPLOY_ENABLED == 'true' && needs.reuse.result == 'success' && (needs.reuse.outputs.reuse == 'true' || needs.rules.result == 'success') }}"
export function validateProductionReuseWorkflow(w,policy){
  const fail=()=>{throw Error('Production verification reuse contract violated.')}
  const {reuse,rules,verify}=w.jobs
  if(w.permissions.actions!=='read'||!reuse||reuse.if!=="${{ vars.PRODUCTION_APP_DEPLOY_ENABLED == 'true' }}"||reuse['runs-on']!=='windows-latest'||
    reuse.outputs?.reuse!=='${{ steps.evidence.outputs.reuse }}'||reuse.outputs?.proof!=='${{ steps.evidence.outputs.proof }}'||
    JSON.stringify(verify.needs)!==JSON.stringify(['reuse','rules'])||verify.if!==productionVerifyCondition||rules.needs!=='reuse'||
    rules.if!=="${{ vars.PRODUCTION_APP_DEPLOY_ENABLED == 'true' && needs.reuse.outputs.reuse != 'true' }}"||rules.uses!=='./.github/workflows/verify-rules.yml')fail()
  const resolver=reuse.steps.filter(s=>s.run)
  if(reuse['continue-on-error']||reuse.steps.some(s=>s.if||s['continue-on-error']||/secrets\.|google-github-actions\/auth/.test(JSON.stringify(s)))||
    resolver.length!==1||resolver[0].run!=='node scripts/verification-evidence.mjs resolve'||resolver[0].id!=='evidence'||resolver[0].env?.GH_TOKEN!=='${{ github.token }}')fail()
  const commands=policy.comprehensiveGateIds.map(id=>policy.gates.find(g=>g.id===id).command)
  for(const step of verify.steps){
    const fallback=commands.includes(step.run)||step.uses==='actions/download-artifact@v8'
    const report=step.run==='node scripts/verification-evidence.mjs report'
    if(step.if!==(fallback?fallbackCondition:report?"${{ needs.reuse.outputs.reuse == 'true' }}":undefined))fail()
  }
  const report=verify.steps.filter(s=>s.run==='node scripts/verification-evidence.mjs report')
  if(report.length!==1||report[0].env?.VERIFICATION_REUSE_PROOF!=='${{ needs.reuse.outputs.proof }}')fail()
  const download=verify.steps.find(s=>s.uses==='actions/download-artifact@v8')
  if(download?.with?.pattern!=='rules-${{ github.sha }}-${{ github.run_attempt }}-*'||download.with.path!=='tmp/rules-receipts'||download.with['merge-multiple']!==true||
    verify.steps.find(s=>s.run==='npm run test:rules')?.env?.RULES_TEST_RECEIPTS!=='tmp/rules-receipts')fail()
  return true
}

export function validateEvidencePublisher(w){
  const v=w.jobs.verify,steps=v.steps,fail=()=>{throw Error('Comprehensive evidence publisher contract violated.')}
  const publish=steps.filter(s=>s.run==='node scripts/verification-evidence.mjs publish'),upload=steps.filter(s=>s.name==='Upload comprehensive verification evidence'),check=steps.filter(s=>s.run==='node scripts/verification-evidence.mjs check-pr')
  if(w.permissions.actions!=='read'||publish.length!==1||upload.length!==1||check.length!==1||publish[0].id!=='evidence'||
    publish[0].name!=='Publish comprehensive verification evidence'||publish[0].if||publish[0]['continue-on-error']||
    steps.indexOf(publish[0])<=steps.findIndex(s=>s.run==='node --check scripts/seed-emulator.mjs')||
    upload[0].uses!=='actions/upload-artifact@v7'||upload[0].with?.name!=='${{ steps.evidence.outputs.name }}'||
    upload[0].with?.path!=='tmp/verification-evidence.json'||upload[0].with?.['if-no-files-found']!=='error'||upload[0].with?.['retention-days']!==30||
    steps.indexOf(upload[0])<=steps.indexOf(publish[0])||upload[0].if||upload[0]['continue-on-error']||
    check[0].if||check[0]['continue-on-error']||check[0].env?.GH_TOKEN!=='${{ github.token }}')fail()
}
