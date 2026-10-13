import { productionProject } from './deployment-target.js'
import { assertApprovedPrototypeRuntime } from './local-runtime.js'

// Account names are part of the reviewed deployment contract, not caller input.
export function productionIdentities(project) {
  productionProject(project)
  return Object.fromEntries(['business', 'backup', 'diagnostics'].map(role =>
    [role, `prod-${role}@${project}.iam.gserviceaccount.com`]))
}

export function productionFunctionIdentity(name, project) {
  const identities = productionIdentities(project)
  return name === 'recoveryBackupMonitor' ? identities.backup
    : name === 'reportAuthDiagnostics' ? identities.diagnostics : identities.business
}

export function runtimeIdentity(role, env = process.env) {
  if (!['business', 'backup', 'diagnostics'].includes(role)) throw Error('Unknown runtime role.')
  if (env.TERMITE_DEPLOYMENT_ENVIRONMENT !== 'production') return {}
  assertApprovedPrototypeRuntime(env)
  return { serviceAccount: productionIdentities(env.TERMITE_PRODUCTION_PROJECT)[role] }
}
