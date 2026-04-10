import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore, type OAuthProvider } from '../store/useAuthStore'
import { enterDemo, getDemoProfile } from '../lib/demo'
import { getPlatform } from '../lib/device'

const BRAND_ORBS = [
  { hex: '#FFD000', y: -6 },
  { hex: '#FF6B00', y: -12 },
  { hex: '#FF0A54', y: -14 },
  { hex: '#C77DFF', y: -10 },
  { hex: '#00B4D8', y: -4 },
  { hex: '#52B788', y: 2 },
  { hex: '#2D6A4F', y: 6 },
]

const FEATURES = [
  {
    color: '#FFD000',
    title: 'Un colore al giorno',
    desc: 'Scegli ogni mattina il colore che racconta come ti senti. Una scelta sola, custodita per sempre.',
  },
  {
    color: '#00B4D8',
    title: 'La tua storia in un\'immagine',
    desc: 'Settimane, mesi, anni di emozioni diventano un archivio cromatico unico e bellissimo.',
  },
  {
    color: '#FF0A54',
    title: 'Condividi con il mondo',
    desc: 'Genera poster pronti per Instagram — feed 1:1 o story 9:16 — con il tuo stile personale.',
  },
]

// Provider OAuth ordinati per device.
// iOS → Apple primo. Altrove → Google primo.
// Facebook è incluso come provider Meta (Instagram non è nativamente supportato
// da Supabase: richiede OAuth custom + Meta Business verification).
function getProviderOrder(): OAuthProvider[] {
  const p = getPlatform()
  if (p === 'ios') return ['apple', 'google', 'facebook']
  return ['google', 'apple', 'facebook']
}

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google:   'Continua con Google',
  apple:    'Continua con Apple',
  facebook: 'Continua con Facebook',
}

export default function Auth() {
  const navigate = useNavigate()
  const { fetchProfile, setProfile, setLoading: setGlobalLoading, signInWithProvider } = useAuthStore()
  const [mode, setMode]       = useState<'login' | 'signup'>('signup')
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [info, setInfo]       = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)

  const configured = isSupabaseConfigured()
  const providers  = getProviderOrder()

  const handleOAuth = async (provider: OAuthProvider) => {
    if (!configured) {
      setError('Backend non configurato. Usa la modalità demo per esplorare l\'app.')
      return
    }
    setError(null)
    setOauthLoading(provider)
    const { error: err } = await signInWithProvider(provider)
    if (err) {
      setError(`Login con ${provider} fallito: ${err}`)
      setOauthLoading(null)
    }
    // In caso di successo Supabase reindirizza alla pagina del provider.
    // Lo state oauthLoading resta attivo fino al redirect.
  }

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
      return 'Connessione non riuscita. Usa la demo per esplorare l\'app.'
    return msg
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configured) {
      setError('Supabase non configurato. Usa la modalità demo per esplorare l\'app.')
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
            navigate('/onboarding')
          } else {
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-14 pb-10">
        <div className="w-full max-w-[360px]">

          {/* Orb arc */}
          <div className="flex items-end justify-center gap-2.5 mb-7" aria-hidden>
            {BRAND_ORBS.map(({ hex, y }, i) => (
              <div
                key={hex}
                className="animate-float"
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  backgroundColor: hex,
                  transform: `translateY(${y}px)`,
                  boxShadow: `0 4px 16px ${hex}60`,
                  flexShrink: 0,
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>

          {/* Brand */}
          <div className="mb-6 text-center">
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
            <p className="text-[18px] font-bold leading-tight tracking-[-0.02em]" style={{ color: 'var(--color-foreground)' }}>
              Il diario che parla<br />per colori
            </p>
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              Ogni giorno scegli un colore che racconta<br />il tuo stato d'animo. Semplice. Bello. Tuo.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-2.5 mb-7">
            {FEATURES.map(f => (
              <div
                key={f.color}
                className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
                style={{
                  background: `${f.color}0E`,
                  border: `1.5px solid ${f.color}28`,
                }}
              >
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: f.color,
                  flexShrink: 0,
                  marginTop: 4,
                  boxShadow: `0 0 8px ${f.color}70`,
                }} />
                <div>
                  <p className="text-[13px] font-bold leading-tight mb-0.5" style={{ color: 'var(--color-foreground)' }}>
                    {f.title}
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Supabase not configured banner */}
          {!configured && (
            <div className="mb-5 px-4 py-3.5 rounded-2xl" style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
              <p className="text-[12px] font-semibold mb-1" style={{ color: '#92400E' }}>
                Backend non configurato
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#B45309' }}>
                Per usare l'auth reale aggiungi i GitHub Secrets. Puoi comunque esplorare tutto con la demo.
              </p>
            </div>
          )}

          {/* OAuth providers — primario + secondari */}
          <div className="space-y-2.5 mb-4">
            {providers.map((p, i) => {
              const isPrimary = i === 0
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleOAuth(p)}
                  disabled={oauthLoading !== null || !configured}
                  className="w-full py-4 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50"
                  style={{
                    background: isPrimary ? 'var(--color-foreground)' : 'var(--color-surface-raised)',
                    color:      isPrimary ? 'var(--color-surface)'    : 'var(--color-foreground)',
                    border:     isPrimary ? 'none'                    : '1.5px solid var(--color-subtle)',
                    boxShadow:  isPrimary ? '0 6px 24px rgba(28,25,23,0.18)' : 'var(--shadow-xs)',
                  }}
                >
                  <ProviderIcon provider={p} dark={isPrimary} />
                  {oauthLoading === p ? '···' : PROVIDER_LABELS[p]}
                </button>
              )
            })}
          </div>

          {/* Demo CTA — secondario */}
          <button
            type="button"
            onClick={handleDemo}
            className="w-full py-3.5 rounded-2xl text-[13px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-3"
            style={{
              background: 'transparent',
              color: 'var(--color-muted)',
              border: '1.5px dashed var(--color-subtle)',
            }}
          >
            <span>✦</span>
            Prova senza account (demo)
          </button>

          {error && (
            <div className="mb-3 px-4 py-3 rounded-2xl" style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}>
              <p className="text-[12px] leading-relaxed" style={{ color: '#BE123C' }}>{error}</p>
            </div>
          )}
          {info && (
            <div className="mb-3 px-4 py-3 rounded-2xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <p className="text-[12px] leading-relaxed" style={{ color: '#166534' }}>{info}</p>
            </div>
          )}

          {/* Email fallback — collassato */}
          {!showEmail ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="w-full text-[12px] py-2 transition-opacity active:opacity-60"
              style={{ color: 'var(--color-muted)', opacity: 0.7 }}
            >
              Preferisci usare email e password? →
            </button>
          ) : (
            <>
              <div className="relative flex items-center gap-3 mb-4 mt-2">
                <div className="flex-1 h-px" style={{ background: 'var(--color-subtle)' }} />
                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--color-muted)' }}>
                  email e password
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--color-subtle)' }} />
              </div>

              <div className="flex p-1 gap-1 rounded-2xl mb-3" style={{ background: 'var(--color-subtle)' }}>
                {(['signup', 'login'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(null); setInfo(null) }}
                    className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97]"
                    style={{
                      background: mode === m ? 'var(--color-surface-raised)' : 'transparent',
                      color:      mode === m ? 'var(--color-foreground)'     : 'var(--color-muted)',
                      boxShadow:  mode === m ? 'var(--shadow-xs)'            : undefined,
                    }}
                  >
                    {m === 'signup' ? 'Crea account' : 'Accedi'}
                  </button>
                ))}
              </div>

              <form onSubmit={handle} className="space-y-2.5">
                <input
                  type="email"
                  placeholder="La tua email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={!configured}
                  autoComplete="email"
                  className="w-full px-5 py-3.5 rounded-2xl text-[14px] focus:outline-none transition-all disabled:opacity-40"
                  style={{
                    background: 'var(--color-surface-raised)',
                    border: '1.5px solid var(--color-subtle)',
                    color: 'var(--color-foreground)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                />
                <input
                  type="password"
                  placeholder={mode === 'signup' ? 'Password (min. 6 caratteri)' : 'Password'}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  required
                  minLength={6}
                  disabled={!configured}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-5 py-3.5 rounded-2xl text-[14px] focus:outline-none transition-all disabled:opacity-40"
                  style={{
                    background: 'var(--color-surface-raised)',
                    border: '1.5px solid var(--color-subtle)',
                    color: 'var(--color-foreground)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !configured}
                  className="w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    background: 'transparent',
                    border: '1.5px solid var(--color-subtle)',
                    color: 'var(--color-foreground)',
                  }}
                >
                  {loading ? '···' : mode === 'signup' ? 'Crea il mio profilo →' : 'Accedi →'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>

      <p className="text-center pb-8 text-[11px] tracking-[0.1em] uppercase" style={{ color: 'var(--color-muted)', opacity: 0.35 }}>
        Gratuito · Nessuna pubblicità · I tuoi dati sono tuoi
      </p>
    </div>
  )
}

// ─── Icone provider OAuth ────────────────────────────────────────────────────

function ProviderIcon({ provider, dark }: { provider: OAuthProvider; dark: boolean }) {
  const fill = dark ? '#F2EDE5' : '#1C1917'
  const size = 18
  switch (provider) {
    case 'google':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.22-4.74 3.22-8.32z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
      )
    case 'apple':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path fill={fill} d="M16.37 12.94c-.03-2.65 2.16-3.93 2.26-4-1.23-1.81-3.16-2.05-3.84-2.08-1.63-.17-3.18.96-4.01.96-.83 0-2.1-.94-3.46-.91-1.78.03-3.42 1.04-4.34 2.63-1.85 3.21-.47 7.95 1.33 10.55.88 1.27 1.93 2.7 3.31 2.65 1.33-.05 1.83-.86 3.44-.86 1.61 0 2.06.86 3.46.83 1.43-.03 2.34-1.3 3.22-2.58 1.01-1.48 1.43-2.91 1.45-2.99-.03-.01-2.78-1.07-2.82-4.2zm-2.65-7.71c.74-.89 1.23-2.13 1.1-3.36-1.06.04-2.34.71-3.1 1.6-.69.79-1.29 2.05-1.13 3.26 1.18.09 2.38-.6 3.13-1.5z"/>
        </svg>
      )
    case 'facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85V15.47H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.96h-1.52c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"/>
        </svg>
      )
  }
}
