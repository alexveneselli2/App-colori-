/**
 * Reminder giornaliero in-app.
 *
 * Limiti del browser web: non possiamo schedulare notifiche se l'app è chiusa
 * (servirebbero le Push API + un service worker registrato + un push server).
 * Iride mostra la notifica solo quando l'app è aperta. Lo scheduler controlla
 * ogni minuto se è arrivata l'ora salvata e fa scattare una `Notification`
 * (o un alert visuale di fallback).
 *
 * L'orario è libero (HH:MM, qualsiasi minuto) e salvato in localStorage.
 */

const TIME_KEY = 'iride_reminder_time'
const LAST_FIRED_KEY = 'iride_reminder_last_fired'

let intervalId: ReturnType<typeof setInterval> | null = null

export function getReminderTime(): string | null {
  return localStorage.getItem(TIME_KEY)
}

export function setReminderTime(time: string | null): void {
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    localStorage.setItem(TIME_KEY, time)
  } else {
    localStorage.removeItem(TIME_KEY)
    localStorage.removeItem(LAST_FIRED_KEY)
  }
  // Restart scheduler to pick up new time
  startReminderScheduler()
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fire(): void {
  const body = 'È il momento di scegliere il colore di oggi.'
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Iride · Il tuo colore di oggi', {
        body,
        icon: `${import.meta.env.BASE_URL}icon.svg`,
        tag: 'iride-daily',
      })
    } catch {
      /* fallback below */
    }
  }
  // Visual fallback when tab is focused
  try {
    document.dispatchEvent(new CustomEvent('iride:reminder', { detail: { body } }))
  } catch {
    /* ignore */
  }
}

function hasTodayEntry(): boolean {
  // Quick local check to avoid disturbing the user if they've already logged
  // today. Looks at both demo and Supabase entry caches.
  const today = todayKey()
  try {
    const raw = localStorage.getItem('iride_demo_entries')
    if (raw) {
      const list = JSON.parse(raw) as Array<{ date: string }>
      if (Array.isArray(list) && list.some(e => e.date === today)) return true
    }
  } catch { /* ignore */ }
  return false
}

function tick(): void {
  const time = getReminderTime()
  if (!time) return
  const now = new Date()
  const [hh, mm] = time.split(':').map(Number)
  if (now.getHours() !== hh || now.getMinutes() !== mm) return
  const last = localStorage.getItem(LAST_FIRED_KEY)
  if (last === todayKey()) return // already fired today
  if (hasTodayEntry()) {
    // Mark as fired to avoid checking every tick during the same minute
    localStorage.setItem(LAST_FIRED_KEY, todayKey())
    return
  }
  localStorage.setItem(LAST_FIRED_KEY, todayKey())
  fire()
}

export function startReminderScheduler(): void {
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(tick, 30 * 1000) // check every 30s
  // Run an immediate check (covers the case where the user opens the app
  // exactly at the configured minute)
  tick()
}

export function stopReminderScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}
