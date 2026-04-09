import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { MoodEntry } from '../types'

const MONTH_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

interface Props {
  entries: MoodEntry[]
}

interface Tooltip {
  entry: MoodEntry
  x: number
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()}/${d.getMonth()+1}`
}

export default function DeepHistory({ entries }: Props) {
  const scrollRef    = useRef<HTMLDivElement>(null)
  const todayRef     = useRef<HTMLDivElement>(null)
  const progressRef  = useRef<HTMLDivElement>(null)
  const todayStr     = todayISO()
  const [tooltip, setTooltip]       = useState<Tooltip | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup long-press timer on unmount
  useEffect(() => () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }, [])

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  // Auto-scroll to today
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' })
    } else if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [entries])

  // Scroll progress bar (DOM-direct, no re-render)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const updateProgress = () => {
      if (!progressRef.current) return
      const pct = el.scrollWidth <= el.clientWidth
        ? 1
        : el.scrollLeft / (el.scrollWidth - el.clientWidth)
      progressRef.current.style.width = `${Math.min(1, pct) * 100}%`
    }
    el.addEventListener('scroll', updateProgress, { passive: true })
    updateProgress()
    return () => el.removeEventListener('scroll', updateProgress)
  }, [entries])

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const startLongPress = (entry: MoodEntry, x: number) => {
    longPressTimer.current = setTimeout(() => {
      setTooltip({ entry, x })
    }, 300)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setTooltip(null)
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

  // Build items with optional month-separator before each entry
  const items: Array<{ type: 'entry'; entry: MoodEntry; idx: number } | { type: 'sep'; month: number; year: number }> = []
  sorted.forEach((entry, idx) => {
    const d = new Date(entry.date + 'T12:00:00')
    const prev = sorted[idx - 1]
    if (!prev || prev.date.slice(0, 7) !== entry.date.slice(0, 7)) {
      items.push({ type: 'sep', month: d.getMonth(), year: d.getFullYear() })
    }
    items.push({ type: 'entry', entry, idx })
  })

  return (
    <div style={{ position:'relative', width:'100%' }} onClick={() => setTooltip(null)}>

      {/* Left arrow */}
      <button onClick={() => scrollBy(-200)} style={{
        position:'absolute', left:0, top:'50%', transform:'translateY(-50%)',
        zIndex:10, width:32, height:32, borderRadius:'50%',
        background:'var(--color-surface-raised)', border:'1.5px solid var(--color-subtle)',
        boxShadow:'var(--shadow-sm)', color:'var(--color-foreground)',
        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0,
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Right arrow */}
      <button onClick={() => scrollBy(200)} style={{
        position:'absolute', right:0, top:'50%', transform:'translateY(-50%)',
        zIndex:10, width:32, height:32, borderRadius:'50%',
        background:'var(--color-surface-raised)', border:'1.5px solid var(--color-subtle)',
        boxShadow:'var(--shadow-sm)', color:'var(--color-foreground)',
        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0,
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Fade edge overlays */}
      <div style={{ position:'absolute', left:40, top:0, bottom:16, width:24, zIndex:5, pointerEvents:'none',
        background:'linear-gradient(to right, var(--color-surface), transparent)' }} />
      <div style={{ position:'absolute', right:40, top:0, bottom:16, width:24, zIndex:5, pointerEvents:'none',
        background:'linear-gradient(to left, var(--color-surface), transparent)' }} />

      {/* Scroll container */}
      <div
        ref={scrollRef}
        style={{
          overflowX:'auto', overflowY:'hidden', display:'flex', alignItems:'stretch',
          height:260, borderRadius:20, marginLeft:40, marginRight:40,
          scrollbarWidth:'none', msOverflowStyle:'none' as CSSProperties['msOverflowStyle'],
          gap:0, background:'var(--color-surface-raised)',
          border:'1.5px solid var(--color-subtle)', boxShadow:'var(--shadow-xs)',
        }}
        className="no-scrollbar"
      >
        {items.map((item, i) => {
          if (item.type === 'sep') {
            return (
              <div key={`sep-${item.year}-${item.month}`} style={{
                flexShrink:0, width:32, display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', position:'relative', zIndex:2,
              }}>
                <div style={{ width:1, height:60, background:'var(--color-subtle)', opacity:0.8 }} />
                <p style={{
                  fontSize:8, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase',
                  color:'var(--color-muted)', marginTop:4, writingMode:'vertical-rl',
                  fontFamily:'Inter, system-ui, sans-serif',
                }}>
                  {MONTH_SHORT[item.month]}
                </p>
              </div>
            )
          }

          const { entry, idx } = item
          const isToday  = entry.date === todayStr
          const isFirst  = idx === 0
          const isLast   = idx === sorted.length - 1

          return (
            <div
              key={entry.id}
              ref={isToday ? todayRef : undefined}
              style={{
                flexShrink:0, width:44, height:'100%',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end',
                position:'relative', cursor:'default',
                borderRadius: isFirst ? '16px 0 0 16px' : isLast ? '0 16px 16px 0' : 0,
                overflow:'hidden', transition:'transform 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scaleY(1.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scaleY(1)'; cancelLongPress() }}
              onMouseDown={e => startLongPress(entry, e.clientX)}
              onMouseUp={cancelLongPress}
              onTouchStart={e => startLongPress(entry, e.touches[0].clientX)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
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
                  <div style={{ fontSize:8, fontWeight:900, letterSpacing:'0.05em', color:'rgba(255,255,255,0.95)',
                    marginBottom:1, textTransform:'uppercase', fontFamily:'Inter, system-ui, sans-serif' }}>
                    OGG
                  </div>
                )}
                <div style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,0.75)', fontFamily:'Inter, system-ui, sans-serif' }}>
                  {formatShortDate(entry.date)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Scroll progress bar */}
      <div style={{ marginLeft:40, marginRight:40, height:3, borderRadius:99, background:'var(--color-subtle)', marginTop:8, overflow:'hidden' }}>
        <div ref={progressRef} style={{ height:'100%', background:'var(--color-foreground)', borderRadius:99, width:'0%', transition:'width 0.1s' }} />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position:'absolute', top:20, left:'50%', transform:'translateX(-50%)',
          zIndex:20, background:'var(--color-foreground)', color:'var(--color-surface)',
          borderRadius:14, padding:'10px 14px', pointerEvents:'none',
          boxShadow:'var(--shadow-lg)', animation:'fadeIn 0.15s ease both',
          maxWidth:200, textAlign:'center',
        }}>
          <p style={{ fontSize:12, fontWeight:800, marginBottom:2 }}>{formatLabel(tooltip.entry.date)}</p>
          {tooltip.entry.mood_label && (
            <p style={{ fontSize:11, fontWeight:600, opacity:0.85 }}>{tooltip.entry.mood_label}</p>
          )}
          {tooltip.entry.note && (
            <p style={{ fontSize:10, opacity:0.65, marginTop:2, lineHeight:1.4 }}>
              {tooltip.entry.note.slice(0, 40)}{tooltip.entry.note.length > 40 ? '…' : ''}
            </p>
          )}
        </div>
      )}

      <p style={{ textAlign:'center', marginTop:6, fontSize:11, color:'var(--color-muted)' }}>
        {sorted.length} {sorted.length === 1 ? 'giorno registrato' : 'giorni registrati'}
      </p>
    </div>
  )
}
