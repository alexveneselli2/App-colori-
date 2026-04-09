import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// PWA Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/App-colori-/sw.js').catch(() => { /* ignore */ })
  })
}

// Daily reminder scheduler (client-side, runs while app is open/in background)
function scheduleDailyReminder() {
  const time = localStorage.getItem('iride_reminder_time')
  if (!time || Notification.permission !== 'granted') return

  const [h, m] = time.split(':').map(Number)
  const now    = new Date()
  const target = new Date(now)
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)

  const delay = target.getTime() - now.getTime()
  setTimeout(() => {
    // Show only if no entry saved today
    const todayStr = new Date().toLocaleDateString('sv') // YYYY-MM-DD in local time
    const raw = localStorage.getItem('iride_demo_entries')
    const hasToday = raw
      ? (JSON.parse(raw) as { date: string }[]).some(e => e.date === todayStr)
      : false

    if (!hasToday) {
      try {
        new Notification('Come ti senti oggi? 🎨', {
          body: 'Apri Iride e scegli il tuo colore.',
          icon: '/App-colori-/icon.svg',
          tag: 'iride-daily',
        })
      } catch { /* ignore */ }
    }
    scheduleDailyReminder()
  }, delay)
}
scheduleDailyReminder()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
