import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'

export default function Onboarding() {
  const navigate = useNavigate()
  const { fetchProfile } = useAuthStore()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim() || username.length < 2) return
    setError(null)
    setLoading(true)

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()

      if (userErr || !user) {
        navigate('/auth')
        return
      }

      const { error: insertErr } = await supabase.from('profiles').insert({
        id:           user.id,
        username:     username.toLowerCase().trim(),
        display_name: displayName.trim(),
      })

      if (insertErr) {
        if (insertErr.code === '23505') {
          setError('Username già in uso. Scegline un altro.')
        } else if (
          insertErr.message.toLowerCase().includes('failed') ||
          insertErr.message.toLowerCase().includes('network') ||
          insertErr.message.toLowerCase().includes('fetch')
        ) {
          setError(
            'Connessione al server non riuscita. ' +
            'Assicurati di avere internet oppure usa la modalità demo (torna al login e clicca "Prova il demo").'
          )
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
      if (msg.toLowerCase().includes('load') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        setError(
          'Connessione non riuscita (Load Failed). ' +
          'L\'app richiede Supabase configurato. Usa "Prova il demo" per testare senza account.'
        )
      } else {
        setError('Errore imprevisto: ' + msg)
      }
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-10">
          <div
            className="text-[11px] font-semibold tracking-[0.15em] uppercase mb-4"
            style={{ color: 'var(--color-muted)' }}
          >
            IRIDE
          </div>
          <h1
            className="text-[36px] font-bold leading-tight tracking-[-0.03em] mb-2"
            style={{ color: 'var(--color-foreground)' }}
          >
            Benvenuto.
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Come ti chiami nel tuo diario cromatico?
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handle} className="space-y-3">
          <input
            type="text"
            placeholder="Il tuo nome"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            autoFocus
            className="w-full px-5 py-4 rounded-2xl text-[14px] text-foreground placeholder:text-muted focus:outline-none transition-all"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1.5px solid var(--color-subtle)',
              boxShadow: '0 1px 4px rgba(28,25,23,0.05)',
            }}
          />
          <div className="relative">
            <span
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[14px] select-none"
              style={{ color: 'var(--color-muted)' }}
            >
              @
            </span>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              required
              maxLength={30}
              className="w-full pl-10 pr-5 py-4 rounded-2xl text-[14px] text-foreground placeholder:text-muted focus:outline-none transition-all"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1.5px solid var(--color-subtle)',
                boxShadow: '0 1px 4px rgba(28,25,23,0.05)',
              }}
            />
          </div>

          {error && (
            <div
              className="px-4 py-3 rounded-2xl"
              style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}
            >
              <p className="text-[12px] leading-relaxed" style={{ color: '#BE123C' }}>
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !displayName.trim() || username.length < 2}
            className="w-full py-4 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              background: 'var(--color-foreground)',
              color: 'var(--color-surface)',
              marginTop: 8,
            }}
          >
            {loading ? '···' : 'Inizia il diario →'}
          </button>
        </form>

      </div>
    </div>
  )
}
