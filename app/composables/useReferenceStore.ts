import { collection } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { effectScope, computed, shallowRef, watch } from 'vue'
import { recoveryRuntime, withRuntimeGeneration } from '../utils/recoveryClient'
import { createMeasuredFirestore, recordMetric } from '../utils/firestoreMetrics'

type Row = {id:string;name:string;[key:string]:any}
type Kind = 'groups' | 'companies' | 'branches'
const paths = { groups: 'warrantyGroups', companies: 'constructionCompanies', branches: 'companyBranches' } as const
let shared: ReturnType<typeof createStore> | undefined

function createStore() {
  const { $firebase } = useNuxtApp()
  const { profile } = useSession()
  const data = shallowRef<Record<Kind, Row[]>>({ groups: [], companies: [], branches: [] })
  const status = shallowRef<'idle'|'loading'|'ready'|'stale'|'error'>('idle')
  const error = shallowRef('')
  const { onSnapshot } = createMeasuredFirestore('referenceStore')
  const inactiveReferenced=new Set<string>()
  let generation = 0, stops: Array<()=>void> = [], pending: Promise<void> | undefined, expires = 0
  const reset = () => { generation++; inactiveReferenced.clear(); stops.splice(0).forEach(stop=>stop()); data.value={groups:[],companies:[],branches:[]}; status.value='idle';error.value='';pending=undefined;expires=0 }
  const identity = computed(()=>JSON.stringify([profile.value, recoveryRuntime.value]))
  const allowed = ()=>!!profile.value && ['normal','verification'].includes(recoveryRuntime.value.phase)
  function start() {
    reset()
    if(!allowed())return
    if(profile.value?.accountType!=='staff')return
    status.value='loading'
    const epoch=generation, ready=new Set<Kind>(), stale=new Set<Kind>(), failed=new Set<Kind>()
    for(const kind of Object.keys(paths) as Kind[]) {
      stops.push(onSnapshot(collection($firebase.firestore,paths[kind]),{includeMetadataChanges:true},snapshot=>{
        if(epoch!==generation)return
        data.value={...data.value,[kind]:snapshot.docs.map(doc=>({...doc.data(),id:doc.id,name:String(doc.data().name ?? doc.id)}))}
        const firstServer=!ready.has(kind) && !snapshot.metadata.fromCache
        if(snapshot.metadata.fromCache)stale.add(kind);else {stale.delete(kind);ready.add(kind)}
        status.value=failed.size ? 'error' : ready.size<3 ? 'loading' : stale.size ? 'stale' : 'ready'
        const rows=data.value[kind]
        if(firstServer)recordMetric('referenceStore',{activeDocuments:rows.filter(row=>row.enabled!==false).length,inactiveDocuments:rows.filter(row=>row.enabled===false).length})
      },()=>{if(epoch===generation){failed.add(kind);error.value='参照マスタを更新できません。接続を確認して再取得してください。';status.value='error'}}))
    }
  }
  async function ensureReady(force=false):Promise<void> {
    if(!allowed())throw new Error('参照マスタを取得できる接続状態ではありません。')
    if(profile.value?.accountType!=='staff') {
      if(!force && status.value==='ready' && Date.now()<expires)return
      if(pending)return pending
      const epoch=generation
      status.value='loading'
      pending=(async()=>{try{
        const result=(await httpsCallable<Record<string,unknown>,Record<Kind,Row[]>>($firebase.functions,'propertyPrototype')(withRuntimeGeneration({action:'catalog',purpose:'referenceStore'}))).data
        if(epoch!==generation)throw new Error('利用範囲が変更されました。')
        data.value=result;expires=Date.now()+300000;status.value='ready';error.value=''
      }catch(e){if(epoch===generation){status.value='error';error.value='参照マスタを取得できませんでした。'}throw e}finally{if(epoch===generation)pending=undefined}})()
      return pending
    }
    if(status.value==='error' || status.value==='idle')start()
    if(status.value==='ready')return
    const epoch=generation
    return new Promise((resolve,reject)=>{
      const finish=(message?:string)=>{clearTimeout(timer);stop();message ? reject(new Error(message)) : resolve()}
      const timer=setTimeout(()=>finish('参照マスタの最新状態を確認できません。再取得してください。'),15000)
      const stop=watch([status,identity],()=>{if(epoch!==generation)finish('利用範囲が変更されました。');else if(status.value==='ready')finish();else if(status.value==='error')finish(error.value)},{flush:'sync'})
    })
  }
  effectScope(true).run(()=>watch(identity,start,{immediate:true,flush:'sync'}))
  const groups=computed(()=>data.value.groups),companies=computed(()=>data.value.companies),branches=computed(()=>data.value.branches)
  const activeCompanies=computed(()=>status.value!=='ready' ? [] : companies.value.filter(company=>company.enabled!==false && groups.value.some(group=>group.id===company.defaultGroupId && group.enabled!==false)))
  const activeBranches=(companyId:string)=>activeCompanies.value.some(company=>company.id===companyId) ? branches.value.filter(branch=>branch.constructionCompanyId===companyId && branch.enabled!==false) : []
  const indexes=computed(()=>Object.fromEntries((Object.keys(paths) as Kind[]).map(kind=>[kind,new Map(data.value[kind].map(row=>[row.id,row]))])) as Record<Kind,Map<string,Row>>)
  function name(kind:Kind,id:string) {
    const row=indexes.value[kind].get(id)
    const key=kind+':'+id
    if(row){const inactive=row.enabled===false;const unique=inactive && !inactiveReferenced.has(key);if(inactive)inactiveReferenced.add(key);recordMetric('referenceStore',{referenceHits:1,inactiveReferenceHits:inactive ? 1 : 0,inactiveUniqueReferences:unique ? 1 : 0})}
    return row?.name ?? id
  }
  return {groups,companies,branches,activeCompanies,activeBranches,status,error,ensureReady,reset,name}
}
export function useReferenceStore() { return shared ??= createStore() }
