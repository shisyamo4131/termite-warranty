import { test } from 'node:test'
import assert from 'node:assert/strict'
import { companyProfileDefaults, billingRecipientDefaults, normalizeCompanyProfile, normalizeBillingRecipient, portalWarrantyGroup } from '../src/domain/company-settings.mjs'
import { PROPERTY_READ_ACTIONS, assertRequest } from '../src/domain/recovery.mjs'

test('company settings require only company name and normalize optional contacts', () => {
  assert.equal(Object.keys(companyProfileDefaults()).length,15)
  assert.throws(()=>normalizeCompanyProfile(),/会社名/)
  assert.deepEqual(normalizeCompanyProfile({}, {requireName:false}),companyProfileDefaults())
  const result=normalizeCompanyProfile({companyName:' 架空会社 ',postalCode:'100-0001',telephone:'03-1234-5678',invoiceRegistrationNumber:'T1234567890123',email:' contact@example.invalid '})
  assert.equal(result.companyName,'架空会社');assert.equal(result.postalCode,'1000001');assert.equal(result.email,'contact@example.invalid')
  assert.equal(result.address2,'')
  for(const patch of [{companyName:5},{postalCode:'1234'},{telephone:'０３'},{fax:'03 1234'},{email:'invalid'},{invoiceRegistrationNumber:'T123'},{address1:'a\nb'}])assert.throws(()=>normalizeCompanyProfile({companyName:'架空会社',...patch}))
})

test('optional bank details preserve leading zeros, allow partial input and reject non-digit account numbers',()=>{
  const profile=normalizeCompanyProfile({companyName:'架空会社',bankName:' 架空銀行 ',bankAccountType:'任意種別',bankAccountNumber:'0012345'})
  assert.equal(profile.bankName,'架空銀行');assert.equal(profile.bankAccountType,'任意種別');assert.equal(profile.bankAccountNumber,'0012345')
  assert.equal(profile.bankBranchName,'');assert.equal(profile.bankAccountHolder,'')
  assert.equal(normalizeCompanyProfile({...profile,bankAccountNumber:''}).bankAccountNumber,'')
  for(const number of ['１２３','12-34','12 34','1.2',123])assert.throws(()=>normalizeCompanyProfile({companyName:'架空',bankAccountNumber:number}))
  for(const bankName of ['x'.repeat(2001),'架空\n銀行',null])assert.throws(()=>normalizeCompanyProfile({companyName:'架空',bankName}))
})
test('billing recipient permits empty/partial values but rejects malformed values and ignores unrelated keys',()=>{
  assert.equal(Object.keys(billingRecipientDefaults()).length,8)
  assert.deepEqual(normalizeBillingRecipient(),billingRecipientDefaults())
  assert.equal(normalizeBillingRecipient({department:' 経理 ',name:'',unrelated:'private'}).department,'経理')
  assert.equal(normalizeBillingRecipient({unrelated:'private'}).unrelated,undefined)
  for(const value of [null,[],false,{name:4},{email:'invalid'}])assert.throws(()=>normalizeBillingRecipient(value))
})
test('portal group uses explicit fields and company profile is read-only during recovery verification',()=>{
  const group={name:'架空',prefix:'X',fiscalStartMonth:1,enabled:false,externalKeyRequired:true,externalKeyLabel:'キー',addressRequired:false,insulationMaterialsRequired:true,billingRecipient:{name:'非公開'},futurePrivate:'非公開',updatedAt:'private'}
  const visible=portalWarrantyGroup(group,'fixture')
  assert.equal(visible.id,'fixture');assert.equal(visible.externalKeyLabel,'キー');assert.equal(visible.insulationMaterialsRequired,true)
  for(const key of ['billingRecipient','futurePrivate','updatedAt'])assert.equal(Object.hasOwn(visible,key),false)
  assert.equal(PROPERTY_READ_ACTIONS.includes('companyProfile'),true)
  assert.equal(PROPERTY_READ_ACTIONS.includes('saveCompanyProfile'),false)
  const state={phase:'verification',generation:1}
  assert.doesNotThrow(()=>assertRequest(state,1,false,true))
  assert.throws(()=>assertRequest(state,1,true,true))
  assert.throws(()=>assertRequest(state,1,false,false))
})
