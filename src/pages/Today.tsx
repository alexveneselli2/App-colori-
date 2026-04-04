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

function needsLightText(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55
}

function blendHex(hex1: string, hex2: string, t: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16)
  const f = t / 100
  const r = Math.round(r1 + (r2 - r1) * f)
  const g = Math.round(g1 + (g2 - g1) * f)
  const b = Math.round(b1 + (b2 - b1) * f)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

interface Selection {
  hex: string
  label: string | null
  source: 'palette' | 'custom'
}

export default function Today() {
  const { profile, signOut } = useAuthStore()
  const { entries, todayEntry, fetchTodayEntry, saveTodayEntry, fetchEntries } = useMoodStore()
  const [loaded, setLoaded]           = useState(false)
  const [selected, setSelected]       = useState<Selection | null>(null)
  const [customHex, setCustomHex]     = useState('#3A86FF')
  const [showCustom, setShowCustom]   = useState(false)
  const [showBlend, setShowBlend]     = useState(false)
  const [blendA, setBlendA]           = useState<MoodColor | null>(null)
  const [blendB, setBlendB]           = useState<MoodColor | null>(null)
  const [blendRatio, setBlendRatio]   = useState(50)
  const [confirming, setConfirming]   = useState(false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)

  const today = new Date()

  useEffect(() => {
    if (profile) {
      Promise.all([
        fetchTodayEntry(profile.id),
        entries.length === 0 ? fetchEntries(profile.id) : Promise.resolve(),
      ]).then(() => setLoaded(true))
    }
  }, [profile])

  const handleSelectMood = (mood: MoodColor) => {
    setSelected({ hex: mood.hex, label: mood.label, source: 'palette' })
    setShowCustom(false)
    setShowBlend(false)
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

  const handleUseBlend = () => {
    if (!blendA || !blendB) return
    const hex = blendHex(blendA.hex, blendB.hex, blendRatio)
    const label =
      blendRatio < 25  ? blendA.label :
      blendRatio > 75  ? blendB.label :
      `${blendA.label} + ${blendB.label}`
    setSelected({ hex, label, source: 'palette' })
    setShowBlend(false)
  }

  const initial = profile?.display_name?.[0]?.toUpperCase() ?? '?'

  // Dynamic background: preview tint when user hovers/selects, ambient from recent entries
  const previewColor = selected?.hex ?? entries[0]?.color_hex ?? null
  const bgGradient = previewColor
    ? `radial-gradient(ellipse 110% 55% at 50% -5%, ${previewColor}22 0%, transparent 70%)`
    : undefined

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD000', animation: 'ping 1s infinite' }} />
      </div>
    )
  }

  // ─── Entry already saved ────────────────────────────────────────────────────
  if (todayEntry) {
    const lightText = needsLightText(todayEntry.color_hex)
    return (
      <div
        className="page-top page-bottom flex flex-col min-h-screen px-6"
        style={{ background: `radial-gradient(ellipse 130% 60% at 50% 5%, ${todayEntry.color_hex}28 0%, transparent 70%)` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted">
            {formatDate(today)}
          </p>
          <button
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-[13px] font-semibold text-foreground border border-subtle"
          >
            {initial}
          </button>
        </div>

        {/* Color hero */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-fade-up">
          <div
            className="w-full rounded-[28px]"
            style={{
              backgroundColor: todayEntry.color_hex,
              aspectRatio: '1/1',
              maxWidth: 260,
              boxShadow: `0 20px 60px ${todayEntry.color_hex}55, 0 4px 16px ${todayEntry.color_hex}33`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {todayEntry.mood_label && (
              <p style={{
                fontSize: 22,
                fontWeight: 600,
                color: lightText ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.78)',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: '-0.02em',
              }}>
                {todayEntry.mood_label}
              </p>
            )}
            <p style={{
              fontSize: 10,
              fontWeight: 400,
              fontFamily: 'monospace',
              color: lightText ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.30)',
            }}>
              {todayEntry.color_hex.toUpperCase()}
            </p>
          </div>

          <p className="text-[13px] text-muted text-center leading-relaxed">
            Il tuo colore di oggi è custodito.<br />
            Torna domani.
          </p>
        </div>

        {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} onSignOut={signOut} profile={profile} />}
      </div>
    )
  }

  // ─── Choose color ────────────────────────────────────────────────────────────
  return (
    <div
      className="page-top page-bottom flex flex-col min-h-screen px-5"
      style={{ background: bgGradient ? `var(--color-surface) no-repeat` : undefined }}
    >
      {/* Dynamic background gradient */}
      {bgGradient && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: bgGradient,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 0.6s ease',
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted mb-1">
              {formatDate(today)}
            </p>
            <h1 className="text-[28px] font-bold leading-tight text-foreground tracking-[-0.03em]">
              Come ti senti<br />oggi?
            </h1>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-[13px] font-semibold text-foreground border border-subtle mt-1 flex-shrink-0"
          >
            {initial}
          </button>
        </div>

        {/* Selected pill */}
        {selected && (
          <div
            className="flex items-center gap-3 mb-5 py-3 px-4 rounded-2xl border border-subtle animate-fade-in"
            style={{ background: `${selected.hex}14` }}
          >
            <div className="w-7 h-7 rounded-lg flex-shrink-0" style={{ backgroundColor: selected.hex }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                {selected.label ?? 'Colore personalizzato'}
              </p>
              <p className="text-[11px] text-muted font-mono">{selected.hex.toUpperCase()}</p>
            </div>
          </div>
        )}

        {/* Palette 5×4 grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
          marginBottom: 4,
        }}>
          {MOOD_PALETTE.map(mood => {
            const isSelected = selected?.hex === mood.hex && !showBlend
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
                  transition: 'transform 0.13s, box-shadow 0.13s',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isSelected
                    ? `0 0 0 2.5px var(--color-surface), 0 0 0 4.5px ${mood.hex}, 0 6px 20px ${mood.hex}60`
                    : '0 1px 4px rgba(0,0,0,0.10)',
                }} />
                <p style={{
                  fontSize: 8,
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? 'var(--color-foreground)' : 'var(--color-muted)',
                  textAlign: 'center',
                  marginTop: 4,
                  lineHeight: 1.2,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  transition: 'color 0.12s',
                }}>
                  {mood.label}
                </p>
              </button>
            )
          })}
        </div>

        {/* Custom color */}
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              const next = !showCustom
              setShowCustom(next)
              setShowBlend(false)
              if (next) setSelected({ hex: customHex, label: null, source: 'custom' })
            }}
            className="flex items-center gap-3 text-muted hover:text-foreground transition-colors"
          >
            <div
              className="w-8 h-8 rounded-xl border border-subtle flex-shrink-0"
              style={{ backgroundColor: customHex }}
            />
            <span className="text-[13px]">Colore personalizzato</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto flex-shrink-0">
              <path d={showCustom ? 'M2 9l5-5 5 5' : 'M2 5l5 5 5-5'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>

          {showCustom && (
            <div className="flex items-center gap-3 pl-1 animate-fade-in">
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
                className="px-3 py-2.5 bg-surface-raised rounded-xl text-[12px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                style={{ width: 110 }}
                placeholder="#000000"
                maxLength={7}
              />
            </div>
          )}
        </div>

        {/* ── Blend feature ── */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              const next = !showBlend
              setShowBlend(next)
              setShowCustom(false)
            }}
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors w-full"
          >
            <div className="flex gap-1 flex-shrink-0">
              <div style={{ width: 14, height: 14, borderRadius: 4, background: blendA?.hex ?? '#FF6B00' }} />
              <div style={{ width: 14, height: 14, borderRadius: 4, background: blendB?.hex ?? '#00B4D8' }} />
            </div>
            <span className="text-[13px]">Crea un mix di emozioni</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto flex-shrink-0">
              <path d={showBlend ? 'M2 9l5-5 5 5' : 'M2 5l5 5 5-5'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>

          {showBlend && (
            <div className="mt-4 space-y-4 animate-fade-up">
              {/* Picker A */}
              <BlendPicker
                label="Prima emozione"
                selected={blendA}
                onSelect={setBlendA}
                accentColor={blendA?.hex}
              />
              {/* Picker B */}
              <BlendPicker
                label="Seconda emozione"
                selected={blendB}
                onSelect={setBlendB}
                accentColor={blendB?.hex}
              />

              {/* Gradient preview + ratio */}
              {blendA && blendB && (
                <div className="space-y-3 animate-fade-in">
                  {/* Gradient bar */}
                  <div style={{
                    height: 52,
                    borderRadius: 16,
                    background: `linear-gradient(90deg, ${blendA.hex}, ${blendHex(blendA.hex, blendB.hex, blendRatio)}, ${blendB.hex})`,
                    boxShadow: `0 4px 20px ${blendHex(blendA.hex, blendB.hex, blendRatio)}44`,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: needsLightText(blendA.hex) ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}>
                      {blendA.label}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: needsLightText(blendB.hex) ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}>
                      {blendB.label}
                    </span>
                  </div>

                  {/* Ratio slider */}
                  <div className="px-1">
                    <input
                      type="range"
                      min={5}
                      max={95}
                      value={blendRatio}
                      onChange={e => setBlendRatio(+e.target.value)}
                      className="w-full"
                      style={{
                        background: `linear-gradient(90deg, ${blendA.hex}, ${blendB.hex})`,
                      }}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted">{blendA.label}</span>
                      <span className="text-[10px] text-muted">{blendB.label}</span>
                    </div>
                  </div>

                  {/* Use mix CTA */}
                  <button
                    type="button"
                    onClick={handleUseBlend}
                    className="w-full py-3.5 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: blendHex(blendA.hex, blendB.hex, blendRatio),
                      color: needsLightText(blendHex(blendA.hex, blendB.hex, blendRatio)) ? '#FFFFFF' : '#1A1A1A',
                    }}
                  >
                    Usa questo mix →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-[12px] text-red-400 mt-3">{error}</p>}

        {/* Main CTA */}
        <div className="mt-6">
          <button
            onClick={() => setConfirming(true)}
            disabled={!selected}
            className="w-full py-4 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-20"
            style={{
              backgroundColor: selected?.hex ?? 'var(--color-foreground)',
              color: selected ? (needsLightText(selected.hex) ? '#FFFFFF' : '#1A1A1A') : '#FFFFFF',
              boxShadow: selected ? `0 6px 24px ${selected.hex}50` : undefined,
              transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
            }}
          >
            {selected?.label
              ? `Oggi mi sento ${selected.label}`
              : 'Scegli un colore'}
          </button>
        </div>

        {/* Confirmation sheet */}
        {confirming && selected && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
            style={{
              backgroundColor: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(14px)',
              padding: '0 0 max(env(safe-area-inset-bottom), 16px) 0',
            }}
            onClick={() => setConfirming(false)}
          >
            <div
              className="w-full max-w-md mx-4 bg-surface rounded-3xl overflow-hidden animate-slide-up"
              style={{ boxShadow: '0 -4px 60px rgba(0,0,0,0.18)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Color band */}
              <div style={{
                backgroundColor: selected.hex,
                height: 132,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                padding: '0 28px 22px',
                background: selected.label && selected.label.includes('+')
                  ? (() => {
                    const parts = selected.label.split(' + ')
                    const a = MOOD_PALETTE.find(m => m.label === parts[0])
                    const b = MOOD_PALETTE.find(m => m.label === parts[1])
                    return a && b ? `linear-gradient(135deg, ${a.hex}, ${b.hex})` : selected.hex
                  })()
                  : selected.hex,
              }}>
                <p style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: needsLightText(selected.hex) ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.80)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                }}>
                  {selected.label ?? 'Colore personalizzato'}
                </p>
              </div>

              <div className="px-7 py-6 space-y-5">
                <p className="text-[13px] text-muted leading-relaxed">
                  Stai per registrare il colore di oggi.<br />
                  <strong className="text-foreground font-semibold">Questa scelta è definitiva</strong> e non potrà essere modificata.
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

        {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} onSignOut={signOut} profile={profile} />}
      </div>
    </div>
  )
}

// ─── Blend Picker ────────────────────────────────────────────────────────────
function BlendPicker({
  label, selected, onSelect, accentColor,
}: {
  label: string
  selected: MoodColor | null
  onSelect: (m: MoodColor) => void
  accentColor?: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {selected && (
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: selected.hex, flexShrink: 0 }} />
        )}
        <p className="text-[11px] font-medium uppercase tracking-[0.10em]" style={{ color: accentColor ?? 'var(--color-muted)' }}>
          {selected ? selected.label : label}
        </p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: 5,
      }}>
        {MOOD_PALETTE.map(mood => (
          <button
            key={mood.hex}
            onClick={() => onSelect(mood)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div style={{
              width: '100%',
              paddingTop: '100%',
              borderRadius: '50%',
              backgroundColor: mood.hex,
              transition: 'transform 0.12s, box-shadow 0.12s',
              transform: selected?.hex === mood.hex ? 'scale(1.18)' : 'scale(1)',
              boxShadow: selected?.hex === mood.hex
                ? `0 0 0 2px var(--color-surface), 0 0 0 3.5px ${mood.hex}`
                : '0 1px 3px rgba(0,0,0,0.12)',
            }} />
          </button>
        ))}
      </div>
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
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', padding: '0 0 max(env(safe-area-inset-bottom), 16px) 0' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 bg-surface rounded-3xl p-6 space-y-5 animate-slide-up"
        style={{ boxShadow: '0 -4px 60px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-raised border border-subtle flex items-center justify-center text-lg font-bold text-foreground">
            {profile?.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-foreground">{profile?.display_name}</p>
            <p className="text-[13px] text-muted">@{profile?.username}</p>
          </div>
        </div>

        <div className="h-px bg-subtle" />

        <button
          onClick={() => { onSignOut(); onClose() }}
          className="w-full py-3.5 rounded-2xl border border-subtle text-[14px] font-medium text-foreground active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Esci dall'account
        </button>
      </div>
    </div>
  )
}
