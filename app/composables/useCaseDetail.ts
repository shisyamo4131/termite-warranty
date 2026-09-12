import { createFirestoreCaseQuerySource } from '../repositories/firestoreCaseQuerySource.ts'
import { initialCaseDetailQueryState, subscribeCaseDetail } from '../repositories/caseDetailRepository.ts'
import { currentLocalDate } from '../utils/canonicalLocalDate.ts'

export const useCaseDetail = () => {
  const { $firebase } = useNuxtApp()
  const source = createFirestoreCaseQuerySource($firebase.firestore)
  const state = shallowRef(initialCaseDetailQueryState())
  let unsubscribe: (() => void) | undefined
  let currentCaseId = ''

  const stop = () => {
    unsubscribe?.()
    unsubscribe = undefined
  }
  const start = (caseId: string) => {
    stop()
    currentCaseId = caseId
    state.value = initialCaseDetailQueryState()
    unsubscribe = subscribeCaseDetail(source, caseId, next => { state.value = next }, currentLocalDate)
  }
  const retry = () => {
    if (currentCaseId) start(currentCaseId)
  }

  onBeforeUnmount(stop)
  return { state, start, retry, stop }
}
