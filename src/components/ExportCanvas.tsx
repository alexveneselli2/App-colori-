import { forwardRef } from 'react'
import {
  getMonthCells,
  getWeekDays,
  toISO,
  MONTH_SHORT,
  MONTH_FULL,
  DAY_INITIAL,
  DAY_SHORT,
} from '../lib/dateUtils'
import { MOOD_PALETTE } from '../constants/moods'
import type { ViewMode, ExportStyle, ExportFormat, ExportFont, ExportBg, ExportCellShape, ExportCellGlow } from '../types'

export const CANVAS_W       = 360
export const CANVAS_H_FEED  = 360
export const CANVAS_H_STORY = 640

interface Props {
  entriesMap:  Map<string, string>
  mode:        ViewMode
  bg:          ExportBg
  style:       ExportStyle
  format:      ExportFormat
  font:        ExportFont
  cellShape:   ExportCellShape
  cellGlow:    ExportCellGlow
  username?:   string
  year:        number
  month:       number
}

function needsLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55
}

function getPalette(bg: ExportBg) {
  const isDark = bg === 'dark'
  return isDark
    ? { fg: '#F0EDE8', muted: '#5A5550', empty: '#1E1D1B', line: '#2E2B28' }
    : { fg: '#181714', muted: '#8A8680', empty: '#E8E4DC', line: '#DED9D1' }
}

function computeBgStyle(bg: ExportBg, entriesMap: Map<string, string>): string {
  if (bg === 'warm')  return '#F7F4EF'
  if (bg === 'white') return '#FFFFFF'
  if (bg === 'dark')  return '#0E0D0C'

  // 'mood': soft gradient from the 3 most-recent mood colors
  const recent = Array.from(entriesMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 3)
    .map(([, c]) => c)

  if (recent.length === 0) return '#F7F4EF'
  const c1 = recent[0]
  const c2 = recent[1] ?? recent[0]
  const c3 = recent[2] ?? recent[1] ?? recent[0]

  return `linear-gradient(135deg, ${c1}38 0%, ${c2}2a 50%, ${c3}1e 100%), #F7F4EF`
}

const FONT_SANS  = 'Inter, system-ui, -apple-system, sans-serif'
const FONT_SERIF = 'Georgia, "Times New Roman", Times, serif'
const FONT_MONO  = '"Courier New", Courier, monospace'

function getFontStack(font: ExportFont): string {
  if (font === 'serif') return FONT_SERIF
  if (font === 'mono')  return FONT_MONO
  return FONT_SANS
}

function getActiveMoods(entriesMap: Map<string, string>) {
  const used = new Set(entriesMap.values())
  return MOOD_PALETTE.filter(m => used.has(m.hex))
}

function cellRadius(size: number, shape: ExportCellShape): string | number {
  if (shape === 'square') return 2
  if (shape === 'circle') return '50%'
  return Math.max(3, Math.round(size * 0.28))
}

function cellBoxShadow(hex: string | null, glow: ExportCellGlow): string | undefined {
  if (!hex || glow === 'none') return undefined
  if (glow === 'vivid') return `0 0 0 1px ${hex}30, 0 3px 12px ${hex}70`
  return `0 2px 8px ${hex}45`
}

const ExportCanvas = forwardRef<HTMLDivElement, Props>(
  ({ entriesMap, mode, bg, style, format, font, cellShape, cellGlow, username, year, month }, ref) => {
    const { fg, muted, empty, line } = getPalette(bg)
    const bgStyle  = computeBgStyle(bg, entriesMap)
    const FONT     = getFontStack(font)
    const canvasH  = format === 'feed' ? CANVAS_H_FEED : CANVAS_H_STORY
    const isStory  = format === 'story'
    const labeled  = style === 'labeled'
    const PAD      = isStory ? 30 : 26

    const getColor = (d: Date | null) => d ? (entriesMap.get(toISO(d)) ?? null) : null
    const getMoodLabel = (hex: string | null) =>
      hex ? (MOOD_PALETTE.find(m => m.hex === hex)?.label ?? null) : null

    // ── HEADER ──────────────────────────────────────────────────────────────
    const getDisplayTitle = () => {
      if (mode === 'weekly')  return 'I colori della mia settimana'
      if (mode === 'monthly') return `I colori di ${MONTH_FULL[month]}`
      return `I colori del ${year}`
    }

    const getDateLabel = () => {
      if (mode === 'weekly') {
        const days = getWeekDays(new Date())
        return `${days[0].getDate()}–${days[6].getDate()} ${MONTH_SHORT[days[0].getMonth()]} ${days[0].getFullYear()}`
      }
      if (mode === 'monthly') return String(year)
      return ''
    }

    const HEADER_H  = isStory ? 108 : 76
    const FOOTER_H  = isStory ? 72  : 52
    const CONTENT_H = canvasH - HEADER_H - FOOTER_H

    const Header = () => (
      <div style={{
        height: HEADER_H,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: `0 ${PAD}px 14px`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{
            fontSize: isStory ? 18 : 14,
            fontWeight: 800,
            letterSpacing: font === 'mono' ? '0.04em' : font === 'serif' ? '-0.01em' : '-0.04em',
            color: fg,
            fontFamily: FONT,
            lineHeight: 1,
          }}>IRIDE</span>
          {getDateLabel() && (
            <span style={{
              fontSize: isStory ? 9 : 8,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: muted,
              fontFamily: FONT,
            }}>
              {getDateLabel()}
            </span>
          )}
        </div>

        <p style={{
          fontSize: isStory ? 21 : 16,
          fontWeight: font === 'serif' ? 700 : 800,
          letterSpacing: font === 'mono' ? '0.02em' : font === 'serif' ? '-0.01em' : '-0.03em',
          color: fg,
          fontFamily: FONT,
          lineHeight: 1.1,
          marginBottom: 12,
          fontStyle: font === 'serif' ? 'italic' : 'normal',
        }}>
          {getDisplayTitle()}
        </p>

        <div style={{ height: 1, backgroundColor: line }} />
      </div>
    )

    // ── FOOTER ──────────────────────────────────────────────────────────────
    const Footer = () => {
      const activeMoods = labeled ? getActiveMoods(entriesMap).slice(0, isStory ? 12 : 6) : []
      return (
        <div style={{
          height: FOOTER_H,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: `12px ${PAD}px 0`,
          flexShrink: 0,
        }}>
          <div style={{ height: 1, backgroundColor: line, marginBottom: 10 }} />
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <span style={{
              fontSize: isStory ? 9 : 8,
              fontWeight: 500,
              letterSpacing: '0.07em',
              color: muted,
              fontFamily: FONT,
              flexShrink: 0,
              marginTop: 1,
            }}>
              {username ? `@${username}` : 'iride.app'}
            </span>
            {labeled && activeMoods.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${isStory ? 4 : 3}, auto)`,
                gap: '3px 10px',
                justifyItems: 'start',
              }}>
                {activeMoods.map(mood => (
                  <div key={mood.hex} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 7, height: 7,
                      borderRadius: cellShape === 'square' ? 1 : cellShape === 'circle' ? '50%' : 2,
                      backgroundColor: mood.hex,
                    }} />
                    <span style={{ fontSize: isStory ? 8 : 7, color: muted, fontFamily: FONT, whiteSpace: 'nowrap' }}>
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

    // ── WEEKLY FEED: 2 rows of tall colored rectangles (4 + 3) ──────────────
    const WeeklyFeed = () => {
      const days  = getWeekDays(new Date())
      const gap   = 8
      const padH  = PAD
      const innerW = CANVAS_W - padH * 2
      const w4    = Math.floor((innerW - gap * 3) / 4)
      const w3    = Math.floor((innerW - gap * 2) / 3)
      const rowH  = Math.floor((CONTENT_H - gap - 4) / 2)

      const Cell = ({ day, w, dayIdx }: { day: Date; w: number; dayIdx: number }) => {
        const color  = getColor(day)
        const cellBg = color ?? empty
        const light  = color ? needsLight(color) : false
        const textColor = (a: number) => color
          ? (light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`)
          : muted
        const cr = cellShape === 'circle'
          ? Math.min(w, rowH) / 2
          : cellShape === 'square' ? 4 : 16
        return (
          <div style={{
            width: w, height: rowH,
            borderRadius: cr,
            backgroundColor: cellBg,
            boxShadow: cellBoxShadow(color, cellGlow),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: labeled ? 'space-between' : 'center',
            alignItems: labeled ? 'flex-start' : 'center',
            padding: labeled ? '12px 12px' : undefined,
            flexShrink: 0,
          }}>
            {labeled && (
              <>
                <span style={{ fontSize: 10, fontWeight: 700, color: textColor(0.8), fontFamily: FONT, letterSpacing: '0.03em' }}>
                  {DAY_SHORT[dayIdx].slice(0, 3).toUpperCase()}
                </span>
                <div>
                  {color && getMoodLabel(color) && (
                    <p style={{ fontSize: 8, color: textColor(0.65), fontFamily: FONT, marginBottom: 2 }}>
                      {getMoodLabel(color)}
                    </p>
                  )}
                  <p style={{ fontSize: 10, color: textColor(0.5), fontFamily: FONT }}>
                    {day.getDate()}
                  </p>
                </div>
              </>
            )}
          </div>
        )
      }

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${padH}px`,
          gap,
        }}>
          <div style={{ display: 'flex', gap }}>
            {days.slice(0, 4).map((day, i) => <Cell key={i} day={day} w={w4} dayIdx={i} />)}
          </div>
          <div style={{ display: 'flex', gap, justifyContent: 'center' }}>
            {days.slice(4, 7).map((day, i) => <Cell key={i} day={day} w={w3} dayIdx={i + 4} />)}
          </div>
        </div>
      )
    }

    // ── WEEKLY STORY: 7 full-width horizontal bars ───────────────────────────
    const WeeklyStory = () => {
      const days = getWeekDays(new Date())
      const gap  = 8
      const padH = PAD
      const barH = Math.floor((CONTENT_H - gap * 6 - 8) / 7)
      const cr   = cellShape === 'circle' ? barH / 2 : cellShape === 'square' ? 4 : 14

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: `4px ${padH}px 0`,
          gap,
        }}>
          {days.map((day, i) => {
            const color  = getColor(day)
            const cellBg = color ?? empty
            const light  = color ? needsLight(color) : false
            const textColor = (a: number) => color
              ? (light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`)
              : muted

            return (
              <div key={i} style={{
                height: barH,
                borderRadius: cr,
                backgroundColor: cellBg,
                boxShadow: cellBoxShadow(color, cellGlow),
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: textColor(0.85), fontFamily: FONT, letterSpacing: '0.02em' }}>
                  {DAY_SHORT[i]}
                </span>
                {labeled && color && getMoodLabel(color) ? (
                  <span style={{ fontSize: 9, color: textColor(0.6), fontFamily: FONT }}>
                    {getMoodLabel(color)}
                  </span>
                ) : null}
                <span style={{ fontSize: 11, color: textColor(0.45), fontFamily: FONT }}>
                  {day.getDate()}
                </span>
              </div>
            )
          })}
        </div>
      )
    }

    // ── MONTHLY FEED: full calendar grid ────────────────────────────────────
    const MonthlyFeed = () => {
      const cells  = getMonthCells(year, month)
      const gap    = 5
      const padH   = PAD
      const cellSz = Math.floor((CANVAS_W - padH * 2 - gap * 6) / 7)
      const labelH = labeled ? 18 : 0
      const cr     = cellRadius(cellSz, cellShape)

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${padH}px`,
        }}>
          {labeled && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(7, ${cellSz}px)`,
              gap,
              height: labelH,
              marginBottom: gap,
            }}>
              {DAY_INITIAL.map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 7, color: muted, fontFamily: FONT, letterSpacing: '0.06em' }}>
                  {d}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cellSz}px)`, gap }}>
            {cells.map((day, i) => {
              const color = day ? getColor(day) : null
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{
                    width: cellSz, height: cellSz, borderRadius: cr,
                    backgroundColor: day ? (color ?? empty) : 'transparent',
                    boxShadow: day ? cellBoxShadow(color, cellGlow) : undefined,
                  }} />
                  {labeled && day && (
                    <span style={{ fontSize: 6, color: muted, fontFamily: FONT }}>{day.getDate()}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    // ── MONTHLY STORY: bigger calendar using all vertical space ─────────────
    const MonthlyStory = () => {
      const cells  = getMonthCells(year, month)
      const gap    = 7
      const padH   = PAD
      const cellSz = Math.floor((CANVAS_W - padH * 2 - gap * 6) / 7)
      const labelH = labeled ? 22 : 0
      const rows   = Math.ceil(cells.length / 7)
      const rowH   = Math.floor((CONTENT_H - labelH - gap * (rows + 1)) / rows)
      const cr     = cellRadius(cellSz, cellShape)

      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${padH}px`,
          gap: gap,
        }}>
          {labeled && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cellSz}px)`, gap }}>
              {DAY_INITIAL.map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 9, color: muted, fontFamily: FONT }}>
                  {d}
                </div>
              ))}
            </div>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(7, ${cellSz}px)`,
            gridAutoRows: rowH,
            gap,
          }}>
            {cells.map((day, i) => {
              const color = day ? getColor(day) : null
              return (
                <div key={i} style={{
                  borderRadius: cr,
                  backgroundColor: day ? (color ?? empty) : 'transparent',
                  boxShadow: day ? cellBoxShadow(color, cellGlow) : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: labeled ? '0 0 4px 4px' : undefined,
                }}>
                  {labeled && day && (
                    <span style={{
                      fontSize: 7,
                      color: color
                        ? (needsLight(color) ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.4)')
                        : muted,
                      fontFamily: FONT,
                    }}>
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

    // ── YEARLY FEED: 4 cols × 3 rows of mini months ─────────────────────────
    const YearlyFeed = () => {
      const cols = 4, rows = 3
      const hGap = 10, vGap = 10
      const padH   = PAD
      const monthW = Math.floor((CANVAS_W - padH * 2 - (cols - 1) * hGap) / cols)
      const monthH = Math.floor((CONTENT_H - (rows - 1) * vGap) / rows)
      const nameH  = 14
      const cGap   = 1.5
      const cellSz = Math.floor((monthW - 6 * cGap) / 7)
      const cr     = cellRadius(cellSz, cellShape)

      return (
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${monthW}px)`,
          gridTemplateRows: `repeat(${rows}, ${monthH}px)`,
          gap: `${vGap}px ${hGap}px`,
          padding: `4px ${padH}px 0`,
        }}>
          {Array.from({ length: 12 }, (_, m) => {
            const cells = getMonthCells(year, m)
            return (
              <div key={m} style={{ overflow: 'hidden' }}>
                <p style={{
                  fontSize: 7.5, fontWeight: 600, color: muted,
                  fontFamily: FONT, marginBottom: 4,
                  letterSpacing: '0.09em', textTransform: 'uppercase',
                  height: nameH,
                }}>
                  {MONTH_SHORT[m]}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cellSz}px)`, gap: cGap }}>
                  {cells.map((day, i) => {
                    const color = day ? getColor(day) : null
                    return (
                      <div key={i} style={{
                        width: cellSz, height: cellSz, borderRadius: cr,
                        backgroundColor: day ? (color ?? empty) : 'transparent',
                        boxShadow: day ? cellBoxShadow(color, cellGlow) : undefined,
                      }} />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // ── YEARLY STORY: 3 cols × 4 rows with bigger cells ─────────────────────
    const YearlyStory = () => {
      const cols = 3, rows = 4
      const hGap = 14, vGap = 14
      const padH   = PAD
      const monthW = Math.floor((CANVAS_W - padH * 2 - (cols - 1) * hGap) / cols)
      const monthH = Math.floor((CONTENT_H - (rows - 1) * vGap) / rows)
      const nameH  = 16
      const cGap   = 2
      const cellSz = Math.floor((monthW - 6 * cGap) / 7)
      const cr     = cellRadius(cellSz, cellShape)

      return (
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${monthW}px)`,
          gridTemplateRows: `repeat(${rows}, ${monthH}px)`,
          gap: `${vGap}px ${hGap}px`,
          padding: `4px ${padH}px 0`,
        }}>
          {Array.from({ length: 12 }, (_, m) => {
            const cells = getMonthCells(year, m)
            return (
              <div key={m} style={{ overflow: 'hidden' }}>
                <p style={{
                  fontSize: 8.5, fontWeight: 600, color: muted,
                  fontFamily: FONT, marginBottom: 5,
                  letterSpacing: '0.09em', textTransform: 'uppercase',
                  height: nameH,
                }}>
                  {MONTH_SHORT[m]}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cellSz}px)`, gap: cGap }}>
                  {cells.map((day, i) => {
                    const color = day ? getColor(day) : null
                    return (
                      <div key={i} style={{
                        width: cellSz, height: cellSz, borderRadius: cr,
                        backgroundColor: day ? (color ?? empty) : 'transparent',
                        boxShadow: day ? cellBoxShadow(color, cellGlow) : undefined,
                      }} />
                    )
                  })}
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
          background: bgStyle,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: FONT,
        }}
      >
        <Header />
        {mode === 'weekly'  && !isStory && <WeeklyFeed />}
        {mode === 'weekly'  &&  isStory && <WeeklyStory />}
        {mode === 'monthly' && !isStory && <MonthlyFeed />}
        {mode === 'monthly' &&  isStory && <MonthlyStory />}
        {mode === 'yearly'  && !isStory && <YearlyFeed />}
        {mode === 'yearly'  &&  isStory && <YearlyStory />}
        <Footer />
      </div>
    )
  }
)

ExportCanvas.displayName = 'ExportCanvas'
export default ExportCanvas
