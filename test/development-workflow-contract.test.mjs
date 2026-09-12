import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { validateDevelopmentWorkflow } from '../scripts/development-workflow-contract.mjs'

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
    assert.throws(() => validateDevelopmentWorkflow(changed, policy), new RegExp(gateId))
  }
})

test('deploy cannot bypass verification or use a general force flag', async () => {
  const { workflow, policy } = await load()
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('    needs: verify\n', ''), policy),
    /depend on the verify job/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('--non-interactive', '--non-interactive --force'), policy),
    /must not use unconditional --force/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace("    if: github.event_name == 'workflow_dispatch'\n", ''), policy),
    /explicit manual workflow dispatch/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('      - name: Run domain tests', '      - continue-on-error: true\n      - name: Run domain tests'), policy),
    /must not bypass/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('      - name: Run domain tests', '      - name: Run domain tests\n        if: false'), policy),
    /domain-test must be unconditional and fail closed/,
  )
})

test('deploy must consume the verified Hosting artifact without rebuilding it', async () => {
  const { workflow, policy } = await load()
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('          include-hidden-files: true\n', ''), policy),
    /upload the verified Hosting artifact/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace("Test-Path -LiteralPath '.output/public/index.html' -PathType Leaf", "Test-Path -LiteralPath '.output/public'"), policy),
    /reject a missing Hosting index artifact/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace('actions/download-artifact@v4', 'actions/cache@v4'), policy),
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
    /must not perform a deployment/,
  )
})

test('deployment must be one exact command with no retargeting or additional deployment', async () => {
  const { workflow, policy } = await load()
  const deployCommand = 'npx firebase deploy --project termite-warranty-dev --only firestore,functions,hosting --non-interactive'
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace(deployCommand, `${deployCommand} --project unintended-production --only hosting`), policy),
    /explicit development project and target set/,
  )
  assert.throws(
    () => validateDevelopmentWorkflow(workflow.replace(`        run: ${deployCommand}`, `        run: ${deployCommand}\n\n      - name: Additional deploy\n        run: npx firebase deploy --project unintended-production --only hosting --non-interactive`), policy),
    /explicit development project and target set/,
  )
})
