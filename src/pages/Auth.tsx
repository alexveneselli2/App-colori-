import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { enterDemo, getDemoProfile } from '../lib/demo'

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
  const [mode, setMode]     = useState<'login' | 'signup'>('login')
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [info, setInfo]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const configured = isSupabaseConfigured()

  const handleDemo = () => {
    enterDemo()
    setProfile(getDemoProfile())
    setGlobalLoading(false)
    navigate('/')
  }

  const translateError = (msg: string): string => {
    if (msg.includes('Invalid login credentials'))  return 'Email o password non corretti.'
    if (msg.includes('Email not confirmed'))         return 'Devi confermare la tua email. Controlla la casella di posta.'
    if (msg.includes('User already registered'))     return 'Esiste già un account con questa email. Prova ad accedere.'
    if (msg.includes('Password should be at least')) return 'La password deve essere di almeno 6 caratteri.'
    if (msg.includes('Unable to validate email'))    return 'Formato email non valido.'
    if (/load failed|network|fetch|failed to fetch/i.test(msg))
      return 'Connessione a Supabase non riuscita. Verifica le credenziali in .env.local oppure usa la demo.'
    return msg
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configured) {
      setError('Supabase non configurato. Usa la modalità demo per esplorare l\'app, oppure configura le credenziali.')
      return
    }
    setError(null)
    setInfo(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (err) {
          setError(translateError(err.message))
        } else if (data.user) {
          const profile = await fetchProfile(data.user.id)
          if (!profile) navigate('/onboarding')
        }
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password: pass })
        if (err) {
          setError(translateError(err.message))
        } else if (data.user) {
          if (data.session) {
            // Email confirmation disabled in Supabase → go straight to onboarding
            navigate('/onboarding')
          } else {
            // Email confirmation required
            setInfo('Quasi fatto! Controlla la tua email e clicca il link di conferma. Poi torna qui e accedi.')
            setMode('login')
            setPass('')
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(translateError(msg))
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface)' }}>

      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-10">
        <div className="w-full max-w-[340px]">

          {/* Mood orb arc */}
          <div className="flex items-end justify-center gap-2.5 mb-8" aria-hidden>
            {BRAND_ORBS.map(({ hex, y }, i) => (
              <div
                key={hex}
                className="animate-float"
                style={{
                  width: 28, height: 28,
                  borderRadius: '50%',
                  backgroundColor: hex,
                  transform: `translateY(${y}px)`,
                  boxShadow: `0 4px 16px ${hex}60, 0 1px 4px ${hex}40`,
                  flexShrink: 0,
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>

          {/* Brand */}
          <div className="mb-8">
            <h1
              className="text-[54px] font-extrabold leading-none tracking-[-0.05em] mb-3"
              style={{
                background: 'var(--brand-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Iride
            </h1>
            <p className="text-[16px] leading-snug font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Il diario del tuo animo,<br />in colori.
            </p>
            <p className="text-[13px] mt-1.5" style={{ color: 'var(--color-muted)' }}>
              Un colore ogni giorno. Per sempre.
            </p>
          </div>

          {/* Supabase not configured banner */}
          {!configured && (
            <div className="mb-5 px-4 py-3.5 rounded-2xl" style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
              <p className="text-[12px] font-semibold mb-1" style={{ color: '#92400E' }}>
                Supabase non configurato
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#B45309' }}>
                Per usare auth reale, aggiungi <code style={{ fontSize: 10, background: '#FEF3C7', padding: '1px 4px', borderRadius: 4 }}>VITE_SUPABASE_URL</code> e <code style={{ fontSize: 10, background: '#FEF3C7', padding: '1px 4px', borderRadius: 4 }}>VITE_SUPABASE_ANON_KEY</code> nei GitHub Secrets. Puoi comunque usare la demo qui sotto.
              </p>
            </div>
          )}

          {/* Mode tabs */}
          <div className="flex p-1 gap-1 rounded-2xl mb-5" style={{ background: 'var(--color-subtle)' }}>
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setInfo(null) }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: mode === m ? 'var(--color-surface-raised)' : 'transparent',
                  color:      mode === m ? 'var(--color-foreground)'     : 'var(--color-muted)',
                  boxShadow:  mode === m ? 'var(--shadow-xs)'            : undefined,
                  opacity:    !configured ? 0.5 : 1,
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
              disabled={!configured}
              autoComplete="email"
              className="w-full px-5 py-4 rounded-2xl text-[14px] focus:outline-none transition-all disabled:opacity-40"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1.5px solid var(--color-subtle)',
                color: 'var(--color-foreground)',
                boxShadow: 'var(--shadow-xs)',
              }}
            />
            <input
              type="password"
              placeholder="Password (min. 6 caratteri)"
              value={pass}
              onChange={e => setPass(e.target.value)}
              required
              minLength={6}
              disabled={!configured}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-5 py-4 rounded-2xl text-[14px] focus:outline-none transition-all disabled:opacity-40"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1.5px solid var(--color-subtle)',
                color: 'var(--color-foreground)',
                boxShadow: 'var(--shadow-xs)',
              }}
            />

            {error && (
              <div className="px-4 py-3 rounded-2xl" style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}>
                <p className="text-[12px] leading-relaxed" style={{ color: '#BE123C' }}>{error}</p>
              </div>
            )}
            {info && (
              <div className="px-4 py-3 rounded-2xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p className="text-[12px] leading-relaxed" style={{ color: '#166534' }}>{info}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !configured}
              className="w-full py-4 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                background: 'var(--color-foreground)',
                color: 'var(--color-surface)',
                boxShadow: '0 4px 20px rgba(28,25,23,0.18)',
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
            className="w-full py-4 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: 'var(--color-surface-raised)',
              color: 'var(--color-foreground)',
              border: '1.5px solid var(--color-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ fontSize: 16 }}>✦</span>
            Prova il demo — senza account
          </button>

        </div>
      </div>

      <p className="text-center pb-8 text-[11px] tracking-[0.1em] uppercase" style={{ color: 'var(--color-muted)', opacity: 0.4 }}>
        Iride · Ogni giorno, un colore
      </p>
    </div>
  )
}
