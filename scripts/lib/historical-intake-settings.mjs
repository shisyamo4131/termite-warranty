import {createHash} from 'node:crypto'
import {typed,decodeTyped} from './default-recovery.mjs'
import {initialGroups} from '../../src/domain/property-warranty.mjs'

const fail=()=>{throw Error('INTAKE_SETTINGS_MAPPING_OR_CONTENT')}
export const emptyIntakeSettings=()=>({version:1,companyProfile:null,billingRecipients:[]})
export const intakeSettingsHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const identity=group=>({prefix:group.prefix,fiscalStartMonth:group.fiscalStartMonth})
// Stable IDs AND immutable numbering settings must agree. Names are never a key.
export function validateIntakeSettings(value=emptyIntakeSettings()) {
  if(!value||value.version!==1||!Array.isArray(value.billingRecipients)||Object.keys(value).sort().join()!=='billingRecipients,companyProfile,version')fail()
  const seen=new Set()
  const check=wire=>{let data;try{data=decodeTyped(wire)}catch{fail()}if(!data||Object.getPrototypeOf(data)!==Object.prototype||JSON.stringify(typed(data))!==JSON.stringify(wire))fail();return data}
  if(value.companyProfile!==null)check(value.companyProfile)
  for(const row of value.billingRecipients){const group=initialGroups.find(g=>g.id===row.groupId);if(!group||seen.has(row.groupId)||JSON.stringify(row.identity)!==JSON.stringify(identity(group))||Object.keys(row).sort().join()!=='groupId,identity,value')fail();seen.add(row.groupId);check(row.value)}
  if(value.billingRecipients.some((row,i,rows)=>i>0&&rows[i-1].groupId.localeCompare(row.groupId)>=0))fail()
  return value
}
export function captureIntakeSettings(image) {
  const result=emptyIntakeSettings()
  const profile=image.get('prototypeSettings/companyProfile')
  if(profile)result.companyProfile=typed(profile.fields)
  for(const [path,row] of image){if(!/^warrantyGroups\/[^/]+$/.test(path)||!Object.hasOwn(row.fields,'billingRecipient'))continue
    result.billingRecipients.push({groupId:path.split('/')[1],identity:identity(row.fields),value:typed(row.fields.billingRecipient)})
  }
  result.billingRecipients.sort((a,b)=>a.groupId.localeCompare(b.groupId))
  return validateIntakeSettings(result)
}
export function restoreIntakeSettings(documents,preserved) {
  validateIntakeSettings(preserved)
  for(const row of preserved.billingRecipients){const target=documents.find(d=>d.path==='warrantyGroups/'+row.groupId);if(!target||JSON.stringify(identity(target.data))!==JSON.stringify(row.identity))fail();target.data.billingRecipient=decodeTyped(row.value)}
  if(preserved.companyProfile!==null)documents.push({path:'prototypeSettings/companyProfile',data:decodeTyped(preserved.companyProfile)})
  return documents
}
