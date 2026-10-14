import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { validateDevelopmentWorkflow, developmentDeployCondition } from '../scripts/development-workflow-contract.mjs'
import { parse, stringify } from 'yaml'
import vm from 'node:vm'

const mutate=(text,change)=>{const w=parse(text);change(w);return stringify(w,{lineWidth:0})}
const workflowUrl = new URL('../.github/workflows/deploy-development.yml', import.meta.url)
const policyUrl = new URL('../governance/verification-policy.json', import.meta.url)
const load = async () => {
  const [workflow, policyText] = await Promise.all([readFile(workflowUrl, 'utf8'), readFile(policyUrl, 'utf8')])
  return { workflow: workflow.replaceAll('\r\n', '\n'), policy: JSON.parse(policyText) }
}

test('development workflow satisfies the registered verification and deployment contract', async () => {
  const { workflow, policy } = await load()
  assert.equal(validateDevelopmentWorkflow(workflow, policy), true)
})

test('removing any comprehensive gate makes the workflow contract fail', async () => {
  const { workflow, policy } = await load()
  const gates = new Map(policy.gates.map(gate => [gate.id, gate]))
  for (const gateId of policy.comprehensiveGateIds) {
    const command = gates.get(gateId)?.command
    assert.equal(typeof command, 'string')
    const changed = workflow.replace(`run: ${command}`, 'run: node -e "process.exit(1)"')
    assert.notEqual(changed, workflow, `${gateId} fixture must alter the workflow`)
    assert.throws(() => validateDevelopmentWorkflow(changed, policy), new RegExp(gateId+'|Parallel verification'))
  }
})

test('deploy cannot bypass verification or use a general force flag', async () => {
  const { workflow, policy } = await load()
  assert.throws(
    () => validateDevelopmentWorkflow(mutate(workflow,w=>{w.jobs.deploy.needs=[]}), policy),
    /Documentation routing/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('--non-interactive', '--non-interactive --force'), policy),
    /must not use unconditional --force/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(mutate(workflow,w=>{delete w.jobs.deploy.if}), policy),
    /Documentation routing/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('      - name: Run domain tests', '      - continue-on-error: true\n      - name: Run domain tests'), policy),
    /Documentation routing|Parallel verification|must not bypass/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(mutate(workflow,w=>{w.jobs.application.steps.find(s=>s.run==='npm test').if='false'}), policy),
    /Documentation routing/,
  )
})

test('actual deployment condition routes only approved events and branches before and after opt-in', async () => {
  const { workflow, policy } = await load()
  const condition = parse(workflow).jobs.deploy.if
  // This expression uses only boolean operators and string equality. Normalize
  // strings to model GitHub's documented case-insensitive comparison semantics.
  for (const flag of ['', 'false', 'TRUE', 'true']) {
    for (const production of ['', 'true', 'TRUE']) {
      for (const event of ['push', 'workflow_dispatch', 'pull_request']) {
        for (const branch of ['main', 'dev', 'codex/production-readiness', 'refs/tags/dev']) {
          const ref = branch.startsWith('refs/') ? branch : `refs/heads/${branch}`
          const enabled = flag.toLowerCase() === 'true'
          const expected = enabled && branch === 'dev' && ['push', 'workflow_dispatch'].includes(event)
          assert.equal(vm.runInNewContext(condition.slice(3,-2), { cancelled:()=>false, needs:{scope:{result:'success',outputs:{documentationOnly:'false'}},verify:{result:'success'}}, github: { event_name: event, ref }, vars: { DEVELOPMENT_BRANCH_DEPLOY_ENABLED: flag.toLowerCase(), PRODUCTION_APP_DEPLOY_ENABLED: production.toLowerCase() } }), expected, `${flag}/${production}/${event}/${branch}`)
        }
      }
    }
  }
  assert.throws(() => validateDevelopmentWorkflow(workflow.replace('cancel-in-progress: false', 'cancel-in-progress: true'), policy), /concurrency/)
  assert.throws(() => validateDevelopmentWorkflow(workflow.replace('      - dev\n', '      - release\n'), policy), /branch routing/)
})

test('deploy must consume the verified Hosting artifact without rebuilding it', async () => {
  const { workflow, policy } = await load()
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('          include-hidden-files: true\n', ''), policy),
    /Parallel verification|upload the verified Hosting artifact/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace("Test-Path -LiteralPath '.output/public/index.html' -PathType Leaf", "Test-Path -LiteralPath '.output/public'"), policy),
    /Parallel verification|reject a missing Hosting index artifact/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replaceAll('actions/download-artifact@v8', 'actions/cache@v4'), policy),
    /download the verified Hosting artifact/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('      - name: Authenticate to Google Cloud', '      - name: Rebuild\n        run: npm run build\n\n      - name: Authenticate to Google Cloud'), policy),
    /must not rebuild/,
  )
})

test('both jobs use the fixed npm installer and verification cannot deploy', async () => {
  const { workflow, policy } = await load()
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('run: npx --yes npm@11.19.1 ci', 'run: npm ci'), policy),
    /Verification must install with the repository npm version/,
  )
  const lastInstall = workflow.lastIndexOf('run: npx --yes npm@11.19.1 ci')
  const changedInstall = `${workflow.slice(0, lastInstall)}run: npm ci${workflow.slice(lastInstall + 'run: npx --yes npm@11.19.1 ci'.length)}`
  assert.throws(() => validateDevelopmentWorkflow(changedInstall, policy), /Deploy job must install with the repository npm version/)
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('      - name: Run domain tests', '      - name: Forbidden deploy\n        run: npx firebase deploy\n\n      - name: Run domain tests'), policy),
    /Documentation routing|Parallel verification|must not perform a deployment/,
  )
})

test('deployment must be one exact command with no retargeting or additional deployment', async () => {
  const { workflow, policy } = await load()
  const deployCommand = 'npx firebase deploy --config firebase.development.generated.json --project termite-warranty-dev --only firestore,functions,hosting --non-interactive'
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace(deployCommand, `${deployCommand} --project unintended-production --only hosting`), policy),
    /explicit development project and target set/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace(`        run: ${deployCommand}`, `        run: ${deployCommand}\n\n      - name: Additional deploy\n        run: npx firebase deploy --project unintended-production --only hosting --non-interactive`), policy),
    /explicit development project and target set/,
  )
})
