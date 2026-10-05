export type AppSnackbarType = 'success' | 'error' | 'info' | 'warning'

interface AppSnackbarState {
  id: number
  open: boolean
  text: string
  type: AppSnackbarType
  timeout: number
  location: 'top center' | 'bottom center'
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
    location: 'bottom center',
  }))

  const showSnackbar = (text: string, type: AppSnackbarType = 'info', timeout?: number, location: AppSnackbarState['location'] = 'bottom center') => {
    const normalized = text.trim()
    if (!normalized) return
    state.value = {
      id: state.value.id + 1,
      open: true,
      text: normalized,
      location,
      type,
      timeout: timeout ?? (type === 'error' ? ERROR_TIMEOUT : DEFAULT_TIMEOUT),
    }
  }

  const closeSnackbar = () => {
    state.value.open = false
  }

  const showValidationError = (text = '入力内容に誤りがあります。赤字の項目を確認してください（画面上部もご確認ください）。') => showSnackbar(text, 'error', ERROR_TIMEOUT, 'top center')

  return { state, showSnackbar, showValidationError, closeSnackbar }
}
