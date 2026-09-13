import { createFirebaseCompanyPortalGateway } from '../gateways/companyPortalGateway.ts'

export const useCompanyPortal = () => {
  const { $firebase } = useNuxtApp()
  return createFirebaseCompanyPortalGateway($firebase.functions)
}
