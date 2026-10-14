export const fallbackCondition="${{ needs.reuse.outputs.reuse != 'true' }}"
export const devFallbackCondition="${{ needs.source.outputs.reuse != 'true' }}"
export const devAdmissionCommand="if ('${{ needs.source.outputs.reuse }}' -eq 'true') { if ('${{ needs.source.result }}' -ne 'success') { throw 'Dev evidence failed.' } } elseif ('${{ needs.rules.result }}' -ne 'success' -or '${{ needs.source.result }}' -notin @('skipped', 'success')) { throw 'Rules shards or Dev evidence failed.' }"
export const devSourceCondition="(github.event_name == 'pull_request' && github.base_ref == 'main') || ((github.event_name == 'push' || github.event_name == 'workflow_dispatch') && github.ref == 'refs/heads/dev')"
export const devRulesCondition="${{ always() && (github.event_name != 'push' || github.ref != 'refs/heads/main') && (needs.source.result == 'success' || needs.source.result == 'skipped') && needs.source.outputs.reuse != 'true' && !(github.event_name == 'pull_request' && github.base_ref == 'main') }}"
export const devHostingCondition="${{ github.event_name != 'pull_request' || github.base_ref != 'main' }}"
export const devDownloadCondition="${{ needs.source.outputs.reuse == 'true' && github.event_name != 'pull_request' }}"
export function validateDevelopmentReuseWorkflow(w,policy){
  const fail=()=>{throw Error('Development promotion reuse contract violated.')},p=w.jobs.source,v=w.jobs.verify
  if(!p||p.name!=='Resolve verified source'||p.if!==devSourceCondition||p['runs-on']!=='windows-latest'||p.needs||p.environment||p.permissions||p['continue-on-error']||
    p.outputs?.reuse!=='${{ steps.evidence.outputs.reuse }}'||p.outputs?.proof!=='${{ steps.evidence.outputs.proof }}'||
    p.outputs?.hostingArtifactId!=='${{ steps.evidence.outputs.hostingArtifactId }}'||p.outputs?.sourceRunId!=='${{ steps.evidence.outputs.sourceRunId }}'||v.outputs?.hostingName!=='${{ steps.evidence.outputs.hostingName }}'||
    p.steps.length!==3||p.steps[0].uses!=='actions/checkout@v7'||p.steps[1].uses!=='actions/setup-node@v7'||p.steps[1].with?.['node-version']!==22||
    p.steps[2].name!=='Resolve source verification'||p.steps[2].run!=='node scripts/verification-evidence.mjs resolve-development'||p.steps[2].id!=='evidence'||p.steps[2].env?.GH_TOKEN!=='${{ github.token }}'||
    p.steps.some(s=>s.if||s['continue-on-error']||/secrets\.|google-github-actions\/auth/.test(JSON.stringify(s))))fail()
  const conditional=['Set up Java','Install dependencies','Check feature PR admission',...policy.comprehensiveGateIds.map(id=>policy.gates.find(g=>g.id===id).command)]
  for(const s of v.steps){
    const expected=s.name==='Download source PR Hosting artifact'?devDownloadCondition:['Check Hosting artifact','Upload verified Hosting artifact'].includes(s.name)?devHostingCondition:conditional.includes(s.name)||conditional.includes(s.run)||s.uses==='actions/download-artifact@v8'?devFallbackCondition:s.name==='Record verified source evidence'?"${{ needs.source.outputs.reuse == 'true' }}":undefined
    if(s.if!==expected||s['continue-on-error'])fail()
  }
  const reports=v.steps.filter(s=>s.name==='Record verified source evidence')
  if(reports.length!==1||reports[0].run!=='node scripts/verification-evidence.mjs report'||reports[0].env?.VERIFICATION_REUSE_PROOF!=='${{ needs.source.outputs.proof }}')fail()
  const downloads=v.steps.filter(s=>s.name==='Download source PR Hosting artifact'),d=downloads[0]
  if(downloads.length!==1||d.uses!=='actions/download-artifact@v8'||JSON.stringify(d.with)!==JSON.stringify({'artifact-ids':'${{ needs.source.outputs.hostingArtifactId }}','run-id':'${{ needs.source.outputs.sourceRunId }}','github-token':'${{ github.token }}',path:'.output/public','digest-mismatch':'error'}))fail()
  if(v.steps.find(s=>s.name==='Upload verified Hosting artifact')?.with?.['retention-days']!==30)fail()
}
export const productionVerifyCondition="${{ always() && vars.PRODUCTION_APP_DEPLOY_ENABLED == 'true' && needs.reuse.result == 'success' && (needs.reuse.outputs.reuse == 'true' || needs.rules.result == 'success') }}"
export function validateProductionReuseWorkflow(w,policy){
  const fail=()=>{throw Error('Production verification reuse contract violated.')}
  const {reuse,rules,verify}=w.jobs
  if(w.permissions.actions!=='read'||!reuse||reuse.if!=="${{ vars.PRODUCTION_APP_DEPLOY_ENABLED == 'true' }}"||reuse['runs-on']!=='windows-latest'||
    reuse.outputs?.reuse!=='${{ steps.evidence.outputs.reuse }}'||reuse.outputs?.proof!=='${{ steps.evidence.outputs.proof }}'||
    JSON.stringify(verify.needs)!==JSON.stringify(['reuse','rules'])||verify.if!==productionVerifyCondition||rules.needs!=='reuse'||
    rules.if!=="${{ vars.PRODUCTION_APP_DEPLOY_ENABLED == 'true' && needs.reuse.outputs.reuse != 'true' }}"||rules.uses!=='./.github/workflows/verify-rules.yml'||
    rules.secrets||rules.with||rules['continue-on-error']||reuse.permissions||reuse.environment)fail()
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
    check[0].if!==devFallbackCondition||check[0]['continue-on-error']||check[0].env?.GH_TOKEN!=='${{ github.token }}')fail()
}
