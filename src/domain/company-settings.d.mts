export interface CompanyProfile {
  companyName:string; postalCode:string; address1:string; address2:string; telephone:string; fax:string;
  invoiceRegistrationNumber:string; representativeName:string; representativeTitle:string; email:string;
}
export interface BillingRecipient {
  name:string; department:string; contactPerson:string; postalCode:string; address1:string; address2:string; telephone:string; email:string;
}
export function companyProfileDefaults():CompanyProfile
export function billingRecipientDefaults():BillingRecipient
export function normalizeCompanyProfile(input?:unknown, options?:{requireName?:boolean}):CompanyProfile
export function normalizeBillingRecipient(input?:unknown):BillingRecipient
export function portalWarrantyGroup(group:Record<string,unknown>, id:string):Record<string,unknown>
