import { readonly, ref, type Ref } from 'vue'

type NotificationTone = 'success' | 'error' | 'info'
const state = import.meta.hot?.data.notificationState ?? {
  notifications: ref<{ id: number; message: string; tone: NotificationTone }[]>([]),
  timers: new Map<number, ReturnType<typeof setTimeout>>(),
  nextId: 0
}
const notifications = state.notifications as Ref<{ id: number; message: string; tone: NotificationTone }[]>
const timers = state.timers as Map<number, ReturnType<typeof setTimeout>>
if (import.meta.hot) {
  import.meta.hot.dispose(data => { data.notificationState = state })
}

function dismiss(id: number) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  notifications.value = notifications.value.filter(item => item.id !== id)
}

function show(message: string, tone: NotificationTone = 'success') {
  if (!message.trim()) return
  const id = ++state.nextId
  if (notifications.value.length >= 3) dismiss(notifications.value[0]!.id)
  notifications.value.push({ id, message, tone })
  timers.set(id, setTimeout(() => dismiss(id), 4500))
}

export function useAppNotification() {
  return { notifications: readonly(notifications), dismiss, show,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    info: (message: string) => show(message, 'info') }
}
