import { effectScope, shallowRef, watch } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { companyProfileDefaults, normalizeCompanyProfile } from '../../src/domain/company-settings.mjs'
import { recoveryRuntime, withRuntimeGeneration } from '../utils/recoveryClient'

type Profile = ReturnType<typeof companyProfileDefaults> & { updatedAt?: string | null; updatedBy?: string; updatedByName?: string }
let shared: ReturnType<typeof createStore> | undefined
function createStore() {
  const { $firebase } = useNuxtApp()
  const { profile } = useSession()
  const value = shallowRef<Profile | null>(null)
  const loading = shallowRef(false)
  let generation = 0
  let pending: Promise<Profile> | null = null
  function reset() { generation++; value.value = null; loading.value = false; pending = null }
  const allowed = () => profile.value?.accountType === 'staff' && (recoveryRuntime.value.phase === 'normal' || recoveryRuntime.value.phase === 'verification' && ['developer_superuser', 'house_solution_administrator'].includes(profile.value.role))
  const canEdit = () => allowed() && recoveryRuntime.value.phase === 'normal' && ['developer_superuser', 'house_solution_administrator'].includes(profile.value?.role ?? '')
  async function request(action: string, input = {}) {
    if (!allowed() || action === 'saveCompanyProfile' && !canEdit()) throw new Error('この操作を利用できる状態ではありません。')
    const token = generation
    const result = (await httpsCallable($firebase.functions, 'propertyPrototype')(withRuntimeGeneration({ action, ...input }))).data as Profile
    if (token !== generation) throw new Error('利用状態が変わりました。画面を開き直してください。')
    value.value = result
    return result
  }
  function load(force = false): Promise<Profile> {
    if (!allowed()) return Promise.reject(new Error('会社設定を参照できません。'))
    if (pending) return pending
    if (!force && value.value) return Promise.resolve(value.value)
    const token = generation
    loading.value = true
    pending = request('companyProfile').finally(() => { if (token === generation) { loading.value = false; pending = null } })
    return pending
  }
  async function save(input: Profile) {
    if (!canEdit()) throw new Error('会社設定を変更できません。')
    return request('saveCompanyProfile', { profile: normalizeCompanyProfile(input) })
  }
  effectScope(true).run(() => watch(() => JSON.stringify([profile.value, recoveryRuntime.value]), reset, { flush: 'sync' }))
  return { value, loading, load, save, reset, canEdit }
}
export function useCompanyProfile() { return shared ??= createStore() }
