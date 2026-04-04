import { forwardRef } from 'react'
import {
  getMonthCells,
  getWeekDays,
  getYearColumns,
  toISO,
  MONTH_SHORT,
  DAY_INITIAL,
  DAY_SHORT,
} from '../lib/dateUtils'
import type { ViewMode, ExportTheme, ExportStyle, ExportFormat } from '../types'

// ---- Canvas dimensions (CSS px) ----
// Captured at 3× pixel ratio → 1080×1080 feed / 1080×1920 story
export const CANVAS_W      = 360
export const CANVAS_H_FEED = 360
export const CANVAS_H_STORY = 640

interface Props {
  entriesMap: Map<string, string>
  mode: ViewMode
  theme: ExportTheme
  style: ExportStyle
  format: ExportFormat
  username?: string
  year: number
  month: number
}

function palette(theme: ExportTheme) {
  return theme === 'light'
    ? { bg: '#FAFAF8', fg: '#1A1A1A', muted: '#9A958F', empty: '#EEEBE6' }
    : { bg: '#0C0C0C', fg: '#F5F5F0', muted: '#5A5550', empty: '#1E1E1E' }
}

const ExportCanvas = forwardRef<HTMLDivElement, Props>(
  ({ entriesMap, mode, theme, style, format, username, year, month }, ref) => {
    const { bg, muted, empty } = palette(theme)
    const canvasH = format === 'feed' ? CANVAS_H_FEED : CANVAS_H_STORY
    const labeled = style === 'labeled'

    const getColor = (d: Date | null) =>
      d ? (entriesMap.get(toISO(d)) ?? null) : null

    // ---- WEEKLY ----
    const renderWeekly = () => {
      const days    = getWeekDays(new Date())
      const gap     = 6
      const padH    = 36
      const cellSz  = Math.floor((CANVAS_W - padH * 2 - gap * 6) / 7)

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `0 ${padH}px`,
        }}>
          {labeled && (
            <p style={{
              fontSize: 10, color: muted, letterSpacing: '0.14em',
              textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif',
              fontWeight: 500, marginBottom: 20,
            }}>
              {MONTH_SHORT[days[0].getMonth()]} {days[0].getFullYear()}
            </p>
          )}
          <div style={{ display: 'flex', gap }}>
            {days.map((day, i) => {
              const color = getColor(day)
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: cellSz, height: cellSz, borderRadius: 8,
                    backgroundColor: color ?? empty,
                  }} />
                  {labeled && (
                    <span style={{ fontSize: 8, color: muted, fontFamily: 'system-ui, sans-serif' }}>
                      {DAY_SHORT[i]}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {labeled && (
            <div style={{ display: 'flex', gap, marginTop: 4 }}>
              {days.map((day, i) => (
                <div key={i} style={{ width: cellSz, textAlign: 'center' }}>
                  <span style={{ fontSize: 8, color: muted, fontFamily: 'system-ui, sans-serif' }}>
                    {day.getDate()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // ---- MONTHLY ----
    const renderMonthly = () => {
      const cells  = getMonthCells(year, month)
      const padH   = 28
      const gap    = 4
      const cellSz = Math.floor((CANVAS_W - padH * 2 - gap * 6) / 7)

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${padH}px`,
        }}>
          {labeled && (
            <p style={{
              fontSize: 10, color: muted, letterSpacing: '0.14em',
              textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif',
              fontWeight: 500, marginBottom: 14,
            }}>
              {MONTH_SHORT[month]} {year}
            </p>
          )}
          {labeled && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(7, ${cellSz}px)`,
              gap, marginBottom: gap,
            }}>
              {DAY_INITIAL.map((d, i) => (
                <div key={i} style={{
                  textAlign: 'center', fontSize: 7,
                  color: muted, fontFamily: 'system-ui, sans-serif',
                }}>{d}</div>
              ))}
            </div>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(7, ${cellSz}px)`,
            gap,
          }}>
            {cells.map((day, i) => (
              <div key={i} style={{
                width: cellSz, height: cellSz, borderRadius: 3,
                backgroundColor: day ? (getColor(day) ?? empty) : 'transparent',
              }} />
            ))}
          </div>
        </div>
      )
    }

    // ---- YEARLY: contribution graph (feed) or stacked months (story) ----
    const renderYearly = () =>
      format === 'story' ? renderYearlyStacked() : renderYearlyGraph()

    const renderYearlyGraph = () => {
      const cols   = getYearColumns(year)
      const cellSz = 4
      const gap    = 1.5
      const totalW = cols.length * (cellSz + gap) - gap
      const padH   = (CANVAS_W - totalW) / 2

      // First day of each month → x position for label
      const monthLabels: { label: string; x: number }[] = []
      cols.forEach((col, ci) => {
        const first = col.find(d => d !== null)
        if (first && first.getDate() <= 7) {
          const mn = MONTH_SHORT[first.getMonth()]
          if (!monthLabels.find(ml => ml.label === mn)) {
            monthLabels.push({ label: mn, x: padH + ci * (cellSz + gap) })
          }
        }
      })

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {labeled && (
            <div style={{ position: 'relative', width: CANVAS_W, height: 14, marginBottom: 5 }}>
              {monthLabels.map(({ label, x }) => (
                <span key={label} style={{
                  position: 'absolute', left: x,
                  fontSize: 7, color: muted, fontFamily: 'system-ui, sans-serif',
                }}>{label}</span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap }}>
            {cols.map((col, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap }}>
                {col.map((day, ri) => (
                  <div key={ri} style={{
                    width: cellSz, height: cellSz, borderRadius: 1,
                    backgroundColor: day ? (getColor(day) ?? empty) : 'transparent',
                  }} />
                ))}
              </div>
            ))}
          </div>
          {labeled && (
            <p style={{
              marginTop: 12, fontSize: 10, color: muted, letterSpacing: '0.14em',
              textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif',
            }}>{year}</p>
          )}
        </div>
      )
    }

    const renderYearlyStacked = () => {
      const padH    = 28
      const gap     = 2
      const mGap    = 7
      const cellSz  = Math.floor((CANVAS_W - padH * 2 - gap * 6) / 7)

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${padH}px`,
          overflow: 'hidden',
        }}>
          {labeled && (
            <p style={{
              fontSize: 10, color: muted, letterSpacing: '0.14em',
              textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif',
              fontWeight: 500, marginBottom: 14,
            }}>{year}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: mGap }}>
            {Array.from({ length: 12 }, (_, m) => {
              const cells = getMonthCells(year, m)
              return (
                <div key={m}>
                  {labeled && (
                    <p style={{
                      fontSize: 7, color: muted,
                      fontFamily: 'system-ui, sans-serif', marginBottom: 2,
                    }}>{MONTH_SHORT[m]}</p>
                  )}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(7, ${cellSz}px)`,
                    gap,
                  }}>
                    {cells.map((day, i) => (
                      <div key={i} style={{
                        width: cellSz, height: cellSz, borderRadius: 2,
                        backgroundColor: day ? (getColor(day) ?? empty) : 'transparent',
                      }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        style={{
          width: CANVAS_W,
          height: canvasH,
          backgroundColor: bg,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {mode === 'weekly'  && renderWeekly()}
          {mode === 'monthly' && renderMonthly()}
          {mode === 'yearly'  && renderYearly()}
        </div>

        {/* Footer branding */}
        {labeled && (
          <div style={{
            padding: '10px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: 8, color: muted, fontFamily: 'system-ui, sans-serif',
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>Iride</span>
            {username && (
              <span style={{ fontSize: 8, color: muted, fontFamily: 'system-ui, sans-serif' }}>
                @{username}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)

ExportCanvas.displayName = 'ExportCanvas'
export default ExportCanvas
