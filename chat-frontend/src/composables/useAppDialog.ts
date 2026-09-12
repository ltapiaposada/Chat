import { reactive } from 'vue'

type DialogTone = 'primary' | 'danger'

interface DialogState {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  showCancel: boolean
  tone: DialogTone
}

const state = reactive<DialogState>({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Aceptar',
  cancelLabel: 'Cancelar',
  showCancel: false,
  tone: 'primary'
})

let resolveCurrent: ((value: boolean) => void) | null = null

function openDialog(options: Partial<DialogState>): Promise<boolean> {
  if (resolveCurrent) resolveCurrent(false)
  Object.assign(state, {
    open: true,
    title: 'Confirmar acción',
    message: '',
    confirmLabel: 'Aceptar',
    cancelLabel: 'Cancelar',
    showCancel: true,
    tone: 'primary',
    ...options
  })
  return new Promise((resolve) => { resolveCurrent = resolve })
}

function closeDialog(result: boolean) {
  state.open = false
  resolveCurrent?.(result)
  resolveCurrent = null
}

export function useAppDialog() {
  return {
    state,
    closeDialog,
    confirm: (message: string, options: Partial<DialogState> = {}) =>
      openDialog({ message, showCancel: true, tone: 'danger', ...options }),
    alert: (message: string, options: Partial<DialogState> = {}) =>
      openDialog({ title: 'Aviso', message, showCancel: false, ...options })
  }
}
