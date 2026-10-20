import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'

export const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trimEnd()
// These tools do not contribute to the deployed application. Everything else
// under scripts remains a product/operational input, deliberately conservative.
const verificationTools=new Set([
  'development-candidate.mjs','development-deployment.mjs',
  'pipeline.mjs','local-verification.mjs','documentation-changes.mjs','ci-introduction.mjs',
  'verification-evidence.mjs','development-acceptance.mjs','development-workflow-contract.mjs',
  'production-workflow-contract.mjs','check-governance.ps1','render-governance.ps1',
  'check-functions-syntax.mjs','functions-syntax.mjs','compare-rules.mjs','test-rules.mjs','test-rules-focused.mjs',
  'lib/change-scope.mjs','lib/pipeline-contract.mjs','lib/local-verification.mjs',
  'lib/ci-introduction-workflow.mjs','lib/documentation-workflow.mjs','lib/verification-parallel-workflow.mjs',
  'lib/verification-reuse-workflow.mjs','lib/verification-evidence.mjs','lib/development-verification.mjs',
  'lib/governance-policy.ps1','lib/rules-test-plan.mjs','lib/rules-test-receipts.mjs','lib/rules-test-reporter.mjs',
  'lib/rules-test-workflow.mjs','lib/focused-test-reporter.mjs','lib/test-emulators.mjs',
  'lib/test-emulator-stage.mjs','lib/test-functions-loader.mjs','lib/test-functions-register.mjs',
])
const documentExtras=new Set(['docs/design/evidence/local-postal-2026-10-20/dashboard.png','docs/design/evidence/zipcloud-2026-10-20/loading-dialog.png','docs/design/evidence/zipcloud-2026-10-20/manual-preserved.png',
'README.md','CHANGELOG.md','INITIAL_PROMPT.md',
  'deliverables/insurance-report-guide-2026-10-19/README.md',
  'deliverables/insurance-report-guide-2026-10-19/build_pdf.py',
  'deliverables/insurance-report-guide-2026-10-19/build_alternatives.py',
  'output/pdf/保険報告CSV_住所と契約番号を分ける理由_2026-10-19.pdf',
  'output/pdf/保険報告一覧_今回分と過去未報告分_図解比較版_2026-10-19.pdf',
  'output/pdf/保険報告一覧_抽出方法のご案内_2026-10-19.pdf',
  'deliverables/production-schedule-2026-10-05/README.md',
  'deliverables/production-schedule-2026-10-05/build_pdf.py',
  'output/pdf/HS_本番稼働に向けた目標スケジュール_2026-10-13.pdf'])
export function pathKind(path){
  if(typeof path!=='string'||path.includes('\\')||path.split('/').some(p=>!p||p==='.'||p==='..'))return 'unknown'
  if(documentExtras.has(path)||/^docs\/.*\.md$/.test(path)||/^docs\/design\/evidence\/[^/]+\.json$/.test(path))return 'documentation'
  if(path.startsWith('test/'))return 'test'
  if(path==='AGENTS.md'||path.startsWith('governance/')||path.startsWith('.codex/')||path.startsWith('.github/')||path.startsWith('references/')||verificationTools.has(path.replace(/^scripts\//,''))&&path.startsWith('scripts/'))return 'ci'
  if(/^(app|src|functions|public|scripts|deliverables)\//.test(path)||['.gitignore','.gitattributes','package.json','package-lock.json','nuxt.config.ts','tsconfig.json','firebase.json','firestore.rules','firestore.control.rules','firestore.indexes.json'].includes(path))return 'product'
  return 'unknown'
}
export function classifyDiff(raw){
  const fields=raw.split('\0');if(fields.pop()!==''||!fields.length||fields.length%2)throw Error('Incomplete change inventory.')
  const kinds=new Set()
  for(let i=0;i<fields.length;i+=2){
    const m=/^:(000000|100644) (000000|100644) [a-f0-9]+ [a-f0-9]+ ([AMD])$/.exec(fields[i])
    const kind=pathKind(fields[i+1])
    if(!m||kind==='unknown'||m[1]==='000000'&&m[3]!=='A'||m[2]==='000000'&&m[3]!=='D')throw Error('Unclassified path or file mode: '+fields[i+1])
    kinds.add(kind)
  }
  return ['product','ci','test','documentation'].find(k=>kinds.has(k))
}
export function inputDigests(entries){
  const rows=[...entries].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)
  if(new Set(rows.map(x=>x.path)).size!==rows.length)throw Error('Duplicate input path.')
  const digest=filter=>createHash('sha256').update(JSON.stringify(rows.filter(filter).map(({path,mode,sha})=>[path,mode,sha]))).digest('hex')
  for(const e of rows)if(!/^[a-f0-9]{40}$/.test(e.sha)||!['100644','100755','120000'].includes(e.mode))throw Error('Unsupported input: '+e.path)
  // Existing unclassified files remain product inputs. Editing them is blocked
  // by classifyDiff until their purpose has been reviewed.
  return {verification:digest(e=>pathKind(e.path)!=='documentation'),product:digest(e=>['product','unknown'].includes(pathKind(e.path)))}
}
export function inputsAt(ref='HEAD',run=git){
  const entries=run('ls-tree','-r','-z',ref).split('\0').filter(Boolean).map(row=>{
    const m=/^(\d+) blob ([a-f0-9]{40})\t([\s\S]+)$/.exec(row)
    if(!m)throw Error('Unsupported input entry.')
    return {mode:m[1],sha:m[2],path:m[3]}
  })
  return inputDigests(entries)
}
