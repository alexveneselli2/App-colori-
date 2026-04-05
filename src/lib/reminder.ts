const KEY_ENABLED = 'iride_reminder_enabled'
const KEY_TIME    = 'iride_reminder_time'
const DEFAULT_TIME = '20:00'

export function getReminderEnabled(): boolean {
  return localStorage.getItem(KEY_ENABLED) === 'true'
}
export function getReminderTime(): string {
  return localStorage.getItem(KEY_TIME) ?? DEFAULT_TIME
}
export function setReminderEnabled(v: boolean) {
  localStorage.setItem(KEY_ENABLED, String(v))
}
export function setReminderTime(t: string) {
  localStorage.setItem(KEY_TIME, t)
}

let reminderTimeout: ReturnType<typeof setTimeout> | null = null

function msUntilNext(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  const now  = new Date()
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

export async function scheduleReminder(timeStr?: string) {
  const t = timeStr ?? getReminderTime()
  if (!getReminderEnabled()) return

  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') { setReminderEnabled(false); return }
  }

  if (reminderTimeout) clearTimeout(reminderTimeout)

  const delay = msUntilNext(t)
  reminderTimeout = setTimeout(async () => {
    if (!getReminderEnabled()) return
    // Only notify if SW is active (preferred), else use plain Notification
    const reg = await navigator.serviceWorker?.ready.catch(() => null)
    if (reg) {
      reg.showNotification('Iride', {
        body: 'Qual è il colore di oggi? Registra il tuo stato d\'animo.',
        icon: '/App-colori-/icon-192.svg',
        badge: '/App-colori-/icon-192.svg',
        tag: 'iride-daily',
      })
    } else {
      new Notification('Iride', {
        body: 'Qual è il colore di oggi?',
        icon: '/App-colori-/icon-192.svg',
      })
    }
    // Re-schedule for tomorrow
    scheduleReminder(t)
  }, delay)
}

export function cancelReminder() {
  if (reminderTimeout) { clearTimeout(reminderTimeout); reminderTimeout = null }
}
