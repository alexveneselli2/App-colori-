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
    <div className="flex flex-col min-h-screen">
      {/* Header + tab bar */}
      <div className="px-6 pt-14 pb-5">
        <h2 className="text-2xl font-light text-foreground mb-6">Memoria</h2>
        <div className="flex bg-surface-raised rounded-xl p-1 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                mode === tab.key ? 'bg-foreground text-surface' : 'text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-10">
        {!loaded ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: '#3A86FF' }} />
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
    <div className="space-y-6">
      <p className="text-xs text-muted tracking-widest uppercase">
        {MONTH_FULL[days[0].getMonth()]} {days[0].getFullYear()}
      </p>
      <div className="grid grid-cols-7 gap-2">
        {DAY_INITIAL.map((d, i) => (
          <p key={i} className="text-center text-[10px] text-muted uppercase tracking-wider">{d}</p>
        ))}
        {days.map((day, i) => {
          const color   = getCellColor(day)
          const isToday = toISO(day) === todayStr
          return (
            <div key={i} className="space-y-1.5">
              <div
                className={`aspect-square rounded-xl transition-colors ${
                  isToday ? 'ring-2 ring-foreground/25 ring-offset-1 ring-offset-surface' : ''
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
      <p className="text-xs text-muted tracking-widest uppercase">
        {MONTH_FULL[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-2">
        {DAY_INITIAL.map((d, i) => (
          <p key={i} className="text-center text-[10px] text-muted uppercase tracking-wider">{d}</p>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const color   = getCellColor(day)
          const isToday = toISO(day) === todayStr
          return (
            <div key={i} className="space-y-0.5">
              <div
                className={`aspect-square rounded-md transition-colors ${
                  isToday ? 'ring-1 ring-foreground/25 ring-offset-1 ring-offset-surface' : ''
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
      <p className="text-xs text-muted tracking-widest uppercase">{year}</p>
      <div className="space-y-4">
        {Array.from({ length: 12 }, (_, m) => {
          const cells = getMonthCells(year, m)
          return (
            <div key={m} className="space-y-1.5">
              <p className="text-[10px] text-muted">{MONTH_SHORT[m]}</p>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} className="aspect-square" />
                  const color   = getCellColor(day)
                  const isToday = toISO(day) === todayStr
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-sm ${
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
