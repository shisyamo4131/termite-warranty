import { createMeasuredFirestore } from '../utils/firestoreMetrics.ts'
import { recordAuthFailure } from '../utils/authDiagnostics'
const { getDoc, onSnapshot } = createMeasuredFirestore('session')
import {
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, type Unsubscribe } from 'firebase/firestore'
import type { SessionProfile } from '../types/company-portal.ts'

const currentUser = shallowRef<User | null>(null)
const profile = shallowRef<SessionProfile | null>(null)
const loading = ref(true)
const errorMessage = ref('')
let initialized = false
let profileSubscription: Unsubscribe | undefined
let authGeneration = 0

let retryProfile: (() => Promise<void>) | undefined

export function useSession() {
  const { $firebase } = useNuxtApp()

  if (!initialized) {
    initialized = true
    const loadProfile = async (user: User | null) => {
      const generation = ++authGeneration
      profileSubscription?.()
      profileSubscription = undefined
      loading.value = true
      errorMessage.value = ''
      currentUser.value = user
      profile.value = null
      if (!user) {
        loading.value = false
        return
      }

      const staffRef = doc($firebase.firestore, 'staffAccounts', user.uid)
      const companyRef = doc($firebase.firestore, 'constructionCompanyAccounts', user.uid)
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
      const [staffSnapshot, companySnapshot] = await Promise.race([
        Promise.all([getDoc(staffRef), getDoc(companyRef)]),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('account-timeout')), 15000) }),
      ])
      if (generation !== authGeneration) return
      const accountRef = staffSnapshot.exists() ? staffRef : companySnapshot.exists() ? companyRef : null
      if (!accountRef) {
        errorMessage.value = '利用可能なアカウントを確認できません。'
        loading.value = false
        await signOut($firebase.auth)
        return
      }

      profileSubscription = onSnapshot(
        accountRef,
        (snapshot) => {
          if (generation !== authGeneration) return
          const data = snapshot.data()
          const allowedRoles = ['developer_superuser', 'house_solution_administrator', 'general_staff'] as const
          const isStaff = snapshot.ref.path.startsWith('staffAccounts/')
          const validRole = isStaff ? allowedRoles.includes(data?.role) : data?.role === 'construction_company'
          if (!snapshot.exists() || data?.enabled !== true || !validRole) {
            profile.value = null
            errorMessage.value = '利用可能なアカウントを確認できません。'
            loading.value = false
            void signOut($firebase.auth).catch(() => {})
            return
          }
          profile.value = isStaff
            ? {
                accountType: 'staff', uid: user.uid, displayName: String(data.displayName ?? ''),
                role: data.role, enabled: true,
              }
            : {
                accountType: 'construction_company', uid: user.uid,
                constructionCompanyId: String(data.constructionCompanyId ?? ''),
                companyName: String(data.companyName ?? ''), displayName: String(data.displayName ?? data.companyName ?? ''),
                scope: data.scope, branchId: String(data.branchId ?? ''),
                email: String(data.email ?? user.email ?? ''), role: 'construction_company', enabled: true,
              }
          loading.value = false
        },
        (error) => {
          if (generation !== authGeneration) return
          recordAuthFailure('profile_listen', error)
          profile.value = null
          errorMessage.value = 'アカウントが無効化されたか、認証確認に失敗しました。'
          loading.value = false
          void signOut($firebase.auth).catch(() => {})
        },
      )
      } catch (error) {
        if (generation === authGeneration) {
          recordAuthFailure('profile_read', error)
          profile.value = null
          errorMessage.value = 'アカウント情報を取得できませんでした。接続を確認して再試行してください。'
        }
      } finally {
        if (timeout) clearTimeout(timeout)
        if (generation === authGeneration) loading.value = false
      }
    }
    retryProfile = () => loadProfile($firebase.auth.currentUser)
    onAuthStateChanged($firebase.auth, loadProfile)
  }

  const login = async (email: string, password: string) => {
    errorMessage.value = ''
    try { await setPersistence($firebase.auth, browserSessionPersistence) }
    catch (error) { recordAuthFailure('persistence', error); throw error }
    try { await signInWithEmailAndPassword($firebase.auth, email, password) }
    catch (error) { recordAuthFailure('sign_in', error); throw error }
  }

  const logout = () => signOut($firebase.auth)
  const resetPassword = async (email: string) => {
    $firebase.auth.languageCode = 'ja'
    try { await sendPasswordResetEmail($firebase.auth, email) }
    catch (error) { recordAuthFailure('password_reset', error); throw error }
  }

  return { currentUser, profile, loading, errorMessage, login, logout, resetPassword, retryProfile: () => retryProfile?.() }
}
