import { useEffect, useRef, type CSSProperties } from 'react'
import type { MoodEntry } from '../types'

interface Props {
  entries: MoodEntry[]
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dy}`
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day   = d.getDate()
  const month = d.getMonth() + 1
  return `${day}/${month}`
}

export default function DeepHistory({ entries }: Props) {
  const scrollRef  = useRef<HTMLDivElement | null>(null)
  const todayRef   = useRef<HTMLDivElement | null>(null)
  const todayStr   = todayISO()

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  // Auto-scroll to today on mount
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' })
    } else if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [entries])

  const scrollBy = (delta: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: delta, behavior: 'smooth' })
    }
  }

  if (sorted.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: 200, gap: 8,
      }}>
        <p style={{ fontSize: 32 }}>🎨</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-foreground)' }}>
          Nessuna voce ancora
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center' }}>
          Inizia a registrare il tuo colore ogni giorno.
        </p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>

      {/* Left arrow */}
      <button
        onClick={() => scrollBy(-220)}
        style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          zIndex: 10, width: 32, height: 32, borderRadius: '50%',
          background: 'var(--color-surface-raised)', border: '1.5px solid var(--color-subtle)',
          boxShadow: 'var(--shadow-sm)', color: 'var(--color-foreground)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Right arrow */}
      <button
        onClick={() => scrollBy(220)}
        style={{
          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
          zIndex: 10, width: 32, height: 32, borderRadius: '50%',
          background: 'var(--color-surface-raised)', border: '1.5px solid var(--color-subtle)',
          boxShadow: 'var(--shadow-sm)', color: 'var(--color-foreground)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          display: 'flex',
          alignItems: 'stretch',
          height: 260,
          borderRadius: 20,
          marginLeft: 40,
          marginRight: 40,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none' as CSSProperties['msOverflowStyle'],
          gap: 2,
          background: 'var(--color-surface-raised)',
          border: '1.5px solid var(--color-subtle)',
          boxShadow: 'var(--shadow-xs)',
          padding: '0 4px',
        }}
        className="no-scrollbar"
      >
        {sorted.map((entry, idx) => {
          const isToday  = entry.date === todayStr
          const isFirst  = idx === 0
          const isLast   = idx === sorted.length - 1

          return (
            <div
              key={entry.id}
              ref={isToday ? todayRef : undefined}
              style={{
                flexShrink: 0,
                width: 44,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                position: 'relative',
                cursor: 'default',
                borderRadius: isFirst ? '16px 0 0 16px' : isLast ? '0 16px 16px 0' : 0,
                overflow: 'hidden',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'scaleY(1.04)'
                el.style.zIndex    = '2'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'scaleY(1)'
                el.style.zIndex    = '0'
              }}
            >
              {/* Color fill */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundColor: entry.color_hex,
                opacity: 0.92,
              }} />

              {/* Today ring */}
              {isToday && (
                <div style={{
                  position: 'absolute', inset: 2,
                  borderRadius: 'inherit',
                  border: `2.5px solid rgba(255,255,255,0.9)`,
                  boxShadow: `0 0 0 2px ${entry.color_hex}, inset 0 0 0 2px rgba(255,255,255,0.4)`,
                  pointerEvents: 'none',
                  zIndex: 3,
                }} />
              )}

              {/* Hover glow overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,255,255,0)',
                transition: 'background 0.15s ease',
                pointerEvents: 'none',
              }} />

              {/* Date label */}
              <div style={{
                position: 'relative', zIndex: 4,
                padding: '0 0 6px',
                textAlign: 'center',
              }}>
                {isToday && (
                  <div style={{
                    fontSize: 8, fontWeight: 900, letterSpacing: '0.05em',
                    color: 'rgba(255,255,255,0.95)',
                    marginBottom: 1,
                    textTransform: 'uppercase',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}>
                    OGG
                  </div>
                )}
                <div style={{
                  fontSize: 8, fontWeight: 700,
                  color: 'rgba(255,255,255,0.75)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}>
                  {formatShortDate(entry.date)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Entry count */}
      <p style={{
        textAlign: 'center', marginTop: 10,
        fontSize: 11, color: 'var(--color-muted)',
      }}>
        {sorted.length} {sorted.length === 1 ? 'giorno registrato' : 'giorni registrati'}
      </p>
    </div>
  )
}
