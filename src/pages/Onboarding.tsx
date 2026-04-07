import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { useT } from '../store/useLanguageStore'

const BRAND_GRADIENT = 'linear-gradient(110deg, #FFD000 0%, #FF6B00 20%, #FF0A54 38%, #C77DFF 55%, #00B4D8 72%, #52B788 88%)'

// Steps: name → username → location
type Step = 'name' | 'username' | 'location'

export default function Onboarding() {
  const navigate = useNavigate()
  const { fetchProfile } = useAuthStore()
  const t = useT()

  const [step, setStep] = useState<Step>('name')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername]       = useState('')
  const [city, setCity]               = useState('')
  const [locationConsent, setLocationConsent] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLocationToggle = async () => {
    if (locationConsent) {
      // Revoke consent
      setLocationConsent(false)
      return
    }
    // Request browser permission
    if (!navigator.geolocation) {
      setLocationConsent(true) // consent without GPS
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocationConsent(true),
      () => setLocationConsent(false) // denied → keep off
    )
  }

  const handleSubmit = async () => {
    if (!displayName.trim() || username.length < 2) return
    setError(null)
    setLoading(true)

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) { navigate('/auth'); return }

      const { error: insertErr } = await supabase.from('profiles').insert({
        id:               user.id,
        username:         username.toLowerCase().trim(),
        display_name:     displayName.trim(),
        city:             city.trim() || null,
        location_consent: locationConsent,
      })

      if (insertErr) {
        if (insertErr.code === '23505') {
          setError(t.ob_err_taken)
        } else if (/failed|network|fetch/i.test(insertErr.message)) {
          setError(t.ob_err_net)
        } else {
          setError(insertErr.message)
        }
        setLoading(false)
        return
      }

      await fetchProfile(user.id)
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(/load|network|fetch/i.test(msg)
        ? t.ob_err_demo
        : 'Error: ' + msg)
      setLoading(false)
    }
  }

  // ── Step: Name ────────────────────────────────────────────────────────────
  const StepName = () => (
    <div className="animate-fade-up space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--color-muted)' }}>
          {t.ob_step1}
        </p>
        <h2 className="text-[32px] font-extrabold tracking-[-0.04em] leading-tight mb-2" style={{ color: 'var(--color-foreground)' }}>
          {t.ob_name_title}
        </h2>
        <p className="text-[14px]" style={{ color: 'var(--color-muted)' }}>
          {t.ob_name_sub}
        </p>
      </div>
      <input
        type="text"
        placeholder={t.ob_name_ph}
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        autoFocus
        className="w-full px-5 py-4 rounded-2xl text-[15px] focus:outline-none transition-all"
        style={{
          background: 'var(--color-surface-raised)',
          border: '1.5px solid var(--color-subtle)',
          color: 'var(--color-foreground)',
          boxShadow: 'var(--shadow-sm)',
        }}
      />
      <button
        onClick={() => { if (displayName.trim()) setStep('username') }}
        disabled={!displayName.trim()}
        className="w-full py-4 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-30"
        style={{ background: 'var(--color-foreground)', color: 'var(--color-surface)' }}
      >
        {t.ob_next}
      </button>
    </div>
  )

  // ── Step: Username ────────────────────────────────────────────────────────
  const StepUsername = () => (
    <div className="animate-fade-up space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--color-muted)' }}>
          {t.ob_step2}
        </p>
        <h2 className="text-[32px] font-extrabold tracking-[-0.04em] leading-tight mb-2" style={{ color: 'var(--color-foreground)' }}>
          {t.ob_user_title}
        </h2>
        <p className="text-[14px]" style={{ color: 'var(--color-muted)' }}>
          {t.ob_user_sub}
        </p>
      </div>
      <div className="relative">
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: 'var(--color-muted)' }}>@</span>
        <input
          type="text"
          placeholder="username"
          value={username}
          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
          maxLength={30}
          autoFocus
          className="w-full pl-10 pr-5 py-4 rounded-2xl text-[15px] focus:outline-none transition-all"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1.5px solid var(--color-subtle)',
            color: 'var(--color-foreground)',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setStep('name')}
          className="flex-1 py-4 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]"
          style={{ background: 'var(--color-subtle)', color: 'var(--color-foreground)' }}
        >{t.ob_back}</button>
        <button
          onClick={() => { if (username.length >= 2) setStep('location') }}
          disabled={username.length < 2}
          className="flex-[2] py-4 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-30"
          style={{ background: 'var(--color-foreground)', color: 'var(--color-surface)' }}
        >{t.ob_next}</button>
      </div>
    </div>
  )

  // ── Step: Location ────────────────────────────────────────────────────────
  const StepLocation = () => (
    <div className="animate-fade-up space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--color-muted)' }}>
          {t.ob_step3}
        </p>
        <h2 className="text-[32px] font-extrabold tracking-[-0.04em] leading-tight mb-2" style={{ color: 'var(--color-foreground)' }}>
          {t.ob_loc_title}
        </h2>
        <p className="text-[14px]" style={{ color: 'var(--color-muted)' }}>
          {t.ob_loc_sub}
        </p>
      </div>

      {/* City field */}
      <input
        type="text"
        placeholder={t.ob_loc_ph}
        value={city}
        onChange={e => setCity(e.target.value)}
        autoFocus
        className="w-full px-5 py-4 rounded-2xl text-[15px] focus:outline-none transition-all"
        style={{
          background: 'var(--color-surface-raised)',
          border: '1.5px solid var(--color-subtle)',
          color: 'var(--color-foreground)',
          boxShadow: 'var(--shadow-sm)',
        }}
      />

      {/* Location permission toggle */}
      <div
        className="card p-5 flex items-start gap-4 cursor-pointer active:scale-[0.99] transition-transform"
        onClick={handleLocationToggle}
      >
        <div style={{
          width: 48, height: 28, borderRadius: 99, flexShrink: 0, position: 'relative',
          background: locationConsent
            ? BRAND_GRADIENT
            : 'var(--color-subtle)',
          transition: 'background 0.25s',
        }}>
          <div style={{
            position: 'absolute',
            top: 3, left: locationConsent ? 22 : 3,
            width: 22, height: 22, borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            transition: 'left 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--color-foreground)' }}>
            {t.ob_gps_title}
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {t.ob_gps_desc}
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-2xl" style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}>
          <p className="text-[12px] leading-relaxed" style={{ color: '#BE123C' }}>{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setStep('username')}
          className="flex-1 py-4 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]"
          style={{ background: 'var(--color-subtle)', color: 'var(--color-foreground)' }}
        >{t.ob_back}</button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-[2] py-4 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'var(--color-foreground)', color: 'var(--color-surface)' }}
        >
          {loading ? '···' : t.ob_start}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: 'var(--color-surface)' }}>
      <div className="w-full max-w-sm">

        {/* Brand wordmark */}
        <div className="mb-10">
          <span className="text-[13px] font-extrabold tracking-[-0.02em]" style={{
            background: BRAND_GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            IRIDE
          </span>
        </div>

        {/* Step indicator dots */}
        <div className="flex gap-1.5 mb-8">
          {(['name', 'username', 'location'] as Step[]).map(s => (
            <div key={s} style={{
              width: step === s ? 20 : 6,
              height: 6,
              borderRadius: 99,
              background: step === s
                ? BRAND_GRADIENT
                : 'var(--color-subtle)',
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          ))}
        </div>

        {step === 'name'     && <StepName />}
        {step === 'username' && <StepUsername />}
        {step === 'location' && <StepLocation />}
      </div>
    </div>
  )
}
