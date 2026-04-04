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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/auth'); return }

    const { error: insertErr } = await supabase.from('profiles').insert({
      id:           user.id,
      username:     username.toLowerCase().trim(),
      display_name: displayName.trim(),
    })

    if (insertErr) {
      if (insertErr.code === '23505') setError('Username già in uso. Scegline un altro.')
      else setError(insertErr.message)
      setLoading(false)
      return
    }

    await fetchProfile(user.id)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-12">

        <div className="space-y-3">
          <h2 className="text-3xl font-light text-foreground">Benvenuto.</h2>
          <p className="text-sm text-muted leading-relaxed">
            Come vuoi chiamarti nel tuo diario?
          </p>
        </div>

        <form onSubmit={handle} className="space-y-3">
          <input
            type="text"
            placeholder="Il tuo nome"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            className="w-full px-4 py-3.5 bg-surface-raised rounded-2xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all"
          />
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm select-none">@</span>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={e => setUsername(
                e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')
              )}
              required
              maxLength={30}
              className="w-full pl-9 pr-4 py-3.5 bg-surface-raised rounded-2xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all"
            />
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !displayName.trim() || username.length < 2}
            className="w-full py-4 mt-1 bg-foreground text-surface rounded-2xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? '···' : 'Inizia il diario →'}
          </button>
        </form>

      </div>
    </div>
  )
}
