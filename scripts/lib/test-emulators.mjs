import {spawn} from 'node:child_process'
import {createServer} from 'node:net'
import {randomUUID} from 'node:crypto'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {TEST_RUNTIME as LOCAL_RUNTIME,testRuntimeHost as localRuntimeHost,isIsolatedTestEnvironment} from '../../functions/test-emulator-profile.js'
import {prepareTestStage,populateTestStage,cleanupTestStage} from './test-emulator-stage.mjs'
import {rulesShards} from './rules-test-plan.mjs'

export const DEMO_PROJECT=LOCAL_RUNTIME.projectId
export const emulatorPorts=[LOCAL_RUNTIME.authPort,LOCAL_RUNTIME.firestorePort,LOCAL_RUNTIME.functionsPort,
  LOCAL_RUNTIME.emulatorHubPort,LOCAL_RUNTIME.emulatorLoggingPort,LOCAL_RUNTIME.emulatorUiPort,LOCAL_RUNTIME.websocketPort,
  LOCAL_RUNTIME.eventarcPort,LOCAL_RUNTIME.tasksPort]

export function assertFocusedEnvironment(env,{child=false}={}) {
  const expected={FIRESTORE_EMULATOR_HOST:localRuntimeHost(LOCAL_RUNTIME.firestorePort),
    FIREBASE_AUTH_EMULATOR_HOST:localRuntimeHost(LOCAL_RUNTIME.authPort),
    FIREBASE_EMULATOR_HUB:localRuntimeHost(LOCAL_RUNTIME.emulatorHubPort)}
  for(const [key,value] of Object.entries(expected)) {
    if(child ? env[key]!==value : env[key]!==undefined)throw Error('Focused test requires its own fresh emulator process.')
  }
  for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT'])if(env[key]!==undefined&&env[key]!==DEMO_PROJECT)throw Error('Non-demo project environment refused.')
  if(env.NODE_OPTIONS)throw Error('Unreviewed Node options refused.')
  if(child && !isIsolatedTestEnvironment(env))throw Error('Isolated test profile is required.')
  if(!child && (env.TERMITE_TEST_RUN || env.TERMITE_TEST_STAGE))throw Error('Nested test runner refused.')
}

export async function assertEmulatorPortsFree(ports=emulatorPorts) {
  // Bind, rather than merely probe: occupied ports (including local user work) fail closed.
  const reservations=[]
  try {
    for(const port of ports) {
      const server=createServer();reservations.push(server)
      await new Promise((ok,bad)=>{server.once('error',bad);server.listen({host:LOCAL_RUNTIME.host,port,exclusive:true},ok)})
    }
  } finally {
    await Promise.all(reservations.filter(server=>server.listening).map(server=>new Promise(ok=>server.close(ok))))
  }
}

export async function runNode(args,{root,env,echo=true}={}) {
  return new Promise((ok,bad)=>{
    const child=spawn(process.execPath,args,{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']})
    let output='',stderr='',size=0
    const interrupt=()=>child.kill('SIGINT')
    process.once('SIGINT',interrupt)
    child.stdout.on('data',data=>{size+=data.length;if(size<=16*1024*1024)output+=data.toString();if(echo)process.stdout.write(data)})
    child.stderr.on('data',data=>{if(stderr.length<65536)stderr+=data.toString();if(echo)process.stderr.write(data)})
    child.once('error',error=>{process.removeListener('SIGINT',interrupt);bad(error)})
    child.once('close',(code,signal)=>{process.removeListener('SIGINT',interrupt);ok({code:signal||size>16*1024*1024?1:code??1,output,stderr})})
  })
}

export async function runEmulatorCommand(script,{root=fileURLToPath(new URL('../..',import.meta.url)),env=process.env,run=runNode,checkPorts=assertEmulatorPortsFree,prepare=populateTestStage}={}) {
  if(!['node scripts/test-rules.mjs --child','node scripts/test-rules.mjs --child --serial','node scripts/test-rules.mjs --child --failure-probe','node scripts/test-rules-focused.mjs --child excel-dates',...rulesShards.map(row=>'node scripts/test-rules.mjs --child --shard '+row.id)].includes(script))throw Error('Unreviewed emulator command.');assertFocusedEnvironment(env)
  await checkPorts()
  const nonce=randomUUID(),owned=await prepareTestStage(root,nonce)
  const childEnv={...env,GCLOUD_PROJECT:DEMO_PROJECT,GOOGLE_CLOUD_PROJECT:DEMO_PROJECT,FOCUSED_TEST_NONCE:nonce,
    TERMITE_TEST_RUN:nonce,TERMITE_TEST_STAGE:owned.stage,METADATA_SERVER_DETECTION:'none'}
  let result
  try {
    await prepare(owned,root)
    await checkPorts()
    const [entry,...options]=script.slice('node '.length).split(' ')
    if(/["\r\n%]/.test(root))throw Error('Unsupported shell path for emulator child.')
    const command=`node "${join(root,entry)}" ${options.join(' ')}`
    result=await run([join(root,'node_modules/firebase-tools/lib/bin/firebase.js'),'emulators:exec','--project',DEMO_PROJECT,
      '--only','auth,firestore,functions','--non-interactive',command],
      {root:owned.stage,env:{...childEnv,XDG_CONFIG_HOME:join(owned.stage,'cli')}})
  } finally {
    // Preserve the stage and lock if shutdown is incomplete. Never kill foreign listeners.
    await checkPorts()
    await cleanupTestStage(owned)
  }
  if(result.code!==0 || /Failed to load function definition|could not be analyzed successfully/.test(result.output+'\n'+result.stderr))throw Error('Focused emulator command failed; completion evidence unavailable.')
  return {...result,nonce}
}
