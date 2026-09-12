import { createFirestoreCaseQuerySource } from '../repositories/firestoreCaseQuerySource.ts'
import { initialCaseListQueryState, subscribeCaseList } from '../repositories/caseListRepository.ts'
import { currentLocalDate } from '../utils/canonicalLocalDate.ts'

export const useCaseList = () => {
  const { $firebase } = useNuxtApp()
  const source = createFirestoreCaseQuerySource($firebase.firestore)
  const state = shallowRef(initialCaseListQueryState())
  let unsubscribe: (() => void) | undefined

  const stop = () => {
    unsubscribe?.()
    unsubscribe = undefined
  }
  const start = () => {
    stop()
    state.value = initialCaseListQueryState()
    unsubscribe = subscribeCaseList(source, next => { state.value = next }, currentLocalDate)
  }
  const retry = () => start()

  onBeforeUnmount(stop)
  return { state, start, retry, stop }
}
