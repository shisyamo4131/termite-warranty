// Local artifact preparation only. There is deliberately no deploy subprocess.
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {maintenanceHtml,maintenanceInputs} from './lib/production-bootstrap-hosting.mjs'
export function bootstrapConfig(){return {hosting:{public:'public',headers:[{source:'**',headers:[{key:'Cache-Control',value:'no-cache, no-store, must-revalidate'}]}],rewrites:[{source:'**',destination:'/index.html'}],ignore:['**/gha-creds-*.json','**/node_modules/**']}}}
export async function prepareBootstrap(directory) {
  const output=resolve(directory)
  // Never replace an existing directory or mix a bootstrap with an application.
  await mkdir(output,{recursive:false})
  try {
    await mkdir(join(output,'public'))
    await writeFile(join(output,'public/index.html'),maintenanceHtml,{flag:'wx'})
    await writeFile(join(output,'firebase.json'),JSON.stringify(bootstrapConfig(),null,2)+'\n',{flag:'wx'})
    await writeFile(join(output,'expected.json'),JSON.stringify({kind:'maintenance-only',files:Object.fromEntries(maintenanceInputs().hostingFiles),applicationReleaseVerified:false},null,2)+'\n',{flag:'wx'})
    return {mode:'local-preparation',cloudWrites:false,output}
  }catch(error){
    // Keep partial output for diagnosis; never delete paths supplied by callers.
    throw Error('Bootstrap preparation failed; inspect the partial output.')
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==3){console.error('Usage: node scripts/prepare-production-bootstrap.mjs <new-local-directory>');process.exitCode=1}
  else prepareBootstrap(process.argv[2]).then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error('Local bootstrap preparation refused; existing output is preserved.');process.exitCode=1})
}
