// Pure validation shared by the browser, Nuxt build and Functions guard.
export const DEVELOPMENT_PROJECT = 'termite-warranty-dev'
export function productionProject(value) {
  if(typeof value!=='string'||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value)||value===DEVELOPMENT_PROJECT||value.startsWith('demo-'))throw Error('Explicit production project required.')
  return value
}
export function hostedTarget({environment='development',project=DEVELOPMENT_PROJECT,appId=''}={}) {
  if(environment==='development'&&project===DEVELOPMENT_PROJECT&&!appId)return {environment,project,appId}
  if(environment!=='production')throw Error('Unknown deployment environment.')
  productionProject(project)
  if(typeof appId!=='string'||!/^1:[1-9]\d*:web:[a-f0-9]+$/.test(appId))throw Error('Explicit production Web App required.')
  return {environment,project,appId}
}
export function validateHostedOptions(target,options) {
  const expected=hostedTarget(target)
  if(!options||options.projectId!==expected.project||expected.environment==='production'&&(options.appId!==expected.appId||options.messagingSenderId!==expected.appId.split(':')[1]))throw Error('Hosting identity does not match this build.')
  return options
}
