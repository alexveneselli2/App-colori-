import { useEffect, useState } from 'react'
import { useMoodStore } from '../store/useMoodStore'
import { useAuthStore } from '../store/useAuthStore'
import {
  toISO, getWeekDays, getMonthCells,
  MONTH_FULL, MONTH_SHORT, DAY_INITIAL,
} from '../lib/dateUtils'
import { EMPTY_CELL_LIGHT } from '../constants/moods'
import type { ViewMode } from '../types'

export default function History() {
  const { profile } = useAuthStore()
  const { entries, fetchEntries } = useMoodStore()
  const [mode, setMode]   = useState<ViewMode>('monthly')
  const [loaded, setLoaded] = useState(false)

  const today = new Date()

  useEffect(() => {
    if (profile && !loaded) {
      fetchEntries(profile.id).then(() => setLoaded(true))
    }
  }, [profile])

  const entryMap  = new Map(entries.map(e => [e.date, e.color_hex]))
  const getCellColor = (d: Date | null) => d ? (entryMap.get(toISO(d)) ?? null) : null
  const todayStr  = toISO(today)

  const tabs: { key: ViewMode; label: string }[] = [
    { key: 'weekly',  label: 'Settimana' },
    { key: 'monthly', label: 'Mese' },
    { key: 'yearly',  label: 'Anno' },
  ]

  return (
    <div className="page-top flex flex-col">
      {/* Header + tab bar */}
      <div className="px-5 pb-5">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.04em] mb-5" style={{ color: 'var(--color-foreground)' }}>
          Memoria
        </h1>
        <div
          className="flex p-1 gap-1 rounded-2xl"
          style={{ background: 'var(--color-subtle)' }}
        >
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97]"
              style={{
                background: mode === tab.key ? 'var(--color-surface-raised)' : 'transparent',
                color: mode === tab.key ? 'var(--color-foreground)' : 'var(--color-muted)',
                boxShadow: mode === tab.key ? 'var(--shadow-xs)' : undefined,
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
        ) : (
          <YearlyView year={today.getFullYear()} getCellColor={getCellColor} todayStr={todayStr} />
        )}
      </div>
    </div>
  )
}

// ---- Sub-views ----

function WeeklyView({
  today, getCellColor, todayStr,
}: {
  today: Date
  getCellColor: (d: Date | null) => string | null
  todayStr: string
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
                className={`aspect-square rounded-2xl transition-colors ${
                  isToday ? 'ring-2 ring-foreground/30 ring-offset-2 ring-offset-surface' : ''
                }`}
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

function MonthlyView({
  today, getCellColor, todayStr,
}: {
  today: Date
  getCellColor: (d: Date | null) => string | null
  todayStr: string
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
                className={`aspect-square rounded-xl transition-colors ${
                  isToday ? 'ring-2 ring-foreground/30 ring-offset-1 ring-offset-surface' : ''
                }`}
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

function YearlyView({
  year, getCellColor, todayStr,
}: {
  year: number
  getCellColor: (d: Date | null) => string | null
  todayStr: string
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
                      className={`aspect-square rounded-md ${
                        isToday ? 'ring-1 ring-foreground/30' : ''
                      }`}
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
