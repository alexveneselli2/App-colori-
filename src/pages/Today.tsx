import { useEffect, useRef, useState } from 'react'
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
  const r1 = parseInt(hex1.slice(1,3),16), g1 = parseInt(hex1.slice(3,5),16), b1 = parseInt(hex1.slice(5,7),16)
  const r2 = parseInt(hex2.slice(1,3),16), g2 = parseInt(hex2.slice(3,5),16), b2 = parseInt(hex2.slice(5,7),16)
  const f = t / 100
  return `#${Math.round(r1+(r2-r1)*f).toString(16).padStart(2,'0')}${Math.round(g1+(g2-g1)*f).toString(16).padStart(2,'0')}${Math.round(b1+(b2-b1)*f).toString(16).padStart(2,'0')}`
}

type Tab = 'palette' | 'custom' | 'mix'

interface Selection {
  hex: string
  label: string | null
  source: 'palette' | 'custom'
}

// Decorative orb strip — same motif as Auth page
const ORB_COLORS = ['#FFD000','#FF6B00','#FF0A54','#C77DFF','#00B4D8','#52B788','#2D6A4F']

export default function Today() {
  const { profile, signOut } = useAuthStore()
  const { entries, todayEntry, fetchTodayEntry, saveTodayEntry, fetchEntries } = useMoodStore()

  const [loaded, setLoaded]         = useState(false)
  const [tab, setTab]               = useState<Tab>('palette')
  const [tabKey, setTabKey]         = useState(0) // forces re-animation on switch
  const [selected, setSelected]     = useState<Selection | null>(null)
  const [customHex, setCustomHex]   = useState('#3A86FF')
  const [blendA, setBlendA]         = useState<MoodColor | null>(null)
  const [blendB, setBlendB]         = useState<MoodColor | null>(null)
  const [blendRatio, setBlendRatio] = useState(50)
  const [confirming, setConfirming] = useState(false)
  const [note, setNote]             = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
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

  const switchTab = (t: Tab) => {
    setTab(t)
    setTabKey(k => k + 1)
  }

  const handleSelectMood = (mood: MoodColor) => {
    setSelected({ hex: mood.hex, label: mood.label, source: 'palette' })
  }

  const handleConfirm = async () => {
    if (!selected || !profile) return
    setSaving(true)

    // Capture GPS if user consented
    let latitude: number | null = null
    let longitude: number | null = null
    let location_label: string | null = null
    if (profile.location_consent && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        )
        latitude  = pos.coords.latitude
        longitude = pos.coords.longitude
        // Reverse geocode city name (best effort)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=it`
          )
          const geo = await res.json()
          location_label = geo.address?.city ?? geo.address?.town ?? geo.address?.village ?? null
        } catch { /* ignore */ }
      } catch { /* permission denied or timeout */ }
    }

    const { error: err } = await saveTodayEntry(
      profile.id, selected.hex, selected.label, selected.source,
      { note: note.trim() || null, latitude, longitude, location_label }
    )
    if (err) setError(err)
    setConfirming(false)
    setSaving(false)
  }

  const handleUseBlend = () => {
    if (!blendA || !blendB) return
    const hex = blendHex(blendA.hex, blendB.hex, blendRatio)
    const label = blendRatio < 25 ? blendA.label : blendRatio > 75 ? blendB.label : `${blendA.label} + ${blendB.label}`
    setSelected({ hex, label, source: 'palette' })
    switchTab('palette') // return to palette view to show selected
  }

  const handleUseCustom = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(customHex)) {
      setSelected({ hex: customHex, label: null, source: 'custom' })
      switchTab('palette')
    }
  }

  const initial = profile?.display_name?.[0]?.toUpperCase() ?? '?'
  const bgColor = selected?.hex ?? entries[0]?.color_hex ?? null

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100dvh' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD000', animation: 'ping 1s infinite' }} />
      </div>
    )
  }

  // ─── Entry already saved ────────────────────────────────────────────────────
  if (todayEntry) {
    const light = needsLightText(todayEntry.color_hex)
    return (
      <div className="page-top flex flex-col px-6" style={{ minHeight: '60dvh' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-[11px] font-semibold tracking-[0.13em] uppercase" style={{ color: 'var(--color-muted)' }}>
            {formatDate(today)}
          </p>
          <button onClick={() => setShowProfile(true)} className="profile-btn" style={profileBtnStyle}>
            {initial}
          </button>
        </div>

        {/* Color hero */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-fade-up">
          {/* Orb strip decoration */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {ORB_COLORS.map((hex, i) => (
              <div key={hex} style={{
                width: 12, height: 12, borderRadius: '50%', backgroundColor: hex,
                opacity: hex === todayEntry.color_hex ? 1 : 0.35,
                transform: `scale(${hex === todayEntry.color_hex ? 1.6 : 1})`,
                boxShadow: hex === todayEntry.color_hex ? `0 0 12px ${hex}90` : undefined,
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          {/* Big color swatch */}
          <div
            className="animate-pop-in"
            style={{
              width: '70%', maxWidth: 220,
              aspectRatio: '1/1',
              borderRadius: 36,
              backgroundColor: todayEntry.color_hex,
              boxShadow: `0 0 0 1px ${todayEntry.color_hex}20, 0 20px 60px ${todayEntry.color_hex}60, 0 4px 20px ${todayEntry.color_hex}40`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {todayEntry.mood_label && (
              <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
                color: light ? 'rgba(255,255,255,0.93)' : 'rgba(0,0,0,0.80)',
                fontFamily: 'Inter, system-ui, sans-serif' }}>
                {todayEntry.mood_label}
              </p>
            )}
            <p style={{ fontSize: 10, fontFamily: 'monospace',
              color: light ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.28)' }}>
              {todayEntry.color_hex.toUpperCase()}
            </p>
          </div>

          <div className="text-center space-y-2">
            <p className="text-[16px] font-bold tracking-[-0.02em]" style={{ color: 'var(--color-foreground)' }}>
              Il tuo colore di oggi è custodito.
            </p>
            {todayEntry.note && (
              <p className="text-[13px] italic leading-relaxed px-4" style={{ color: 'var(--color-muted)' }}>
                "{todayEntry.note}"
              </p>
            )}
            {todayEntry.location_label && (
              <p className="text-[11px] flex items-center justify-center gap-1" style={{ color: 'var(--color-muted)' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 2.5C5 2.5 8 5.5 8 7c0 1-1.3 1.5-3 1.5S2 8 2 7c0-1.5 3-4.5 3-4.5z" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {todayEntry.location_label}
              </p>
            )}
            <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
              Torna domani per il prossimo.
            </p>
          </div>
        </div>

        {showProfile && <ProfileSheet profile={profile} onClose={() => setShowProfile(false)} onSignOut={signOut} />}
      </div>
    )
  }

  // ─── Choose color ────────────────────────────────────────────────────────────
  return (
    <div className="page-top flex flex-col" style={{ position: 'relative' }}>

      {/* Ambient background flood */}
      {bgColor && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 130% 60% at 50% 0%, ${bgColor}28 0%, transparent 65%)`,
          transition: 'background 0.7s ease',
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col px-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.13em] uppercase mb-1.5" style={{ color: 'var(--color-muted)' }}>
              {formatDate(today)}
            </p>
            <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.04em]" style={{ color: 'var(--color-foreground)' }}>
              Come ti senti<br />oggi?
            </h1>
          </div>
          <button onClick={() => setShowProfile(true)} style={profileBtnStyle}>
            {initial}
          </button>
        </div>

        {/* ── Three-tab switcher ── */}
        <div
          className="flex p-1 gap-1 rounded-2xl mb-4"
          style={{ background: 'var(--color-subtle)' }}
        >
          {([
            { id: 'palette', label: 'Palette' },
            { id: 'custom',  label: 'Colore' },
            { id: 'mix',     label: '✦ Mix' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-[0.96]"
              style={{
                background: tab === t.id ? 'var(--color-surface-raised)' : 'transparent',
                color: tab === t.id ? 'var(--color-foreground)' : 'var(--color-muted)',
                boxShadow: tab === t.id ? 'var(--shadow-sm)' : undefined,
                letterSpacing: t.id === 'mix' ? '-0.01em' : undefined,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Selected preview pill ── */}
        {selected && (
          <div
            key={selected.hex}
            className="flex items-center gap-3 mb-4 py-2.5 px-4 rounded-2xl animate-fade-in"
            style={{ background: `${selected.hex}18`, border: `1.5px solid ${selected.hex}45` }}
          >
            <div style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: selected.hex, flexShrink: 0, boxShadow: `0 2px 10px ${selected.hex}55` }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold" style={{ color: 'var(--color-foreground)' }}>
                {selected.label ?? 'Colore personalizzato'}
              </p>
              <p className="text-[10px] font-mono" style={{ color: 'var(--color-muted)' }}>{selected.hex.toUpperCase()}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{ color: 'var(--color-muted)', padding: 4 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── Tab content ── */}
        <div key={tabKey} className="tab-content-enter">

          {/* PALETTE TAB */}
          {tab === 'palette' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
              {MOOD_PALETTE.map((mood, i) => {
                const row = Math.floor(i / 5)
                const isSelected = selected?.hex === mood.hex
                return (
                  <button
                    key={mood.hex}
                    onClick={() => handleSelectMood(mood)}
                    className={`swatch-row-${row + 1}`}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <div style={{
                      width: '100%', paddingTop: '100%', borderRadius: 18,
                      backgroundColor: mood.hex, position: 'relative',
                      transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
                      transform: isSelected ? 'scale(1.14)' : 'scale(1)',
                      boxShadow: isSelected
                        ? `0 0 0 2.5px var(--color-surface), 0 0 0 5px ${mood.hex}, 0 8px 28px ${mood.hex}70`
                        : `0 3px 10px ${mood.hex}40`,
                    }} />
                    <p style={{
                      fontSize: 8, fontWeight: isSelected ? 800 : 400,
                      color: isSelected ? 'var(--color-foreground)' : 'var(--color-muted)',
                      textAlign: 'center', marginTop: 5, lineHeight: 1.2,
                      fontFamily: 'Inter, system-ui, sans-serif',
                      transition: 'all 0.15s',
                    }}>
                      {mood.label}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {/* CUSTOM COLOR TAB */}
          {tab === 'custom' && (
            <div className="space-y-4">
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${customHex}20, ${customHex}08)`,
                  border: `2px solid ${customHex}40`,
                }}
              >
                {/* Big color preview */}
                <div
                  style={{ height: 120, backgroundColor: customHex, display: 'flex', alignItems: 'flex-end', padding: '0 20px 14px' }}
                >
                  <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
                    color: needsLightText(customHex) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)' }}>
                    {customHex.toUpperCase()}
                  </p>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customHex}
                      onChange={e => setCustomHex(e.target.value)}
                      style={{ width: 52, height: 52, borderRadius: 14, border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      value={customHex}
                      onChange={e => {
                        const v = e.target.value
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setCustomHex(v)
                      }}
                      className="flex-1 px-4 py-3 rounded-xl text-[13px] font-mono focus:outline-none"
                      style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}
                      placeholder="#000000"
                      maxLength={7}
                    />
                  </div>
                  <button
                    onClick={handleUseCustom}
                    className="w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.97]"
                    style={{ background: customHex, color: needsLightText(customHex) ? '#fff' : '#1C1917',
                      boxShadow: `0 6px 20px ${customHex}50` }}
                  >
                    Usa questo colore →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MIX TAB */}
          {tab === 'mix' && (
            <div className="space-y-4">
              {/* Pickers side by side */}
              <div className="grid grid-cols-2 gap-3">
                <MixPicker label="Emozione A" selected={blendA} onSelect={setBlendA} />
                <MixPicker label="Emozione B" selected={blendB} onSelect={setBlendB} />
              </div>

              {blendA && blendB ? (
                <div className="space-y-3 animate-fade-in">
                  {/* Gradient preview */}
                  <div style={{
                    height: 64, borderRadius: 20,
                    background: `linear-gradient(90deg, ${blendA.hex} 0%, ${blendHex(blendA.hex, blendB.hex, blendRatio)} 50%, ${blendB.hex} 100%)`,
                    boxShadow: `0 6px 28px ${blendHex(blendA.hex, blendB.hex, blendRatio)}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'Inter, system-ui, sans-serif',
                      color: needsLightText(blendA.hex) ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)' }}>
                      {blendA.label}
                    </span>
                    <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)' }}>
                      {blendHex(blendA.hex, blendB.hex, blendRatio).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'Inter, system-ui, sans-serif',
                      color: needsLightText(blendB.hex) ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)' }}>
                      {blendB.label}
                    </span>
                  </div>

                  {/* Slider */}
                  <input
                    type="range" min={0} max={100} value={blendRatio}
                    onChange={e => setBlendRatio(+e.target.value)}
                    style={{ background: `linear-gradient(90deg, ${blendA.hex}, ${blendB.hex})` }}
                  />

                  <button
                    onClick={handleUseBlend}
                    className="w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.97]"
                    style={{
                      background: blendHex(blendA.hex, blendB.hex, blendRatio),
                      color: needsLightText(blendHex(blendA.hex, blendB.hex, blendRatio)) ? '#fff' : '#1C1917',
                      boxShadow: `0 6px 24px ${blendHex(blendA.hex, blendB.hex, blendRatio)}55`,
                    }}
                  >
                    Usa questo mix →
                  </button>
                </div>
              ) : (
                <p className="text-center text-[12px] py-4" style={{ color: 'var(--color-muted)' }}>
                  Seleziona due emozioni per creare il tuo mix
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-[12px] mt-3" style={{ color: '#BE123C' }}>{error}</p>}

        {/* ── CTA ── */}
        <div className="mt-5">
          <button
            onClick={() => setConfirming(true)}
            disabled={!selected}
            className="w-full py-4 rounded-2xl text-[15px] font-extrabold transition-all active:scale-[0.98] disabled:opacity-20"
            style={{
              background: selected?.hex ?? 'var(--color-foreground)',
              color: selected ? (needsLightText(selected.hex) ? '#FFFFFF' : '#1C1917') : '#FFFFFF',
              boxShadow: selected ? `0 10px 32px ${selected.hex}60` : '0 4px 14px rgba(28,25,23,0.20)',
              transition: 'background 0.35s ease, box-shadow 0.35s ease',
              letterSpacing: '-0.02em',
            }}
          >
            {selected?.label ? `Oggi mi sento ${selected.label}` : 'Scegli un colore'}
          </button>
        </div>

      </div>

      {/* ── Confirmation sheet ── */}
      {confirming && selected && (
        <ConfirmSheet
          selected={selected}
          saving={saving}
          note={note}
          onNoteChange={setNote}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}

      {showProfile && <ProfileSheet profile={profile} onClose={() => setShowProfile(false)} onSignOut={signOut} />}
    </div>
  )
}

// ─── Mix Picker card ─────────────────────────────────────────────────────────
function MixPicker({ label, selected, onSelect }: { label: string; selected: MoodColor | null; onSelect: (m: MoodColor) => void }) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: selected ? `${selected.hex}14` : 'var(--color-surface-raised)',
        border: `1.5px solid ${selected ? selected.hex + '50' : 'var(--color-subtle)'}`,
        transition: 'all 0.2s ease',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.10em] mb-2.5"
         style={{ color: selected?.hex ?? 'var(--color-muted)' }}>
        {selected ? selected.label : label}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
        {MOOD_PALETTE.map(mood => (
          <button
            key={mood.hex}
            onClick={() => onSelect(mood)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div style={{
              width: '100%', paddingTop: '100%', borderRadius: '50%',
              backgroundColor: mood.hex,
              transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s',
              transform: selected?.hex === mood.hex ? 'scale(1.25)' : 'scale(1)',
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

// ─── Confirm sheet ────────────────────────────────────────────────────────────
function ConfirmSheet({ selected, saving, note, onNoteChange, onConfirm, onCancel }: {
  selected: Selection; saving: boolean
  note: string; onNoteChange: (v: string) => void
  onConfirm: () => void; onCancel: () => void
}) {
  const light = needsLightText(selected.hex)
  const colorBg = selected.label?.includes('+')
    ? (() => {
        const [a, b] = (selected.label ?? '').split(' + ')
        const mA = MOOD_PALETTE.find(m => m.label === a)
        const mB = MOOD_PALETTE.find(m => m.label === b)
        return mA && mB ? `linear-gradient(135deg, ${mA.hex}, ${mB.hex})` : selected.hex
      })()
    : selected.hex

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(18px)', padding: '0 0 max(env(safe-area-inset-bottom),16px) 0' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md mx-4 rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Color hero */}
        <div style={{
          height: 128, background: colorBg,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 24px 18px',
        }}>
          <p style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.05,
            color: light ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.82)',
            fontFamily: 'Inter, system-ui, sans-serif' }}>
            {selected.label ?? 'Colore personalizzato'}
          </p>
        </div>

        <div className="px-6 pt-5 pb-6 space-y-4">
          {/* Note textarea */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--color-muted)' }}>
              Come mai questo colore? (facoltativo)
            </p>
            <textarea
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              placeholder="Scrivi una frase sul tuo stato d'animo…"
              maxLength={280}
              rows={2}
              className="w-full px-4 py-3 rounded-2xl text-[13px] focus:outline-none resize-none transition-all"
              style={{
                background: 'var(--color-surface)',
                border: `1.5px solid ${note ? selected.hex + '60' : 'var(--color-subtle)'}`,
                color: 'var(--color-foreground)',
                lineHeight: 1.5,
              }}
            />
            {note && (
              <p className="text-[10px] text-right mt-1" style={{ color: 'var(--color-muted)' }}>
                {note.length}/280
              </p>
            )}
          </div>

          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Questa scelta è <strong style={{ color: 'var(--color-foreground)' }}>definitiva</strong> e non può essere modificata.
          </p>

          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-all"
              style={{ border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}>
              Annulla
            </button>
            <button onClick={onConfirm} disabled={saving}
              className="flex-[2] py-3.5 rounded-2xl text-[14px] font-extrabold active:scale-[0.98] transition-all disabled:opacity-60"
              style={{ background: selected.hex, color: light ? '#fff' : '#1C1917', boxShadow: `0 6px 20px ${selected.hex}55` }}>
              {saving ? '···' : 'Salva per sempre →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Profile sheet ────────────────────────────────────────────────────────────
const profileBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%',
  background: 'var(--color-surface-raised)',
  border: '1.5px solid var(--color-subtle)',
  color: 'var(--color-foreground)',
  boxShadow: 'var(--shadow-xs)',
  fontSize: 13, fontWeight: 800,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
}

function ProfileSheet({ profile, onClose, onSignOut }: {
  profile: { display_name: string; username: string } | null; onClose: () => void; onSignOut: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(28,25,23,0.50)', backdropFilter: 'blur(16px)', padding: '0 0 max(env(safe-area-inset-bottom),16px) 0' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-3xl p-6 space-y-5 animate-slide-up"
        style={{ background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Brand orb strip */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 4 }}>
          {ORB_COLORS.map(hex => (
            <div key={hex} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: hex, opacity: 0.7 }} />
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold"
            style={{ background: 'var(--brand-gradient)', color: '#fff' }}>
            {profile?.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-[15px] font-bold" style={{ color: 'var(--color-foreground)' }}>{profile?.display_name}</p>
            <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>@{profile?.username}</p>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--color-subtle)' }} />

        <button onClick={() => { onSignOut(); onClose() }}
          className="w-full py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Esci dall'account
        </button>
      </div>
    </div>
  )
}
