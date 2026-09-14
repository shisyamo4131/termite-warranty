import { createFirebaseStaffAccountGateway } from '../gateways/staffAccountGateway.ts'

export const useStaffAccountManagement = () => {
  const { $firebase } = useNuxtApp()
  return createFirebaseStaffAccountGateway($firebase.functions, $firebase.auth)
}
