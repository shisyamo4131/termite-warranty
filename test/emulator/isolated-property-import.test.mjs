import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {after,test} from 'node:test'
import {initializeApp,deleteApp} from 'firebase-admin/app'
import {getFirestore as adminFirestore} from 'firebase-admin/firestore'
import {propertyPrototypeOperation as propertyOperation} from '../../functions/property-warranty.js'
import {propertyBulkImportOperation as bulkOperation} from '../../functions/property-bulk-import.js'
import {CSV_TEMPLATE_HEADERS} from '../../src/domain/property-bulk-import.mjs'
import {inspectBusinessIntegrity} from '../../scripts/lib/recovery-controller.mjs'
import {LOCAL_RUNTIME,localRuntimeHost} from '../helpers/emulator-runtime.mjs'
import {isolatedImportDatabase,isolatedImportAuth} from '../helpers/isolated-import.mjs'
if(process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort))throw Error('Dedicated emulator required')
// Legacy import scenarios represent the current supported client request format.
const propertyPrototypeOperation=(auth,db,input,uid)=>propertyOperation(auth,db,input.action==='reenableMaster'?input:{operationProtocol:2,...input},uid)
const propertyBulkImportOperation=(db,input,uid)=>bulkOperation(db,{operationProtocol:1,...input},uid)
const app=initializeApp({projectId:'demo-termite-warranty-test'},'isolated-import-test')
const getFirestore=(app,id)=>isolatedImportDatabase(adminFirestore,app,id),auth=isolatedImportAuth
const fields={name:'架空物件',postalCode:'1000001',address:'東京都千代田区1-1',buildingArea:100,applicationDate:'2026-10-01',handoverDate:'2026-10-01',maxYears:20,constructionCompanyId:'meeting-co',branchId:'meeting-branch'}
after(()=>deleteApp(app))

test('manual external keys and CSV share reservations, immutable settings and recovery identities',async()=>{
  const target=getFirestore(app,'test-external-keys')
  for(const root of await target.listCollections())await target.recursiveDelete(root)
  await target.doc('staffAccounts/key-admin').set({enabled:true,role:'house_solution_administrator'})
  const invoke=(action,input={})=>propertyPrototypeOperation(auth,target,{action,...input},'key-admin')
  const group={id:'G',name:'架空キー必須',prefix:'KEY',maxWarrantyYears:30,fiscalStartMonth:1,externalKeyRequired:true,externalKeyLabel:'架空契約No'}
  await invoke('saveGroup',group)
  await invoke('saveGroup',{...group,addressRequired:false})
  assert.equal((await target.doc('warrantyGroups/G').get()).data().addressRequired,true)
  await assert.rejects(invoke('saveGroup',{...group,insulationMaterialsRequired:false}),/変更できません/)
  await invoke('saveGroup',{...group,addressRequired:'true'})
  await assert.rejects(invoke('saveGroup',{...group,externalKeyRequired:false}),/変更できません/)
  await invoke('saveGroup',{...group,externalKeyLabel:'改訂表示名'})
  await invoke('saveGroup',{id:'F',name:'架空任意',prefix:'OPT',maxWarrantyYears:30,fiscalStartMonth:1,externalKeyRequired:false,addressRequired:false,insulationMaterialsRequired:false})
  await assert.rejects(invoke('saveGroup',{id:'F',name:'架空任意',prefix:'OPT',maxWarrantyYears:30,fiscalStartMonth:1,externalKeyRequired:true,externalKeyLabel:'契約番号'}),/変更できません/)
  await assert.rejects(invoke('saveGroup',{id:'X',name:'UH',maxWarrantyYears:10,prefix:'U',maxWarrantyYears:30,fiscalStartMonth:1,externalKeyRequired:false}))
  await invoke('saveGroup',{id:'U',name:'UH',maxWarrantyYears:10,prefix:'U',maxWarrantyYears:30,fiscalStartMonth:1})
  await target.doc('constructionCompanies/C').set({name:'架空工務店',defaultGroupId:'G',enabled:true})
  await invoke('saveBranch',{id:'B',name:'架空支店',constructionCompanyId:'C',branchCode:'0001'})
  const inputFields={...fields,constructionCompanyId:'C',branchId:'B'}
  const request=(property,externalKey,revision=0)=>({id:property,revision,requestId:crypto.randomUUID(),fields:{...inputFields,...(externalKey===undefined?{}:{externalKey})},confirmRegistration:true,confirmWarnings:true})
  await assert.rejects(invoke('save',request('missing')),/改訂表示名/)
  assert.equal((await target.doc('propertyWarranties/missing').get()).exists,false)
  const draft=request('manual',' 0001-2026001 ')
  await invoke('save',draft)
  await invoke('save',draft) // Same request is replay-safe.
  assert.equal((await target.doc('propertyWarranties/manual').get()).data().externalKey,'0001-2026001')
  await assert.rejects(invoke('save',request('manual','other',1)),/変更できません/)
  await assert.rejects(invoke('save',request('manual','',1)),/変更できません/)
  await invoke('register',request('manual',undefined,1)) // Older clients preserve the saved key.
  const csv=(key)=>CSV_TEMPLATE_HEADERS.join(',')+'\r\n'+CSV_TEMPLATE_HEADERS.map(header=>'"'+String({'外部キー':key,'支店コード':'0001','物件名':'架空取込物件','申込日':'2026-10-01','引渡日':'2026-10-01','最長保証期間':'20','現在保証年数':'10','建築面積':'100','断熱材あり':'なし','住所':'東京都架空市1-1'}[header.replace('（＊）','').replace('本支店コード','支店コード')]??'').replaceAll('"','""')+'"').join(',')
  const bulk=(action,key,extra={})=>propertyBulkImportOperation(target,{action,groupId:'G',companyId:'C',format:'common',csv:csv(key),requestId:'bulk-key-'+Buffer.from(key).toString('hex'),...extra},'key-admin')
  // More than two disabled matches must not hide the sole active (including legacy) branch.
  for(const id of ['disabled-a','disabled-b','disabled-c'])await invoke('saveBranch',{id,name:'無効支店',constructionCompanyId:'C',branchCode:'0001',enabled:false})
  const branchRef=target.doc('companyBranches/B'),branch=(await branchRef.get()).data()
  const {enabled,...legacyBranch}=branch
  await branchRef.set(legacyBranch)
  assert.deepEqual((await bulk('preview','branch-probe')).errors,[])
  const reservationRef=target.doc('branchCodeReservations/'+createHash('sha256').update('C\0'+'0001').digest('hex'))
  const reservation=(await reservationRef.get()).data()
  await reservationRef.delete()
  assert.ok((await bulk('preview','branch-probe')).errors.some(e=>e.field==='本支店コード'))
  await reservationRef.set({...reservation,branchId:'disabled-a'})
  assert.ok((await bulk('preview','branch-probe')).errors.some(e=>e.field==='本支店コード'))
  await reservationRef.set(reservation)
  await target.doc('companyBranches/direct-duplicate').set({...legacyBranch,name:'不正な直接重複'})
  // Unsupported direct writes are detected by integrity inspection, not per-import scans.
  assert.deepEqual((await bulk('preview','branch-probe')).errors,[])
  await assert.rejects(inspectBusinessIntegrity(target),/Duplicate branch code/)
  await target.doc('companyBranches/direct-duplicate').delete()
  for(const corrupt of [{branchId:'bad/path'},{branchId:'missing'},{branchCode:'0002'},{constructionCompanyId:'other'}]) {
    await reservationRef.set({...reservation,...corrupt})
    assert.ok((await bulk('preview','branch-probe')).errors.some(e=>e.field==='本支店コード'))
  }
  await reservationRef.set(reservation)
  assert.equal((await target.collection('propertyImportReceipts').get()).size,0)
  const measuredReads=[]
  const measured=new Proxy(target,{get(t,k){
    if(k==='runTransaction')return (fn,...args)=>t.runTransaction(tx=>fn(new Proxy(tx,{get(t,k){
      if(k==='get')return ref=>{assert.notEqual(ref._queryOptions?.collectionId,'companyBranches','CSV must not scan branches');return t.get(ref)}
      if(k==='getAll')return (...refs)=>{measuredReads.push(...refs.map(ref=>ref.path).filter(path=>/^(companyBranches|branchCodeReservations)\//.test(path)));return t.getAll(...refs)}
      const value=t[k];return typeof value==='function'?value.bind(t):value
    }})),...args)
    const value=t[k];return typeof value==='function'?value.bind(t):value
  }})
  const boundedPreview=()=>propertyBulkImportOperation(measured,{action:'preview',groupId:'G',companyId:'C',csv:csv('bounded-one')+'\r\n'+csv('bounded-two').split('\r\n')[1],requestId:'bounded-preview'},'key-admin')
  assert.deepEqual((await boundedPreview()).errors,[])
  assert.equal(measuredReads.length,2)
  for(let i=0;i<30;i++)await invoke('saveBranch',{id:'unrelated-'+i,name:'対象外',constructionCompanyId:'C',branchCode:'other-'+i})
  measuredReads.length=0
  assert.deepEqual((await boundedPreview()).errors,[])
  assert.equal(measuredReads.length,2)
  for(const character of ['\t','\n','\r','\u007f']) {
    const key=`invalid${character}key`
    const roots=['propertyWarranties','externalKeyReservations','propertyImportSources','propertyImportReceipts','warrantyCounters']
    const snapshot=async()=>Promise.all(roots.map(async root=>(await target.collection(root).get()).docs.map(doc=>[doc.id,doc.data()])))
    const initial=await snapshot(), preview=await bulk('preview',key)
    assert.ok(preview.errors.length)
    await assert.rejects(bulk('commit',key,{confirmed:true,previewHash:preview.previewHash}))
    await assert.rejects(invoke('save',request('invalid-key',key)),/改訂表示名/)
    assert.deepEqual(await snapshot(),initial)
  }
  const duplicate=await bulk('preview','0001-2026001')
  assert.ok(duplicate.errors.some(error=>error.field==='改訂表示名'))
  await assert.rejects(bulk('commit','0001-2026001',{confirmed:true,previewHash:duplicate.previewHash}))
  const first=await bulk('preview','bulk-first')
  await bulk('commit','bulk-first',{confirmed:true,previewHash:first.previewHash})
  await assert.rejects(invoke('register',request('manual-duplicate','bulk-first')),e=>e.code==='already-exists')
  const raceKey='manual-bulk-race',race=await bulk('preview',raceKey)
  const concurrent=await Promise.allSettled([invoke('register',request('race-manual',raceKey)),bulk('commit',raceKey,{confirmed:true,previewHash:race.previewHash})])
  assert.equal(concurrent.filter(value=>value.status==='fulfilled').length,1)
  assert.equal((await target.collection('propertyWarranties').where('externalKey','==',raceKey).get()).size,1)
  const two=await Promise.allSettled([invoke('register',request('race-a','manual-race')),invoke('register',request('race-b','manual-race'))])
  assert.equal(two.filter(value=>value.status==='fulfilled').length,1)
  await invoke('cancel',{...request('manual',undefined,2),reason:'架空の取消確認',confirmCancellation:true})
  await assert.rejects(invoke('save',request('cancelled-duplicate','0001-2026001')),e=>e.code==='already-exists')
  await inspectBusinessIntegrity(target) // Manual rows require reservations, not fictitious import sources.
  const row=(await target.doc('propertyWarranties/manual').get()).data()
  assert.equal(row.externalKey,'0001-2026001');assert.equal(row.receivedRecordId,undefined)
  await target.doc('propertyWarranties/manual').update({receivedRecordId:'manual'})
  await assert.rejects(inspectBusinessIntegrity(target),/source/)
  await target.doc('propertyWarranties/manual').set(row)
  await target.doc('constructionCompanies/UC').set({name:'架空UH工務店',defaultGroupId:'U',enabled:true})
  await target.doc('companyBranches/UC-head').set({name:'本店',constructionCompanyId:'UC',enabled:true})
  const uhFields={...inputFields,constructionCompanyId:'UC',branchId:'UC-head',maxYears:10}
  await assert.rejects(invoke('save',{...request('uh-missing'),fields:uhFields}),/お施主様契約No/)
  await invoke('register',{...request('uh-registered'),fields:{...uhFields,externalKey:'fictional-uh-key'}})
  await inspectBusinessIntegrity(target)
  await target.doc('constructionCompanies/FC').set({name:'架空任意会社',defaultGroupId:'F',enabled:true})
  await target.doc('companyBranches/FC-head').set({name:'本店',constructionCompanyId:'FC',enabled:true})
  const optionalFields={...inputFields,constructionCompanyId:'FC',branchId:'FC-head',address:'',foundationInsulation:true,insulationMaterials:''}
  await assert.rejects(invoke('register',{...request('optional-fields'),fields:optionalFields}),/住所/)
  await invoke('register',{...request('optional-fields-valid'),fields:{...optionalFields,address:'架空住所'}})
  await assert.rejects(invoke('save',{...request('optional-key'),fields:{...optionalFields,externalKey:'forbidden-key'}}),/入力できません/)
  await assert.rejects(invoke('register',{...request('required-address','required-address-key'),fields:{...inputFields,externalKey:'required-address-key',address:''}}),/住所/)
  await assert.rejects(invoke('register',{...request('required-material','required-material-key'),fields:{...inputFields,externalKey:'required-material-key',foundationInsulation:true,insulationMaterials:''}}),/資材/)
  const denied={action:'preview',groupId:'F',companyId:'FC',csv:csv('optional-group-key'),requestId:'optional-bulk'}
  const refused=await propertyBulkImportOperation(target,denied,'key-admin')
  assert.ok(refused.errors.some(e=>/外部キー必須/.test(e.message)))
  await assert.rejects(propertyBulkImportOperation(target,{...denied,action:'commit',confirmed:true,previewHash:refused.previewHash},'key-admin'),/全件/)
  assert.equal((await target.doc('propertyImportReceipts/optional-bulk').get()).exists,false)
  const beforeReuse=await bulk('preview','reuse-code')
  await invoke('saveBranch',{id:'B',name:'旧支店',constructionCompanyId:'C',enabled:false})
  const inactive=await bulk('preview','inactive-code')
  assert.ok(inactive.errors.some(e=>e.field==='本支店コード'))
  await assert.rejects(bulk('commit','inactive-code',{confirmed:true,previewHash:inactive.previewHash}))
  await invoke('saveBranch',{id:'replacement',name:'再利用先',constructionCompanyId:'C',branchCode:'0001'})
  await assert.rejects(bulk('commit','reuse-code',{confirmed:true,previewHash:beforeReuse.previewHash}),e=>e.code==='aborted')
  const afterReuse=await bulk('preview','reuse-code')
  const reused=await bulk('commit','reuse-code',{confirmed:true,previewHash:afterReuse.previewHash})
  assert.equal((await target.doc('propertyWarranties/'+reused.ids[0]).get()).data().branchId,'replacement')
  assert.equal((await target.doc('propertyWarranties/manual').get()).data().branchId,'B')
  const longCode='0'+'長'.repeat(2200)
  await invoke('saveBranch',{id:'long-code',name:'長いコード',constructionCompanyId:'C',branchCode:longCode})
  await invoke('saveBranch',{id:'long-near-match',name:'末尾だけ異なるコード',constructionCompanyId:'C',branchCode:longCode+'1'})
  await assert.rejects(invoke('saveBranch',{id:'long-duplicate',name:'重複',constructionCompanyId:'C',branchCode:longCode}),e=>e.code==='already-exists')
  const longInput={action:'preview',groupId:'G',companyId:'C',csv:csv('long-code-import').replace('"0001"','"'+longCode+'"'),requestId:'long-code-import'}
  const longPreview=await propertyBulkImportOperation(target,longInput,'key-admin')
  assert.deepEqual(longPreview.errors,[])
  const longResult=await propertyBulkImportOperation(target,{...longInput,action:'commit',confirmed:true,previewHash:longPreview.previewHash},'key-admin')
  assert.equal((await target.doc('propertyWarranties/'+longResult.ids[0]).get()).data().branchId,'long-code')
  await inspectBusinessIntegrity(target)
})

test('real Firestore bulk transaction commits 279 rows atomically and recovery verifies identities',async()=>{
  const imported=getFirestore(app,'test-import-volume')
  for(const root of await imported.listCollections())await imported.recursiveDelete(root)
  await imported.doc('staffAccounts/import-admin').set({enabled:true,role:'house_solution_administrator'})
  await imported.doc('warrantyGroups/G').set({name:'架空取込み',prefix:'QA',maxWarrantyYears:30,fiscalStartMonth:1,enabled:true,externalKeyRequired:true,addressRequired:false,insulationMaterialsRequired:false})
  await imported.doc('constructionCompanies/C').set({name:'架空工務店',defaultGroupId:'G',enabled:true})
  await propertyPrototypeOperation(auth,imported,{action:'saveBranch',id:'B',name:'架空支店',constructionCompanyId:'C',branchCode:'0001'},'import-admin')
  const makeCsv=(count,offset=0)=>CSV_TEMPLATE_HEADERS.join(',')+'\r\n'+Array.from({length:count},(_,i)=>{
    const row={'外部キー':`fictional-${offset+i}`,'支店コード':'0001','物件名':`架空物件${i}`,'住所':'架空住所','申込日':'2026-10-01','引渡日':'2026-10-01','最長保証期間':'20','現在保証年数':'10','建築面積':'100','断熱材あり':'あり'}
    return CSV_TEMPLATE_HEADERS.map(key=>row[key.replace('（＊）','').replace('本支店コード','支店コード')]??'').join(',')
  }).join('\r\n')
  const input={groupId:'G',companyId:'C',format:'common',csv:makeCsv(279),requestId:'volume-279'}
  const preview=await propertyBulkImportOperation(imported,{...input,action:'preview'},'import-admin')
  assert.equal(preview.count,279);assert.deepEqual(preview.errors,[])
  assert.equal((await imported.collection('propertyWarranties').get()).size,0)
  const confirm={...input,action:'commit',confirmed:true,previewHash:preview.previewHash}
  const result=await propertyBulkImportOperation(imported,confirm,'import-admin')
  assert.equal(result.count,279);assert.equal((await imported.collection('propertyWarranties').get()).size,279)
  const row=(await imported.doc('propertyWarranties/'+result.ids[0]).get()).data()
  assert.equal(row.address,'架空住所');assert.equal(row.insulationMaterials,'');assert.equal(row.status,'active')
  assert.equal((await propertyBulkImportOperation(imported,confirm,'import-admin')).replayed,true)
  await assert.rejects(propertyBulkImportOperation(imported,{...confirm,requestId:'duplicate-file'},'import-admin'),e=>e.details?.safeToDiscard===true)
  assert.equal((await imported.collection('propertyWarranties').get()).size,279)
  await inspectBusinessIntegrity(imported)
  const receiptRef=imported.doc('propertyImportReceipts/'+input.requestId),receipt=(await receiptRef.get()).data()
  await receiptRef.delete()
  await assert.rejects(inspectBusinessIntegrity(imported),/receipt/)
  await receiptRef.set({...receipt,ids:receipt.ids.slice(1),count:receipt.count-1})
  await assert.rejects(inspectBusinessIntegrity(imported),/receipt/)
  await receiptRef.set({...receipt,digest:'invalid'})
  await assert.rejects(inspectBusinessIntegrity(imported),/receipt/)
  await receiptRef.set(receipt)
  assert.equal((await propertyBulkImportOperation(imported,{action:'status',requestId:input.requestId},'import-admin')).count,279)
  assert.deepEqual(await propertyBulkImportOperation(imported,{action:'status',requestId:'absent'},'import-admin'),{pending:true})
  await imported.doc('staffAccounts/another-admin').set({enabled:true,role:'house_solution_administrator'})
  await assert.rejects(propertyBulkImportOperation(imported,{action:'status',requestId:input.requestId},'another-admin'),e=>e.code==='permission-denied')
  const p2=await propertyBulkImportOperation(imported,{...input,csv:makeCsv(1,900),requestId:'branch-change',action:'preview'},'import-admin')
  await propertyPrototypeOperation(auth,imported,{action:'saveBranch',id:'B',name:'架空支店',constructionCompanyId:'C',branchCode:'0002'},'import-admin')
  await assert.rejects(propertyBulkImportOperation(imported,{...input,csv:makeCsv(1,900),requestId:'branch-change',action:'commit',confirmed:true,previewHash:p2.previewHash},'import-admin'))
  assert.equal((await imported.collection('propertyWarranties').get()).size,279)
  const key=(await imported.collection('externalKeyReservations').limit(1).get()).docs[0]
  await key.ref.delete()
  await assert.rejects(inspectBusinessIntegrity(imported),/reservation/)
  await key.ref.set(key.data())
  const parallelInput={...input,csv:makeCsv(1,901).replace('fictional-901,0001','fictional-901,0002')}
  const parallelPreview=await propertyBulkImportOperation(imported,{...parallelInput,action:'preview'},'import-admin')
  const concurrent=await Promise.allSettled(['race-a','race-b'].map(requestId=>propertyBulkImportOperation(imported,{...parallelInput,requestId,action:'commit',confirmed:true,previewHash:parallelPreview.previewHash},'import-admin')))
  assert.equal(concurrent.filter(value=>value.status==='fulfilled').length,1)
  assert.equal((await imported.collection('propertyWarranties').get()).size,280)
  await inspectBusinessIntegrity(imported)
})
