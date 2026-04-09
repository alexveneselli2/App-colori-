import { useEffect, useRef, useState, type KeyboardEvent, type CSSProperties } from 'react'
import confetti from 'canvas-confetti'
import { useMoodStore } from '../store/useMoodStore'
import { useAuthStore } from '../store/useAuthStore'
import { useThemeStore } from '../store/useThemeStore'
import { MOOD_PALETTE } from '../constants/moods'
import { MONTH_FULL, getWeekDays, toISO, DAY_INITIAL } from '../lib/dateUtils'
import { getGraceTimeLeftMs } from '../lib/gracePeriod'
import type { GraceEntry } from '../lib/gracePeriod'
import ArtGenerator from '../components/ArtGenerator'
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function blendHexRgb(hex: string, r2: number, g2: number, b2: number, t: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `#${Math.round(r + (r2 - r) * t).toString(16).padStart(2, '0')}${Math.round(g + (g2 - g) * t).toString(16).padStart(2, '0')}${Math.round(b + (b2 - b) * t).toString(16).padStart(2, '0')}`
}

function formatGraceTimer(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000))
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
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
  const { entries, todayEntry, pendingGrace, fetchTodayEntry, saveTodayEntry, fetchEntries, beginGrace, cancelGrace, commitGrace, updateGrace } = useMoodStore()

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
  const [tags, setTags]             = useState<string[]>([])
  const [tagInput, setTagInput]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [graceTimeLeft, setGraceTimeLeft] = useState<number>(0)
  const [showEditGrace, setShowEditGrace] = useState(false)

  const today = new Date()

  useEffect(() => {
    if (profile) {
      Promise.all([
        fetchTodayEntry(profile.id),
        entries.length === 0 ? fetchEntries(profile.id) : Promise.resolve(),
      ]).then(() => setLoaded(true))
    }
  }, [profile])

  // Grace countdown timer
  useEffect(() => {
    if (!pendingGrace) return
    const tick = () => setGraceTimeLeft(getGraceTimeLeftMs(pendingGrace))
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [pendingGrace])

  const switchTab = (t: Tab) => {
    setTab(t)
    setTabKey(k => k + 1)
  }

  const handleSelectMood = (mood: MoodColor) => {
    if (navigator.vibrate) navigator.vibrate(15)
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

    const { error: err } = await beginGrace(
      profile.id, selected.hex, selected.label, selected.source,
      { note: note.trim() || null, tags, latitude, longitude, location_label }
    )
    if (err) {
      setError(err)
    } else {
      // Confetti explosion in the selected color
      const { r, g, b } = hexToRgb(selected.hex)
      const lighterVersion = blendHexRgb(selected.hex, 255, 255, 255, 0.45)
      const darkerVersion  = blendHexRgb(selected.hex, 0, 0, 0, 0.35)
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.65 },
        colors: [selected.hex, lighterVersion, darkerVersion],
      })
      void r; void g; void b
    }
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

  const handleUseCustom = (label: string) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(customHex)) {
      setSelected({ hex: customHex, label: label.trim() || null, source: 'custom' })
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--color-muted)' }}>
              {formatDate(today)}
            </p>
          </div>
          <button onClick={() => setShowProfile(true)} className="profile-btn" style={profileBtnStyle}>
            {initial}
          </button>
        </div>

        {/* Color hero */}
        <div className="flex flex-col items-center gap-6 animate-fade-up">

          {/* Big color swatch — tall rectangle, editorial */}
          <div
            className="animate-pop-in"
            style={{
              width: '82%', maxWidth: 260,
              aspectRatio: '4/5',
              borderRadius: 32,
              backgroundColor: todayEntry.color_hex,
              boxShadow: `0 0 0 1px ${todayEntry.color_hex}25, 0 24px 72px ${todayEntry.color_hex}65, 0 6px 24px ${todayEntry.color_hex}40`,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '22px 22px 18px',
            }}
          >
            {/* Top: hex */}
            <p style={{ fontSize: 10, fontFamily: 'monospace',
              color: light ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.25)',
              letterSpacing: '0.06em' }}>
              {todayEntry.color_hex.toUpperCase()}
            </p>
            {/* Bottom: mood label */}
            {todayEntry.mood_label && (
              <p style={{
                fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05,
                color: light ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.82)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                {todayEntry.mood_label}
              </p>
            )}
          </div>

          {/* Summary card */}
          <div className="card p-4 w-full max-w-xs space-y-2 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--color-muted)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M6 3.5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <p className="text-[12px]">Salvato alle {new Date(todayEntry.created_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</p>
            </div>
            {todayEntry.location_label && (
              <div className="flex items-center gap-2" style={{ color: 'var(--color-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M6 2C6 2 10 6 10 8.5c0 1.2-1.8 2-4 2s-4-.8-4-2C2 6 6 2 6 2z" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                <p className="text-[12px]">{todayEntry.location_label}</p>
              </div>
            )}
            {todayEntry.tags && todayEntry.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {todayEntry.tags.map(t => (
                  <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100,
                    background: `${todayEntry.color_hex}20`, border: `1px solid ${todayEntry.color_hex}40`,
                    color: 'var(--color-foreground)' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            {todayEntry.note && (
              <p className="text-[12px] italic leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
                "{todayEntry.note}"
              </p>
            )}
            <p className="text-[12px]" style={{ color: 'var(--color-muted)' }}>Torna domani per il prossimo.</p>
          </div>

          {/* Mini week strip */}
          <div className="w-full max-w-xs animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] mb-2 text-center" style={{ color: 'var(--color-muted)' }}>La tua settimana</p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {getWeekDays(today).map((day, i) => {
                const dayStr = toISO(day)
                const dayEntry = entries.find(e => e.date === dayStr)
                const isToday = dayStr === toISO(today)
                return (
                  <div key={dayStr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <p style={{ fontSize: 8, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase' }}>{DAY_INITIAL[i]}</p>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      backgroundColor: dayEntry?.color_hex ?? 'var(--color-subtle)',
                      border: isToday ? `2px solid ${todayEntry.color_hex}` : '2px solid transparent',
                      boxShadow: dayEntry ? `0 3px 10px ${dayEntry.color_hex}50` : undefined,
                      flexShrink: 0,
                    }} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Art Generator */}
          <div className="animate-fade-up" style={{ width: '100%', maxWidth: 400, animationDelay: '0.2s' } as CSSProperties}>
            <ArtGenerator entries={entries} height={220} />
          </div>

          {/* Share button */}
          {navigator.share && (
            <button
              onClick={async () => {
                try {
                  await navigator.share({
                    title: 'Il mio colore di oggi — Iride',
                    text: `Oggi mi sento ${todayEntry.mood_label ?? 'unico'} (${todayEntry.color_hex}) — Iride`,
                  })
                } catch { /* user cancelled */ }
              }}
              className="flex items-center gap-2 py-3 px-5 rounded-2xl text-[13px] font-semibold transition-all active:scale-[0.97]"
              style={{ border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M11 1l4 4-4 4M15 5H5a4 4 0 000 8h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Condividi il colore di oggi
            </button>
          )}
        </div>

        {showProfile && <ProfileSheet profile={profile} onClose={() => setShowProfile(false)} onSignOut={signOut} />}
      </div>
    )
  }

  // ─── Grace period active (entry confirmed but not yet committed) ─────────────
  if (pendingGrace) {
    const light = needsLightText(pendingGrace.colorHex)
    return (
      <div className="page-top flex flex-col px-6" style={{ minHeight: '60dvh' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--color-muted)' }}>
              {formatDate(today)}
            </p>
          </div>
          <button onClick={() => setShowProfile(true)} className="profile-btn" style={profileBtnStyle}>
            {initial}
          </button>
        </div>

        <div className="flex flex-col items-center gap-5 animate-fade-up">

          {/* Swatch */}
          <div
            className="animate-pop-in"
            style={{
              width: '82%', maxWidth: 260,
              aspectRatio: '4/5',
              borderRadius: 32,
              backgroundColor: pendingGrace.colorHex,
              boxShadow: `0 0 0 1px ${pendingGrace.colorHex}25, 0 24px 72px ${pendingGrace.colorHex}65, 0 6px 24px ${pendingGrace.colorHex}40`,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '22px 22px 18px',
            }}
          >
            <p style={{ fontSize: 10, fontFamily: 'monospace',
              color: light ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.25)',
              letterSpacing: '0.06em' }}>
              {pendingGrace.colorHex.toUpperCase()}
            </p>
            {pendingGrace.moodLabel && (
              <p style={{
                fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05,
                color: light ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.82)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                {pendingGrace.moodLabel}
              </p>
            )}
          </div>

          {/* Grace countdown banner */}
          <div style={{
            width: '100%', maxWidth: 400,
            borderRadius: 20,
            background: `${pendingGrace.colorHex}18`,
            border: `1.5px solid ${pendingGrace.colorHex}40`,
            padding: '14px 18px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-foreground)', marginBottom: 2 }}>
                  Periodo di modifica
                </p>
                <p style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: pendingGrace.colorHex }}>
                  {formatGraceTimer(graceTimeLeft)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
                  rimasto per modificare
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => setShowEditGrace(true)}
                  style={{
                    padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: pendingGrace.colorHex,
                    color: light ? '#fff' : '#1C1917',
                    fontSize: 12, fontWeight: 700,
                    boxShadow: `0 4px 12px ${pendingGrace.colorHex}55`,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  Modifica
                </button>
                <button
                  onClick={() => { if (profile) commitGrace(profile.id) }}
                  style={{
                    padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                    background: 'transparent',
                    border: `1.5px solid ${pendingGrace.colorHex}60`,
                    color: pendingGrace.colorHex,
                    fontSize: 12, fontWeight: 600,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  Conferma ora
                </button>
                <button
                  onClick={() => cancelGrace()}
                  style={{
                    padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                    background: 'transparent',
                    border: '1.5px solid var(--color-subtle)',
                    color: 'var(--color-muted)',
                    fontSize: 12, fontWeight: 600,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>

          {/* Art Generator */}
          <div style={{ width: '100%', maxWidth: 400 }}>
            <ArtGenerator entries={entries} height={220} />
          </div>
        </div>

        {showEditGrace && (
          <EditGraceSheet
            grace={pendingGrace}
            onSave={(updates) => { updateGrace(updates); setShowEditGrace(false) }}
            onClose={() => setShowEditGrace(false)}
          />
        )}
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
          background: `radial-gradient(ellipse 160% 55% at 50% -5%, ${bgColor}40 0%, transparent 58%), radial-gradient(ellipse 90% 28% at 50% 115%, ${bgColor}18 0%, transparent 100%)`,
          transition: 'background 0.8s ease',
        }} />
      )}

      <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col px-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-2" style={{ color: 'var(--color-muted)' }}>
              {formatDate(today)}
            </p>
            <h1 className="text-[36px] font-extrabold leading-[1.0] tracking-[-0.05em]" style={{ color: 'var(--color-foreground)' }}>
              Come ti<br />
              <span style={{ color: selected?.hex ?? 'inherit', transition: 'color 0.4s ease' }}>senti oggi?</span>
            </h1>
          </div>
          <button onClick={() => setShowProfile(true)} style={profileBtnStyle}>
            {initial}
          </button>
        </div>

        {/* ── Three-tab switcher ── */}
        <div className="flex gap-2 mb-5">
          {([
            { id: 'palette', label: 'Palette', icon: '⬛' },
            { id: 'custom',  label: 'Colore',  icon: '🎨' },
            { id: 'mix',     label: 'Mix',     icon: '✦' },
          ] as { id: Tab; label: string; icon: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className="flex-1 py-2.5 rounded-2xl text-[12px] font-bold transition-all active:scale-[0.95]"
              style={{
                background: tab === t.id
                  ? selected?.hex ? `${selected.hex}20` : 'var(--color-surface-raised)'
                  : 'transparent',
                color: tab === t.id ? (selected?.hex ?? 'var(--color-foreground)') : 'var(--color-muted)',
                border: tab === t.id
                  ? `1.5px solid ${selected?.hex ? selected.hex + '40' : 'var(--color-subtle)'}`
                  : '1.5px solid transparent',
                boxShadow: tab === t.id ? 'var(--shadow-xs)' : undefined,
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
            className="flex items-center gap-3 mb-5 py-3 px-4 rounded-2xl animate-fade-in"
            style={{
              background: `${selected.hex}15`,
              border: `1.5px solid ${selected.hex}40`,
              boxShadow: `0 4px 16px ${selected.hex}20`,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 11, backgroundColor: selected.hex, flexShrink: 0,
              boxShadow: `0 4px 14px ${selected.hex}60, 0 0 0 1.5px ${selected.hex}30`,
            }} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-extrabold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                {selected.label ?? 'Colore personalizzato'}
              </p>
              <p className="text-[10px] font-mono" style={{ color: 'var(--color-muted)' }}>{selected.hex.toUpperCase()}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{ color: 'var(--color-muted)', padding: 6 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── Tab content ── */}
        <div key={tabKey} className="tab-content-enter">

          {/* PALETTE TAB */}
          {tab === 'palette' && (
            <PaletteWithSections selected={selected} onSelect={handleSelectMood} />
          )}

          {/* CUSTOM COLOR TAB */}
          {tab === 'custom' && (
            <CustomColorTab
              customHex={customHex}
              setCustomHex={setCustomHex}
              onUse={handleUseCustom}
            />
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

        {error && <p className="text-[12px] mt-2 px-1" style={{ color: '#BE123C' }}>{error}</p>}

      </div>

      {/* ── Sticky CTA ── always visible above nav */}
      <div style={{
        position: 'sticky',
        bottom: 'calc(var(--nav-total) + 8px)',
        zIndex: 20,
        padding: '14px 20px 4px',
        background: `linear-gradient(to bottom, transparent 0%, var(--color-surface) 28%)`,
        pointerEvents: 'none',
      }}>
        <button
          onClick={() => setConfirming(true)}
          disabled={!selected}
          className="w-full py-4 rounded-2xl text-[15px] font-extrabold transition-all active:scale-[0.98] disabled:opacity-25"
          style={{
            pointerEvents: 'auto',
            background: selected?.hex ?? 'var(--color-foreground)',
            color: selected ? (needsLightText(selected.hex) ? '#FFFFFF' : '#1C1917') : 'rgba(255,255,255,0.6)',
            boxShadow: selected ? `0 12px 36px ${selected.hex}65, 0 4px 12px ${selected.hex}30` : '0 4px 14px rgba(28,25,23,0.18)',
            transition: 'background 0.35s ease, box-shadow 0.35s ease, color 0.35s ease',
            letterSpacing: '-0.02em',
          }}
        >
          {selected?.label ? `Oggi mi sento ${selected.label} →` : 'Scegli un colore'}
        </button>
      </div>

      {/* ── Confirmation sheet ── */}
      {confirming && selected && (
        <ConfirmSheet
          selected={selected}
          saving={saving}
          note={note}
          onNoteChange={setNote}
          tags={tags}
          onTagsChange={setTags}
          tagInput={tagInput}
          onTagInputChange={setTagInput}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}

      {showProfile && <ProfileSheet profile={profile} onClose={() => setShowProfile(false)} onSignOut={signOut} />}
    </div>
  )
}

// ─── Palette grouped by emotional family ────────────────────────────────────
const PRIMARY_GROUPS: { label: string; moods: MoodColor[] }[] = [
  { label: 'Luminose', moods: [0,1,2,8,9].map(i => MOOD_PALETTE[i]) },
  { label: 'Calde',    moods: [3,4,7,10,11].map(i => MOOD_PALETTE[i]) },
  { label: 'Profonde', moods: [5,6,12,13,14].map(i => MOOD_PALETTE[i]) },
  { label: 'Intense',  moods: [15,16,17,18,19].map(i => MOOD_PALETTE[i]) },
]
const EXTRA_GROUPS: { label: string; moods: MoodColor[] }[] = [
  { label: 'Mente Attiva', moods: MOOD_PALETTE.slice(20, 24) },
  { label: "Zone d'Ombra", moods: MOOD_PALETTE.slice(24, 28) },
]

function PaletteGroup({ label, moods, cols, isOpen, hasSelected, selectedHex, onToggle, onSelect }: {
  label: string; moods: MoodColor[]; cols: number
  isOpen: boolean; hasSelected: boolean; selectedHex: string | undefined
  onToggle: () => void; onSelect: (m: MoodColor) => void
}) {
  // Representative color = middle of the group
  const accent = moods[Math.floor(moods.length / 2)].hex

  return (
    <div style={{
      borderRadius: 20,
      border: `1.5px solid ${accent}${isOpen ? '38' : '22'}`,
      background: isOpen ? `${accent}12` : `${accent}07`,
      transition: 'border-color 0.22s ease, background 0.22s ease',
      overflow: 'hidden',
    }}>
      {/* ── Group header ── */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isOpen ? '12px 14px 10px' : '11px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          transition: 'padding 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* Color spectrum strip */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {moods.map(m => (
              <div key={m.hex} style={{
                width: m.hex === selectedHex ? 14 : 10,
                height: m.hex === selectedHex ? 14 : 10,
                borderRadius: 5,
                backgroundColor: m.hex,
                flexShrink: 0,
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: m.hex === selectedHex
                  ? `0 0 0 2px var(--color-surface-raised), 0 0 0 3.5px ${m.hex}, 0 3px 8px ${m.hex}70`
                  : `0 1px 4px ${m.hex}55`,
              }} />
            ))}
          </div>
          {/* Label */}
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
            color: hasSelected ? 'var(--color-foreground)' : 'var(--color-muted)',
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'color 0.2s ease',
          }}>
            {label}
          </span>
          {hasSelected && !isOpen && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
              background: `${selectedHex}25`, color: selectedHex,
              border: `1px solid ${selectedHex}40`,
            }}>
              ✓
            </span>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{
          transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.22s ease',
          color: hasSelected ? accent : 'var(--color-muted)',
          flexShrink: 0,
        }}>
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── Swatch grid ── */}
      {isOpen && (
        <div className="tab-content-enter" style={{
          display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 7, padding: '2px 10px 12px',
        }}>
          {moods.map((mood) => {
            const isSelected = selectedHex === mood.hex
            const light = needsLightText(mood.hex)
            return (
              <button
                key={mood.hex}
                onClick={() => { if (navigator.vibrate) navigator.vibrate(15); onSelect(mood) }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: 16 }}
              >
                <div style={{
                  width: '100%',
                  paddingTop: '100%', // perfect square
                  borderRadius: isSelected ? 18 : 14,
                  backgroundColor: mood.hex,
                  position: 'relative',
                  transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: isSelected ? 'scale(1.07)' : 'scale(1)',
                  boxShadow: isSelected
                    ? `0 0 0 2.5px var(--color-surface), 0 0 0 4.5px ${mood.hex}, 0 10px 28px ${mood.hex}70`
                    : `0 2px 8px ${mood.hex}50`,
                }}>
                  {/* Label */}
                  <div style={{ position: 'absolute', bottom: 5, left: 5, right: 5, pointerEvents: 'none' }}>
                    <p style={{
                      fontSize: 8, fontWeight: isSelected ? 800 : 700,
                      color: light ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.72)',
                      lineHeight: 1.15, fontFamily: 'Inter, system-ui, sans-serif',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {mood.label}
                    </p>
                  </div>
                  {/* Check badge */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 15, height: 15, borderRadius: '50%',
                      background: light ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6"
                          stroke={light ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.80)'}
                          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PaletteWithSections({ selected, onSelect }: {
  selected: Selection | null
  onSelect: (m: MoodColor) => void
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    'Luminose': true, 'Calde': false, 'Profonde': false, 'Intense': false,
    'Mente Attiva': false, "Zone d'Ombra": false,
  })

  // One-at-a-time: opening one group closes all others
  const toggle = (label: string) => setOpen(o => {
    const wasOpen = o[label]
    const next: Record<string, boolean> = {}
    Object.keys(o).forEach(k => { next[k] = k === label ? !wasOpen : false })
    return next
  })

  const handleSelect = (m: MoodColor, groupLabel: string) => {
    onSelect(m)
    // Auto-close the group after selection
    setOpen(o => ({ ...o, [groupLabel]: false }))
  }

  return (
    <div className="space-y-2.5">
      {PRIMARY_GROUPS.map(g => (
        <PaletteGroup key={g.label} label={g.label} moods={g.moods} cols={5}
          isOpen={open[g.label]} hasSelected={g.moods.some(m => m.hex === selected?.hex)}
          selectedHex={selected?.hex}
          onToggle={() => toggle(g.label)}
          onSelect={(m) => handleSelect(m, g.label)}
        />
      ))}
      {EXTRA_GROUPS.map(g => (
        <PaletteGroup key={g.label} label={g.label} moods={g.moods} cols={4}
          isOpen={open[g.label]} hasSelected={g.moods.some(m => m.hex === selected?.hex)}
          selectedHex={selected?.hex}
          onToggle={() => toggle(g.label)}
          onSelect={(m) => handleSelect(m, g.label)}
        />
      ))}
    </div>
  )
}

// ─── Custom Color Tab ─────────────────────────────────────────────────────────
function CustomColorTab({ customHex, setCustomHex, onUse }: {
  customHex: string
  setCustomHex: (v: string) => void
  onUse: (label: string) => void
}) {
  const [sentiment, setSentiment] = useState('')
  const light = needsLightText(customHex)
  const ok = sentiment.trim().length >= 2

  // Palette autocomplete suggestions
  const suggestions = sentiment.length >= 1
    ? MOOD_PALETTE.filter(m => m.label.toLowerCase().startsWith(sentiment.toLowerCase())).slice(0, 3)
    : []

  return (
    <div className="space-y-4">
      <div className="rounded-3xl overflow-hidden"
        style={{ border: `2px solid ${customHex}40`, background: `linear-gradient(135deg, ${customHex}12, ${customHex}05)` }}>

        {/* Color preview */}
        <div style={{ height: 110, backgroundColor: customHex, display: 'flex', alignItems: 'flex-end', padding: '0 20px 14px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
            color: light ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)' }}>
            {customHex.toUpperCase()}
          </p>
        </div>

        <div className="p-4 space-y-3">
          {/* Hex picker row */}
          <div className="flex items-center gap-3">
            <input type="color" value={customHex} onChange={e => setCustomHex(e.target.value)}
              style={{ width: 48, height: 48, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0 }} />
            <input type="text" value={customHex}
              onChange={e => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setCustomHex(v) }}
              className="flex-1 px-4 py-3 rounded-xl text-[13px] font-mono focus:outline-none"
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}
              placeholder="#000000" maxLength={7} />
          </div>

          {/* Sentiment field */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--color-muted)' }}>
              Come ti fa sentire questo colore?
            </p>
            <input
              type="text"
              value={sentiment}
              onChange={e => setSentiment(e.target.value)}
              placeholder="es. malinconico, in pace, energico…"
              maxLength={40}
              className="w-full px-4 py-3 rounded-xl text-[13px] focus:outline-none transition-all"
              style={{
                background: 'var(--color-surface)',
                border: `1.5px solid ${ok ? customHex + '60' : 'var(--color-subtle)'}`,
                color: 'var(--color-foreground)',
              }}
            />
            {ok && <p className="text-[11px] mt-1.5" style={{ color: customHex }}>✓ Pronto</p>}

            {/* Autocomplete chips */}
            {suggestions.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {suggestions.map(m => (
                  <button
                    key={m.hex}
                    type="button"
                    onClick={() => { setSentiment(m.label); setCustomHex(m.hex); onUse(m.label) }}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 100,
                      background: `${m.hex}20`, border: `1px solid ${m.hex}40`,
                      color: 'var(--color-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: m.hex, display: 'inline-block' }} />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => { if (ok) onUse(sentiment.trim()) }}
            disabled={!ok}
            className="w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.97] disabled:opacity-40"
            style={{ background: customHex, color: light ? '#fff' : '#1C1917', boxShadow: `0 6px 20px ${customHex}50` }}>
            Usa questo colore →
          </button>
        </div>
      </div>
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
function ConfirmSheet({ selected, saving, note, onNoteChange, tags, onTagsChange, tagInput, onTagInputChange, onConfirm, onCancel }: {
  selected: Selection; saving: boolean
  note: string; onNoteChange: (v: string) => void
  tags: string[]; onTagsChange: (v: string[]) => void
  tagInput: string; onTagInputChange: (v: string) => void
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

  const addTag = (raw: string) => {
    const tag = raw.trim().slice(0, 20).replace(/,/g, '')
    if (!tag || tags.includes(tag) || tags.length >= 5) return
    onTagsChange([...tags, tag])
    onTagInputChange('')
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  const removeTag = (t: string) => onTagsChange(tags.filter(x => x !== t))

  return (
    <div
      className="fixed inset-0 flex items-end justify-center animate-fade-in"
      style={{ zIndex: 100, background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(18px)', padding: '0 0 max(env(safe-area-inset-bottom),16px) 0' }}
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

          {/* Tags section */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--color-muted)' }}>
              Tag (facoltativo)
            </p>
            {/* Chips */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {tags.map(t => (
                  <div
                    key={t}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: `${selected.hex}20`,
                      border: `1.5px solid ${selected.hex}50`,
                      borderRadius: 100,
                      padding: '3px 10px 3px 12px',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)' }}>{t}</span>
                    <button
                      onClick={() => removeTag(t)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 2l6 6M8 2l-6 6" stroke="var(--color-muted)" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {tags.length < 5 && (
              <input
                type="text"
                value={tagInput}
                onChange={e => onTagInputChange(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                placeholder="Digita un tag e premi Invio…"
                maxLength={20}
                className="w-full px-4 py-2.5 rounded-xl text-[13px] focus:outline-none"
                style={{
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-subtle)',
                  color: 'var(--color-foreground)',
                }}
              />
            )}
            {tags.length >= 5 && (
              <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>Massimo 5 tag raggiunto.</p>
            )}
          </div>

          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Avrai <strong style={{ color: 'var(--color-foreground)' }}>5 minuti</strong> per modificare prima che venga salvato definitivamente.
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
              {saving ? '···' : 'Conferma →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Profile sheet ────────────────────────────────────────────────────────────
const profileBtnStyle: CSSProperties = {
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
  const { theme, setTheme } = useThemeStore()
  const [reminderOn, setReminderOn]     = useState(!!localStorage.getItem('iride_reminder_time'))
  const [reminderTime, setReminderTime] = useState(localStorage.getItem('iride_reminder_time') || '20:00')

  const handleReminderToggle = async () => {
    if (reminderOn) {
      localStorage.removeItem('iride_reminder_time')
      setReminderOn(false)
    } else {
      if (!('Notification' in window)) return
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        localStorage.setItem('iride_reminder_time', reminderTime)
        setReminderOn(true)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-end justify-center animate-fade-in"
      style={{ zIndex: 100, background: 'rgba(28,25,23,0.50)', backdropFilter: 'blur(16px)', padding: '0 0 max(env(safe-area-inset-bottom),16px) 0' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-3xl p-6 space-y-4 animate-slide-up"
        style={{ background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-lg)', maxHeight: '85dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
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

        {/* Theme toggle */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--color-muted)' }}>Tema</p>
          <div className="flex p-1 gap-1 rounded-2xl" style={{ background: 'var(--color-subtle)' }}>
            {(['light','dark','system'] as const).map(t => (
              <button key={t} onClick={() => setTheme(t)}
                className="flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: theme === t ? 'var(--color-surface-raised)' : 'transparent',
                  color: theme === t ? 'var(--color-foreground)' : 'var(--color-muted)',
                  boxShadow: theme === t ? 'var(--shadow-xs)' : undefined,
                }}>
                {t === 'light' ? 'Light' : t === 'dark' ? 'Dark' : 'Auto'}
              </button>
            ))}
          </div>
        </div>

        {/* Reminder toggle */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>Reminder giornaliero</p>
              <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Notifica quando l'app è aperta nel browser</p>
            </div>
            <div onClick={handleReminderToggle} style={{
              width: 44, height: 26, borderRadius: 99, position: 'relative', cursor: 'pointer', flexShrink: 0,
              background: reminderOn ? 'var(--color-foreground)' : 'var(--color-subtle)', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 4, width: 18, height: 18, borderRadius: '50%',
                background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                left: reminderOn ? 22 : 4, transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </div>
          </div>
          {reminderOn && (
            <select value={reminderTime}
              onChange={e => { setReminderTime(e.target.value); localStorage.setItem('iride_reminder_time', e.target.value) }}
              className="w-full px-4 py-2.5 rounded-xl text-[13px] focus:outline-none mt-2"
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}>
              {Array.from({ length: 33 }, (_, i) => {
                const mins = 7*60 + i*30
                const h = String(Math.floor(mins/60)).padStart(2,'0')
                const m = String(mins%60).padStart(2,'0')
                return <option key={`${h}:${m}`} value={`${h}:${m}`}>{h}:{m}</option>
              })}
            </select>
          )}
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

// ─── Edit Grace Sheet (Step 4) ────────────────────────────────────────────────
function EditGraceSheet({ grace, onSave, onClose }: {
  grace: GraceEntry
  onSave: (updates: Partial<Pick<GraceEntry, 'colorHex' | 'moodLabel' | 'note' | 'tags' | 'source'>>) => void
  onClose: () => void
}) {
  const [selectedMood, setSelectedMood] = useState<MoodColor | null>(
    MOOD_PALETTE.find(m => m.hex === grace.colorHex) ?? null
  )
  const [note, setNote]   = useState(grace.note ?? '')
  const [tags, setTags]   = useState<string[]>(grace.tags ?? [])
  const [tagIn, setTagIn] = useState('')
  const light = needsLightText(selectedMood?.hex ?? grace.colorHex)
  const hex = selectedMood?.hex ?? grace.colorHex

  const addTag = (raw: string) => {
    const t = raw.trim().slice(0,20)
    if (!t || tags.includes(t) || tags.length >= 5) return
    setTags(ts => [...ts, t]); setTagIn('')
  }

  return (
    <div className="fixed inset-0 flex items-end justify-center animate-fade-in"
      style={{ zIndex: 100, background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(18px)', padding: '0 0 max(env(safe-area-inset-bottom),16px) 0' }}
      onClick={onClose}>
      <div className="w-full max-w-md mx-4 rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-lg)', maxHeight: '85dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Color preview header */}
        <div style={{ height: 100, background: hex, display: 'flex', alignItems: 'flex-end', padding: '0 20px 14px' }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: light ? 'rgba(255,255,255,0.95)':'rgba(0,0,0,0.82)',
            fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '-0.04em' }}>
            {selectedMood?.label ?? 'Personalizzato'}
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Mini palette */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--color-muted)' }}>Cambia colore</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
              {MOOD_PALETTE.map(m => (
                <button key={m.hex} onClick={() => setSelectedMood(m)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  <div style={{ width: '100%', paddingTop: '100%', borderRadius: '50%', backgroundColor: m.hex,
                    border: selectedMood?.hex === m.hex ? '2.5px solid var(--color-foreground)' : '2px solid transparent',
                    transform: selectedMood?.hex === m.hex ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.18s', }} />
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--color-muted)' }}>Nota</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={280} rows={2}
              className="w-full px-4 py-3 rounded-2xl text-[13px] focus:outline-none resize-none"
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }} />
          </div>

          {/* Tags */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--color-muted)' }}>Tag</p>
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                {tags.map(t => (
                  <span key={t} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: `${hex}20`, border: `1px solid ${hex}40`, color: 'var(--color-foreground)', cursor: 'pointer' }}
                    onClick={() => setTags(ts => ts.filter(x => x !== t))}>
                    {t} ×
                  </span>
                ))}
              </div>
            )}
            {tags.length < 5 && (
              <input value={tagIn} onChange={e => setTagIn(e.target.value)} maxLength={20}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagIn) } }}
                onBlur={() => { if (tagIn.trim()) addTag(tagIn) }}
                placeholder="Aggiungi tag…"
                className="w-full px-4 py-2.5 rounded-xl text-[13px] focus:outline-none"
                style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }} />
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold active:scale-[0.98]"
              style={{ border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}>
              Annulla
            </button>
            <button
              onClick={() => onSave({ colorHex: hex, moodLabel: selectedMood?.label ?? grace.moodLabel, note: note.trim() || null, tags, source: selectedMood ? 'palette' : grace.source })}
              className="flex-[2] py-3.5 rounded-2xl text-[14px] font-extrabold active:scale-[0.98]"
              style={{ background: hex, color: light ? '#fff' : '#1C1917', boxShadow: `0 6px 20px ${hex}55` }}>
              Salva modifiche →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
