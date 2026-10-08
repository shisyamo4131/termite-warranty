import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { propertyPrototypeOperation } from '../../functions/property-warranty.js'
import { propertyBulkImportOperation } from '../../functions/property-bulk-import.js'
import { CSV_TEMPLATE_HEADERS } from '../../src/domain/property-bulk-import.mjs'
import { inspectBusinessIntegrity } from '../../scripts/lib/recovery-controller.mjs'
import { coveragePeriods, initialGroups, insuranceReportTarget, latestInsuranceReport } from '../../src/domain/property-warranty.mjs'
import { LOCAL_RUNTIME, localRuntimeHost } from '../../src/config/local-emulator.mjs'
import { seedFixedRuntime, httpsCallable as fixedCallable } from '../helpers/fixed-runtime.mjs'
if(process.env.FIRESTORE_EMULATOR_HOST!==localRuntimeHost(LOCAL_RUNTIME.firestorePort))throw new Error('Emulator required')
const app=initializeApp({projectId:'demo-termite-warranty'},'property-test'),db=getFirestore(app),auth=getAuth(app)
const call=async(action,data={},uid='meeting-hs')=>{
  // Old scenario helpers explicitly construct the new confirmation payload.
  if (['report','undoReport'].includes(action)) {
    const row=(await db.doc('propertyWarranties/'+data.id).get()).data()
    data={...data,...(action==='report' ? {reportTarget:insuranceReportTarget(row,data.month)} : {targetReportId:latestInsuranceReport(row)?.requestId})}
  }
  return propertyPrototypeOperation(auth,db,{action,...data},uid)
}
const fields={name:'架空物件',postalCode:'1000001',address:'東京都千代田区1-1',buildingArea:100,applicationDate:'2026-10-01',handoverDate:'2026-10-01',maxYears:20,constructionCompanyId:'meeting-co',branchId:'meeting-branch'}
const companyAddress={postalCode:'1000001',prefecture:'東京都',municipality:'千代田区',streetTownAndNumber:'1'}
const saveCompany=(id,defaultGroupId,enabled=true)=>call('saveCompany',{id,name:'架空工務店',defaultGroupId,enabled,address:companyAddress})
const command=(id,revision,extra={})=>({id,revision,requestId:crypto.randomUUID(),fields,confirmRegistration:true,confirmWarnings:true,confirmCancellation:true,...extra})
before(async()=>{
  await seedFixedRuntime(db)
  for(const name of ['propertyWarranties','warrantyGroups','warrantyCounters','companyBranches'])await db.recursiveDelete(db.collection(name))
  await db.doc('staffAccounts/meeting-hs').set({role:'house_solution_administrator',enabled:true,displayName:'架空HS'})
  await auth.createUser({uid:'meeting-hs',email:'meeting-callable@example.invalid',password:'Demo-only-password-123'})
  await db.doc('constructionCompanies/meeting-co').set({name:'架空工務店',defaultGroupId:'HSC'})
  await db.doc('companyBranches/meeting-branch').set({name:'架空支店',constructionCompanyId:'meeting-co',groupId:'SHS'})
  for(const g of initialGroups)await db.doc(`warrantyGroups/${g.id}`).set(g)
  for(const [uid,company,scope,branchId] of [['meeting-head','meeting-co','company',''],['meeting-branch-user','meeting-co','branch','meeting-branch'],['meeting-otherbranch','meeting-co','branch','other'],['meeting-otherco','other','company','']])await db.doc(`constructionCompanyAccounts/${uid}`).set({role:'construction_company',enabled:true,constructionCompanyId:company,scope,branchId})
})
after(()=>deleteApp(app))

test('conflicting legacy name refuses editor and notice mutations without changing data or receipts',async()=>{
 const id='fictional-name-conflict',ref=db.doc('propertyWarranties/'+id)
 const original={...fields,name:'架空物件',ownerName:'架空別名',revision:1,status:'active',history:[]}
 await ref.set(original)
 for(const action of ['save','notify']){
  const input=command(id,1,{notified:true})
  await assert.rejects(call(action,input),e=>e.code==='failed-precondition')
  assert.deepEqual((await ref.get()).data(),original)
  assert.equal((await db.doc(`propertyOperationReceipts/${id}_${input.requestId}`).get()).exists,false)
 }
 await ref.delete()
})

test('manual external keys and CSV share reservations, immutable settings and recovery identities',async()=>{
  const target=getFirestore(app,'test-external-keys')
  for(const root of await target.listCollections())await target.recursiveDelete(root)
  await target.doc('staffAccounts/key-admin').set({enabled:true,role:'house_solution_administrator'})
  const invoke=(action,input={})=>propertyPrototypeOperation(auth,target,{action,...input},'key-admin')
  const group={id:'G',name:'架空キー必須',prefix:'KEY',fiscalStartMonth:1,externalKeyRequired:true,externalKeyLabel:'架空契約No'}
  await invoke('saveGroup',group)
  await assert.rejects(invoke('saveGroup',{...group,addressRequired:false}),/変更できません/)
  await assert.rejects(invoke('saveGroup',{...group,insulationMaterialsRequired:false}),/変更できません/)
  await assert.rejects(invoke('saveGroup',{...group,addressRequired:'true'}),/不正/)
  await assert.rejects(invoke('saveGroup',{...group,externalKeyRequired:false}),/変更できません/)
  await invoke('saveGroup',{...group,externalKeyLabel:'改訂表示名'})
  await invoke('saveGroup',{id:'F',name:'架空任意',prefix:'OPT',fiscalStartMonth:1,externalKeyRequired:false,addressRequired:false,insulationMaterialsRequired:false})
  await assert.rejects(invoke('saveGroup',{id:'F',name:'架空任意',prefix:'OPT',fiscalStartMonth:1,externalKeyRequired:true,externalKeyLabel:'契約番号'}),/変更できません/)
  await assert.rejects(invoke('saveGroup',{id:'X',name:'UH',prefix:'U',fiscalStartMonth:1,externalKeyRequired:false}))
  await invoke('saveGroup',{id:'U',name:'UH',prefix:'U',fiscalStartMonth:1})
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
  const csv=(key)=>CSV_TEMPLATE_HEADERS.join(',')+'\r\n'+CSV_TEMPLATE_HEADERS.map(header=>'"'+String({'外部キー':key,'支店コード':'0001','物件名':'架空取込物件','申込日':'2026-10-01','引渡日':'2026-10-01','最長保証期間':'20','現在保証年数':'10','建築面積':'100','断熱材あり':'なし','住所':'東京都架空市1-1'}[header.replace('（＊）','')]??'').replaceAll('"','""')+'"').join(',')
  const bulk=(action,key,extra={})=>propertyBulkImportOperation(target,{action,groupId:'G',companyId:'C',format:'common',csv:csv(key),requestId:'bulk-key-'+Buffer.from(key).toString('hex'),...extra},'key-admin')
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
  const uhFields={...inputFields,constructionCompanyId:'UC',branchId:'',maxYears:10}
  await assert.rejects(invoke('save',{...request('uh-missing'),fields:uhFields}),/お施主様契約No/)
  await invoke('register',{...request('uh-registered'),fields:{...uhFields,externalKey:'fictional-uh-key'}})
  await inspectBusinessIntegrity(target)
  await target.doc('constructionCompanies/FC').set({name:'架空任意会社',defaultGroupId:'F',enabled:true})
  const optionalFields={...inputFields,constructionCompanyId:'FC',branchId:'',address:'',foundationInsulation:true,insulationMaterials:''}
  await invoke('register',{...request('optional-fields'),fields:optionalFields})
  await assert.rejects(invoke('save',{...request('optional-key'),fields:{...optionalFields,externalKey:'forbidden-key'}}),/入力できません/)
  await assert.rejects(invoke('register',{...request('required-address','required-address-key'),fields:{...inputFields,externalKey:'required-address-key',address:''}}),/住所/)
  await assert.rejects(invoke('register',{...request('required-material','required-material-key'),fields:{...inputFields,externalKey:'required-material-key',foundationInsulation:true,insulationMaterials:''}}),/資材/)
  const denied={action:'preview',groupId:'F',companyId:'FC',csv:csv('optional-group-key'),requestId:'optional-bulk'}
  const refused=await propertyBulkImportOperation(target,denied,'key-admin')
  assert.ok(refused.errors.some(e=>/外部キー必須/.test(e.message)))
  await assert.rejects(propertyBulkImportOperation(target,{...denied,action:'commit',confirmed:true,previewHash:refused.previewHash},'key-admin'),/全件/)
  assert.equal((await target.doc('propertyImportReceipts/optional-bulk').get()).exists,false)
})

test('branch codes reserve per company, retain existing property references and preserve omitted code',async()=>{
  const codeDb=getFirestore(app,'test-branch-codes')
  for(const root of await codeDb.listCollections())await codeDb.recursiveDelete(root)
  await codeDb.doc('staffAccounts/meeting-hs').set({enabled:true,role:'house_solution_administrator'})
  await codeDb.doc('constructionCompanies/meeting-co').set({name:'架空工務店'})
  const codeCall=(action,data)=>propertyPrototypeOperation(auth,codeDb,{action,...data},'meeting-hs')
  const first=await codeCall('saveBranch',{id:'code-a',name:'架空コード支店',constructionCompanyId:'meeting-co',branchCode:'0001'})
  assert.equal(first.id,'code-a')
  await assert.rejects(codeCall('saveBranch',{id:'code-b',name:'別支店',constructionCompanyId:'meeting-co',branchCode:'0001'}),e=>e.code==='already-exists')
  await codeCall('saveBranch',{id:'code-a',name:'架空コード支店改名',constructionCompanyId:'meeting-co'})
  assert.equal((await codeDb.doc('companyBranches/code-a').get()).data().branchCode,'0001')
  await codeCall('saveBranch',{id:'code-a',name:'架空コード支店',constructionCompanyId:'meeting-co',branchCode:'0002'})
  await codeCall('saveBranch',{id:'code-b',name:'別支店',constructionCompanyId:'meeting-co',branchCode:'0001'})
  const legacyFields={...fields};delete legacyFields.address
  await assert.rejects(call('save',command('old-address-client',0,{fields:legacyFields})),/住所|入力/)
})

test('Excel CSV dates preview and persist as ISO while source dates and atomic rejection stay intact',async()=>{
  const target=getFirestore(app,'test-import-excel-dates')
  for(const root of await target.listCollections())await target.recursiveDelete(root)
  await target.doc('staffAccounts/excel-admin').set({enabled:true,role:'house_solution_administrator'})
  await target.doc('warrantyGroups/U').set({name:'UH',prefix:'',fiscalStartMonth:1,enabled:true,externalKeyRequired:true,addressRequired:false,insulationMaterialsRequired:false})
  await target.doc('constructionCompanies/C').set({name:'架空Excel検証会社',defaultGroupId:'U',enabled:true})
  await propertyPrototypeOperation(auth,target,{action:'saveBranch',id:'B',name:'架空支店',constructionCompanyId:'C',branchCode:'0001'},'excel-admin')
  const dates=[['2018/4/1','2018/6/30'],['2018/9/1','2018/11/30'],['2018/10/1','2018/12/30']]
  const makeCsv=values=>CSV_TEMPLATE_HEADERS.join(',')+'\r\n'+values.map(([application,handover],index)=>{
    const row={'外部キー':`0001-202690${index+1}`,'支店コード':'0001','物件名':`架空Excel物件${index+1}`,'申込日':application,'引渡日':handover,'最長保証期間':'10','建築面積':'200','断熱材あり':'あり'}
    return CSV_TEMPLATE_HEADERS.map(header=>row[header.replace('（＊）','')]??'').join(',')
  }).join('\r\n')
  const base={groupId:'U',companyId:'C',format:'common',requestId:'excel-dates',csv:makeCsv(dates)}
  const bad={...base,requestId:'excel-invalid',csv:makeCsv([dates[0],['2018/9/1','2018/11/31']])}
  const rejected=await propertyBulkImportOperation(target,{...bad,action:'preview'},'excel-admin')
  assert.ok(rejected.errors.some(error=>error.line===3 && /引渡日/.test(error.message)))
  await assert.rejects(propertyBulkImportOperation(target,{...bad,action:'commit',confirmed:true,previewHash:rejected.previewHash},'excel-admin'),error=>error.details?.safeToDiscard===true)
  for(const root of ['propertyWarranties','propertyImportSources','propertyImportReceipts','externalKeyReservations','warrantyCounters'])assert.equal((await target.collection(root).get()).size,0)
  const unknown={...base,requestId:'excel-unknown-branch',csv:base.csv.replaceAll(',0001,',',0999,')}
  const unknownPreview=await propertyBulkImportOperation(target,{...unknown,action:'preview'},'excel-admin')
  assert.equal(unknownPreview.errors.length,3)
  assert.ok(unknownPreview.errors.every(error=>error.field==='支店コード'))
  assert.equal(unknownPreview.rows[0].applicationDate,'2018-04-01')
  await assert.rejects(propertyBulkImportOperation(target,{...unknown,action:'commit',confirmed:true,previewHash:unknownPreview.previewHash},'excel-admin'),error=>error.details?.safeToDiscard===true)
  for(const root of ['propertyWarranties','propertyImportSources','propertyImportReceipts','externalKeyReservations','warrantyCounters'])assert.equal((await target.collection(root).get()).size,0)
  const preview=await propertyBulkImportOperation(target,{...base,action:'preview'},'excel-admin')
  assert.deepEqual(preview.errors,[])
  assert.deepEqual(preview.rows.map(row=>[row.applicationDate,row.handoverDate]),[['2018-04-01','2018-06-30'],['2018-09-01','2018-11-30'],['2018-10-01','2018-12-30']])
  const confirm={...base,action:'commit',confirmed:true,previewHash:preview.previewHash}
  const result=await propertyBulkImportOperation(target,confirm,'excel-admin')
  assert.equal(result.count,3)
  for(let index=0;index<result.ids.length;index++) {
    const property=(await target.doc('propertyWarranties/'+result.ids[index]).get()).data()
    const source=(await target.doc('propertyImportSources/'+result.ids[index]).get()).data()
    assert.equal(property.applicationDate,preview.rows[index].applicationDate)
    assert.equal(property.handoverDate,preview.rows[index].handoverDate)
    assert.equal(property.startDate,property.handoverDate)
    assert.equal(property.fiscalYear,2018)
    assert.equal(property.address,'');assert.equal(property.insulationMaterials,'')
    assert.equal(source.values['申込日'],dates[index][0]);assert.equal(source.values['引渡日'],dates[index][1])
  }
  assert.equal((await target.doc('warrantyCounters/U_2018').get()).data().lastValue,3)
  assert.equal((await propertyBulkImportOperation(target,confirm,'excel-admin')).replayed,true)
  await inspectBusinessIntegrity(target)
})

test('real Firestore bulk transaction commits 279 rows atomically and recovery verifies identities',async()=>{
  const imported=getFirestore(app,'test-import-volume')
  for(const root of await imported.listCollections())await imported.recursiveDelete(root)
  await imported.doc('staffAccounts/import-admin').set({enabled:true,role:'house_solution_administrator'})
  await imported.doc('warrantyGroups/G').set({name:'架空取込み',prefix:'QA',fiscalStartMonth:1,enabled:true,externalKeyRequired:true,addressRequired:false,insulationMaterialsRequired:false})
  await imported.doc('constructionCompanies/C').set({name:'架空工務店',defaultGroupId:'G',enabled:true})
  await propertyPrototypeOperation(auth,imported,{action:'saveBranch',id:'B',name:'架空支店',constructionCompanyId:'C',branchCode:'0001'},'import-admin')
  const makeCsv=(count,offset=0)=>CSV_TEMPLATE_HEADERS.join(',')+'\r\n'+Array.from({length:count},(_,i)=>{
    const row={'外部キー':`fictional-${offset+i}`,'支店コード':'0001','物件名':`架空物件${i}`,'申込日':'2026-10-01','引渡日':'2026-10-01','最長保証期間':'20','現在保証年数':'10','建築面積':'100','断熱材あり':'あり'}
    return CSV_TEMPLATE_HEADERS.map(key=>row[key.replace('（＊）','')]??'').join(',')
  }).join('\r\n')
  const input={groupId:'G',companyId:'C',format:'common',csv:makeCsv(279),requestId:'volume-279'}
  const preview=await propertyBulkImportOperation(imported,{...input,action:'preview'},'import-admin')
  assert.equal(preview.count,279);assert.deepEqual(preview.errors,[])
  assert.equal((await imported.collection('propertyWarranties').get()).size,0)
  const confirm={...input,action:'commit',confirmed:true,previewHash:preview.previewHash}
  const result=await propertyBulkImportOperation(imported,confirm,'import-admin')
  assert.equal(result.count,279);assert.equal((await imported.collection('propertyWarranties').get()).size,279)
  const row=(await imported.doc('propertyWarranties/'+result.ids[0]).get()).data()
  assert.equal(row.address,'');assert.equal(row.insulationMaterials,'');assert.equal(row.status,'active')
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

test('warranty alert list excludes capped periods and preserves notification and cancellation filters',async()=>{
  const prefix='notice-cap-'
  const cases=[
    ['ten-twenty',10,20,'active',false,true],
    ['twenty-twenty',20,20,'active',false,false],
    ['twenty-thirty',20,30,'active',false,true],
    ['thirty-thirty',30,30,'active',false,false],
    ['cancelled',10,20,'cancelled',false,false],
    ['notified',10,20,'active',true,false],
  ]
  const keys=cases.map(([name])=>prefix+name)
  const snapshots=[]
  try {
    for(const [name,years,maxYears,status,warrantyNotified] of cases){
      const periods=coveragePeriods('1990-01-01',years)
      const data={name:'架空案内物件',constructionCompanyId:'meeting-co',branchId:'meeting-branch',years,maxYears,status,warrantyNotified,handoverDate:'1990-01-01',expiryDate:periods.at(-1).expiryDate,updatedAt:new Date(2000,0,1)}
      await db.doc('propertyWarranties/'+prefix+name).set(data)
      snapshots.push((await db.doc('propertyWarranties/'+prefix+name).get()).data())
    }
    const result=await call('list',{filter:{alertKind:'warranty',notification:'pending'}})
    assert.deepEqual(result.rows.filter(r=>keys.includes(r.id)).map(r=>r.id).sort(),cases.filter(c=>c[5]).map(c=>prefix+c[0]).sort())
    for(const [i,key] of keys.entries())assert.deepEqual((await db.doc('propertyWarranties/'+key).get()).data(),snapshots[i])
  } finally {for(const key of keys)await db.doc('propertyWarranties/'+key).delete()}
})

test('property list finds an older exact number, rejects partial numbers and keeps company/branch scope',async()=>{
  const keys=Array.from({length:25},(_,i)=>`exact-search-${i}`)
  try {
    for(const [i,key] of keys.entries()) await db.doc(`propertyWarranties/${key}`).set({name:'架空検索物件',warrantyNumber:`QA-26-${i}`,constructionCompanyId:'meeting-co',branchId:'meeting-branch',updatedAt:new Date(2000,0,i+1),status:'active'})
    assert.equal((await call('propertyList')).limited,true)
    assert.ok((await call('propertyList')).rows.length<=20)
    const result=await call('propertyList',{filter:{warrantyNumber:' QA-26-0 '}})
    assert.deepEqual(result.rows.map(r=>r.id),[keys[0]])
    assert.equal((await call('propertyList',{filter:{warrantyNumber:'26-0'}})).rows.length,0)
    assert.equal((await call('propertyList',{filter:{warrantyNumber:'QA-26-0'}},'meeting-head')).rows.length,1)
    assert.equal((await call('propertyList',{filter:{warrantyNumber:'QA-26-0'}},'meeting-branch-user')).rows.length,1)
    for(const uid of ['meeting-otherbranch','meeting-otherco']) assert.equal((await call('propertyList',{filter:{warrantyNumber:'QA-26-0'}},uid)).rows.length,0)
    await assert.rejects(call('propertyList',{filter:{search:'架空'}}),e=>e.code==='invalid-argument')
  } finally { for(const key of keys) await db.doc(`propertyWarranties/${key}`).delete() }
})

test('historical initial report uses selected period, leaves unselected untouched and reverses exactly',async()=>{
  const key='initial-past-period',untouched='initial-past-unselected'
  const pastFields={...fields,applicationDate:'2016-10-01',handoverDate:'2016-10-06'}
  for(const id of [key,untouched]) await call('register',command(id,0,{fields:pastFields}))
  const original=await call('detail',{id:key})
  const snapshot=(await db.doc('propertyWarranties/'+untouched).get()).data()
  const items=(await call('list',{filter:{reportMonth:'2023-10'}})).rows
  const candidate=items.find(r=>r.id===key)
  assert.equal(candidate.reportTarget.startDate,'2021-10-06')
  assert.equal(candidate.reportTarget.expiryDate,'2026-10-05')
  assert.equal((await call('detail',{id:key})).insuranceStartDate,'2016-10-06')
  await assert.rejects(propertyPrototypeOperation(auth,db,{action:'report',...command(key,1),month:'2023-10',reportTarget:{...candidate.reportTarget,startDate:'2016-10-06'}},'meeting-hs'),/期間/)
  const request=command(key,1,{month:'2023-10'})
  await call('report',request);await call('report',request)
  let row=await call('detail',{id:key})
  assert.equal(row.insuranceStartDate,'2021-10-06');assert.equal(row.insuranceExpiryDate,'2026-10-05')
  assert.equal(row.insuranceRenewalMonth,'202610');assert.equal(row.insuranceEverRenewed,false)
  assert.equal(row.insuranceEvents.filter(e=>e.kind==='report').length,1)
  assert.equal(row.insuranceEvents[0].warrantyPeriodId,'initial')
  assert.equal(row.insuranceEvents[0].reportKind,'new')
  assert.deepEqual((await db.doc('propertyWarranties/'+untouched).get()).data(),snapshot)
  await call('undoReport',command(key,row.revision,{reason:'架空の訂正'}))
  row=await call('detail',{id:key})
  for(const field of ['insuranceStartDate','insuranceExpiryDate','insuranceRenewalMonth','insuranceReported']) assert.equal(row[field],original[field])
  assert.ok((await call('list',{filter:{reportMonth:'2026-10'}})).rows.some(r=>r.id===key))
  assert.ok(!(await call('list',{filter:{reportMonth:'2026-11'}})).rows.some(r=>r.id===key))
})

test('interval-linked reports and bills enforce reversal, preserve history and unlock handover',async()=>{
  const key='lifecycle-101'
  await call('register',command(key,0,{fields:{...fields,maxYears:30}}))
  const get=()=>call('detail',{id:key})
  const act=async(action,extra={})=>{const row=await get();await call(action,command(key,row.revision,extra));return get()}
  let row=await get()
  const initial={warrantyPeriodId:'initial',startDate:row.startDate,expiryDate:row.expiryDate}
  await assert.rejects(call('bill',command(key,row.revision,initial),'meeting-branch-user'),e=>e.code==='permission-denied')
  await assert.rejects(call('bill',command(key,row.revision,{...initial,expiryDate:'2046-09-30'})),/期間/)
  row=await act('bill',initial)
  await assert.rejects(act('save',{fields:{...fields,maxYears:30,handoverDate:'2026-10-06'},confirmDates:true}),/請求済み/)
  await assert.rejects(propertyPrototypeOperation(auth,db,{action:'report',...command(key,row.revision),month:'2026-10'},'meeting-hs'),/区間/)
  row=await act('report',{month:'2026-10'})
  assert.equal(row.insuranceEvents.at(-1).warrantyPeriodId,'initial')
  row=await act('extend')
  const extensionId=row.history.at(-1).requestId
  const extension={warrantyPeriodId:extensionId,startDate:row.periods[1].startDate,expiryDate:row.periods[1].expiryDate}
  row=await act('bill',extension)
  await assert.rejects(act('undoExtend',{targetRequestId:extensionId,reason:'誤延長'}),/請求済み/)
  row=await act('report',{month:'2031-09'})
  assert.equal(row.insuranceEvents.at(-1).warrantyPeriodId,'initial')
  row=await act('report',{month:'2036-09'})
  assert.equal(row.insuranceEvents.at(-1).warrantyPeriodId,extensionId)
  row=await act('undoBill',{...extension,reason:'請求訂正済み'})
  await assert.rejects(act('undoExtend',{targetRequestId:extensionId,reason:'誤延長'}),/保険報告/)
  await assert.rejects(propertyPrototypeOperation(auth,db,{action:'undoReport',...command(key,row.revision),targetReportId:row.insuranceEvents[0].requestId},'meeting-hs'),/直近/)
  await assert.rejects(act('cancel',{reason:'確認なし',confirmCancellation:false}),/影響/)
  row=await act('cancel',{reason:'外部訂正はHS'})
  assert.equal(row.insuranceReported,true)
  assert.equal(row.billingItems.find(p=>p.id==='initial').state,'billed')
  await assert.rejects(act('undoBill',{...initial,reason:'取消中'}),/本登録/)
  row=await act('restore',{reason:'確認して復元'})
  row=await act('undoReport')
  assert.equal(row.insuranceExpiryDate,'2036-09-30')
  row=await act('undoExtend',{targetRequestId:extensionId,reason:'保険と請求を訂正済み'})
  assert.equal(row.years,10)
  await assert.rejects(act('save',{fields:{...fields,maxYears:30,handoverDate:'2026-10-06'},confirmDates:true}),/報告済み/)
  row=await act('undoReport')
  row=await act('undoReport')
  assert.equal(row.insuranceReported,false)
  await assert.rejects(act('save',{fields:{...fields,maxYears:30,handoverDate:'2026-10-06'},confirmDates:true}),/請求済み/)
  row=await act('undoBill',{...initial,reason:'初回請求も訂正'})
  row=await act('notify',{notified:true})
  row=await act('save',{fields:{...fields,maxYears:30,handoverDate:'2026-10-06'},confirmDates:true})
  assert.equal(row.expiryDate,'2036-10-05');assert.equal(row.insuranceExpiryDate,'2031-10-05');assert.equal(row.warrantyNotified,false)
  assert.equal(row.insuranceEvents.filter(e=>e.kind==='report').length,3)
  assert.equal(row.insuranceEvents.filter(e=>e.kind==='undoReport').length,3)
  assert.equal(row.billingItems.find(p=>p.id==='initial').expiryDate,'2036-10-05')
  row=await act('extend')
  const newId=row.history.at(-1).requestId
  assert.notEqual(newId,extensionId);assert.equal(row.billingItems.find(p=>p.id===newId).state,'pending')
  const initialItems=(await call('list',{filter:{billingMonth:row.applicationDate.slice(0,7)}})).rows.filter(r=>r.id===key)
  assert.equal(initialItems.length,1);assert.equal(initialItems[0].billingEventId,'initial')
  const items=(await call('list',{filter:{billingMonth:'2036-10'}})).rows.filter(r=>r.id===key)
  assert.equal(items.length,1);assert.equal(items[0].billingEventId,newId);assert.equal(items[0].billingStartDate,'2036-10-06')
})

test('legacy billing is unknown and missing insurance history cannot silently unlock handover',async()=>{
  const key='legacy-lifecycle-101'
  await call('register',command(key,0))
  let row=await call('detail',{id:key})
  const legacy={...row,insuranceEverRenewed:true,insuranceReported:false}
  delete legacy.insuranceEvents;delete legacy.insuranceHistoryIncomplete;delete legacy.billingItems;delete legacy.id
  await db.doc(`propertyWarranties/${key}`).set(legacy)
  await assert.rejects(call('save',command(key,1,{fields:{...fields,handoverDate:'2026-10-06'},confirmDates:true})),/記録が不足/)
  await call('confirmUnbilled',command(key,1,{warrantyPeriodId:'initial',startDate:row.startDate,expiryDate:row.expiryDate}))
  row=await call('detail',{id:key})
  assert.equal(row.billingItems[0].state,'pending')
  await assert.rejects(call('save',command(key,row.revision,{fields:{...fields,handoverDate:'2026-10-06'},confirmDates:true})),/記録が不足/)
})
test('draft, concurrent registration, replay, boundaries, permanent renewal, correction, cancellation and restoration',async()=>{
  await call('save',command('meeting-property',0,{fields:{...fields,handoverDate:''}}),'meeting-branch-user')
  let row=await call('detail',{id:'meeting-property'})
  assert.equal(row.status,'draft');assert.equal(row.warrantyNumber,undefined)
  const register=command('meeting-property',1)
  await Promise.all([call('register',register,'meeting-head'),call('register',register,'meeting-head')])
  row=await call('detail',{id:'meeting-property'})
  assert.equal(row.revision,2);assert.equal(row.groupId,'HSC');assert.equal(row.history.filter(h=>h.kind==='register').length,1)
  const number=row.warrantyNumber
  await assert.rejects(call('detail',{id:row.id},'meeting-otherbranch'),e=>e.code==='permission-denied')
  await assert.rejects(call('detail',{id:row.id},'meeting-otherco'),e=>e.code==='permission-denied')
  assert.equal((await call('list',{},'meeting-otherbranch')).rows.length,0)
  await saveCompany('meeting-co','UH')
  await call('extend',command(row.id,2),'meeting-branch-user')
  row=await call('detail',{id:row.id});assert.equal(row.warrantyNumber,number);assert.equal(row.groupId,'HSC');assert.equal(row.years,20)
  await assert.rejects(call('extend',command(row.id,3)),e=>e.code==='failed-precondition')
  await call('save',command(row.id,3,{fields:{...fields,maxYears:30}}))
  await call('extend',command(row.id,4))
  await assert.rejects(call('save',command(row.id,5)),e=>e.code==='failed-precondition' && /既に延長した期間/.test(e.message))
  const unchanged=await call('detail',{id:row.id});assert.equal(unchanged.years,30);assert.equal(unchanged.maxYears,30);assert.equal(unchanged.revision,5)
  await assert.rejects(call('save',command(row.id,5,{fields:{...fields,maxYears:30,handoverDate:'2026-11-01'}})),e=>e.code==='failed-precondition')
  await assert.rejects(call('save',command(row.id,5,{fields:{...fields,maxYears:30,handoverDate:'2026-11-01'},confirmDates:true})),/延長/)
  await call('save',command(row.id,5,{fields:{...fields,maxYears:30,notes:'訂正可能な備考'}}))
  row=await call('detail',{id:row.id});assert.equal(row.expiryDate,'2056-09-30');assert.equal(row.history.at(-1).before.expiryDate,'2056-09-30')
  await call('cancel',command(row.id,6,{reason:'入力誤り'}),'meeting-head')
  await assert.rejects(call('restore',command(row.id,7,{reason:'訂正'}),'meeting-head'),e=>e.code==='permission-denied')
  await call('restore',command(row.id,7,{reason:'確認して復元'}))
  row=await call('detail',{id:row.id});assert.equal(row.warrantyNumber,number);assert.equal(row.expiryDate,'2056-09-30')
  await call('register',command('meeting-new',0,{fields:{...fields,maxYears:10,externalKey:'fictional-uh-new'}}))
  assert.equal((await call('detail',{id:'meeting-new'})).groupId,'UH')
  await db.doc('constructionCompanyAccounts/meeting-head').update({enabled:false})
  await assert.rejects(call('list',{},'meeting-head'),e=>e.code==='permission-denied')
})
test('different concurrent properties receive unique consecutive numbers',async()=>{
  await Promise.all(Array.from({length:5},(_,i)=>call('register',command(`meeting-concurrent-${i}`,0,{fields:{...fields,maxYears:10,externalKey:`fictional-uh-concurrent-${i}`}}))))
  const all=(await call('list',{filter:{companyId:'meeting-co'}})).rows
  const nums=all.map(r=>r.warrantyNumber).filter(Boolean)
  assert.equal(new Set(nums).size,nums.length)
  assert.equal((await db.doc('warrantyCounters/UH_2026').get()).data().lastValue,6)
})
test('handover is mandatory for every group, draft retry succeeds and collisions remain rejected',async()=>{
  for(const group of ['HSC','SHS','UH']){
    await saveCompany('meeting-co',group)
    const groupFields={...fields,maxYears:group==='UH'?10:20,...(group==='UH'?{externalKey:'fictional-uh-required'}:{})}
    const key=`required-${group}`, req=command(key,0,{fields:{...groupFields,handoverDate:''}})
    await assert.rejects(call('register',req))
    assert.equal((await db.doc(`propertyWarranties/${key}`).get()).exists,false)
    req.fields={...groupFields,buildingArea:''}
    await assert.rejects(call('register',req))
    req.fields={...groupFields,buildingArea:123.45,postalCode:''}
    await call('register',req)
    const row=await call('detail',{id:key})
    assert.equal(row.buildingArea,123.45);assert.equal(row.insuranceExpiryDate,'2031-09-30')
    assert.equal(row.insuranceRenewalMonth,'203109');assert.equal(row.insuranceReported,false)
  }
  await saveCompany('meeting-co','HSC')
  await call('register',command('meeting-collision-source',0))
  const counterRef=db.doc('warrantyCounters/HSC_2026'),counter=(await counterRef.get()).data()
  await counterRef.update({lastValue:counter.lastValue-1})
  await assert.rejects(call('register',command('meeting-collision',0)),e=>e.code==='failed-precondition')
  assert.equal((await db.doc('propertyWarranties/meeting-collision').get()).exists,false)
  await counterRef.set(counter)
})

test('application date editable before registration, drives fiscal year, and is immutable afterwards',async()=>{
  await saveCompany('meeting-co','SHS')
  const dated={...fields,applicationDate:'2026-04-01',handoverDate:'2026-09-30'}
  await call('save',command('meeting-backdate',0,{fields:dated}))
  const corrected={...dated,applicationDate:'2026-03-31'}
  await call('save',command('meeting-backdate',1,{fields:corrected}))
  assert.equal((await call('detail',{id:'meeting-backdate'})).applicationDate,'2026-03-31')
  await call('register',command('meeting-backdate',2,{fields:corrected}))
  let row=await call('detail',{id:'meeting-backdate'})
  assert.equal(row.fiscalYear,2025);assert.match(row.warrantyNumber,/^SHS-25-/)
  assert.equal(row.applicationDate,'2026-03-31')
  const number=row.warrantyNumber
  await assert.rejects(call('save',command(row.id,3,{fields:dated})),e=>e.code==='failed-precondition')
  await assert.rejects(call('register',command('meeting-no-application',0,{fields:{...dated,applicationDate:''}})))
  const legacyClient={...corrected};delete legacyClient.applicationDate
  await call('save',command(row.id,3,{fields:legacyClient}))
  row=await call('detail',{id:row.id});assert.equal(row.applicationDate,'2026-03-31');assert.equal(row.warrantyNumber,number)
  const report=await call('list',{filter:{from:'2026-09-01',to:'2026-09-30'}})
  assert.ok(report.rows.some(r=>r.id===row.id))
  assert.ok(!report.rows.some(r=>r.id==='meeting-new'))
  await call('cancel',command(row.id,4,{reason:'架空確認'}))
  assert.ok(!(await call('list',{filter:{from:'2026-09-01',to:'2026-09-30'}})).rows.some(r=>r.id===row.id))
  assert.ok((await call('list',{filter:{from:'2026-09-01',to:'2026-09-30',includeCancelled:true}})).rows.some(r=>r.id===row.id))
})

test('group identity locked before numbering, disable blocks new use but retains existing coverage',async()=>{
  const group={name:'架空検証グループ',prefix:'TEST-',fiscalStartMonth:1,enabled:true}
  const {id:groupId}=await call('saveGroup',group)
  await assert.rejects(call('saveGroup',{...group,id:groupId,prefix:'OTHER-'}),e=>e.code==='failed-precondition')
  await assert.rejects(call('saveGroup',{...group,id:groupId,fiscalStartMonth:4}),e=>e.code==='failed-precondition')
  await saveCompany('meeting-co',groupId)
  await call('register',command('meeting-disabled-group-existing',0))
  const original=await call('detail',{id:'meeting-disabled-group-existing'})
  await assert.rejects(call('saveGroup',{...group,id:groupId,enabled:false},'meeting-branch-user'),e=>e.code==='permission-denied')
  await call('saveGroup',{...group,id:groupId,enabled:false})
  await assert.rejects(call('register',command('meeting-disabled-group-new',0)),e=>e.code==='failed-precondition')
  assert.equal((await db.doc('propertyWarranties/meeting-disabled-group-new').get()).exists,false)
  await assert.rejects(call('saveBranch',{name:'架空追加支店',constructionCompanyId:'meeting-co',groupId}),e=>e.code==='invalid-argument')
  await assert.rejects(call('saveCompany',{name:'架空追加会社',defaultGroupId:groupId,address:{postalCode:'1000001',prefecture:'東京都',municipality:'千代田区',streetTownAndNumber:'1'}}),e=>e.code==='failed-precondition')
  await call('saveBranch',{id:'meeting-branch',name:'架空支店訂正',constructionCompanyId:'meeting-co'})
  await call('extend',command(original.id,1))
  const extended=await call('detail',{id:original.id})
  assert.equal(extended.years,20);assert.equal(extended.warrantyNumber,original.warrantyNumber)
  assert.ok((await call('catalog')).groups.some(g=>g.id===groupId && g.enabled===false))
  await assert.rejects(call('saveGroup',{...group,name:'重複グループ'}),e=>e.code==='already-exists')
  await call('saveGroup',{...group,id:groupId,enabled:true})
  await call('register',command('meeting-reenabled-group',0))
  assert.match((await call('detail',{id:'meeting-reenabled-group'})).warrantyNumber,/-002$/)
})


test('company and branch disable stop only new registrations; reenable preserves branch-local state',async()=>{
  const co='hierarchy-co',branch='hierarchy-branch',other='hierarchy-other'
  await saveCompany(co,'HSC')
  await call('saveBranch',{id:branch,name:'個別停止支店',constructionCompanyId:co})
  await call('saveBranch',{id:other,name:'継続支店',constructionCompanyId:co})
  const commandFor=(key,revision=0,branchId=branch)=>command(key,revision,{fields:{...fields,constructionCompanyId:co,branchId}})
  await call('register',commandFor('hierarchy-existing'))
  const original=await call('detail',{id:'hierarchy-existing'})
  await call('save',commandFor('hierarchy-draft'))
  await call('saveBranch',{id:branch,name:'個別停止支店',constructionCompanyId:co,enabled:false})
  await assert.rejects(call('register',commandFor('hierarchy-branch-blocked')),e=>e.code==='failed-precondition')
  await assert.rejects(call('save',commandFor('hierarchy-draft-blocked')),e=>e.code==='failed-precondition')
  await assert.rejects(call('register',commandFor('hierarchy-draft',1)),e=>e.code==='failed-precondition')
  await call('save',commandFor('hierarchy-draft',1)) // Preserve an existing draft without issuing coverage.
  await call('register',commandFor('hierarchy-head-office',0,''))
  await call('register',commandFor('hierarchy-other-branch',0,other))
  await saveCompany(co,'HSC',false)
  await assert.rejects(call('register',commandFor('hierarchy-parent-blocked',0,other)),e=>e.code==='failed-precondition')
  await assert.rejects(call('register',commandFor('hierarchy-parent-head-blocked',0,'')),e=>e.code==='failed-precondition')
  await call('save',commandFor(original.id,1))
  await call('extend',commandFor(original.id,2))
  const extended=await call('detail',{id:original.id})
  assert.equal(extended.groupId,original.groupId)
  assert.equal(extended.warrantyNumber,original.warrantyNumber)
  assert.equal(extended.years,20)
  assert.ok((await call('list',{filter:{from:fields.handoverDate,to:fields.handoverDate}})).rows.some(r=>r.id===original.id))
  await saveCompany(co,'SHS',true)
  assert.equal((await db.doc(`companyBranches/${branch}`).get()).data().enabled,false)
  assert.equal((await db.doc(`companyBranches/${other}`).get()).data().enabled,true)
  await assert.rejects(call('register',commandFor('hierarchy-still-disabled')),e=>e.code==='failed-precondition')
  await call('register',commandFor('hierarchy-new-group',0,other))
  assert.equal((await call('detail',{id:'hierarchy-new-group'})).groupId,'SHS')
  assert.equal((await call('detail',{id:original.id})).groupId,'HSC')
  await call('saveBranch',{id:branch,name:'再開支店',constructionCompanyId:co,enabled:true})
  await call('register',commandFor('hierarchy-branch-reenabled'))
  assert.equal((await call('detail',{id:'hierarchy-branch-reenabled'})).groupId,'SHS')
  await assert.rejects(call('saveCompany',{id:co,name:'不正',defaultGroupId:'HSC',address:companyAddress,enabled:'false'}),e=>e.code==='invalid-argument')
  await assert.rejects(call('saveBranch',{id:branch,name:'不正',constructionCompanyId:co,enabled:0}),e=>e.code==='invalid-argument')
  await assert.rejects(call('saveBranch',{id:branch,name:'独自グループ不可',constructionCompanyId:co,groupId:'UH'}),e=>e.code==='invalid-argument')
  assert.equal((await db.doc(`companyBranches/${branch}`).get()).data().groupId,undefined)
})

test('hierarchy catalog filters before pagination and never changes company-user scope',async()=>{
  const {id:groupId}=await call('saveGroup',{name:'階層確認グループ',prefix:'HIER-',fiscalStartMonth:1})
  const co='hierarchy-old-co', branch='hierarchy-old-branch'
  await saveCompany(co,groupId)
  await call('saveBranch',{id:branch,name:'古い対象支店',constructionCompanyId:co})
  const oldDate=new Date('2020-01-01T00:00:00Z')
  await db.doc(`constructionCompanies/${co}`).update({updatedAt:oldDate})
  await db.doc(`companyBranches/${branch}`).update({updatedAt:oldDate})
  for(let i=0;i<23;i++){
    await saveCompany(`hierarchy-recent-${i}`,'HSC')
    await call('saveBranch',{id:`hierarchy-recent-branch-${i}`,name:`別会社支店${i}`,constructionCompanyId:`hierarchy-recent-${i}`})
  }
  const defaults=await call('catalog')
  assert.equal(defaults.companies.length,20)
  assert.ok(!defaults.companies.some(r=>r.id===co))
  const selected=await call('catalog',{groupId,companyId:co})
  assert.deepEqual(selected.companies.map(r=>r.id),[co])
  assert.deepEqual(selected.branches.map(r=>r.id),[branch])
  for(let i=0;i<22;i++)await call('saveBranch',{id:`hierarchy-child-${i}`,name:`対象支店${i}`,constructionCompanyId:co})
  assert.equal((await call('catalog',{groupId,companyId:co})).branches.length,23)
  assert.equal((await call('catalog',{groupId,companyId:co,search:'古い'})).branches.length,1)
  await assert.rejects(call('catalog',{groupId,companyId:co},'meeting-branch-user'),e=>e.code==='permission-denied')
  const companyView=await call('catalog',{},'meeting-branch-user')
  assert.ok(companyView.companies.every(r=>r.id==='meeting-co'))
  assert.ok(companyView.branches.every(r=>r.id==='meeting-branch'))
})

test('annual counters reset at fiscal boundary and old global counters require migration',async()=>{
  const {id:g}=await call('saveGroup',{name:'年度検証',prefix:'YEAR-',fiscalStartMonth:4})
  await saveCompany('meeting-co',g)
  for(const [key,date,num] of [['march','2026-03-31','YEAR-25-001'],['april','2026-04-01','YEAR-26-001'],['next','2026-04-02','YEAR-26-002']]){
    await call('register',command(`year-${key}`,0,{fields:{...fields,applicationDate:date}}))
    assert.equal((await call('detail',{id:`year-${key}`})).warrantyNumber,num)
  }
  await db.doc(`warrantyCounters/${g}`).set({lastValue:999})
  await assert.rejects(call('register',command('year-old',0,{fields:{...fields,applicationDate:'2027-04-01'}})),/年度別移行/)
  await db.doc(`warrantyCounters/${g}`).delete()
})

test('report/export separation, renewal, replay, undo snapshot, sticky handover lock and notification reset',async()=>{
  await saveCompany('meeting-co','HSC')
  const key='insurance-flow'
  await call('register',command(key,0))
  let row=await call('detail',{id:key})
  assert.equal(row.insuranceReported,false)
  assert.ok((await call('list',{filter:{reportMonth:'2026-10'}})).rows.some(r=>r.id===key && r.reportKind==='new'))
  await assert.rejects(call('report',{...command(key,1),month:'2026-10'},'meeting-branch-user'),e=>e.code==='permission-denied')
  const first={...command(key,1),month:'2026-10'}
  await call('report',first);await call('report',first)
  row=await call('detail',{id:key});assert.equal(row.revision,2);assert.equal(row.insuranceExpiryDate,'2031-09-30')
  assert.equal(row.insuranceReported,true)
  await assert.rejects(call('save',command(key,2,{fields:{...fields,handoverDate:'2026-10-02'},confirmDates:true})),/報告済み/)
  await call('undoReport',command(key,2))
  row=await call('detail',{id:key});assert.equal(row.insuranceReported,false);assert.equal(row.insuranceExpiryDate,'2031-09-30')
  await call('report',{...command(key,3),month:'2026-10'})
  const renew={...command(key,4),month:'2031-09'}
  await Promise.all([call('report',renew),call('report',renew)])
  row=await call('detail',{id:key});assert.equal(row.insuranceExpiryDate,'2036-09-30');assert.equal(row.insuranceStartDate,'2031-10-01');assert.equal(row.insuranceEverRenewed,true)
  await call('undoReport',command(key,5))
  row=await call('detail',{id:key});assert.equal(row.insuranceExpiryDate,'2031-09-30');assert.equal(row.insuranceRenewalMonth,'203109');assert.equal(row.insuranceEverRenewed,true)
  await assert.rejects(call('save',command(key,6,{fields:{...fields,handoverDate:'2026-10-02'},confirmDates:true})),/報告済み/)
  await call('notify',{...command(key,6),notified:true})
  await call('extend',command(key,7))
  row=await call('detail',{id:key});assert.equal(row.warrantyNotified,false);assert.equal(row.insuranceExpiryDate,'2031-09-30')
  await call('cancel',command(key,8,{reason:'架空取消'}))
  assert.ok(!(await call('list',{filter:{reportMonth:'2031-09'}})).rows.some(r=>r.id===key))
  await call('restore',command(key,9,{reason:'架空復元'}))
  assert.ok((await call('list',{filter:{reportMonth:'2031-09'}})).rows.some(r=>r.id===key))
  assert.equal((await call('detail',{id:key})).history.some(h=>h.kind==='report'),true)
})

test('same name and address need no confirmation; owner/affiliation/insulation checks preserve saved data',async()=>{
  await saveCompany('meeting-co','HSC')
  await call('register',command('warning-property',0,{confirmWarnings:false}))
  await assert.rejects(call('save',command('warning-property',1,{fields:{...fields,branchId:''}})),/工務店・支店/)
  await assert.rejects(call('save',command('warning-property',1,{fields:{...fields,foundationInsulation:true}})),/使用資材/)
  await call('save',command('warning-property',1,{fields:{...fields,name:'変更後物件名',ownerTelephone:'03-0000-0000'}}))
  const row=await call('detail',{id:'warning-property'})
  assert.equal(row.history.at(-1).before.name,fields.name)
  assert.equal(row.history.at(-1).before.ownerTelephone,'')
  assert.equal((await call('list',{filter:{warrantyNumber:row.warrantyNumber}})).rows.length,1)
  assert.equal((await call('list',{filter:{warrantyNumber:row.warrantyNumber.slice(-3)}})).rows.length,0)
})

test('alert settings are admin-only; branch account creation retains ownership restrictions',async()=>{
  await assert.rejects(call('saveAlertSettings',{settings:{warrantyMonths:1,insuranceMonths:3}},'meeting-branch-user'),e=>e.code==='permission-denied')
  await call('saveAlertSettings',{settings:{warrantyMonths:1,insuranceMonths:3}})
  assert.deepEqual(await call('alertSettings'),{warrantyMonths:1,insuranceMonths:3})
  await assert.rejects(call('saveAlertSettings',{settings:{warrantyMonths:13}}))
  const created=await call('createAccount',{constructionCompanyId:'meeting-co',branchId:'meeting-branch',scope:'branch',displayName:'架空担当',email:'new-branch@example.invalid'})
  const view=await call('list',{},created.uid)
  assert.ok(view.rows.every(r=>r.constructionCompanyId==='meeting-co' && r.branchId==='meeting-branch'))
  await assert.rejects(call('accounts',{},created.uid),e=>e.code==='permission-denied')
  await call('setAccountEnabled',{uid:created.uid,enabled:false})
  await assert.rejects(call('list',{},created.uid),e=>e.code==='permission-denied')
})

test('HTTP Callable preserves account authentication and latest registration payload on retry',async()=>{
  const {initializeApp: webApp,deleteApp:deleteWeb}=await import('firebase/app')
  const {getAuth:webAuth,connectAuthEmulator,signInWithEmailAndPassword}=await import('firebase/auth')
  const {getFunctions,connectFunctionsEmulator,httpsCallable}=await import('firebase/functions')
  const web=webApp({apiKey:'demo-key',projectId:'demo-termite-warranty'},'meeting-http-regression')
  try {
    const login=webAuth(web);connectAuthEmulator(login,`http://${localRuntimeHost(LOCAL_RUNTIME.authPort)}`,{disableWarnings:true})
    const functions=getFunctions(web,'asia-northeast1');connectFunctionsEmulator(functions,LOCAL_RUNTIME.host,LOCAL_RUNTIME.functionsPort)
    const invoke=fixedCallable(functions,'propertyPrototype')
    const bulk=fixedCallable(functions,'propertyBulkImport')
    await assert.rejects(invoke({action:'catalog'}),e=>e.code==='functions/unauthenticated')
    await assert.rejects(bulk({action:'status',requestId:'no-receipt'}),e=>e.code==='functions/unauthenticated')
    await signInWithEmailAndPassword(login,'meeting-callable@example.invalid','Demo-only-password-123')
    assert.deepEqual((await bulk({action:'status',requestId:'no-receipt'})).data,{pending:true})
    const control=getFirestore(app,'test-fixed-control'),runtime=control.doc('recovery/runtime'),marker=db.doc('_recovery/access')
    const original=(await runtime.get()).data()
    try{
      await runtime.update({phase:'recovering'});await marker.update({phase:'recovering'})
      await assert.rejects(bulk({action:'status',requestId:'no-receipt'}),e=>e.code==='functions/failed-precondition')
      await runtime.update({phase:'verification'});await marker.update({phase:'verification'})
      assert.deepEqual((await bulk({action:'status',requestId:'no-receipt'})).data,{pending:true})
      await assert.rejects(bulk({action:'commit',requestId:'no-receipt'}),e=>e.code==='functions/failed-precondition')
      await assert.rejects(httpsCallable(functions,'propertyBulkImport')({action:'status',requestId:'no-receipt',runtimeProtocol:2,runtimeGeneration:0}),e=>e.code==='functions/failed-precondition')
    }finally{await runtime.set(original);await marker.set(original)}
    const payload={action:'register',...command('http-retry',0,{fields:{...fields,buildingArea:''}})}
    await assert.rejects(invoke(payload),e=>e.code==='functions/invalid-argument')
    payload.fields={...fields,buildingArea:88.25}
    await invoke(payload);await invoke(payload)
    const row=(await invoke({action:'detail',id:'http-retry'})).data
    assert.equal(row.revision,1);assert.equal(row.buildingArea,88.25);assert.equal(row.history.filter(h=>h.kind==='register').length,1)
  } finally {await deleteWeb(web)}
})


test('formal registration requires explicit confirmation even with no warnings; rejection does not allocate a number',async()=>{
  const group=(await call('saveGroup',{name:'確認必須検証',prefix:'ACK',fiscalStartMonth:1})).id
  await saveCompany('ack-company',group)
  const data={...fields,name:'確認必須の架空物件',constructionCompanyId:'ack-company',branchId:'',applicationDate:'2026-10-01',handoverDate:'2026-10-01'}
  const req=command('ack-property',0,{fields:data,confirmRegistration:false,confirmWarnings:false})
  for(const value of [false,undefined]){
    await assert.rejects(call('register',{...req,confirmRegistration:value}),/確認チェック/)
    assert.equal((await db.doc('propertyWarranties/ack-property').get()).exists,false)
    assert.equal((await db.doc(`warrantyCounters/${group}_2026`).get()).exists,false)
  }
  await call('register',{...req,confirmRegistration:true})
  const row=await call('detail',{id:req.id})
  assert.equal(row.warrantyNumber,'ACK-26-001')
})

test('company optional postal and branch address round trip, blank legacy branch, invalid postal rejected',async()=>{
  const co=(await call('saveCompany',{name:'住所検証工務店',defaultGroupId:'HSC',address:{...companyAddress,postalCode:''}})).id
  assert.equal((await db.doc(`constructionCompanies/${co}`).get()).data().address.postalCode,'')
  const branch=(await call('saveBranch',{name:'住所検証支店',constructionCompanyId:co,address:{...companyAddress,postalCode:'',buildingName:'架空ビル'}})).id
  assert.equal((await db.doc(`companyBranches/${branch}`).get()).data().address.buildingName,'架空ビル')
  await call('saveBranch',{id:branch,name:'住所検証支店',constructionCompanyId:co,address:{...companyAddress,postalCode:'100-0001'}})
  assert.equal((await db.doc(`companyBranches/${branch}`).get()).data().address.postalCode,'1000001')
  await call('saveBranch',{id:'legacy-address-branch',name:'住所なし旧支店',constructionCompanyId:co})
  assert.equal((await db.doc('companyBranches/legacy-address-branch').get()).data().address.postalCode,'')
  for(const action of ['saveCompany','saveBranch'])await assert.rejects(call(action,{name:'不正郵便番号',defaultGroupId:'HSC',constructionCompanyId:co,address:{...companyAddress,postalCode:'123'}}),/7桁/)
  await assert.rejects(call('saveCompany',{name:'住所欠落',defaultGroupId:'HSC',address:{postalCode:''}}),/住所/)
})

test('legacy trailing dash prefix remains immutable, reserves canonical equivalent and numbers with a single separator',async()=>{
  await db.doc('warrantyGroups/legacy-dash').set({name:'旧接頭辞',prefix:'LEGACY-',fiscalStartMonth:1,enabled:true})
  await call('saveGroup',{id:'legacy-dash',name:'旧接頭辞編集',prefix:'LEGACY',fiscalStartMonth:1})
  assert.equal((await db.doc('warrantyGroups/legacy-dash').get()).data().prefix,'LEGACY-')
  for(const prefix of ['LEGACY','LEGACY-'])await assert.rejects(call('saveGroup',{name:'重複',prefix,fiscalStartMonth:1}),e=>e.code==='already-exists')
  await assert.rejects(call('saveGroup',{id:'legacy-dash',name:'改変',prefix:'OTHER',fiscalStartMonth:1}),e=>e.code==='failed-precondition')
  await saveCompany('legacy-dash-co','legacy-dash')
  await call('register',command('legacy-dash-property',0,{fields:{...fields,constructionCompanyId:'legacy-dash-co',branchId:''}}))
  assert.equal((await call('detail',{id:'legacy-dash-property'})).warrantyNumber,'LEGACY-26-001')
})


test('undoing an already-notified extension restores the pre-extension notice state',async()=>{
  await saveCompany('meeting-co','SHS')
  for(const previousNotified of [false,true]){
    const key=`undo-notified-extension-${previousNotified}`
    await call('register',command(key,0,{fields:{...fields,maxYears:30}}))
    let row=await call('detail',{id:key})
    await call('notify',command(key,row.revision,{notified:previousNotified}))
    row=await call('detail',{id:key})
    const original=row
    await call('extend',command(key,row.revision))
    row=await call('detail',{id:key})
    const targetRequestId=row.history.at(-1).requestId
    assert.equal(row.warrantyNotified,false)
    await call('notify',command(key,row.revision,{notified:true}))
    row=await call('detail',{id:key})
    assert.equal(row.warrantyNotified,true)
    await assert.rejects(call('undoExtend',command(key,row.revision,{targetRequestId,reason:'案内後の誤延長訂正'})),/未案内/)
    await call('notify',command(key,row.revision,{notified:false}))
    row=await call('detail',{id:key})
    await call('undoExtend',command(key,row.revision,{targetRequestId,reason:'案内取消後の誤延長訂正'}))
    row=await call('detail',{id:key})
    assert.equal(row.warrantyNotified,previousNotified)
    for(const field of ['years','expiryDate','warrantyNumber'])assert.equal(row[field],original[field])
    assert.deepEqual(row.periods,original.periods)
    assert.deepEqual(Object.fromEntries(Object.entries(row).filter(([k])=>k.startsWith('insurance'))),Object.fromEntries(Object.entries(original).filter(([k])=>k.startsWith('insurance'))))
    assert.equal(row.history.at(-1).before.warrantyNotified,false)
    assert.equal(row.history.at(-1).targetRequestId,targetRequestId)
    const billing=(await call('list',{filter:{billingMonth:row.periods[1]?.startDate.slice(0,7) || '2036-10'}})).rows
    assert.equal(billing.filter(r=>r.id===key && r.billingKind==='延長').length,0)
  }
})

test('HS latest extension undo preserves insurance and corrections, requires reason, is replay/concurrency safe',async()=>{
  await saveCompany('meeting-co','SHS')
  const key='undo-extension-test'
  await call('register',command(key,0,{fields:{...fields,maxYears:30}}))
  await call('notify',command(key,1,{notified:true}))
  await call('extend',command(key,2))
  let row=await call('detail',{id:key})
  const first=row.history.at(-1).requestId
  await call('extend',command(key,3))
  row=await call('detail',{id:key})
  const second=row.history.at(-1).requestId,number=row.warrantyNumber
  await call('save',command(key,4,{fields:{...fields,maxYears:30,name:'訂正後'},confirmDates:true}))
  await call('report',command(key,5,{month:'2026-10'}))
  row=await call('detail',{id:key})
  const insurance=Object.fromEntries(Object.entries(row).filter(([k])=>k.startsWith('insurance')))
  await assert.rejects(call('undoExtend',command(key,6,{targetRequestId:second,reason:'訂正'}),'meeting-branch-user'),e=>e.code==='permission-denied')
  await assert.rejects(call('undoExtend',command(key,6,{targetRequestId:second,reason:' '})),e=>e.code==='invalid-argument')
  await assert.rejects(call('undoExtend',command(key,6,{targetRequestId:first,reason:'訂正'})),e=>e.code==='failed-precondition')
  const undo=command(key,6,{targetRequestId:second,reason:'誤延長の訂正'})
  await Promise.all([call('undoExtend',undo),call('undoExtend',undo)])
  row=await call('detail',{id:key})
  assert.equal(row.revision,7);assert.equal(row.years,20);assert.equal(row.maxYears,30)
  assert.equal(row.expiryDate,'2046-09-30');assert.equal(row.name,'訂正後');assert.equal(row.warrantyNumber,number)
  assert.deepEqual(Object.fromEntries(Object.entries(row).filter(([k])=>k.startsWith('insurance'))),insurance)
  assert.equal(row.history.filter(h=>h.kind==='undoExtend').length,1)
  const billed=(await call('list',{filter:{billingMonth:row.periods[1]?.startDate.slice(0,7) || '2036-10'}})).rows.filter(r=>r.id===key && r.billingKind==='延長')
  assert.equal(billed.length,1);assert.equal(billed[0].billingEventId,first)
  await assert.rejects(call('undoExtend',command(key,6,{targetRequestId:first,reason:'訂正'})),e=>e.code==='aborted')
  await call('undoExtend',command(key,7,{targetRequestId:first,reason:'初回の延長も誤操作'}))
  row=await call('detail',{id:key})
  assert.equal(row.years,10);assert.equal(row.warrantyNotified,true);assert.equal(row.history.filter(h=>h.kind==='extend').length,2)
  await assert.rejects(call('undoExtend',command(key,8,{targetRequestId:first,reason:'重複'})),e=>e.code==='failed-precondition')
  await call('extend',command(key,8))
  row=await call('detail',{id:key})
  const latest=row.history.at(-1).requestId
  await call('cancel',command(key,9,{reason:'確認用取消'}))
  await assert.rejects(call('undoExtend',command(key,10,{targetRequestId:latest,reason:'訂正'})),e=>e.code==='failed-precondition')
})
