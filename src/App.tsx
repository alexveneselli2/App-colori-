import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import History from './pages/History'
import Export from './pages/Export'
import Layout from './components/Layout'

export default function App() {
  const { profile, loading, setLoading, fetchProfile, setProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setProfile(null)
          setLoading(false)
        } else if (session?.user) {
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
        <div
          className="w-5 h-5 rounded-full animate-ping"
          style={{ backgroundColor: '#3A86FF', opacity: 0.7 }}
        />
      </div>
    )
  }

  if (!profile) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
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
          <Route path="export" element={<Export />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
