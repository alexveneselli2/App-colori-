import { forwardRef } from 'react'
import {
  getMonthCells,
  getWeekDays,
  getYearColumns,
  toISO,
  MONTH_SHORT,
  MONTH_FULL,
  DAY_INITIAL,
  DAY_SHORT,
} from '../lib/dateUtils'
import { MOOD_PALETTE } from '../constants/moods'
import type { ViewMode, ExportTheme, ExportStyle, ExportFormat } from '../types'

// ---- Canvas dimensions (CSS px) ----
// Captured at 3× pixel ratio → 1080×1080 feed / 1080×1920 story
export const CANVAS_W       = 360
export const CANVAS_H_FEED  = 360
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
    ? { bg: '#F8F6F2', fg: '#181714', muted: '#8A8680', empty: '#ECEAE5', line: '#E0DCD5' }
    : { bg: '#0E0D0C', fg: '#F0EDE8', muted: '#5A5550', empty: '#1E1D1B', line: '#2A2826' }
}

// Only return palette entries that appear in the entries map
function getActiveMoods(entriesMap: Map<string, string>) {
  const usedHexes = new Set(entriesMap.values())
  return MOOD_PALETTE.filter(m => usedHexes.has(m.hex))
}

const ExportCanvas = forwardRef<HTMLDivElement, Props>(
  ({ entriesMap, mode, theme, style, format, username, year, month }, ref) => {
    const { bg, fg, muted, empty, line } = palette(theme)
    const canvasH  = format === 'feed' ? CANVAS_H_FEED : CANVAS_H_STORY
    const labeled  = style === 'labeled'
    const isStory  = format === 'story'

    const getColor = (d: Date | null) =>
      d ? (entriesMap.get(toISO(d)) ?? null) : null

    // ---- Period label ----
    const getPeriodLabel = () => {
      if (mode === 'weekly') {
        const days = getWeekDays(new Date())
        return `${days[0].getDate()}–${days[6].getDate()} ${MONTH_FULL[days[0].getMonth()]} ${days[0].getFullYear()}`
      }
      if (mode === 'monthly') return `${MONTH_FULL[month]} ${year}`
      return `${year}`
    }

    const FONT = 'Inter, system-ui, -apple-system, sans-serif'

    // ---- HEADER ----
    const renderHeader = () => {
      const headerPad = isStory ? '28px 32px 0' : '22px 28px 0'
      return (
        <div style={{
          padding: headerPad,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}>
          {/* Wordmark */}
          <span style={{
            fontSize: isStory ? 28 : 22,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: fg,
            fontFamily: FONT,
            lineHeight: 1,
          }}>
            IRIDE
          </span>
          {/* Period */}
          <span style={{
            fontSize: isStory ? 11 : 9,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: muted,
            fontFamily: FONT,
          }}>
            {getPeriodLabel()}
          </span>
        </div>
      )
    }

    // ---- FOOTER ----
    const renderFooter = () => {
      const activeMoods = labeled ? getActiveMoods(entriesMap).slice(0, isStory ? 12 : 6) : []
      const footPad = isStory ? '0 32px 28px' : '0 28px 20px'

      return (
        <div style={{ padding: footPad }}>
          {/* Divider */}
          <div style={{ height: 1, backgroundColor: line, marginBottom: isStory ? 16 : 12 }} />

          <div style={{
            display: 'flex',
            alignItems: labeled && activeMoods.length > 0 ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            {/* Username */}
            <span style={{
              fontSize: isStory ? 10 : 8,
              fontWeight: 500,
              letterSpacing: '0.05em',
              color: muted,
              fontFamily: FONT,
              flexShrink: 0,
            }}>
              {username ? `@${username}` : 'iride.app'}
            </span>

            {/* Color legend */}
            {labeled && activeMoods.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isStory ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                gap: '4px 12px',
                flex: 1,
                justifyItems: 'end',
              }}>
                {activeMoods.map(mood => (
                  <div key={mood.hex} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}>
                    <div style={{
                      width: isStory ? 8 : 6,
                      height: isStory ? 8 : 6,
                      borderRadius: '50%',
                      backgroundColor: mood.hex,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: isStory ? 8.5 : 7,
                      color: muted,
                      fontFamily: FONT,
                      whiteSpace: 'nowrap',
                    }}>
                      {mood.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    // ---- WEEKLY ----
    const renderWeekly = () => {
      const days   = getWeekDays(new Date())
      const padH   = isStory ? 32 : 28
      const gap    = isStory ? 8 : 6
      const cellSz = Math.floor((CANVAS_W - padH * 2 - gap * 6) / 7)

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `0 ${padH}px`,
          gap: 6,
        }}>
          {labeled && (
            <div style={{ display: 'flex', gap, width: '100%', justifyContent: 'center', marginBottom: 4 }}>
              {DAY_SHORT.map((d, i) => (
                <div key={i} style={{
                  width: cellSz, textAlign: 'center',
                  fontSize: 8, color: muted, fontFamily: FONT,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  {d}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap }}>
            {days.map((day, i) => {
              const color = getColor(day)
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: cellSz, height: cellSz, borderRadius: 10,
                    backgroundColor: color ?? empty,
                  }} />
                  {labeled && (
                    <span style={{ fontSize: 7, color: muted, fontFamily: FONT }}>
                      {day.getDate()}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    // ---- MONTHLY ----
    const renderMonthly = () => {
      const cells  = getMonthCells(year, month)
      const padH   = isStory ? 32 : 28
      const gap    = isStory ? 5 : 4
      const cellSz = Math.floor((CANVAS_W - padH * 2 - gap * 6) / 7)

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${padH}px`,
          gap: 4,
        }}>
          {labeled && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(7, ${cellSz}px)`,
              gap,
              marginBottom: 4,
            }}>
              {DAY_INITIAL.map((d, i) => (
                <div key={i} style={{
                  textAlign: 'center', fontSize: 7,
                  color: muted, fontFamily: FONT,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {d}
                </div>
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
                width: cellSz, height: cellSz, borderRadius: 4,
                backgroundColor: day ? (getColor(day) ?? empty) : 'transparent',
              }} />
            ))}
          </div>
        </div>
      )
    }

    // ---- YEARLY: contribution graph (feed) or stacked months (story) ----
    const renderYearly = () =>
      isStory ? renderYearlyStacked() : renderYearlyGraph()

    const renderYearlyGraph = () => {
      const cols   = getYearColumns(year)
      const cellSz = 4
      const gap    = 1.5
      const totalW = cols.length * (cellSz + gap) - gap
      const padH   = (CANVAS_W - totalW) / 2

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
                  fontSize: 7, color: muted, fontFamily: FONT,
                }}>
                  {label}
                </span>
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
          {!labeled && (
            <p style={{
              marginTop: 10, fontSize: 8, color: muted, letterSpacing: '0.14em',
              textTransform: 'uppercase', fontFamily: FONT,
            }}>{year}</p>
          )}
        </div>
      )
    }

    const renderYearlyStacked = () => {
      const padH   = 32
      const gap    = 3
      const mGap   = isStory ? 10 : 7
      const cellSz = Math.floor((CANVAS_W - padH * 2 - gap * 6) / 7)

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${padH}px`,
          overflow: 'hidden',
          gap: mGap,
        }}>
          {Array.from({ length: 12 }, (_, m) => {
            const cells = getMonthCells(year, m)
            return (
              <div key={m}>
                {labeled && (
                  <p style={{
                    fontSize: 7.5, color: muted,
                    fontFamily: FONT, marginBottom: 3,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                    {MONTH_SHORT[m]}
                  </p>
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
          fontFamily: FONT,
          position: 'relative',
        }}
      >
        {renderHeader()}

        {/* Divider below header */}
        <div style={{ height: 1, backgroundColor: line, margin: isStory ? '16px 32px 0' : '12px 28px 0' }} />

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {mode === 'weekly'  && renderWeekly()}
          {mode === 'monthly' && renderMonthly()}
          {mode === 'yearly'  && renderYearly()}
        </div>

        {renderFooter()}
      </div>
    )
  }
)

ExportCanvas.displayName = 'ExportCanvas'
export default ExportCanvas
