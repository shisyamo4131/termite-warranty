import {assertGroupWarrantyLimit} from '../../src/domain/group-warranty-limit.mjs'
import {createHash} from 'node:crypto'
import {normalizeProperty,coveragePeriods,initialInsurance,fiscalYear,initialGroups} from '../../src/domain/property-warranty.mjs'
import {normalizeExternalKey} from '../../src/domain/external-key.mjs'
import {materializeInsuranceState,insuranceProjection,validateInsuranceState,waiveExpiredImportedPeriods} from '../../src/domain/insurance-state.mjs'
import {insuranceNoticeProjection} from '../../src/domain/insurance-notice-query.mjs'
import {monthlyQueryProjection} from '../../src/domain/monthly-query.mjs'
import {assertInsuranceCapacity} from '../../src/domain/insurance-capacity.mjs'
import {validateIntakeSettings} from './historical-intake-settings.mjs'

export const intakeHash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex')
const nonempty=v=>typeof v==='string'&&!!v.trim()
const fail=code=>{throw Error(code)}
const identifier=v=>typeof v==='string'&&/^[\w-]{1,100}$/.test(v)
const addressKeys=['postalCode','prefecture','municipality','streetTownAndNumber','buildingName']
const cleanAddress=value=>Object.fromEntries(addressKeys.map(k=>[k,String(value?.[k]??'').trim()]))

// Local preparation only: real values belong in the caller's private directory.
// Numbering follows the year encoded in each preserved number, not application FY.
export function prepareHistoricalIntake(input,{today}={}) {
  const preservedSettings=validateIntakeSettings(input?.preservedBusinessSettings)
  if(input?.schemaVersion!==1||!nonempty(input.workbookId)||!/^[a-f0-9]{64}$/.test(input.sourceSha256??'')||!nonempty(input.transformVersion)||!Array.isArray(input.rows)||!input.rows.length||input.rows.length>10000||!Array.isArray(input.companies)||!Array.isArray(input.branches)) fail('INPUT_SHAPE')
  if(!/^\d{4}-\d{2}-\d{2}$/.test(today??''))fail('REFERENCE_DATE_REQUIRED')
  fiscalYear(today,1)
  if(JSON.stringify(input.expectedRows)!==JSON.stringify({HSC:99,SHS:66,UH:277}))fail('REVIEWED_ROW_COUNTS')
  for(const key of ['H-01','H-02','S-01','S-02','S-03','U-01','excludedNumbers'])if(!nonempty(input.decisions?.[key]))fail('DECISION_EVIDENCE')
  const groups=initialGroups.map(g=>({...g,enabled:true,externalKeyRequired:g.id==='UH',externalKeyLabel:g.id==='UH'?'お施主様契約No':'外部キー',addressRequired:true,insulationMaterialsRequired:g.id!=='UH'}))
  const documents=[],errors=[],numbers=new Set(),externalKeys=new Set(),sourceRows=new Set(),counters=new Map(),companies=new Map(),branches=new Map(),codes=new Set()
  const add=(collection,id,data)=>documents.push({path:`${collection}/${id}`,data})
  for(const g of groups){const {id,...data}=g;add('warrantyGroups',id,data)}
  for(const company of input.companies) {
    if(!identifier(company?.id)||companies.has(company.id)||!groups.some(g=>g.id===company.groupId)||!nonempty(company.name))fail('COMPANY_MAPPING')
    const address=cleanAddress(company.address)
    if(!['prefecture','municipality','streetTownAndNumber'].every(k=>nonempty(address[k])))errors.push({code:'COMPANY_ADDRESS_MISSING',group:company.groupId})
    if(address.postalCode&&!/^\d{7}$/.test(address.postalCode))fail('COMPANY_POSTCODE')
    companies.set(company.id,company)
    add('constructionCompanies',company.id,{name:company.name,defaultGroupId:company.groupId,address,telephone:'',fax:'',contactPerson:'',notes:'',enabled:true})
  }
  for(const branch of input.branches) {
    const company=companies.get(branch?.companyId),code=branch?.branchCode??''
    if(!company||!identifier(branch.id)||branches.has(branch.id)||!nonempty(branch.name)||typeof code!=='string'||code.trim()!==code||company.groupId==='UH'&&!/^\d{4}-\d{2}$/.test(code))fail('BRANCH_MAPPING')
    if(code&&codes.has(company.id+'\0'+code))fail('DUPLICATE_BRANCH_CODE')
    if(code)codes.add(company.id+'\0'+code)
    branches.set(branch.id,branch)
    const address=cleanAddress(branch.address)
    if(address.postalCode&&!/^\d{7}$/.test(address.postalCode))fail('BRANCH_POSTCODE')
    add('companyBranches',branch.id,{name:branch.name,constructionCompanyId:company.id,branchCode:code,address,telephone:'',fax:'',enabled:true})
    if(code)add('branchCodeReservations',intakeHash(company.id+'\0'+code),{constructionCompanyId:company.id,branchId:branch.id,branchCode:code})
  }
  const groupCounts={},yearDifferences=[]
  for(const row of input.rows) {
    const group=groups.find(g=>g.id===row.group),company=companies.get(row.companyId),branch=branches.get(row.branchId)
    if(!group||company?.groupId!==group.id||branch?.companyId!==company.id||!Number.isSafeInteger(row.sourceRow)||row.sourceRow<2||sourceRows.has(group.id+':'+row.sourceRow))fail('ROW_MAPPING')
    sourceRows.add(group.id+':'+row.sourceRow)
    const prefix=group.prefix?group.prefix+'-':'',match=typeof row.warrantyNumber==='string'?row.warrantyNumber.match(new RegExp('^'+prefix+'(\\d{2})-(\\d{3,})$')):null
    if(!match||numbers.has(row.warrantyNumber)||!Number.isSafeInteger(Number(match[2]))||Number(match[2])<1)fail('WARRANTY_NUMBER')
    numbers.add(row.warrantyNumber)
    const numberYear=2000+Number(match[1]),sequence=Number(match[2]),counterId=group.id+'_'+numberYear
    const externalKey=normalizeExternalKey(row.externalKey??'')
    // The approved UH intake maps the source contract number to the normal address field.
    // Preserve the original key for duplicate detection and never mutate the source row.
    const fields=normalizeProperty(group.id==='UH'?{...row.fields,address:externalKey}:row.fields,true,group)
    assertGroupWarrantyLimit(group,fields.maxYears)
    if(fields.applicationDate<'2000-01-01'||fields.applicationDate>='2100-01-01')fail('NUMBER_CENTURY_REQUIRES_REVIEW')
    const applicationYear=fiscalYear(fields.applicationDate,group.fiscalStartMonth)
    if(numberYear!==applicationYear)yearDifferences.push({group:group.id,row:row.sourceRow,applicationYear,numberYear})
    counters.set(counterId,Math.max(counters.get(counterId)??0,sequence))
    if(group.id==='UH'&&(!/^\d{4}-\d{7}$/.test(externalKey)))fail('UH_CONSTRAINT')
    if(group.externalKeyRequired&&!externalKey||externalKey&&externalKeys.has(externalKey))fail('EXTERNAL_KEY')
    if(externalKey)externalKeys.add(externalKey)
    const id='historical-'+intakeHash(group.id+'\0'+row.warrantyNumber).slice(0,40)
    const periods=coveragePeriods(fields.handoverDate,10)
    if(periods[0].expiryDate<today)errors.push({code:'INITIAL_WARRANTY_EXPIRED',group:group.id,row:row.sourceRow})
    const source={workbookId:input.workbookId,sourceSha256:input.sourceSha256,transformVersion:input.transformVersion,sheet:group.id,row:row.sourceRow,rowHash:intakeHash(row)}
    let value={...fields,constructionCompanyId:company.id,branchId:branch.id,groupId:group.id,groupName:group.name,fiscalYear:applicationYear,warrantyNumber:row.warrantyNumber,externalKey,status:'active',years:10,periods,startDate:fields.handoverDate,expiryDate:periods[0].expiryDate,...initialInsurance(fields.handoverDate),warrantyNotified:false,insuranceEvents:[],insuranceHistoryIncomplete:false,billingItems:[{id:'initial',...periods[0],state:'billed'}],certificateItems:[{id:'initial',...periods[0],issued:true}],history:[],revision:1,historicalIntakeSource:source}
    value=materializeInsuranceState(value,{newRegistration:true})
    value=waiveExpiredImportedPeriods(value,{today,actorUid:'historical-intake-plan',actorName:'初期取込み計画（実行時に置換）',at:new Date(`${today}T00:00:00+09:00`).toISOString()})
    Object.assign(value,insuranceProjection(value),monthlyQueryProjection(value),insuranceNoticeProjection(value))
    if(validateInsuranceState(value,{today}).length)fail('INSURANCE_STATE')
    assertInsuranceCapacity(value,{documentPath:'propertyWarranties/'+id,today})
    add('propertyWarranties',id,value)
    if(externalKey)add('externalKeyReservations',intakeHash(externalKey),{externalKey,propertyId:id})
    groupCounts[group.id]=(groupCounts[group.id]??0)+1
  }
  if(input.reservedNumbers!==undefined&&!Array.isArray(input.reservedNumbers))fail('RESERVATIONS_SHAPE')
  for(const entry of input.reservedNumbers??[]) {
    const group=groups.find(g=>g.id===entry.group)
    if(!group||!nonempty(entry.reference))fail('RESERVATION_EVIDENCE')
    const m=entry.number?.match(new RegExp('^'+(group.prefix?group.prefix+'-':'')+'(\\d{2})-(\\d{3,})$'))
    if(!m||!Number.isSafeInteger(Number(m[2]))||Number(m[2])<1||numbers.has(entry.number))fail('RESERVATION_NUMBER')
    const key=group.id+'_'+(2000+Number(m[1]));counters.set(key,Math.max(counters.get(key)??0,Number(m[2])))
  }
  for(const [id,lastValue] of [...counters].sort())add('warrantyCounters',id,{lastValue})
  const paths=documents.map(d=>d.path)
  if(new Set(paths).size!==paths.length)fail('DUPLICATE_DESTINATION')
  if(Object.entries(input.expectedRows).some(([g,count])=>groupCounts[g]!==count))fail('ROW_COUNTS')
  return {schemaVersion:1,workbookId:input.workbookId,sourceSha256:input.sourceSha256,transformVersion:input.transformVersion,today,documents,preservedSettings,summary:{groups:groups.length,companies:companies.size,branches:branches.size,properties:input.rows.length,groupCounts,counters:[...counters].sort().map(([id,lastValue])=>({id,lastValue,nextValue:lastValue+1})),yearDifferences,errors},inputDigest:intakeHash(input),planDigest:intakeHash({documents,today,preservedSettings,inputDigest:intakeHash(input)})}
}
