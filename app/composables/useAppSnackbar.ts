export type AppSnackbarType = 'success' | 'error' | 'info' | 'warning'

interface AppSnackbarState {
  id: number
  open: boolean
  text: string
  type: AppSnackbarType
  timeout: number
}

const DEFAULT_TIMEOUT = 5000
const ERROR_TIMEOUT = 8000

export const useAppSnackbar = () => {
  const state = useState<AppSnackbarState>('app-snackbar', () => ({
    id: 0,
    open: false,
    text: '',
    type: 'info',
    timeout: DEFAULT_TIMEOUT,
  }))

  const showSnackbar = (text: string, type: AppSnackbarType = 'info', timeout?: number) => {
    const normalized = text.trim()
    if (!normalized) return
    state.value = {
      id: state.value.id + 1,
      open: true,
      text: normalized,
      type,
      timeout: timeout ?? (type === 'error' ? ERROR_TIMEOUT : DEFAULT_TIMEOUT),
    }
  }

  const closeSnackbar = () => {
    state.value.open = false
  }

  return { state, showSnackbar, closeSnackbar }
}
