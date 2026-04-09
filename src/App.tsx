import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import { isDemoMode, getDemoProfile } from './lib/demo'
import Splash from './pages/Splash'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import History from './pages/History'
import Export from './pages/Export'
import Stats from './pages/Stats'
import Layout from './components/Layout'

export default function App() {
  const { profile, loading, setLoading, fetchProfile, setProfile } = useAuthStore()
  // shouldOnboard is ONLY true when a verified session exists but the user
  // has never created a profile (i.e. just confirmed email for the first time).
  // It is NOT set on logout, so logout always sends to /auth.
  const [shouldOnboard, setShouldOnboard] = useState(false)
  const [showSplash, setShowSplash] = useState(() => !isDemoMode())

  useEffect(() => {
    if (isDemoMode()) {
      const p = getDemoProfile()
      if (p) setProfile(p)
      setLoading(false)
      return
    }

    // Fallback: force-clear loading after 6s in case Supabase hangs
    const timeout = setTimeout(() => setLoading(false), 6000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) {
        if (profile) {
          // Cache hit → app already visible, refresh silently in background
          fetchProfile(session.user.id).catch(() => {})
          setLoading(false)
        } else {
          // No cache → await fetchProfile so routing knows the real profile state
          try {
            const p = await fetchProfile(session.user.id)
            if (!p) setShouldOnboard(true) // session exists but no profile → first-time user
          } catch { /* ignore */ }
          setLoading(false)
        }
      } else {
        // No session → clear any stale cache, send to /auth
        setProfile(null)
        setShouldOnboard(false)
        setLoading(false)
      }
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          // Explicit logout: clear everything, go to /auth (NOT /onboarding)
          setShouldOnboard(false)
          setProfile(null)
          setLoading(false)
        } else if (event === 'SIGNED_IN' && session?.user) {
          // User just confirmed email or explicitly signed in
          try {
            const p = await fetchProfile(session.user.id)
            if (!p) setShouldOnboard(true) // no profile → needs onboarding
          } catch { /* ignore */ }
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
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
          {/* Only go to onboarding if we know the user has a verified session but no profile */}
          <Route path="*" element={<Navigate to={shouldOnboard ? '/onboarding' : '/auth'} replace />} />
        </Routes>
      </HashRouter>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="history" element={<History />} />
          <Route path="stats" element={<Stats />} />
          <Route path="export" element={<Export />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
