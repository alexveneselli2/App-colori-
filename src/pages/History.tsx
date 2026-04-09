import { useEffect, useMemo, useState } from 'react'
import { useMoodStore } from '../store/useMoodStore'
import { useAuthStore } from '../store/useAuthStore'
import {
  toISO, getWeekDays, getMonthCells,
  MONTH_FULL, MONTH_SHORT, DAY_INITIAL,
} from '../lib/dateUtils'
import { EMPTY_CELL_LIGHT } from '../constants/moods'
import DeepHistory from '../components/DeepHistory'
import type { MoodEntry, ViewMode } from '../types'

type Mode = ViewMode | 'diary' | 'timeline'

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
    { key: 'weekly',   label: 'Sett.' },
    { key: 'monthly',  label: 'Mese' },
    { key: 'yearly',   label: 'Anno' },
    { key: 'diary',    label: 'Diario' },
    { key: 'timeline', label: 'Timeline' },
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
  const [search, setSearch]         = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [filter, setFilter]         = useState<'all' | 'note' | 'location' | string>('all')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 200)
    return () => clearTimeout(t)
  }, [search])

  // Top 5 colors
  const topColors = useMemo(() => {
    const counts = new Map<string, { hex: string; label: string; count: number }>()
    entries.forEach(e => {
      const prev = counts.get(e.color_hex)
      if (prev) { prev.count++ } else { counts.set(e.color_hex, { hex: e.color_hex, label: e.mood_label ?? '', count: 1 }) }
    })
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  }, [entries])

  const filtered = useMemo(() => {
    let result = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    if (debouncedQ) {
      const q = debouncedQ.toLowerCase()
      result = result.filter(e =>
        e.note?.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q))
      )
    }
    if (filter === 'note')     result = result.filter(e => e.note)
    if (filter === 'location') result = result.filter(e => e.location_label)
    if (filter.startsWith('#')) result = result.filter(e => e.color_hex === filter)
    return result
  }, [entries, debouncedQ, filter])

  if (entries.length === 0) {
    return (
      <div className="card p-8 text-center mt-4">
        <p className="text-[32px] mb-3">📖</p>
        <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>Il diario è vuoto</p>
        <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>Quando salvi un colore puoi scrivere una frase. Apparirà qui.</p>
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

  return (
    <div className="space-y-4 pb-4">
      {/* Search bar */}
      <div className="relative">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--color-muted)', pointerEvents:'none' }}>
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca nelle note e nei tag…"
          className="w-full pl-10 pr-10 py-3 rounded-2xl text-[13px] focus:outline-none"
          style={{ background:'var(--color-surface-raised)', border:'1.5px solid var(--color-subtle)', color:'var(--color-foreground)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--color-muted)', padding:4 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }} className="no-scrollbar">
        {[
          { key: 'all',      label: 'Tutte' },
          { key: 'note',     label: 'Con nota' },
          { key: 'location', label: 'Con luogo' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              flexShrink:0, padding:'5px 14px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer',
              background: filter === f.key ? 'var(--color-foreground)' : 'var(--color-surface-raised)',
              color:      filter === f.key ? 'var(--color-surface)'    : 'var(--color-muted)',
              border:     filter === f.key ? 'none'                    : '1.5px solid var(--color-subtle)',
            }}
          >
            {f.label}
          </button>
        ))}
        {topColors.map(c => (
          <button
            key={c.hex}
            onClick={() => setFilter(filter === c.hex ? 'all' : c.hex)}
            style={{
              flexShrink:0, padding:'5px 12px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6,
              background: filter === c.hex ? `${c.hex}30` : 'var(--color-surface-raised)',
              border: `1.5px solid ${filter === c.hex ? c.hex : 'var(--color-subtle)'}`,
              color: 'var(--color-foreground)',
            }}
          >
            <div style={{ width:8, height:8, borderRadius:'50%', backgroundColor:c.hex, flexShrink:0 }} />
            {c.label || c.hex.slice(0,7)}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-[13px] text-center py-8" style={{ color:'var(--color-muted)' }}>
          Nessun risultato trovato
        </p>
      ) : (
        <>
          {search && <p className="text-[11px]" style={{ color:'var(--color-muted)' }}>{filtered.length} {filtered.length === 1 ? 'risultato' : 'risultati'}</p>}
          {Object.entries(byMonth).map(([monthKey, monthEntries]) => {
            const [y, m] = monthKey.split('-').map(Number)
            return (
              <div key={monthKey}>
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] mb-3" style={{ color:'var(--color-muted)' }}>
                  {MONTH_FULL[m-1]} {y}
                </p>
                <div className="space-y-3">
                  {monthEntries.map(entry => {
                    const d     = new Date(entry.date + 'T12:00:00')
                    const light = needsLight(entry.color_hex)
                    return (
                      <div key={entry.id} className="rounded-2xl overflow-hidden"
                        style={{ border:`1.5px solid ${entry.color_hex}30`, background:'var(--color-surface-raised)', boxShadow:'var(--shadow-xs)' }}>
                        <div style={{ background:entry.color_hex, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontSize:12, fontWeight:800, letterSpacing:'-0.02em', color:light ? 'rgba(255,255,255,0.92)':'rgba(0,0,0,0.8)' }}>
                            {entry.mood_label ?? 'Personalizzato'}
                          </span>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            {entry.location_label && (
                              <span style={{ fontSize:9, color:light ? 'rgba(255,255,255,0.65)':'rgba(0,0,0,0.45)' }}>📍 {entry.location_label}</span>
                            )}
                            <span style={{ fontSize:10, color:light ? 'rgba(255,255,255,0.65)':'rgba(0,0,0,0.45)' }}>
                              {DAY_NAMES[d.getDay()]} {d.getDate()}
                            </span>
                          </div>
                        </div>
                        <div className="px-4 py-3 space-y-1.5">
                          {entry.note ? (
                            <p className="text-[13px] leading-relaxed" style={{ color:'var(--color-foreground)' }}>"{entry.note}"</p>
                          ) : (
                            <p className="text-[12px]" style={{ color:'var(--color-muted)', fontStyle:'italic' }}>Nessuna nota per questo giorno.</p>
                          )}
                          {entry.tags && entry.tags.length > 0 && (
                            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                              {entry.tags.map(t => (
                                <span key={t} style={{ fontSize:10, padding:'2px 8px', borderRadius:100,
                                  background:`${entry.color_hex}20`, border:`1px solid ${entry.color_hex}40`,
                                  color:'var(--color-foreground)' }}>
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
          })}
        </>
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
