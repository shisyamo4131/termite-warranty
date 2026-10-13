export class ReferenceScopeChangedError extends Error {
  constructor() { super('利用範囲が変更されました。'); this.name='ReferenceScopeChangedError' }
}
export function createReferenceRequestGuard() {
  let generation=0
  const capture=()=>generation
  const isCurrent=token=>token===generation
  const assertCurrent=token=>{if(!isCurrent(token))throw new ReferenceScopeChangedError()}
  return { capture,isCurrent,assertCurrent,invalidate:()=>{generation++},async run(invoke){
    const token=capture()
    try { const result=await invoke();assertCurrent(token);return result }
    catch(error){assertCurrent(token);throw error}
  } }
}
