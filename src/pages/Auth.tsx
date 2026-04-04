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
  const [info, setInfo] = useState<string | null>(null)
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
    setInfo(null)
    setLoading(true)

    if (mode === 'login') {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) {
        if (authErr.message.includes('Email not confirmed')) {
          setError('Controlla la tua email e clicca il link di conferma prima di accedere.')
        } else {
          setError('Email o password non corretti.')
        }
      } else if (data.user) {
        const profile = await fetchProfile(data.user.id)
        if (!profile) navigate('/onboarding')
        // if profile exists, App.tsx auth state change handles the redirect
      }
    } else {
      const { data, error: authErr } = await supabase.auth.signUp({ email, password })
      if (authErr) {
        setError(authErr.message)
      } else if (data.user) {
        if (data.session) {
          // Email confirmation disabled — proceed directly
          navigate('/onboarding')
        } else {
          // Email confirmation required
          setInfo(
            'Registrazione quasi completa! Controlla la tua email e clicca il link di conferma. ' +
            'Poi torna qui e accedi.'
          )
          setMode('login')
        }
      }
    }
    setLoading(false)
  }

  const ACCENT_COLORS = ['#FFD000', '#FF6B00', '#FF0A54', '#C77DFF', '#52B788', '#00B4D8']

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-10">

        {/* Logotype */}
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-2 mb-3">
            {ACCENT_COLORS.map((c, i) => (
              <div
                key={c}
                className="rounded-lg"
                style={{
                  width: 14, height: 14,
                  backgroundColor: c,
                  transform: `translateY(${i % 2 === 0 ? -2 : 2}px)`,
                }}
              />
            ))}
          </div>
          <h1 className="text-[42px] font-bold tracking-[-0.04em] text-foreground leading-none">
            Iride
          </h1>
          <p className="text-[14px] text-muted leading-relaxed">
            Ogni giorno, un colore.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-surface-raised rounded-2xl p-1 gap-1">
          {(['login', 'signup'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); setInfo(null) }}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all active:scale-[0.97] ${
                mode === m ? 'bg-foreground text-surface shadow-sm' : 'text-muted'
              }`}
            >
              {m === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          ))}
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
            className="w-full px-4 py-4 bg-surface-raised rounded-2xl text-[14px] text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all"
          />
          <input
            type="password"
            placeholder="Password (minimo 6 caratteri)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full px-4 py-4 bg-surface-raised rounded-2xl text-[14px] text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all"
          />

          {error && (
            <div className="px-4 py-3 bg-red-50 rounded-2xl">
              <p className="text-[12px] text-red-500 leading-relaxed">{error}</p>
            </div>
          )}
          {info && (
            <div className="px-4 py-3 rounded-2xl" style={{ background: '#F0FDF4' }}>
              <p className="text-[12px] leading-relaxed" style={{ color: '#166534' }}>{info}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-1 bg-foreground text-surface rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? '···' : mode === 'login' ? 'Entra →' : 'Crea il tuo profilo →'}
          </button>
        </form>

        {/* Demo */}
        <div className="space-y-4">
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-subtle" />
            <span className="text-[11px] text-muted flex-shrink-0 uppercase tracking-[0.1em]">oppure</span>
            <div className="flex-1 h-px bg-subtle" />
          </div>
          <button
            type="button"
            onClick={handleDemo}
            className="w-full py-4 border border-subtle text-muted rounded-2xl text-[14px] font-medium transition-all active:scale-[0.98] hover:text-foreground hover:border-foreground/20"
          >
            Prova il demo — senza account
          </button>
        </div>

      </div>
    </div>
  )
}
