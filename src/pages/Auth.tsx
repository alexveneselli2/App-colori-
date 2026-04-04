import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { enterDemo, getDemoProfile } from '../lib/demo'

// Mood orbs displayed in the brand header — a snapshot of the palette
const BRAND_ORBS = [
  { hex: '#FFD000', y: -6 },
  { hex: '#FF6B00', y: -12 },
  { hex: '#FF0A54', y: -14 },
  { hex: '#C77DFF', y: -10 },
  { hex: '#00B4D8', y: -4 },
  { hex: '#52B788', y: 2 },
  { hex: '#2D6A4F', y: 6 },
]

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
    setProfile(getDemoProfile())
    setGlobalLoading(false)
    navigate('/')
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    if (mode === 'login') {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError(
          err.message.includes('Email not confirmed')
            ? 'Devi prima confermare la tua email. Controlla la casella di posta.'
            : 'Email o password non corretti.'
        )
      } else if (data.user) {
        const profile = await fetchProfile(data.user.id)
        if (!profile) navigate('/onboarding')
      }
    } else {
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) {
        setError(err.message)
      } else if (data.user) {
        if (data.session) {
          navigate('/onboarding')
        } else {
          setInfo('Quasi fatto! Controlla la tua email e clicca il link di conferma. Poi torna qui e accedi.')
          setMode('login')
        }
      }
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface)' }}
    >
      {/* Top brand section */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-10">
        <div className="w-full max-w-[340px]">

          {/* Mood orb decoration */}
          <div className="flex items-end justify-center gap-2.5 mb-8" aria-hidden>
            {BRAND_ORBS.map(({ hex, y }) => (
              <div
                key={hex}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: hex,
                  transform: `translateY(${y}px)`,
                  boxShadow: `0 4px 16px ${hex}60, 0 1px 4px ${hex}40`,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* Brand */}
          <div className="mb-8">
            <h1
              className="text-[52px] font-extrabold leading-none tracking-[-0.05em] mb-3"
              style={{
                background: 'var(--brand-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Iride
            </h1>
            <p className="text-[16px] leading-snug font-medium" style={{ color: 'var(--color-foreground)' }}>
              Il diario del tuo animo,<br />in colori.
            </p>
            <p className="text-[13px] mt-1.5" style={{ color: 'var(--color-muted)' }}>
              Un colore ogni giorno. Per sempre.
            </p>
          </div>

          {/* Mode tabs */}
          <div
            className="flex p-1 gap-1 rounded-2xl mb-5"
            style={{ background: 'var(--color-subtle)' }}
          >
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setInfo(null) }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: mode === m ? 'var(--color-surface-raised)' : 'transparent',
                  color: mode === m ? 'var(--color-foreground)' : 'var(--color-muted)',
                  boxShadow: mode === m ? 'var(--shadow-xs)' : undefined,
                }}
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
              className="w-full px-5 py-4 rounded-2xl text-[14px] text-foreground placeholder:text-muted focus:outline-none transition-all"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1.5px solid var(--color-subtle)',
                boxShadow: 'var(--shadow-xs)',
              }}
            />
            <input
              type="password"
              placeholder="Password (min. 6 caratteri)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-5 py-4 rounded-2xl text-[14px] text-foreground placeholder:text-muted focus:outline-none transition-all"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1.5px solid var(--color-subtle)',
                boxShadow: 'var(--shadow-xs)',
              }}
            />

            {error && (
              <div className="px-4 py-3 rounded-2xl animate-fade-in" style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}>
                <p className="text-[12px] leading-relaxed" style={{ color: '#BE123C' }}>{error}</p>
              </div>
            )}
            {info && (
              <div className="px-4 py-3 rounded-2xl animate-fade-in" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p className="text-[12px] leading-relaxed" style={{ color: '#166534' }}>{info}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                background: 'var(--color-foreground)',
                color: 'var(--color-surface)',
                boxShadow: '0 4px 20px rgba(28,25,23,0.20)',
                marginTop: 4,
              }}
            >
              {loading ? '···' : mode === 'login' ? 'Entra →' : 'Crea il profilo →'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--color-subtle)' }} />
            <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--color-muted)' }}>oppure</span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-subtle)' }} />
          </div>

          {/* Demo */}
          <button
            type="button"
            onClick={handleDemo}
            className="w-full py-4 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]"
            style={{
              background: 'var(--color-surface-raised)',
              color: 'var(--color-muted)',
              border: '1.5px solid var(--color-subtle)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            Prova il demo — senza account
          </button>

        </div>
      </div>

      {/* Bottom wordmark */}
      <p className="text-center pb-8 text-[11px] tracking-[0.1em] uppercase" style={{ color: 'var(--color-muted)', opacity: 0.5 }}>
        Iride · Ogni giorno, un colore
      </p>
    </div>
  )
}
