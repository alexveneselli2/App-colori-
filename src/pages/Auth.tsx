import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore, type OAuthProvider } from '../store/useAuthStore'
import { enterDemo, getDemoProfile } from '../lib/demo'
import { getPlatform } from '../lib/device'
import { useT } from '../lib/i18n'

const BRAND = 'linear-gradient(110deg, #FFD000 0%, #FF6B00 20%, #FF0A54 38%, #C77DFF 55%, #00B4D8 72%, #52B788 88%)'

const DOT_COLORS = ['#FFD000', '#FF6B00', '#FF0A54', '#C77DFF', '#00B4D8', '#52B788']

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
  google:   'Google',
  apple:    'Apple',
  facebook: 'Facebook',
}

export default function Auth() {
  const navigate = useNavigate()
  const { fetchProfile, setProfile, setLoading: setGlobalLoading, signInWithProvider } = useAuthStore()
  const t = useT()
  const [mode, setMode]       = useState<'login' | 'signup'>('login')
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [info, setInfo]       = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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
    // Su successo Supabase reindirizza al provider; oauthLoading resta attivo.
  }

  const handleDemo = () => {
    enterDemo()
    setProfile(getDemoProfile())
    setGlobalLoading(false)
    navigate('/')
  }

  const translateError = (msg: string): string => {
    if (msg.includes('Invalid login credentials'))  return t.auth_err_creds
    if (msg.includes('Email not confirmed'))         return t.auth_err_confirm
    if (msg.includes('User already registered'))     return t.auth_err_exists
    if (msg.includes('Password should be at least')) return t.auth_err_short
    if (msg.includes('Unable to validate email'))    return t.auth_err_email
    if (/load failed|network|fetch|failed to fetch/i.test(msg))
      return t.auth_err_net
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
            setInfo(t.auth_info_confirm)
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
    <div style={{
      minHeight: '100dvh',
      background: '#05050F',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @keyframes authOrbDrift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(20px,-30px) scale(1.06); }
          70%     { transform: translate(-14px,18px) scale(0.95); }
        }
        @keyframes authOrbDrift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          35%     { transform: translate(-22px,24px) scale(0.94); }
          65%     { transform: translate(18px,-20px) scale(1.05); }
        }
        @keyframes authIn {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes authShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes dotFloat {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-5px); }
        }
        .auth-input {
          width: 100%;
          padding: 15px 18px;
          border-radius: 16px;
          font-size: 14px;
          font-family: Inter, system-ui, sans-serif;
          outline: none;
          background: rgba(255,255,255,0.07);
          border: 1.5px solid rgba(255,255,255,0.10);
          color: #FFFFFF;
          transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.32); }
        .auth-input:focus {
          border-color: rgba(255,255,255,0.30);
          background: rgba(255,255,255,0.11);
        }
        .auth-input:disabled { opacity: 0.35; }
        .auth-oauth {
          width: 100%;
          padding: 13px 0;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 700;
          font-family: Inter, system-ui, sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.2s, transform 0.15s, opacity 0.2s;
        }
        .auth-oauth:hover:not(:disabled) { background: rgba(255,255,255,0.10); }
        .auth-oauth:active:not(:disabled) { transform: scale(0.98); }
        .auth-oauth:disabled { opacity: 0.4; cursor: default; }
      `}</style>

      {/* Background orbs */}
      <div style={{
        position: 'absolute', width: 420, height: 420, borderRadius: '50%',
        backgroundColor: '#C77DFF', opacity: 0.13, filter: 'blur(100px)',
        top: '-8%', right: '-18%',
        animation: 'authOrbDrift1 10s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 380, height: 380, borderRadius: '50%',
        backgroundColor: '#FFD000', opacity: 0.11, filter: 'blur(100px)',
        bottom: '5%', left: '-14%',
        animation: 'authOrbDrift2 13s ease-in-out infinite 1.5s',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 280, height: 280, borderRadius: '50%',
        backgroundColor: '#00B4D8', opacity: 0.10, filter: 'blur(80px)',
        bottom: '30%', right: '5%',
        animation: 'authOrbDrift1 8s ease-in-out infinite 3s',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 28px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>

          {/* IRIDE wordmark */}
          <div style={{
            fontSize: 'clamp(72px, 20vw, 96px)',
            fontWeight: 900,
            letterSpacing: '-0.07em',
            lineHeight: 0.88,
            background: BRAND,
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: 'Inter, system-ui, sans-serif',
            animation: 'authIn 0.6s cubic-bezier(0.22,1,0.36,1) both, authShimmer 4s linear infinite',
            marginBottom: 18,
          }}>
            IRIDE
          </div>

          {/* Tagline */}
          <p style={{
            fontSize: 20, fontWeight: 700, color: '#FFFFFF',
            letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.25,
            animation: 'authIn 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            {t.auth_tagline}
          </p>
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginBottom: 10,
            animation: 'authIn 0.6s 0.18s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            {t.auth_desc.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 ? <br /> : null}</span>
            ))}
          </p>

          {/* Color dots */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 36,
            animation: 'authIn 0.6s 0.26s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            {DOT_COLORS.map((c, i) => (
              <div key={c} style={{
                width: 9, height: 9, borderRadius: '50%', backgroundColor: c,
                animation: `dotFloat ${2.5 + i * 0.3}s ${i * 0.15}s ease-in-out infinite`,
                boxShadow: `0 0 8px ${c}80`,
              }} />
            ))}
          </div>

          {/* Form card */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.09)',
            padding: '20px 20px 24px',
            animation: 'authIn 0.7s 0.32s cubic-bezier(0.22,1,0.36,1) both',
          }}>

            {/* Supabase not configured banner */}
            {!configured && (
              <div style={{
                marginBottom: 16, padding: '12px 14px', borderRadius: 14,
                background: 'rgba(251,197,7,0.12)', border: '1px solid rgba(251,197,7,0.25)',
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#FCD34D', marginBottom: 4 }}>
                  {t.auth_supa_title}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  {t.auth_supa_desc}
                </p>
              </div>
            )}

            {/* OAuth providers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {providers.map(p => (
                <button
                  key={p}
                  type="button"
                  className="auth-oauth"
                  onClick={() => handleOAuth(p)}
                  disabled={oauthLoading !== null || !configured}
                >
                  <ProviderIcon provider={p} />
                  {oauthLoading === p ? '···' : `${t.auth_continue_with} ${PROVIDER_LABELS[p]}`}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 12px',
            }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
              <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.32)', fontWeight: 600 }}>
                {t.auth_or_email}
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
            </div>

            {/* Mode tabs */}
            <div style={{
              display: 'flex', padding: 4, gap: 4, borderRadius: 14, marginBottom: 12,
              background: 'rgba(255,255,255,0.07)',
            }}>
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); setInfo(null) }}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif',
                    transition: 'all 0.2s',
                    background: mode === m ? 'rgba(255,255,255,0.14)' : 'transparent',
                    color: mode === m ? '#FFFFFF' : 'rgba(255,255,255,0.40)',
                    opacity: !configured ? 0.5 : 1,
                  }}
                >
                  {m === 'login' ? t.auth_login : t.auth_signup}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="auth-input"
                type="email"
                placeholder={t.auth_email}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={!configured}
                autoComplete="email"
              />
              <input
                className="auth-input"
                type="password"
                placeholder={t.auth_pass}
                value={pass}
                onChange={e => setPass(e.target.value)}
                required
                minLength={6}
                disabled={!configured}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(190,18,60,0.18)', border: '1px solid rgba(190,18,60,0.35)',
                }}>
                  <p style={{ fontSize: 12, color: '#FCA5A5', lineHeight: 1.5 }}>{error}</p>
                </div>
              )}
              {info && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(22,163,74,0.18)', border: '1px solid rgba(22,163,74,0.35)',
                }}>
                  <p style={{ fontSize: 12, color: '#86EFAC', lineHeight: 1.5 }}>{info}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !configured}
                style={{
                  width: '100%', padding: '15px 0', borderRadius: 16, border: 'none',
                  fontSize: 15, fontWeight: 800, fontFamily: 'Inter, system-ui, sans-serif',
                  cursor: loading || !configured ? 'default' : 'pointer',
                  background: BRAND, backgroundSize: '200% auto',
                  color: '#FFFFFF',
                  boxShadow: '0 8px 32px rgba(255,107,0,0.35)',
                  transition: 'opacity 0.2s, transform 0.15s',
                  opacity: loading || !configured ? 0.45 : 1,
                  marginTop: 4,
                }}
              >
                {loading ? '···' : mode === 'login' ? t.auth_enter : t.auth_create}
              </button>
            </form>
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0',
            animation: 'authIn 0.6s 0.44s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
            <span style={{ fontSize: 11, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', fontWeight: 600 }}>OPPURE</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
          </div>

          {/* Demo button */}
          <button
            type="button"
            onClick={handleDemo}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 16, border: '1.5px solid rgba(255,255,255,0.14)',
              fontSize: 14, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              color: 'rgba(255,255,255,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              animation: 'authIn 0.6s 0.5s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            <span style={{ fontSize: 15 }}>✦</span>
            {t.auth_demo}
          </button>

          <p style={{
            textAlign: 'center', marginTop: 24,
            fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.15)',
            fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif',
            animation: 'authIn 0.6s 0.58s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            {t.auth_footer}
          </p>

        </div>
      </div>
    </div>
  )
}

// ─── Icone provider OAuth ────────────────────────────────────────────────────

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
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
          <path fill="#FFFFFF" d="M16.37 12.94c-.03-2.65 2.16-3.93 2.26-4-1.23-1.81-3.16-2.05-3.84-2.08-1.63-.17-3.18.96-4.01.96-.83 0-2.1-.94-3.46-.91-1.78.03-3.42 1.04-4.34 2.63-1.85 3.21-.47 7.95 1.33 10.55.88 1.27 1.93 2.7 3.31 2.65 1.33-.05 1.83-.86 3.44-.86 1.61 0 2.06.86 3.46.83 1.43-.03 2.34-1.3 3.22-2.58 1.01-1.48 1.43-2.91 1.45-2.99-.03-.01-2.78-1.07-2.82-4.2zm-2.65-7.71c.74-.89 1.23-2.13 1.1-3.36-1.06.04-2.34.71-3.1 1.6-.69.79-1.29 2.05-1.13 3.26 1.18.09 2.38-.6 3.13-1.5z"/>
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
