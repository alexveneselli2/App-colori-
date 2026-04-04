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

export default function Today() {
  const { profile } = useAuthStore()
  const { todayEntry, fetchTodayEntry, saveTodayEntry } = useMoodStore()
  const [loaded, setLoaded]       = useState(false)
  const [selected, setSelected]   = useState<Selection | null>(null)
  const [customHex, setCustomHex] = useState('#3A86FF')
  const [showCustom, setShowCustom] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

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

  // --- Loading ---
  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: '#3A86FF' }} />
      </div>
    )
  }

  // --- Entry already saved today ---
  if (todayEntry) {
    return (
      <div className="flex flex-col min-h-screen px-6 pt-16 pb-10">
        <p className="text-xs text-muted tracking-widest uppercase">
          {formatDate(today)}
        </p>

        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          {/* The color — full protagonist */}
          <div
            className="w-52 h-52 rounded-3xl shadow-sm"
            style={{ backgroundColor: todayEntry.color_hex }}
          />

          <div className="text-center space-y-1.5">
            {todayEntry.mood_label && (
              <p className="text-xl font-light text-foreground">{todayEntry.mood_label}</p>
            )}
            <p className="text-xs font-mono text-muted">
              {todayEntry.color_hex.toUpperCase()}
            </p>
          </div>

          <p className="text-xs text-muted text-center leading-relaxed">
            Il colore di oggi è custodito.<br />
            Torna domani.
          </p>
        </div>
      </div>
    )
  }

  // --- Choose today’s color ---
  return (
    <div className="flex flex-col min-h-screen px-6 pt-14 pb-8">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted tracking-widest uppercase mb-2">
          {formatDate(today)}
        </p>
        <h2 className="text-2xl font-light text-foreground leading-snug">
          Come ti senti<br />oggi?
        </h2>
      </div>

      {/* Selected preview */}
      {selected && (
        <div className="flex items-center gap-3 mb-6 py-3 px-4 bg-surface-raised rounded-2xl">
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 transition-colors duration-300"
            style={{ backgroundColor: selected.hex }}
          />
          <div className="min-w-0">
            {selected.label && (
              <p className="text-sm font-medium text-foreground">{selected.label}</p>
            )}
            <p className="text-xs text-muted font-mono">{selected.hex.toUpperCase()}</p>
          </div>
        </div>
      )}

      {/* Mood palette 4×3 grid */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        {MOOD_PALETTE.map(mood => (
          <button
            key={mood.hex}
            onClick={() => handleSelectMood(mood)}
            className="aspect-square rounded-2xl transition-all duration-100 active:scale-95"
            style={{
              backgroundColor: mood.hex,
              boxShadow:
                selected?.hex === mood.hex
                  ? `0 0 0 2.5px var(--color-surface), 0 0 0 4px ${mood.hex}`
                  : undefined,
              transform: selected?.hex === mood.hex ? 'scale(1.07)' : undefined,
            }}
            title={mood.label}
            aria-label={mood.label}
          />
        ))}
      </div>

      {/* Palette mood label hint */}
      {selected?.source === 'palette' && selected.label && (
        <p className="text-center text-xs text-muted mb-4">{selected.label}</p>
      )}

      {/* Custom color picker */}
      <div className="mt-2 space-y-3">
        <button
          type="button"
          onClick={() => {
            const next = !showCustom
            setShowCustom(next)
            if (next) setSelected({ hex: customHex, label: null, source: 'custom' })
          }}
          className="flex items-center gap-2.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <div
            className="w-7 h-7 rounded-lg border border-subtle flex-shrink-0"
            style={{ backgroundColor: customHex }}
          />
          <span>Scegli un colore personalizzato</span>
        </button>

        {showCustom && (
          <div className="flex items-center gap-3 pl-1">
            <input
              type="color"
              value={customHex}
              onChange={e => handleCustomChange(e.target.value)}
              className="w-11 h-11 rounded-xl cursor-pointer flex-shrink-0"
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
              className="w-28 px-3 py-2 bg-surface-raised rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400 mt-4">{error}</p>}

      {/* Confirm CTA */}
      <div className="mt-auto pt-8">
        <button
          onClick={() => setConfirming(true)}
          disabled={!selected}
          className="w-full py-4 rounded-2xl bg-foreground text-surface text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-20"
        >
          Fissa questo colore
        </button>
      </div>

      {/* Confirmation bottom sheet */}
      {confirming && selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-md bg-surface rounded-3xl p-7 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-2xl"
                style={{ backgroundColor: selected.hex }}
              />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-medium text-foreground">
                {selected.label ?? 'Colore personalizzato'}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Stai per fissare il colore di oggi.<br />
                Questa scelta è permanente e non potrà<br />
                essere modificata.
              </p>
              <p className="text-xs font-mono text-muted/50 mt-1">
                {selected.hex.toUpperCase()}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-3.5 rounded-2xl border border-subtle text-sm text-foreground font-medium transition-all active:scale-[0.98]"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-3.5 rounded-2xl text-sm font-medium text-white transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: selected.hex }}
              >
                {saving ? '···' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
