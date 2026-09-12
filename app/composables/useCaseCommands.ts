import { createFirebaseCaseCommandGateway } from '../gateways/caseCommandGateway.ts'

export const useCaseCommands = () => {
  const { $firebase } = useNuxtApp()
  return createFirebaseCaseCommandGateway($firebase.firestore, $firebase.functions)
}
