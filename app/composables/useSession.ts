import {
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'

export interface StaffProfile {
  uid: string
  displayName: string
  role: 'developer_superuser' | 'house_solution_administrator' | 'general_staff'
  enabled: true
}

const currentUser = shallowRef<User | null>(null)
const profile = shallowRef<StaffProfile | null>(null)
const loading = ref(true)
const errorMessage = ref('')
let initialized = false
let profileSubscription: Unsubscribe | undefined

export function useSession() {
  const { $firebase } = useNuxtApp()

  if (!initialized) {
    initialized = true
    onAuthStateChanged($firebase.auth, (user) => {
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

      profileSubscription = onSnapshot(
        doc($firebase.firestore, 'staffAccounts', user.uid),
        (snapshot) => {
          const data = snapshot.data()
          const allowedRoles = ['developer_superuser', 'house_solution_administrator', 'general_staff'] as const
          if (!snapshot.exists() || data?.enabled !== true || !allowedRoles.includes(data.role)) {
            profile.value = null
            errorMessage.value = '利用可能なスタッフアカウントを確認できません。'
            loading.value = false
            void signOut($firebase.auth)
            return
          }
          profile.value = {
            uid: user.uid,
            displayName: String(data.displayName ?? ''),
            role: data.role,
            enabled: true,
          }
          loading.value = false
        },
        () => {
          profile.value = null
          errorMessage.value = 'スタッフアカウントが無効化されたか、認証確認に失敗しました。'
          loading.value = false
          void signOut($firebase.auth)
        },
      )
    })
  }

  const login = async (email: string, password: string) => {
    errorMessage.value = ''
    await setPersistence($firebase.auth, browserSessionPersistence)
    await signInWithEmailAndPassword($firebase.auth, email, password)
  }

  const logout = () => signOut($firebase.auth)

  return { currentUser, profile, loading, errorMessage, login, logout }
}
