import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const jobSections = (workflow) => {
  const lines = workflow.split(/\r?\n/)
  const jobs = new Map()
  let current = null
  for (const line of lines) {
    const match = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line)
    if (match) {
      current = { name: match[1], lines: [] }
      jobs.set(current.name, current)
    } else if (current) {
      current.lines.push(line)
    }
  }
  return jobs
}

const runCommands = (job) => job.lines.flatMap((line) => {
  const match = /^\s+run:\s*(.+?)\s*$/.exec(line)
  return match ? [match[1]] : []
})

const steps = (job) => {
  const parsed = []
  let current = null
  for (const line of job.lines) {
    const start = /^      -\s+(.+?)\s*$/.exec(line)
    if (start) {
      current = { lines: [start[1]] }
      parsed.push(current)
    } else if (current) {
      current.lines.push(line.trim())
    }
  }
  for (const step of parsed) {
    for (const line of step.lines) {
      const match = /^(name|run|uses|if|continue-on-error):\s*(.*?)\s*$/.exec(line)
      if (match) step[match[1]] = match[2]
    }
  }
  return parsed
}

export function validateDevelopmentWorkflow(workflow, policy) {
  if (!Array.isArray(policy?.comprehensiveGateIds) || !Array.isArray(policy?.gates)) {
    throw new Error('Verification policy does not define comprehensive gates.')
  }
  if (/continue-on-error\s*:\s*true/i.test(workflow) || /if\s*:\s*\$\{\{\s*always\(\)/i.test(workflow)) {
    throw new Error('Development deployment must not bypass a failed verification step.')
  }
  if (/(?:^|\s)--force(?:\s|$)/m.test(workflow)) {
    throw new Error('Development deployment must not use unconditional --force.')
  }

  const jobs = jobSections(workflow)
  const verify = jobs.get('verify')
  const deploy = jobs.get('deploy')
  if (!verify || !deploy) throw new Error('Development workflow requires separate verify and deploy jobs.')

  const verifyText = verify.lines.join('\n')
  const deployText = deploy.lines.join('\n')
  if (!/runs-on:\s*windows-latest/.test(verifyText)) throw new Error('Verification must use the supported Windows runtime profile.')
  if (!/actions\/setup-java@v4/.test(verifyText) || !/java-version:\s*['"]?21['"]?/.test(verifyText)) {
    throw new Error('Verification must install Java 21 for the Emulator gate.')
  }
  if (/google-github-actions\/auth|FIREBASE_SERVICE_ACCOUNT/.test(verifyText)) {
    throw new Error('Verification must not receive deployment credentials.')
  }
  if (runCommands(verify).some(command => command.includes('firebase deploy'))) {
    throw new Error('Verification job must not perform a deployment.')
  }
  if (!/actions\/upload-artifact@v4/.test(verifyText)
    || !/name:\s*firebase-hosting-\$\{\{ github\.sha \}\}/.test(verifyText)
    || !/path:\s*\.output\/public/.test(verifyText)
    || !/if-no-files-found:\s*error/.test(verifyText)
    || !/include-hidden-files:\s*true/.test(verifyText)) {
    throw new Error('Verification must upload the verified Hosting artifact for this revision.')
  }
  if (!runCommands(verify).some(command => command.includes("Test-Path -LiteralPath '.output/public/index.html' -PathType Leaf"))) {
    throw new Error('Verification must reject a missing Hosting index artifact.')
  }

  const verifySteps = steps(verify)
  const commands = verifySteps.flatMap(step => typeof step.run === 'string' ? [step.run] : [])
  if (!commands.includes('npx --yes npm@11.19.1 ci')) {
    throw new Error('Verification must install with the repository npm version.')
  }
  const gates = new Map(policy.gates.map(gate => [gate.id, gate]))
  let previousIndex = -1
  for (const gateId of policy.comprehensiveGateIds) {
    const gate = gates.get(gateId)
    if (!gate || typeof gate.command !== 'string') throw new Error(`Unknown comprehensive gate: ${gateId}`)
    const matchingSteps = verifySteps.flatMap((step, index) => step.run === gate.command ? [{ step, index }] : [])
    if (matchingSteps.length !== 1) throw new Error(`Verification job must run ${gateId} exactly once as its own step.`)
    const match = matchingSteps[0]
    if (typeof match.step.if === 'string' || typeof match.step['continue-on-error'] === 'string') {
      throw new Error(`Verification gate ${gateId} must be unconditional and fail closed.`)
    }
    if (match.index <= previousIndex) throw new Error(`Verification gate order does not match the policy at ${gateId}.`)
    previousIndex = match.index
  }

  if (!/^    needs:\s*verify\s*$/m.test(deployText)) throw new Error('Deploy job must depend on the verify job.')
  if (!/^    if:\s*github\.event_name == ['"]workflow_dispatch['"]\s*$/m.test(deployText)) {
    throw new Error('Deploy job must require an explicit manual workflow dispatch.')
  }
  if (!/actions\/download-artifact@v4/.test(deployText)
    || !/name:\s*firebase-hosting-\$\{\{ github\.sha \}\}/.test(deployText)
    || !/path:\s*\.output\/public/.test(deployText)) {
    throw new Error('Deploy job must download the verified Hosting artifact for this revision.')
  }
  if (!/google-github-actions\/auth@v2/.test(deployText) || !/FIREBASE_SERVICE_ACCOUNT_TERMITE_WARRANTY_DEV/.test(deployText)) {
    throw new Error('Deploy job is missing its explicit development authentication step.')
  }
  const deployCommands = steps(deploy).flatMap(step => typeof step.run === 'string' ? [step.run] : [])
  if (!deployCommands.includes('npx --yes npm@11.19.1 ci')) {
    throw new Error('Deploy job must install with the repository npm version.')
  }
  if (deployCommands.some(command => /(?:nuxt\s+generate|npm\s+run\s+build)/.test(command))) {
    throw new Error('Deploy job must not rebuild the verified Hosting artifact.')
  }
  const deployments = deployCommands.filter(command => /(?:^|\s)(?:npx\s+)?firebase\s+deploy(?:\s|$)/.test(command))
  const allowedDeployment = 'npx firebase deploy --project termite-warranty-dev --only firestore,functions,hosting --non-interactive'
  if (deployments.length !== 1 || deployments[0] !== allowedDeployment) {
    throw new Error('Deploy job must use the explicit development project and target set.')
  }
  return true
}

const scriptPath = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const repositoryRoot = path.resolve(path.dirname(scriptPath), '..')
  const [workflow, policyText] = await Promise.all([
    readFile(path.join(repositoryRoot, '.github', 'workflows', 'deploy-development.yml'), 'utf8'),
    readFile(path.join(repositoryRoot, 'governance', 'verification-policy.json'), 'utf8'),
  ])
  validateDevelopmentWorkflow(workflow, JSON.parse(policyText))
  process.stdout.write('Development workflow contract is valid.\n')
}
