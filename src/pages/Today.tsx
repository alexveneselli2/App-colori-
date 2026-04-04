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
    const { error: err } = await saveTodayEntry(profile.id, selected.hex, selected.label, selected.source)
    if (err) setError(err)
    setConfirming(false)
    setSaving(false)
  }

  const handleUseBlend = () => {
    if (!blendA || !blendB) return
    const hex = blendHex(blendA.hex, blendB.hex, blendRatio)
    const label =
      blendRatio < 25 ? blendA.label :
      blendRatio > 75 ? blendB.label :
      `${blendA.label} + ${blendB.label}`
    setSelected({ hex, label, source: 'palette' })
    setShowBlend(false)
  }

  const initial = profile?.display_name?.[0]?.toUpperCase() ?? '?'
  const previewColor = selected?.hex ?? entries[0]?.color_hex ?? null

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100dvh', background: 'var(--color-surface)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD000', animation: 'ping 1s infinite' }} />
      </div>
    )
  }

  // ─── Entry already saved ────────────────────────────────────────────────────
  if (todayEntry) {
    const lightText = needsLightText(todayEntry.color_hex)
    return (
      <div
        className="page-top flex flex-col"
        style={{
          minHeight: '100dvh',
          background: `radial-gradient(ellipse 140% 70% at 50% 0%, ${todayEntry.color_hex}30 0%, var(--color-surface) 65%)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 mb-12">
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--color-muted)' }}>
            {formatDate(today)}
          </p>
          <button
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold transition-all active:scale-[0.95]"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1.5px solid var(--color-subtle)',
              color: 'var(--color-foreground)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {initial}
          </button>
        </div>

        {/* Color hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6 animate-fade-up">
          <div
            style={{
              width: '100%',
              maxWidth: 240,
              aspectRatio: '1/1',
              borderRadius: 32,
              backgroundColor: todayEntry.color_hex,
              boxShadow: `0 0 0 1px ${todayEntry.color_hex}30, 0 16px 48px ${todayEntry.color_hex}55`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {todayEntry.mood_label && (
              <p style={{
                fontSize: 24, fontWeight: 700,
                color: lightText ? 'rgba(255,255,255,0.93)' : 'rgba(0,0,0,0.80)',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: '-0.03em',
              }}>
                {todayEntry.mood_label}
              </p>
            )}
            <p style={{
              fontSize: 10, fontFamily: 'monospace',
              color: lightText ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.28)',
            }}>
              {todayEntry.color_hex.toUpperCase()}
            </p>
          </div>

          <div className="text-center">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Il tuo colore di oggi è custodito.
            </p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-muted)' }}>
              Torna domani per il prossimo.
            </p>
          </div>
        </div>

        {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} onSignOut={signOut} profile={profile} />}
      </div>
    )
  }

  // ─── Choose color ────────────────────────────────────────────────────────────
  return (
    <div
      className="page-top flex flex-col"
      style={{ minHeight: '100dvh', background: 'var(--color-surface)', position: 'relative' }}
    >
      {/* Ambient background */}
      {previewColor && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 120% 55% at 50% 0%, ${previewColor}22 0%, transparent 68%)`,
          transition: 'background 0.5s ease',
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1 }} className="px-5">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: 'var(--color-muted)' }}>
              {formatDate(today)}
            </p>
            <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.04em]" style={{ color: 'var(--color-foreground)' }}>
              Come ti senti<br />oggi?
            </h1>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 mt-1 transition-all active:scale-[0.95]"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1.5px solid var(--color-subtle)',
              color: 'var(--color-foreground)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {initial}
          </button>
        </div>

        {/* Selected preview pill */}
        {selected && (
          <div
            className="flex items-center gap-3 mb-5 py-3 px-4 rounded-2xl animate-fade-in"
            style={{
              background: `${selected.hex}18`,
              border: `1.5px solid ${selected.hex}40`,
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: selected.hex, flexShrink: 0, boxShadow: `0 2px 8px ${selected.hex}50` }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {selected.label ?? 'Colore personalizzato'}
              </p>
              <p className="text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>{selected.hex.toUpperCase()}</p>
            </div>
          </div>
        )}

        {/* ── Palette 5×4 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          {MOOD_PALETTE.map(mood => {
            const isSelected = selected?.hex === mood.hex && !showBlend
            return (
              <button
                key={mood.hex}
                onClick={() => handleSelectMood(mood)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <div style={{
                  width: '100%', paddingTop: '100%', position: 'relative',
                  borderRadius: 16,
                  backgroundColor: mood.hex,
                  transition: 'transform 0.14s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.14s ease',
                  transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                  boxShadow: isSelected
                    ? `0 0 0 2.5px var(--color-surface), 0 0 0 4.5px ${mood.hex}, 0 6px 24px ${mood.hex}65`
                    : `0 2px 8px ${mood.hex}35`,
                }} />
                <p style={{
                  fontSize: 8, fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? 'var(--color-foreground)' : 'var(--color-muted)',
                  textAlign: 'center', marginTop: 5, lineHeight: 1.2,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  transition: 'color 0.12s, font-weight 0.12s',
                }}>
                  {mood.label}
                </p>
              </button>
            )
          })}
        </div>

        {/* ── Colore personalizzato card ── */}
        <div
          className="mb-3 rounded-2xl overflow-hidden"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1.5px solid var(--color-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <button
            type="button"
            onClick={() => { setShowCustom(!showCustom); setShowBlend(false) }}
            className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:opacity-70"
          >
            {/* Color icon */}
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              backgroundColor: customHex,
              boxShadow: `0 2px 8px ${customHex}40`,
            }} />
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
                Colore personalizzato
              </p>
              <p className="text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>
                {customHex.toUpperCase()}
              </p>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              style={{ color: 'var(--color-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: showCustom ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showCustom && (
            <div className="px-4 pb-4 pt-1 animate-fade-in border-t" style={{ borderColor: 'var(--color-subtle)' }}>
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="color"
                  value={customHex}
                  onChange={e => handleCustomChange(e.target.value)}
                  style={{ width: 48, height: 48, borderRadius: 12, cursor: 'pointer', flexShrink: 0, border: '1.5px solid var(--color-subtle)' }}
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
                  className="flex-1 px-4 py-3 rounded-xl text-[13px] font-mono focus:outline-none transition-all"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-subtle)',
                    color: 'var(--color-foreground)',
                  }}
                  placeholder="#000000"
                  maxLength={7}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(customHex)) {
                      setSelected({ hex: customHex, label: null, source: 'custom' })
                      setShowCustom(false)
                    }
                  }}
                  className="px-4 py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97]"
                  style={{ background: customHex, color: needsLightText(customHex) ? '#fff' : '#1C1917' }}
                >
                  Usa
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Mix di emozioni card ── */}
        <div
          className="mb-5 rounded-2xl overflow-hidden"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1.5px solid var(--color-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <button
            type="button"
            onClick={() => { setShowBlend(!showBlend); setShowCustom(false) }}
            className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:opacity-70"
          >
            {/* Gradient blend icon */}
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: blendA && blendB
                ? `linear-gradient(135deg, ${blendA.hex}, ${blendB.hex})`
                : 'linear-gradient(135deg, #FFD000, #C77DFF)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }} />
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
                Mix di emozioni
              </p>
              <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                {blendA && blendB ? `${blendA.label} + ${blendB.label}` : 'Combina due stati d\'animo'}
              </p>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              style={{ color: 'var(--color-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: showBlend ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showBlend && (
            <div className="px-4 pb-4 pt-1 animate-fade-in border-t" style={{ borderColor: 'var(--color-subtle)' }}>
              <div className="space-y-4 mt-3">
                <BlendPicker label="Prima emozione" selected={blendA} onSelect={setBlendA} />
                <BlendPicker label="Seconda emozione" selected={blendB} onSelect={setBlendB} />

                {blendA && blendB && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Gradient preview */}
                    <div style={{
                      height: 56, borderRadius: 14,
                      background: `linear-gradient(90deg, ${blendA.hex} 0%, ${blendHex(blendA.hex, blendB.hex, blendRatio)} 50%, ${blendB.hex} 100%)`,
                      boxShadow: `0 4px 24px ${blendHex(blendA.hex, blendB.hex, blendRatio)}50`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 14px',
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif', color: needsLightText(blendA.hex) ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)' }}>
                        {blendA.label}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 500, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>
                        {blendHex(blendA.hex, blendB.hex, blendRatio).toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif', color: needsLightText(blendB.hex) ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)' }}>
                        {blendB.label}
                      </span>
                    </div>

                    {/* Slider */}
                    <div>
                      <input
                        type="range" min={5} max={95} value={blendRatio}
                        onChange={e => setBlendRatio(+e.target.value)}
                        style={{ background: `linear-gradient(90deg, ${blendA.hex}, ${blendB.hex})` }}
                      />
                      <div className="flex justify-between mt-1 px-0.5">
                        <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{blendA.label}</span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--color-muted)' }}>{blendRatio}%</span>
                        <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{blendB.label}</span>
                      </div>
                    </div>

                    <button
                      type="button" onClick={handleUseBlend}
                      className="w-full py-3.5 rounded-xl text-[14px] font-bold transition-all active:scale-[0.98]"
                      style={{
                        background: blendHex(blendA.hex, blendB.hex, blendRatio),
                        color: needsLightText(blendHex(blendA.hex, blendB.hex, blendRatio)) ? '#fff' : '#1C1917',
                      }}
                    >
                      Usa questo mix →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-[12px] mb-3" style={{ color: '#BE123C' }}>{error}</p>}

        {/* ── CTA ── */}
        <button
          onClick={() => setConfirming(true)}
          disabled={!selected}
          className="w-full py-4 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-25"
          style={{
            background: selected?.hex ?? 'var(--color-foreground)',
            color: selected ? (needsLightText(selected.hex) ? '#FFFFFF' : '#1C1917') : '#FFFFFF',
            boxShadow: selected ? `0 8px 28px ${selected.hex}55` : '0 4px 14px rgba(28,25,23,0.20)',
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          {selected?.label ? `Oggi mi sento ${selected.label}` : 'Scegli un colore'}
        </button>

      </div>

      {/* ── Confirmation sheet ── */}
      {confirming && selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
          style={{ backgroundColor: 'rgba(28,25,23,0.50)', backdropFilter: 'blur(16px)', padding: '0 0 max(env(safe-area-inset-bottom), 16px) 0' }}
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-3xl overflow-hidden animate-slide-up"
            style={{ background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              backgroundColor: selected.hex,
              height: 136,
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              padding: '0 28px 20px',
            }}>
              <p style={{
                fontSize: 32, fontWeight: 800,
                letterSpacing: '-0.04em', lineHeight: 1.05,
                color: needsLightText(selected.hex) ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.82)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                {selected.label ?? 'Colore personalizzato'}
              </p>
            </div>

            <div className="px-7 py-6 space-y-5">
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                Stai per registrare il colore di oggi.<br />
                <strong style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>Questa scelta è definitiva</strong> e non può essere modificata.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-all"
                  style={{ border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirm} disabled={saving}
                  className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold active:scale-[0.98] transition-all disabled:opacity-60"
                  style={{
                    background: selected.hex,
                    color: needsLightText(selected.hex) ? '#FFFFFF' : '#1C1917',
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
  )
}

// ─── Blend Picker ────────────────────────────────────────────────────────────
function BlendPicker({
  label, selected, onSelect,
}: {
  label: string
  selected: MoodColor | null
  onSelect: (m: MoodColor) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {selected
          ? <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: selected.hex }} />
          : <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--color-subtle)' }} />
        }
        <p className="text-[11px] font-semibold uppercase tracking-[0.10em]"
           style={{ color: selected?.hex ?? 'var(--color-muted)' }}>
          {selected ? selected.label : label}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 5 }}>
        {MOOD_PALETTE.map(mood => (
          <button
            key={mood.hex}
            onClick={() => onSelect(mood)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div style={{
              width: '100%', paddingTop: '100%', borderRadius: '50%',
              backgroundColor: mood.hex,
              transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.12s',
              transform: selected?.hex === mood.hex ? 'scale(1.2)' : 'scale(1)',
              boxShadow: selected?.hex === mood.hex
                ? `0 0 0 2px var(--color-surface-raised), 0 0 0 3.5px ${mood.hex}`
                : `0 1px 3px ${mood.hex}40`,
            }} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Profile sheet ────────────────────────────────────────────────────────────
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
      style={{ background: 'rgba(28,25,23,0.45)', backdropFilter: 'blur(14px)', padding: '0 0 max(env(safe-area-inset-bottom), 16px) 0' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-3xl p-6 space-y-5 animate-slide-up"
        style={{ background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}
          >
            {profile?.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--color-foreground)' }}>{profile?.display_name}</p>
            <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>@{profile?.username}</p>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--color-subtle)' }} />

        <button
          onClick={() => { onSignOut(); onClose() }}
          className="w-full py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}
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
