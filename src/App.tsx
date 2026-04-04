import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import { isDemoMode, getDemoProfile } from './lib/demo'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import History from './pages/History'
import Export from './pages/Export'
import Stats from './pages/Stats'
import Layout from './components/Layout'

export default function App() {
  const { profile, loading, setLoading, fetchProfile, setProfile } = useAuthStore()
  // Track whether we have an active Supabase session even if profile isn't created yet.
  // When true and profile is null → redirect to onboarding (e.g. after email confirmation).
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    if (isDemoMode()) {
      const p = getDemoProfile()
      if (p) setProfile(p)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setHasSession(true)
        await fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setHasSession(false)
          setProfile(null)
          setLoading(false)
        } else if (session?.user) {
          setHasSession(true)
          await fetchProfile(session.user.id)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

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
          {/* After email confirmation: session exists but no profile → go to onboarding */}
          <Route path="*" element={<Navigate to={hasSession ? '/onboarding' : '/auth'} replace />} />
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
