// Validate the downloaded maintenance artifact before acquiring cloud credentials.
import {readFile,readdir,lstat} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {isDeepStrictEqual} from 'node:util'
import {bootstrapConfig} from './prepare-production-bootstrap.mjs'
import {maintenanceHtml,maintenanceInputs} from './lib/production-bootstrap-hosting.mjs'
import {validateProductionTarget} from './lib/production-deployment-plan.mjs'
export async function checkBootstrapArtifact(directory,target) {
  const fail=()=>{throw Error('Maintenance artifact verification failed.')}
  target=validateProductionTarget(target)
  const root=resolve(directory)
  for(const name of ['', 'public']){const st=await lstat(join(root,name));if(st.isSymbolicLink()||!st.isDirectory())fail()}
  if(!isDeepStrictEqual((await readdir(root)).sort(),['expected.json','firebase.json','public'])||!isDeepStrictEqual(await readdir(join(root,'public')),['index.html']))fail()
  for(const name of ['expected.json','firebase.json','public/index.html']){const st=await lstat(join(root,name));if(st.isSymbolicLink()||!st.isFile()||st.size>65536)fail()}
  const config=bootstrapConfig();config.hosting.site=target.site
  if(!isDeepStrictEqual(JSON.parse(await readFile(join(root,'firebase.json'),'utf8')),config))fail()
  if(!isDeepStrictEqual(JSON.parse(await readFile(join(root,'expected.json'),'utf8')),{kind:'maintenance-only',files:Object.fromEntries(maintenanceInputs().hostingFiles),applicationReleaseVerified:false}))fail()
  if(!(await readFile(join(root,'public/index.html'))).equals(Buffer.from(maintenanceHtml)))fail()
  return {kind:'verified-local-maintenance-artifact',cloudWrites:false}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==4){console.error('Usage: node scripts/check-production-bootstrap-artifact.mjs <artifact-directory> <target-json>');process.exitCode=1}
  else readFile(process.argv[3],'utf8').then(JSON.parse).then(target=>checkBootstrapArtifact(process.argv[2],target)).then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error('Maintenance artifact refused before authentication.');process.exitCode=1})
}
