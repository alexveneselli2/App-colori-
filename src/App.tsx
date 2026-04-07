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

/**
 * Synchronously check if any Supabase session token is stored in localStorage.
 * If none exists, the user is definitely not logged in — skip the network check.
 */
function hasStoredSupabaseSession(): boolean {
  try {
    return Object.keys(localStorage).some(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    )
  } catch {
    return false
  }
}

/**
 * Race a promise against a timeout that resolves to `fallback`.
 * Never rejects — network failures just return the fallback.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

export default function App() {
  const { profile, loading, setLoading, fetchProfile, setProfile } = useAuthStore()
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    // ── Demo mode: skip all Supabase logic ──────────────────────────────────
    if (isDemoMode()) {
      const p = getDemoProfile()
      if (p) setProfile(p)
      setLoading(false)
      return
    }

    // ── Fast path: no stored token → user is not logged in, show Auth now ───
    if (!hasStoredSupabaseSession()) {
      setLoading(false)
      return
    }

    // ── Slow path: stored token exists → verify it (max 3 seconds) ──────────
    const safetyTimeout = setTimeout(() => setLoading(false), 3000)

    withTimeout(supabase.auth.getSession(), 2500, { data: { session: null }, error: null })
      .then(async ({ data: { session } }) => {
        try {
          if (session?.user) {
            setHasSession(true)
            // fetchProfile also gets a 3s cap so it never hangs
            await withTimeout(fetchProfile(session.user.id), 3000, null)
          }
        } catch (e) {
          console.error('[Iride] session init error:', e)
        } finally {
          clearTimeout(safetyTimeout)
          setLoading(false)
        }
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setHasSession(false)
          setProfile(null)
          setLoading(false)
        } else if (event === 'INITIAL_SESSION' && !session?.user) {
          // INITIAL_SESSION with no session = definitely not logged in
          clearTimeout(safetyTimeout)
          setLoading(false)
        } else if (session?.user) {
          setHasSession(true)
          try {
            await withTimeout(fetchProfile(session.user.id), 3000, null)
          } catch (e) {
            console.error('[Iride] fetchProfile error:', e)
          }
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
    }
  }, [])

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="h-screen w-screen flex flex-col items-center justify-center gap-5"
        style={{ background: 'var(--color-surface)' }}
      >
        {/* Brand orbs */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {['#FFD000','#FF6B00','#FF0A54','#C77DFF','#00B4D8','#52B788'].map((c, i) => (
            <div
              key={c}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                backgroundColor: c,
                opacity: 0.85,
                animation: `ping 1.2s cubic-bezier(0,0,0.2,1) ${i * 0.12}s infinite`,
              }}
            />
          ))}
        </div>
        <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-muted)', opacity: 0.5 }}>
          Iride
        </p>
      </div>
    )
  }

  // ── Auth / Onboarding ──────────────────────────────────────────────────────
  if (!profile) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to={hasSession ? '/onboarding' : '/auth'} replace />} />
        </Routes>
      </HashRouter>
    )
  }

  // ── Main app ───────────────────────────────────────────────────────────────
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
