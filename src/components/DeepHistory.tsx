import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { MoodEntry } from '../types'

interface Props {
  entries: MoodEntry[]
}

const MONTH_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()}/${d.getMonth()+1}`
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

interface TooltipState {
  entryIdx: number
  x: number
}

export default function DeepHistory({ entries }: Props) {
  const scrollRef     = useRef<HTMLDivElement | null>(null)
  const todayRef      = useRef<HTMLDivElement | null>(null)
  const progressRef   = useRef<HTMLDivElement | null>(null)
  const rafRef        = useRef<number>(0)
  const todayStr      = todayISO()
  const longPressRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  // Auto-scroll to today
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' })
    } else if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [entries])

  // Progress bar — update via DOM ref (no re-render)
  const updateProgress = () => {
    const el = scrollRef.current
    const bar = progressRef.current
    if (!el || !bar) return
    const max = el.scrollWidth - el.clientWidth
    const pct = max > 0 ? (el.scrollLeft / max) * 100 : 100
    bar.style.width = `${pct}%`
  }

  const handleScroll = () => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(updateProgress)
  }

  useEffect(() => {
    updateProgress()
    return () => cancelAnimationFrame(rafRef.current)
  }, [entries])

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  if (sorted.length === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, gap:8 }}>
        <p style={{ fontSize:32 }}>🎨</p>
        <p style={{ fontSize:15, fontWeight:700, color:'var(--color-foreground)' }}>Nessuna voce ancora</p>
        <p style={{ fontSize:13, color:'var(--color-muted)', textAlign:'center' }}>Inizia a registrare il tuo colore ogni giorno.</p>
      </div>
    )
  }

  const current = tooltip !== null ? sorted[tooltip.entryIdx] : null

  return (
    <div style={{ position:'relative', width:'100%' }}>

      {/* Left arrow */}
      <button onClick={() => scrollBy(-220)} style={{
        position:'absolute', left:0, top:'50%', transform:'translateY(-50%)',
        zIndex:10, width:36, height:36, borderRadius:'50%',
        background:'var(--color-surface-raised)', border:'1.5px solid var(--color-subtle)',
        boxShadow:'var(--shadow-sm)', color:'var(--color-foreground)',
        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Right arrow */}
      <button onClick={() => scrollBy(220)} style={{
        position:'absolute', right:0, top:'50%', transform:'translateY(-50%)',
        zIndex:10, width:36, height:36, borderRadius:'50%',
        background:'var(--color-surface-raised)', border:'1.5px solid var(--color-subtle)',
        boxShadow:'var(--shadow-sm)', color:'var(--color-foreground)',
        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Tooltip */}
      {tooltip !== null && current && (
        <div style={{
          position:'absolute', bottom: 288, left: Math.max(8, Math.min(tooltip.x - 60, 280)),
          zIndex:20, background:'var(--color-surface-raised)', border:'1.5px solid var(--color-subtle)',
          borderRadius:14, padding:'8px 12px', boxShadow:'var(--shadow-md)',
          animation:'fadeIn 0.15s ease both', pointerEvents:'none', minWidth:120,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <div style={{ width:12, height:12, borderRadius:'50%', backgroundColor:current.color_hex, flexShrink:0 }} />
            <span style={{ fontSize:12, fontWeight:700, color:'var(--color-foreground)' }}>{current.mood_label ?? current.color_hex}</span>
          </div>
          <p style={{ fontSize:10, color:'var(--color-muted)', marginBottom:current.note ? 4 : 0 }}>{formatFullDate(current.date)}</p>
          {current.note && (
            <p style={{ fontSize:11, color:'var(--color-foreground)', fontStyle:'italic', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              "{current.note.slice(0,40)}{current.note.length > 40 ? '…' : ''}"
            </p>
          )}
        </div>
      )}

      {/* Scroll container with fade edges */}
      <div style={{ position:'relative', marginLeft:44, marginRight:44 }}>
        {/* Left fade */}
        <div style={{ position:'absolute', left:0, top:0, bottom:16, width:40, zIndex:5, pointerEvents:'none',
          background:'linear-gradient(to right, var(--color-surface), transparent)', borderRadius:'20px 0 0 0' }} />
        {/* Right fade */}
        <div style={{ position:'absolute', right:0, top:0, bottom:16, width:40, zIndex:5, pointerEvents:'none',
          background:'linear-gradient(to left, var(--color-surface), transparent)', borderRadius:'0 20px 0 0' }} />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            overflowX:'auto', overflowY:'hidden',
            display:'flex', alignItems:'stretch',
            height:260, borderRadius:20,
            scrollbarWidth:'none',
            msOverflowStyle:'none' as CSSProperties['msOverflowStyle'],
            gap:0,
            background:'var(--color-surface-raised)',
            border:'1.5px solid var(--color-subtle)',
            boxShadow:'var(--shadow-xs)',
            position:'relative',
          }}
          className="no-scrollbar"
        >
          {sorted.map((entry, idx) => {
            const isToday = entry.date === todayStr
            const isFirst = idx === 0
            const isLast  = idx === sorted.length - 1
            // Month separator: show if month changes from previous
            const prevEntry = idx > 0 ? sorted[idx-1] : null
            const showMonthSep = prevEntry && prevEntry.date.slice(0,7) !== entry.date.slice(0,7)
            const monthLabel = MONTH_SHORT[new Date(entry.date+'T12:00:00').getMonth()]

            return (
              <div key={entry.id} style={{ position:'relative', display:'flex', flexShrink:0 }}>
                {/* Month separator */}
                {showMonthSep && (
                  <div style={{ position:'absolute', left:0, top:0, bottom:20, width:1, background:'rgba(255,255,255,0.4)', zIndex:6, pointerEvents:'none' }}>
                    <span style={{ position:'absolute', top:8, left:4, fontSize:7, fontWeight:800, color:'rgba(255,255,255,0.85)', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>
                      {monthLabel}
                    </span>
                  </div>
                )}

                <div
                  ref={isToday ? todayRef : undefined}
                  style={{
                    flexShrink:0, width:44, height:'100%',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end',
                    position:'relative', cursor:'default',
                    borderRadius: isFirst ? '16px 0 0 16px' : isLast ? '0 16px 16px 0' : 0,
                    overflow:'hidden',
                    transition:'transform 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform='scaleY(1.04)'; setTooltip({ entryIdx: idx, x: idx * 44 }) }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform='scaleY(1)'; setTooltip(null) }}
                  onTouchStart={e => {
                    const touch = e.touches[0]
                    longPressRef.current = setTimeout(() => setTooltip({ entryIdx: idx, x: touch.clientX }), 300)
                  }}
                  onTouchEnd={() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null }; setTimeout(() => setTooltip(null), 1200) }}
                  onTouchMove={() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null } }}
                >
                  {/* Color fill */}
                  <div style={{ position:'absolute', inset:0, backgroundColor:entry.color_hex, opacity:0.92 }} />

                  {/* Today ring */}
                  {isToday && (
                    <div style={{
                      position:'absolute', inset:2, borderRadius:'inherit',
                      border:'2.5px solid rgba(255,255,255,0.9)',
                      boxShadow:`0 0 0 2px ${entry.color_hex}, inset 0 0 0 2px rgba(255,255,255,0.4)`,
                      pointerEvents:'none', zIndex:3,
                    }} />
                  )}

                  {/* Date label */}
                  <div style={{ position:'relative', zIndex:4, padding:'0 0 6px', textAlign:'center' }}>
                    {isToday && (
                      <div style={{ fontSize:7, fontWeight:900, color:'rgba(255,255,255,0.95)', marginBottom:1, textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:'Inter, system-ui, sans-serif' }}>
                        OGG
                      </div>
                    )}
                    <div style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,0.75)', fontFamily:'Inter, system-ui, sans-serif' }}>
                      {formatShortDate(entry.date)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div style={{ height:3, borderRadius:999, background:'var(--color-subtle)', marginTop:8, overflow:'hidden' }}>
          <div ref={progressRef} style={{ height:'100%', borderRadius:999, background:'var(--color-foreground)', width:'0%', transition:'width 0.1s linear' }} />
        </div>
      </div>

      {/* Entry count */}
      <p style={{ textAlign:'center', marginTop:10, fontSize:11, color:'var(--color-muted)' }}>
        {sorted.length} {sorted.length === 1 ? 'giorno registrato' : 'giorni registrati'}
      </p>
    </div>
  )
}
