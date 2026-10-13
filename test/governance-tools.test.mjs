import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,copyFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const outputs=['AGENTS.md','docs/operations.md','governance/governance.lock.toml']
function fixture() {
  // Synthetic governance fixture only: no Git checkout, application, data or installed skill.
  const root=mkdtempSync(join(tmpdir(),'termite-governance-fixture-'))
  const put=(p,s)=>{mkdirSync(dirname(join(root,p)),{recursive:true});writeFileSync(join(root,p),s)}
  for(const p of ['scripts/check-governance.ps1','scripts/render-governance.ps1','scripts/lib/governance-policy.ps1','test/governance-tools.test.mjs']) {
    mkdirSync(dirname(join(root,p)),{recursive:true});copyFileSync(join(repo,p),join(root,p))
  }
  put('governance/common-governance.md','<!-- project-governance-version: 1.0.0 -->\n# Local fixture\n')
  put('governance/project-rules.md','# Fixture project rules\n')
  put('governance/verification-policy.json',readFileSync(join(repo,'governance/verification-policy.json')))
  put('governance/governance.lock.toml','ownership_model = "project-owned"\ncommon_governance_version = "fixture-origin"\ncommon_governance_sha256 = "unrelated-origin-provenance"\n')
  put('references/task-turnover-contract.md','# Fixture reference\n')
  put('AGENTS.md','stale fixture\n')
  put('docs/operations.md','# Fixture operations\n## Verification Matrix\nGate Catalog and Inclusion\nEvidence Validity\ngovernance/verification-policy.json\nOWNER BEFORE\n<!-- BEGIN GENERATED VERIFICATION POLICY SUMMARY -->\nstale\n<!-- END GENERATED VERIFICATION POLICY SUMMARY -->\nOWNER AFTER\n')
  const get=p=>readFileSync(join(root,p),'utf8')
  const snapshot=()=>outputs.map(p=>readFileSync(join(root,p)).toString('base64'))
  const run=(script,...args)=>{
    const quote=s=>"'"+s.replaceAll("'","''")+"'"
    const command="& "+quote(join(root,'scripts',script))+" -ProjectPath "+quote(root)+" "+args.map(a=>a.startsWith('-')?a:quote(a)).join(' ')+" | ConvertTo-Json -Depth 8 -Compress"
    const result=spawnSync(process.env.GOV_TEST_PWSH||'pwsh',['-NoProfile','-Command',command],{encoding:'utf8'})
    if(result.error)throw result.error
    assert.equal(result.signal,null,'child must terminate normally')
    return {code:result.status,text:result.stdout+result.stderr}
  }
  return {root,put,get,snapshot,run,close:()=>rmSync(root,{recursive:true,force:true})}
}
function using(fn){const f=fixture();try{fn(f)}finally{f.close()}}
const render=(f,...args)=>f.run('render-governance.ps1',...args)
const check=(f,...args)=>f.run('check-governance.ps1',...args)
const pass=r=>assert.equal(r.code,0,r.text)
const fail=(r,pattern)=>{assert.notEqual(r.code,0,r.text);assert.match(r.text,pattern)}

test('stale Check is read-only; Apply validates and repeated Apply is byte-idempotent',()=>using(f=>{
  const before=f.snapshot();fail(render(f,'-Check'),/Stale local projection/);assert.deepEqual(f.snapshot(),before)
  pass(render(f,'-Apply'));pass(check(f));const after=f.snapshot()
  const again=render(f,'-Apply');pass(again);assert.match(again.text,/"write_count":0/);assert.deepEqual(f.snapshot(),after)
  assert.match(f.get('docs/operations.md'),/OWNER BEFORE/);assert.match(f.get('docs/operations.md'),/OWNER AFTER/)
  assert.match(f.get('governance/governance.lock.toml'),/unrelated-origin-provenance/)
}))
test('local source and helper changes invalidate projections and regenerate without origin equality',()=>using(f=>{
  pass(render(f,'-Apply'))
  f.put('governance/common-governance.md',f.get('governance/common-governance.md')+'\nLocal rule.\n')
  fail(check(f),/Stale local projection/);pass(render(f,'-Apply'));pass(check(f))
  f.put('scripts/lib/governance-policy.ps1',f.get('scripts/lib/governance-policy.ps1')+'\n# fixture change\n')
  fail(check(f),/Stale local projection/);pass(render(f,'-Apply'));pass(check(f))
}))
test('SourcesOnly cannot claim completion or repair stale generated files',()=>using(f=>{
  const before=f.snapshot();const result=check(f,'-SourcesOnly');pass(result)
  assert.match(result.text,/"completion_verified":false/);assert.deepEqual(f.snapshot(),before);fail(check(f),/summary|Stale/)
}))
test('invalid gate reference, inclusion cycle and comprehensive omission reject Apply without writes',()=>using(f=>{
  const original=f.get('governance/verification-policy.json')
  for(const change of [
    p=>p.gates[0].includes=['missing'],
    p=>p.gates[0].includes=[p.gates[0].id],
    p=>p.classes.find(c=>c.id==='governance-permissions-agents').completionGateIds=['governance-check'],
  ]) {
    const p=JSON.parse(original);change(p);f.put('governance/verification-policy.json',JSON.stringify(p))
    const before=f.snapshot();fail(render(f,'-Apply'),/Unknown included|Cyclic|does not include comprehensive/);assert.deepEqual(f.snapshot(),before)
  }
}))
test('missing, duplicate and reversed summary markers reject before writing',()=>using(f=>{
  const original=f.get('docs/operations.md'),begin='<!-- BEGIN GENERATED VERIFICATION POLICY SUMMARY -->',end='<!-- END GENERATED VERIFICATION POLICY SUMMARY -->'
  for(const s of [original.replace(begin,''),original+begin,original.replace(begin,'TEMP').replace(end,begin).replace('TEMP',end)]) {
    f.put('docs/operations.md',s);const before=f.snapshot();fail(render(f,'-Apply'),/marker/);assert.deepEqual(f.snapshot(),before)
  }
}))
test('size limit and missing script gate reject before writing',()=>using(f=>{
  const before=f.snapshot();fail(render(f,'-Apply','-MaxAgentsBytes','1'),/exceeds/);assert.deepEqual(f.snapshot(),before)
  const p=JSON.parse(f.get('governance/verification-policy.json'));p.gates[0].command='./scripts/does-not-exist.ps1'
  f.put('governance/verification-policy.json',JSON.stringify(p));fail(render(f,'-Apply'),/missing script/);assert.deepEqual(f.snapshot(),before)
}))
test('post-generation validation failure restores only invocation-owned output',()=>using(f=>{
  f.put('scripts/check-governance.ps1',f.get('scripts/check-governance.ps1').replace("$ErrorActionPreference = 'Stop'","$ErrorActionPreference = 'Stop'\nif (-not $SourcesOnly) { throw 'fixture final failure' }"))
  const before=f.snapshot();fail(render(f,'-Apply'),/fixture final failure/);assert.deepEqual(f.snapshot(),before)
}))
test('concurrent output is preserved instead of rolled back on final failure',()=>using(f=>{
  f.put('scripts/check-governance.ps1',f.get('scripts/check-governance.ps1').replace("$ErrorActionPreference = 'Stop'","$ErrorActionPreference = 'Stop'\nif (-not $SourcesOnly) { [IO.File]::WriteAllText((Join-Path $ProjectPath 'AGENTS.md'),'concurrent owner edit'); throw 'fixture competing writer' }"))
  const before=f.snapshot();const result=render(f,'-Apply');fail(result,/fixture competing writer/)
  assert.match(result.text,/Concurrent output preserved/);assert.equal(f.get('AGENTS.md'),'concurrent owner edit')
  assert.deepEqual(f.snapshot().slice(1),before.slice(1))
}))

test('deleted concurrent output does not prevent restoring remaining generated files',()=>using(f=>{
  f.put('scripts/check-governance.ps1',f.get('scripts/check-governance.ps1').replace("$ErrorActionPreference = 'Stop'","$ErrorActionPreference = 'Stop'\nif (-not $SourcesOnly) { [IO.File]::Delete((Join-Path $ProjectPath 'AGENTS.md')); throw 'fixture deleted output' }"))
  const before=f.snapshot();const result=render(f,'-Apply');fail(result,/fixture deleted output/)
  assert.match(result.text,/Output recovery incomplete/)
  assert.throws(()=>f.get('AGENTS.md'),/ENOENT/)
  assert.deepEqual(outputs.slice(1).map(p=>readFileSync(join(f.root,p)).toString('base64')),before.slice(1))
}))

test('missing focused regression file or trigger rejects generation',()=>using(f=>{
  const original=f.get('governance/verification-policy.json')
  for(const change of [
    p=>p.focusedRegressions[0].command='node --test test/missing.test.mjs',
    p=>p.focusedRegressions[0].triggerPaths=['../outside.ps1'],
    p=>p.focusedRegressions=[],
  ]) {
    const p=JSON.parse(original);change(p);f.put('governance/verification-policy.json',JSON.stringify(p))
    const before=f.snapshot();fail(render(f,'-Apply'),/Focused regression|focused regression/);assert.deepEqual(f.snapshot(),before)
  }
}))
