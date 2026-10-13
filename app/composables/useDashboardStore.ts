import { effectScope, shallowRef, watch } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { createDashboardSession, type DashboardState } from '../utils/dashboardSession.mjs'
import { recoveryRuntime, withRuntimeGeneration } from '../utils/recoveryClient'
import { japanDate } from '../../src/domain/property-warranty.mjs'
import { recordMetric } from '../utils/firestoreMetrics'
let shared: ReturnType<typeof createStore> | undefined
function createStore() {
  const { $firebase } = useNuxtApp()
  const { profile } = useSession()
  const state = shallowRef<DashboardState>({value:null,attempted:false,loading:false,stale:false,error:''})
  const allowed = () => profile.value?.accountType === 'staff' && (recoveryRuntime.value.phase === 'normal' || recoveryRuntime.value.phase === 'verification' && ['developer_superuser','house_solution_administrator'].includes(profile.value.role))
  const session = createDashboardSession({
    fetch: async () => {
      if (!allowed()) throw new Error('ダッシュボードを利用できる状態ではありません。')
      return (await httpsCallable($firebase.functions,'propertyPrototype')(withRuntimeGeneration({action:'dashboard'}))).data
    }, today: japanDate, generation: () => recoveryRuntime.value.generation, publish: value => { state.value = value },
  })
  effectScope(true).run(() => watch(() => JSON.stringify([profile.value,recoveryRuntime.value]), session.reset, {flush:'sync'}))
  return {state,...session, ensure: () => {
    if (state.value.value) recordMetric('dashboard',{cacheHits:1})
    return session.ensure()
  }}
}
export function useDashboardStore() { return shared ??= createStore() }
