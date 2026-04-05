import { useEffect, useState } from 'react'
import { useMoodStore } from '../store/useMoodStore'
import { useAuthStore } from '../store/useAuthStore'
import {
  toISO, getWeekDays, getMonthCells,
  MONTH_FULL, MONTH_SHORT, DAY_INITIAL,
} from '../lib/dateUtils'
import { EMPTY_CELL_LIGHT } from '../constants/moods'
import type { MoodEntry, ViewMode } from '../types'

type Mode = ViewMode | 'diary'

const DAY_NAMES = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']

function needsLight(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 < 0.55
}

export default function History() {
  const { profile } = useAuthStore()
  const { entries, fetchEntries } = useMoodStore()
  const [mode, setMode]     = useState<Mode>('monthly')
  const [loaded, setLoaded] = useState(false)

  const today = new Date()

  useEffect(() => {
    if (profile && !loaded) {
      fetchEntries(profile.id).then(() => setLoaded(true))
    }
  }, [profile])

  const entryMap     = new Map(entries.map(e => [e.date, e.color_hex]))
  const getCellColor = (d: Date | null) => d ? (entryMap.get(toISO(d)) ?? null) : null
  const todayStr     = toISO(today)

  const tabs: { key: Mode; label: string }[] = [
    { key: 'weekly',  label: 'Sett.' },
    { key: 'monthly', label: 'Mese' },
    { key: 'yearly',  label: 'Anno' },
    { key: 'diary',   label: 'Diario' },
  ]

  return (
    <div className="page-top flex flex-col">
      {/* Header + tab bar */}
      <div className="px-5 pb-5">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.04em] mb-5" style={{ color: 'var(--color-foreground)' }}>
          Memoria
        </h1>
        <div className="flex p-1 gap-1 rounded-2xl" style={{ background: 'var(--color-subtle)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97]"
              style={{
                background: mode === tab.key ? 'var(--color-surface-raised)' : 'transparent',
                color:      mode === tab.key ? 'var(--color-foreground)'     : 'var(--color-muted)',
                boxShadow:  mode === tab.key ? 'var(--shadow-xs)'            : undefined,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5">
        {!loaded ? (
          <div className="flex items-center justify-center h-40">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD000', animation: 'ping 1s infinite' }} />
          </div>
        ) : mode === 'weekly' ? (
          <WeeklyView today={today} getCellColor={getCellColor} todayStr={todayStr} />
        ) : mode === 'monthly' ? (
          <MonthlyView today={today} getCellColor={getCellColor} todayStr={todayStr} />
        ) : mode === 'yearly' ? (
          <YearlyView year={today.getFullYear()} getCellColor={getCellColor} todayStr={todayStr} />
        ) : (
          <DiaryView entries={entries} />
        )}
      </div>
    </div>
  )
}

// ─── Diary view ──────────────────────────────────────────────────────────────
function DiaryView({ entries }: { entries: MoodEntry[] }) {
  const withNotes  = entries.filter(e => e.note)
  const allEntries = [...entries].sort((a,b) => b.date.localeCompare(a.date))

  if (allEntries.length === 0) {
    return (
      <div className="card p-8 text-center mt-4">
        <p className="text-[32px] mb-3">📖</p>
        <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
          Il diario è vuoto
        </p>
        <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
          Quando salvi un colore puoi scrivere una frase. Apparirà qui.
        </p>
      </div>
    )
  }

  // Group by month
  const byMonth: Record<string, MoodEntry[]> = {}
  allEntries.forEach(e => {
    const key = e.date.slice(0, 7) // YYYY-MM
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(e)
  })

  return (
    <div className="space-y-8 pb-4">
      {withNotes.length === 0 && (
        <div className="px-1">
          <p className="text-[12px]" style={{ color: 'var(--color-muted)' }}>
            Nessuna nota ancora — scrivi qualcosa quando salvi il prossimo colore.
          </p>
        </div>
      )}

      {Object.entries(byMonth).map(([monthKey, monthEntries]) => {
        const [y, m] = monthKey.split('-').map(Number)
        return (
          <div key={monthKey}>
            {/* Month header */}
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] mb-3" style={{ color: 'var(--color-muted)' }}>
              {MONTH_FULL[m-1]} {y}
            </p>

            <div className="space-y-3">
              {monthEntries.map(entry => {
                const d     = new Date(entry.date + 'T12:00:00')
                const light = needsLight(entry.color_hex)

                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      border: `1.5px solid ${entry.color_hex}30`,
                      background: 'var(--color-surface-raised)',
                      boxShadow: `var(--shadow-xs)`,
                    }}
                  >
                    {/* Color strip + date */}
                    <div style={{
                      background: entry.color_hex,
                      padding: '10px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 800, letterSpacing: '-0.02em',
                          color: light ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.8)',
                        }}>
                          {entry.mood_label ?? 'Personalizzato'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {entry.location_label && (
                          <span style={{
                            fontSize: 9,
                            color: light ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)',
                          }}>
                            📍 {entry.location_label}
                          </span>
                        )}
                        <span style={{
                          fontSize: 10,
                          color: light ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)',
                        }}>
                          {DAY_NAMES[d.getDay()]} {d.getDate()}
                        </span>
                      </div>
                    </div>

                    {/* Note or empty state */}
                    <div className="px-4 py-3">
                      {entry.note ? (
                        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
                          "{entry.note}"
                        </p>
                      ) : (
                        <p className="text-[12px]" style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>
                          Nessuna nota per questo giorno.
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Grid sub-views ──────────────────────────────────────────────────────────

function WeeklyView({ today, getCellColor, todayStr }: {
  today: Date; getCellColor: (d: Date | null) => string | null; todayStr: string
}) {
  const days = getWeekDays(today)
  return (
    <div className="space-y-5">
      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted">
        {days[0].getDate()}–{days[6].getDate()} {MONTH_FULL[days[0].getMonth()]} {days[0].getFullYear()}
      </p>
      <div className="grid grid-cols-7 gap-2">
        {DAY_INITIAL.map((d, i) => (
          <p key={i} className="text-center text-[9px] text-muted uppercase tracking-wider font-medium">{d}</p>
        ))}
        {days.map((day, i) => {
          const color   = getCellColor(day)
          const isToday = toISO(day) === todayStr
          return (
            <div key={i} className="space-y-1.5">
              <div
                className={`aspect-square rounded-2xl transition-colors ${isToday ? 'ring-2 ring-foreground/30 ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: color ?? EMPTY_CELL_LIGHT }}
              />
              <p className="text-center text-[9px] text-muted">{day.getDate()}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyView({ today, getCellColor, todayStr }: {
  today: Date; getCellColor: (d: Date | null) => string | null; todayStr: string
}) {
  const year  = today.getFullYear()
  const month = today.getMonth()
  const cells = getMonthCells(year, month)
  return (
    <div className="space-y-5">
      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted">
        {MONTH_FULL[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-2">
        {DAY_INITIAL.map((d, i) => (
          <p key={i} className="text-center text-[9px] text-muted uppercase tracking-wider font-medium">{d}</p>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const color   = getCellColor(day)
          const isToday = toISO(day) === todayStr
          return (
            <div key={i} className="space-y-0.5">
              <div
                className={`aspect-square rounded-xl transition-colors ${isToday ? 'ring-2 ring-foreground/30 ring-offset-1 ring-offset-surface' : ''}`}
                style={{ backgroundColor: color ?? EMPTY_CELL_LIGHT }}
              />
              <p className="text-center text-[8px] text-muted">{day.getDate()}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function YearlyView({ year, getCellColor, todayStr }: {
  year: number; getCellColor: (d: Date | null) => string | null; todayStr: string
}) {
  return (
    <div className="space-y-5">
      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted">{year}</p>
      <div className="space-y-4">
        {Array.from({ length: 12 }, (_, m) => {
          const cells = getMonthCells(year, m)
          return (
            <div key={m} className="space-y-1.5">
              <p className="text-[9px] font-medium text-muted uppercase tracking-wider">{MONTH_SHORT[m]}</p>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} className="aspect-square" />
                  const color   = getCellColor(day)
                  const isToday = toISO(day) === todayStr
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-md ${isToday ? 'ring-1 ring-foreground/30' : ''}`}
                      style={{ backgroundColor: color ?? EMPTY_CELL_LIGHT }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
