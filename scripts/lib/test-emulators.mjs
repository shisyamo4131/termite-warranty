import {spawn} from 'node:child_process'
import {createServer} from 'node:net'
import {randomUUID} from 'node:crypto'
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import {resolve,join,dirname,basename} from 'node:path'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {LOCAL_RUNTIME,localRuntimeHost} from '../../src/config/local-emulator.mjs'

export const DEMO_PROJECT='demo-termite-warranty'
export const emulatorPorts=[LOCAL_RUNTIME.authPort,LOCAL_RUNTIME.firestorePort,LOCAL_RUNTIME.functionsPort,
  LOCAL_RUNTIME.emulatorHubPort,LOCAL_RUNTIME.emulatorLoggingPort,LOCAL_RUNTIME.emulatorUiPort,9150]

export function assertFocusedEnvironment(env,{child=false}={}) {
  const expected={FIRESTORE_EMULATOR_HOST:localRuntimeHost(LOCAL_RUNTIME.firestorePort),
    FIREBASE_AUTH_EMULATOR_HOST:localRuntimeHost(LOCAL_RUNTIME.authPort),
    FIREBASE_EMULATOR_HUB:localRuntimeHost(LOCAL_RUNTIME.emulatorHubPort)}
  for(const [key,value] of Object.entries(expected)) {
    if(child ? env[key]!==value : env[key]!==undefined)throw Error('Focused test requires its own fresh emulator process.')
  }
  for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT'])if(env[key]!==undefined&&env[key]!==DEMO_PROJECT)throw Error('Non-demo project environment refused.')
  if(env.NODE_OPTIONS)throw Error('Unreviewed Node options refused.')
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

export async function runEmulatorCommand(script,{root=fileURLToPath(new URL('../..',import.meta.url)),env=process.env,run=runNode,checkPorts=assertEmulatorPortsFree}={}) {
  if(!['node scripts/test-rules.mjs --child','node scripts/test-rules.mjs --child --serial','node scripts/test-rules-focused.mjs --child excel-dates'].includes(script))throw Error('Unreviewed emulator command.');assertFocusedEnvironment(env)
  const config=JSON.parse(await readFile(join(root,'firebase.json'),'utf8'))
  for(const [name,port] of Object.entries({auth:LOCAL_RUNTIME.authPort,firestore:LOCAL_RUNTIME.firestorePort,
    functions:LOCAL_RUNTIME.functionsPort,hub:LOCAL_RUNTIME.emulatorHubPort,logging:LOCAL_RUNTIME.emulatorLoggingPort,ui:LOCAL_RUNTIME.emulatorUiPort})) {
    if(config.emulators?.[name]?.host!==LOCAL_RUNTIME.host||config.emulators[name].port!==port)throw Error('Emulator configuration changed; focused profile needs review.')
  }
  if(config.emulators.firestore.websocketPort!==undefined&&config.emulators.firestore.websocketPort!==9150)throw Error('Unreviewed websocket port.')
  await checkPorts()
  const nonce=randomUUID(),childEnv={...env,GCLOUD_PROJECT:DEMO_PROJECT,GOOGLE_CLOUD_PROJECT:DEMO_PROJECT,FOCUSED_TEST_NONCE:nonce}
  const prepared=await run(['scripts/prepare-functions-deploy.mjs'],{root,env:childEnv})
  if(prepared.code!==0)throw Error('Functions preparation failed; emulators were not started.')
  // Recheck immediately before Firebase; its own port/startup guard is also retained.
  await checkPorts()
  const temporaryRoot=resolve(tmpdir()),configRoot=await mkdtemp(join(temporaryRoot,'termite-focused-config-'))
  let result
  try {
    // A fresh CLI config avoids account-wide settings and telemetry-dependent exit failures.
    await mkdir(join(configRoot,'configstore'))
    await writeFile(join(configRoot,'configstore/firebase-tools.json'),JSON.stringify({usage:false}))
    result=await run(['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec','--project',DEMO_PROJECT,
      '--only','auth,firestore,functions','--non-interactive',script],
      {root,env:{...childEnv,XDG_CONFIG_HOME:configRoot}})
  } finally {
    try {
      // Never kill another process to make cleanup appear successful.
      await checkPorts()
    } finally {
      if(dirname(configRoot)!==temporaryRoot||!basename(configRoot).startsWith('termite-focused-config-'))throw Error('Temporary config cleanup scope mismatch.')
      await rm(configRoot,{recursive:true,force:true})
    }
  }
  if(result.code!==0)throw Error('Focused emulator command failed; completion evidence unavailable.')
  return {...result,nonce}
}
