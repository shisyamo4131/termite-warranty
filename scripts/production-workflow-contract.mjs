import {validatePipeline} from './lib/pipeline-contract.mjs'
export const validateProductionWorkflow=(text,policy)=>validatePipeline(text,policy,'production')
