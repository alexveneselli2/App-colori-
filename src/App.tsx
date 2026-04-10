import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import { isDemoMode, getDemoProfile } from './lib/demo'
import Splash from './pages/Splash'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import Layout from './components/Layout'

// Pagine pesanti caricate on-demand per ridurre il bundle iniziale
const History = lazy(() => import('./pages/History'))
const Stats   = lazy(() => import('./pages/Stats'))
const Export  = lazy(() => import('./pages/Export'))

function Loader() {
  return (
    <div className="page-top flex items-center justify-center" style={{ minHeight: 300 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        backgroundColor: '#FFD000',
        animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
      }} />
    </div>
  )
}

export default function App() {
  const { profile, loading, setLoading, fetchProfile, setProfile } = useAuthStore()
  const [hasSession, setHasSession] = useState(false)
  const [showSplash, setShowSplash] = useState(
    () => !localStorage.getItem('iride_intro_seen') && !isDemoMode(),
  )

  useEffect(() => {
    if (isDemoMode()) {
      const p = getDemoProfile()
      if (p) setProfile(p)
      setLoading(false)
      return
    }

    // Safety net: se nulla si risolve in 8s, vai al login
    const timeout = setTimeout(() => setLoading(false), 8000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setHasSession(true)
        try { await fetchProfile(session.user.id) } catch { /* gestito nello store */ }
      }
      clearTimeout(timeout)
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setHasSession(false)
          setProfile(null)
          setLoading(false)
          return
        }
        // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED — tutti hanno session
        if (session?.user) {
          setHasSession(true)
          try { await fetchProfile(session.user.id) } catch { /* gestito nello store */ }
          setLoading(false)
        }
      },
    )

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          backgroundColor: '#FFD000',
          animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        }} />
      </div>
    )
  }

  if (!profile) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          {/* Dopo conferma email o OAuth: session esiste ma profilo no → onboarding */}
          <Route path="*" element={<Navigate to={hasSession ? '/onboarding' : '/auth'} replace />} />
        </Routes>
      </HashRouter>
    )
  }

  return (
    <HashRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="history" element={<History />} />
            <Route path="stats" element={<Stats />} />
            <Route path="export" element={<Export />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
