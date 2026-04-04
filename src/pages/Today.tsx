import { useEffect, useState } from 'react'
import { useMoodStore } from '../store/useMoodStore'
import { useAuthStore } from '../store/useAuthStore'
import { MOOD_PALETTE } from '../constants/moods'
import { MONTH_FULL } from '../lib/dateUtils'
import type { MoodColor } from '../constants/moods'

const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

function formatDate(d: Date) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_FULL[d.getMonth()]}`
}

interface Selection {
  hex: string
  label: string | null
  source: 'palette' | 'custom'
}

// Determine if text on a background should be light or dark
function needsLightText(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.55
}

export default function Today() {
  const { profile, signOut } = useAuthStore()
  const { todayEntry, fetchTodayEntry, saveTodayEntry } = useMoodStore()
  const [loaded, setLoaded]           = useState(false)
  const [selected, setSelected]       = useState<Selection | null>(null)
  const [customHex, setCustomHex]     = useState('#3A86FF')
  const [showCustom, setShowCustom]   = useState(false)
  const [confirming, setConfirming]   = useState(false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)

  const today = new Date()

  useEffect(() => {
    if (profile) {
      fetchTodayEntry(profile.id).then(() => setLoaded(true))
    }
  }, [profile])

  const handleSelectMood = (mood: MoodColor) => {
    setSelected({ hex: mood.hex, label: mood.label, source: 'palette' })
    setShowCustom(false)
  }

  const handleCustomChange = (hex: string) => {
    setCustomHex(hex)
    setSelected({ hex, label: null, source: 'custom' })
  }

  const handleConfirm = async () => {
    if (!selected || !profile) return
    setSaving(true)
    const { error: err } = await saveTodayEntry(
      profile.id, selected.hex, selected.label, selected.source
    )
    if (err) setError(err)
    setConfirming(false)
    setSaving(false)
  }

  const initial = profile?.display_name?.[0]?.toUpperCase() ?? '?'

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD000', animation: 'ping 1s infinite' }} />
      </div>
    )
  }

  // ─── Entry already saved ────────────────────────────────────────────────────
  if (todayEntry) {
    const lightText = needsLightText(todayEntry.color_hex)
    return (
      <div className="page-top page-bottom flex flex-col min-h-screen px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted">
              {formatDate(today)}
            </p>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-sm font-semibold text-foreground border border-subtle"
          >
            {initial}
          </button>
        </div>

        {/* Color hero */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div
            className="w-full rounded-3xl flex flex-col items-center justify-center"
            style={{
              backgroundColor: todayEntry.color_hex,
              aspectRatio: '1/1',
              maxWidth: 280,
            }}
          >
            {todayEntry.mood_label && (
              <p style={{
                fontSize: 22,
                fontWeight: 300,
                color: lightText ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}>
                {todayEntry.mood_label}
              </p>
            )}
            <p style={{
              fontSize: 11,
              fontWeight: 400,
              fontFamily: 'monospace',
              color: lightText ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)',
              marginTop: 6,
            }}>
              {todayEntry.color_hex.toUpperCase()}
            </p>
          </div>

          <p className="text-xs text-muted text-center leading-relaxed">
            Il tuo colore di oggi è custodito.<br />
            Torna domani.
          </p>
        </div>

        {/* Profile sheet */}
        {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} onSignOut={signOut} profile={profile} />}
      </div>
    )
  }

  // ─── Choose color ────────────────────────────────────────────────────────────
  return (
    <div className="page-top page-bottom flex flex-col min-h-screen px-5">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted mb-1">
            {formatDate(today)}
          </p>
          <h1 className="text-[26px] font-semibold leading-tight text-foreground tracking-tight">
            Come ti senti<br />oggi?
          </h1>
        </div>
        <button
          onClick={() => setShowProfile(true)}
          className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-sm font-semibold text-foreground border border-subtle mt-1"
        >
          {initial}
        </button>
      </div>

      {/* Selected pill */}
      {selected && (
        <div className="flex items-center gap-3 mb-5 py-3 px-4 rounded-2xl border border-subtle bg-surface-raised">
          <div
            className="w-7 h-7 rounded-lg flex-shrink-0"
            style={{ backgroundColor: selected.hex }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground">
              {selected.label ?? 'Colore personalizzato'}
            </p>
            <p className="text-[11px] text-muted font-mono">{selected.hex.toUpperCase()}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted flex-shrink-0">
            <path d="M7 2l5 5-5 5M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      {/* Palette 5×4 grid — 20 moods, mood name below each */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
        marginBottom: 4,
      }}>
        {MOOD_PALETTE.map(mood => {
          const isSelected = selected?.hex === mood.hex
          return (
            <button
              key={mood.hex}
              onClick={() => handleSelectMood(mood)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <div style={{
                width: '100%',
                paddingTop: '100%',
                borderRadius: 14,
                backgroundColor: mood.hex,
                position: 'relative',
                transition: 'transform 0.12s, box-shadow 0.12s',
                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                boxShadow: isSelected
                  ? `0 0 0 2.5px var(--color-surface), 0 0 0 4.5px ${mood.hex}, 0 4px 16px ${mood.hex}55`
                  : '0 1px 4px rgba(0,0,0,0.10)',
              }} />
              <p style={{
                fontSize: 8.5,
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? 'var(--color-foreground)' : 'var(--color-muted)',
                textAlign: 'center',
                marginTop: 4,
                lineHeight: 1.2,
                letterSpacing: '0.01em',
                fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'color 0.12s, font-weight 0.12s',
              }}>
                {mood.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Custom color */}
      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={() => {
            const next = !showCustom
            setShowCustom(next)
            if (next) setSelected({ hex: customHex, label: null, source: 'custom' })
          }}
          className="flex items-center gap-3 text-sm text-muted hover:text-foreground transition-colors"
        >
          <div
            className="w-8 h-8 rounded-xl border border-subtle flex-shrink-0"
            style={{ backgroundColor: customHex }}
          />
          <span className="text-[13px]">Colore personalizzato</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto flex-shrink-0">
            <path d={showCustom ? 'M2 9l5-5 5 5' : 'M2 5l5 5 5-5'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>

        {showCustom && (
          <div className="flex items-center gap-3 pl-1">
            <input
              type="color"
              value={customHex}
              onChange={e => handleCustomChange(e.target.value)}
              style={{ width: 44, height: 44, borderRadius: 12, cursor: 'pointer', flexShrink: 0 }}
            />
            <input
              type="text"
              value={customHex}
              onChange={e => {
                const v = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                  setCustomHex(v)
                  if (v.length === 7) handleCustomChange(v)
                }
              }}
              className="px-3 py-2.5 bg-surface-raised rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
              style={{ width: 110 }}
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

      {/* CTA */}
      <div className="mt-6">
        <button
          onClick={() => setConfirming(true)}
          disabled={!selected}
          className="w-full py-4 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-20"
          style={{
            backgroundColor: selected?.hex ?? 'var(--color-foreground)',
            color: selected ? (needsLightText(selected.hex) ? '#FFFFFF' : '#1A1A1A') : '#FFFFFF',
          }}
        >
          {selected?.label ? `Oggi mi sento ${selected.label}` : 'Scegli un colore'}
        </button>
      </div>

      {/* Confirmation sheet */}
      {confirming && selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
            padding: '0 0 max(env(safe-area-inset-bottom), 12px) 0',
          }}
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-md mx-4 bg-surface rounded-3xl overflow-hidden"
            style={{ boxShadow: '0 -4px 60px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Color band */}
            <div style={{
              backgroundColor: selected.hex,
              height: 120,
              display: 'flex',
              alignItems: 'flex-end',
              padding: '0 28px 20px',
            }}>
              <p style={{
                fontSize: 28,
                fontWeight: 600,
                color: needsLightText(selected.hex) ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.80)',
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1,
              }}>
                {selected.label ?? 'Colore personalizzato'}
              </p>
            </div>

            <div className="px-7 py-6 space-y-5">
              <p className="text-sm text-muted leading-relaxed">
                Stai per registrare il colore di oggi.<br />
                <strong className="text-foreground font-medium">Questa scelta è definitiva</strong> e non potrà essere modificata.
              </p>
              <p className="text-[11px] font-mono text-muted/60">{selected.hex.toUpperCase()}</p>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-3.5 rounded-2xl border border-subtle text-[14px] text-foreground font-medium active:scale-[0.98] transition-transform"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-all disabled:opacity-60"
                  style={{
                    backgroundColor: selected.hex,
                    color: needsLightText(selected.hex) ? '#FFFFFF' : '#1A1A1A',
                  }}
                >
                  {saving ? '···' : 'Conferma'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile sheet */}
      {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} onSignOut={signOut} profile={profile} />}
    </div>
  )
}

// ─── Profile bottom sheet ────────────────────────────────────────────────────
function ProfileSheet({
  profile, onClose, onSignOut,
}: {
  profile: { display_name: string; username: string } | null
  onClose: () => void
  onSignOut: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', padding: '0 0 max(env(safe-area-inset-bottom), 12px) 0' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 bg-surface rounded-3xl p-6 space-y-5"
        style={{ boxShadow: '0 -4px 60px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Profile info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-raised border border-subtle flex items-center justify-center text-lg font-semibold text-foreground">
            {profile?.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-foreground">{profile?.display_name}</p>
            <p className="text-sm text-muted">@{profile?.username}</p>
          </div>
        </div>

        <div className="h-px bg-subtle" />

        <button
          onClick={() => { onSignOut(); onClose() }}
          className="w-full py-3.5 rounded-2xl border border-subtle text-[14px] font-medium text-foreground active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Esci dall'account
        </button>
      </div>
    </div>
  )
}
