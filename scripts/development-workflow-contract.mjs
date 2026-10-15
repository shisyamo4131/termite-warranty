import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {validatePipeline} from './lib/pipeline-contract.mjs'
export const validateDevelopmentWorkflow=(text,policy)=>validatePipeline(text,policy,'development')
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  validateDevelopmentWorkflow(readFileSync(new URL('../.github/workflows/deploy-development.yml',import.meta.url),'utf8'),JSON.parse(readFileSync(new URL('../governance/verification-policy.json',import.meta.url))))
  console.log('Development safety contract is valid.')
}
