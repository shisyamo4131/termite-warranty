import { isIsolatedTestEnvironment } from './test-emulator-profile.js'
import { productionProject } from './deployment-target.js'
const prototypeFirestoreHost = '127.0.0.1:28080'
const developmentProjectId = 'termite-warranty-dev'

export function resolveProjectId(env = process.env) {
  try {
    const ids=[env.GCLOUD_PROJECT,env.GCLOUD_PROJECT_ID,env.GOOGLE_CLOUD_PROJECT,JSON.parse(env.FIREBASE_CONFIG ?? '{}').projectId].filter(value=>value!==undefined&&value!=='')
    return ids.length&&ids.every(id=>typeof id==='string'&&id===ids[0])?ids[0]:undefined
  } catch {
    return undefined
  }
}

export function isLocalPrototypeRuntime(env = process.env) {
  const projectId = resolveProjectId(env)
  return env.FUNCTIONS_EMULATOR === 'true' && (
    (!env.TERMITE_TEST_RUN && projectId === 'demo-termite-warranty' && env.FIRESTORE_EMULATOR_HOST === prototypeFirestoreHost)
    || isIsolatedTestEnvironment(env))
}

export function assertLocalPrototypeRuntime(env = process.env) {
  if (!isLocalPrototypeRuntime(env)) {
    throw new Error('This prototype function may run only against the local demo-termite-warranty emulator.')
  }
}

export function assertApprovedPrototypeRuntime(env = process.env) {
  const projectId = resolveProjectId(env)
  const isLocalEmulator = isLocalPrototypeRuntime(env)
  const isDevelopment = env.FUNCTIONS_EMULATOR !== 'true'
    && !Object.keys(env).some(key=>key.endsWith('_EMULATOR_HOST')&&env[key])
    && !env.TERMITE_TEST_RUN
    && projectId === developmentProjectId
    && !env.TERMITE_PRODUCTION_PROJECT
    && (!env.TERMITE_DEPLOYMENT_ENVIRONMENT||env.TERMITE_DEPLOYMENT_ENVIRONMENT==='development')
  let isProduction=false
  if(env.TERMITE_DEPLOYMENT_ENVIRONMENT==='production'&&!env.TERMITE_TEST_RUN&&env.FUNCTIONS_EMULATOR!=='true'&&!Object.keys(env).some(key=>key.endsWith('_EMULATOR_HOST')&&env[key])) {
    try{isProduction=productionProject(env.TERMITE_PRODUCTION_PROJECT)===projectId}catch{}
  }

  if ((!isLocalEmulator || env.TERMITE_PRODUCTION_PROJECT || env.TERMITE_DEPLOYMENT_ENVIRONMENT==='production') && !isDevelopment && !isProduction) {
    throw new Error('Function target is not an explicitly approved environment.')
  }
}
