import { useEffect, useMemo, useRef, useState } from 'react'
import { useMoodStore } from '../store/useMoodStore'
import { useAuthStore } from '../store/useAuthStore'
import {
  toISO, getWeekDays, getMonthCells,
  MONTH_FULL, MONTH_SHORT, DAY_INITIAL,
} from '../lib/dateUtils'
import { EMPTY_CELL_LIGHT } from '../constants/moods'
import DeepHistory from '../components/DeepHistory'
import { useT } from '../store/useLanguageStore'
import type { MoodEntry, ViewMode } from '../types'

type Mode = ViewMode | 'diary' | 'timeline'

function needsLight(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 < 0.55
}

export default function History() {
  const { profile } = useAuthStore()
  const { entries, fetchEntries } = useMoodStore()
  const t = useT()
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
    { key: 'weekly',   label: t.history_weekly },
    { key: 'monthly',  label: t.history_monthly },
    { key: 'yearly',   label: t.history_yearly },
    { key: 'diary',    label: t.history_diary },
    { key: 'timeline', label: t.history_timeline },
  ]

  return (
    <div className="page-top flex flex-col">
      {/* Header + tab bar */}
      <div className="px-5 pb-5">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.04em] mb-5" style={{ color: 'var(--color-foreground)' }}>
          {t.history_title}
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
        ) : mode === 'timeline' ? (
          <DeepHistory entries={entries} />
        ) : (
          <DiaryView entries={entries} />
        )}
      </div>
    </div>
  )
}

// ─── Diary view ──────────────────────────────────────────────────────────────
function DiaryView({ entries }: { entries: MoodEntry[] }) {
  const t = useT()
  const [query, setQuery]           = useState('')
  const [debouncedQuery, setDQ]     = useState('')
  const [chipFilter, setChipFilter] = useState<string>('all')
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const allEntries = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries])

  // Debounce search
  const handleSearch = (v: string) => {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDQ(v), 200)
  }

  // Top-5 colors by frequency
  const top5Colors = useMemo(() => {
    const freq: Record<string, { hex: string; label: string | null; count: number }> = {}
    allEntries.forEach(e => {
      if (!freq[e.color_hex]) freq[e.color_hex] = { hex: e.color_hex, label: e.mood_label, count: 0 }
      freq[e.color_hex].count++
    })
    return Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [allEntries])

  // Filtered entries
  const filtered = useMemo(() => {
    let result = allEntries
    const q = debouncedQuery.toLowerCase().trim()
    if (q) {
      result = result.filter(e =>
        (e.note?.toLowerCase().includes(q)) ||
        (e.tags?.some(t => t.toLowerCase().includes(q)))
      )
    }
    if (chipFilter === 'note') result = result.filter(e => e.note)
    else if (chipFilter === 'location') result = result.filter(e => e.location_label)
    else if (chipFilter !== 'all') result = result.filter(e => e.color_hex === chipFilter)
    return result
  }, [allEntries, debouncedQuery, chipFilter])

  if (allEntries.length === 0) {
    return (
      <div className="card p-8 text-center mt-4">
        <p className="text-[32px] mb-3">📖</p>
        <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>{t.diary_empty}</p>
        <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>{t.diary_empty_sub}</p>
      </div>
    )
  }

  // Group filtered by month
  const byMonth: Record<string, MoodEntry[]> = {}
  filtered.forEach(e => {
    const key = e.date.slice(0, 7)
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(e)
  })

  const chipStyle = (active: boolean, colorHex?: string): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap', border: 'none',
    background: active ? (colorHex ?? 'var(--color-foreground)') : 'var(--color-surface-raised)',
    color: active ? (colorHex ? (needsLight(colorHex) ? '#fff' : '#1C1917') : 'var(--color-surface)') : 'var(--color-muted)',
    boxShadow: active ? 'var(--shadow-xs)' : undefined,
    transition: 'all 0.18s ease',
  })

  return (
    <div className="space-y-4 pb-4">
      {/* Search bar */}
      <div style={{ position: 'relative' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }}>
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text" value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder={t.diary_search_ph}
          style={{
            width: '100%', padding: '11px 40px 11px 38px', borderRadius: 16, fontSize: 13,
            background: 'var(--color-surface-raised)', border: '1.5px solid var(--color-subtle)',
            color: 'var(--color-foreground)', outline: 'none',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setDQ('') }} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)',
            fontSize: 16, lineHeight: 1, padding: 2,
          }}>×</button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }} className="no-scrollbar">
        <button onClick={() => setChipFilter('all')} style={chipStyle(chipFilter === 'all')}>{t.diary_all}</button>
        <button onClick={() => setChipFilter('note')} style={chipStyle(chipFilter === 'note')}>{t.diary_with_note}</button>
        <button onClick={() => setChipFilter('location')} style={chipStyle(chipFilter === 'location')}>{t.diary_with_loc}</button>
        {top5Colors.map(c => (
          <button key={c.hex} onClick={() => setChipFilter(prev => prev === c.hex ? 'all' : c.hex)}
            style={chipStyle(chipFilter === c.hex, c.hex)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.hex, display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }} />
              {c.label ?? c.hex.slice(0, 7)}
            </span>
          </button>
        ))}
      </div>

      {/* Results count when searching */}
      {(debouncedQuery || chipFilter !== 'all') && (
        <p style={{ fontSize: 11, color: 'var(--color-muted)' }}>
          {filtered.length} {filtered.length === 1 ? t.diary_result : t.diary_results}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p style={{ fontSize: 28, marginBottom: 8 }}>🔍</p>
          <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>{t.diary_no_results}</p>
        </div>
      ) : (
        Object.entries(byMonth).map(([monthKey, monthEntries]) => {
          const [y, m] = monthKey.split('-').map(Number)
          return (
            <div key={monthKey}>
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] mb-3" style={{ color: 'var(--color-muted)' }}>
                {MONTH_FULL[m-1]} {y}
              </p>
              <div className="space-y-3">
                {monthEntries.map(entry => {
                  const d = new Date(entry.date + 'T12:00:00')
                  const light = needsLight(entry.color_hex)
                  return (
                    <div key={entry.id} className="rounded-2xl overflow-hidden"
                      style={{ border: `1.5px solid ${entry.color_hex}30`, background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-xs)' }}>
                      <div style={{ background: entry.color_hex, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: light ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.8)' }}>
                          {entry.mood_label ?? t.stats_custom}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {entry.location_label && <span style={{ fontSize: 9, color: light ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)' }}>📍 {entry.location_label}</span>}
                          <span style={{ fontSize: 10, color: light ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)' }}>
                            {t.days_short[d.getDay()]} {d.getDate()}
                          </span>
                        </div>
                      </div>
                      <div style={{ padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {entry.note ? (
                          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-foreground)' }}>"{entry.note}"</p>
                        ) : (
                          <p style={{ fontSize: 12, color: 'var(--color-muted)', fontStyle: 'italic' }}>{t.diary_no_note}</p>
                        )}
                        {entry.tags && entry.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {entry.tags.map(t => (
                              <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${entry.color_hex}18`, border: `1px solid ${entry.color_hex}35`, color: 'var(--color-foreground)' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
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
