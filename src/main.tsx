import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

// PWA Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/App-colori-/sw.js').catch(() => { /* ignore */ })
  })
}

// Lo scheduler del reminder giornaliero è in `lib/reminder.ts` e viene avviato
// da `App.tsx` (così reagisce a cambi di orario senza dover ricaricare la pagina).

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
