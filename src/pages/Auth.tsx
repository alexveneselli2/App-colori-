import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { enterDemo, getDemoProfile } from '../lib/demo'

export default function Auth() {
  const navigate = useNavigate()
  const { fetchProfile, setProfile, setLoading: setGlobalLoading } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleDemo = () => {
    enterDemo()
    const profile = getDemoProfile()
    setProfile(profile)
    setGlobalLoading(false)
    navigate('/')
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'login') {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) {
        setError('Email o password non corretti.')
      } else if (data.user) {
        const profile = await fetchProfile(data.user.id)
        if (!profile) navigate('/onboarding')
        // if profile exists, App.tsx handles redirect automatically
      }
    } else {
      const { data, error: authErr } = await supabase.auth.signUp({ email, password })
      if (authErr) {
        setError(authErr.message)
      } else if (data.user) {
        navigate('/onboarding')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-12">

        {/* Logotype */}
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-1.5 mb-2">
            {['#3A86FF', '#FFD166', '#2A9D8F', '#FF006E', '#8338EC', '#06D6A0'].map(c => (
              <div key={c} className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: c }} />
            ))}
          </div>
          <h1 className="text-4xl font-light tracking-tight text-foreground">Iride</h1>
          <p className="text-sm text-muted leading-relaxed">
            Ogni giorno, un colore.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handle} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3.5 bg-surface-raised rounded-2xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full px-4 py-3.5 bg-surface-raised rounded-2xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all"
          />

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-1 bg-foreground text-surface rounded-2xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? '···' : mode === 'login' ? 'Entra' : 'Crea il tuo profilo'}
          </button>
        </form>

        {/* Demo mode */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-subtle" />
          <span className="text-xs text-muted flex-shrink-0">oppure</span>
          <div className="flex-1 h-px bg-subtle" />
        </div>
        <button
          type="button"
          onClick={handleDemo}
          className="w-full py-4 border border-subtle text-muted rounded-2xl text-sm transition-all active:scale-[0.98] hover:text-foreground hover:border-foreground/30"
        >
          Prova il demo — senza account
        </button>

        {/* Toggle login / signup */}
        <p className="text-center text-sm text-muted">
          {mode === 'login' ? 'Prima volta su Iride?' : 'Hai già un account?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
            className="text-foreground underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            {mode === 'login' ? 'Registrati' : 'Accedi'}
          </button>
        </p>

      </div>
    </div>
  )
}
