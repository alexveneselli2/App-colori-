import { useEffect, useState } from 'react'

const BRAND = 'linear-gradient(110deg, #FFD000 0%, #FF6B00 20%, #FF0A54 38%, #C77DFF 55%, #00B4D8 72%, #52B788 88%)'

const CYCLE_COLORS = [
  { color: '#FFD000', label: 'Gioia' },
  { color: '#FF0A54', label: 'Estasi' },
  { color: '#00B4D8', label: 'Calma' },
  { color: '#C77DFF', label: 'Nostalgia' },
  { color: '#52B788', label: 'Gratitudine' },
  { color: '#4361EE', label: 'Coinvolgimento' },
]

// 35 cells (5 rows × 7 cols) pre-colored for the calendar demo
const DEMO_CELLS: (string | null)[] = [
  null, '#FFD000', '#FF6B00', '#FF0A54', '#C77DFF', '#00B4D8', '#52B788',
  '#FFD000', '#FF8FAB', '#2D6A4F', '#FFBE0B', '#80ED99', '#D62839', '#7B2FBE',
  '#90E0EF', '#415A77', '#FFD000', '#FB5607', '#52B788', '#3A5A8C', '#FF8FAB',
  '#00B4D8', '#FFBE0B', '#2D6A4F', '#A30015', '#C77DFF', '#80ED99', '#FF6B00',
  '#4361EE', '#06D6A0', null, null, null, null, null,
]

export default function Splash({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const [slideKey, setSlideKey] = useState(0)

  const next = () => {
    if (slide >= 3) { finish(); return }
    setSlide(s => s + 1)
    setSlideKey(k => k + 1)
  }

  const finish = () => {
    localStorage.setItem('iride_intro_seen', '1')
    onDone()
  }

  return (
    <div
      onClick={next}
      style={{ position: 'fixed', inset: 0, zIndex: 200, overflow: 'hidden', cursor: 'pointer', userSelect: 'none' }}
    >
      <style>{`
        @keyframes splashIn {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashInFast {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes orbDrift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(24px,-36px) scale(1.08); }
          66%     { transform: translate(-18px,22px) scale(0.94); }
        }
        @keyframes orbDrift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(-28px,18px) scale(0.92); }
          70%     { transform: translate(20px,-28px) scale(1.06); }
        }
        @keyframes orbDrift3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(16px,32px) scale(1.04); }
        }
        @keyframes calCell {
          0%   { opacity: 0; transform: scale(0.2); }
          65%  { transform: scale(1.18); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes colorPulse {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.04); }
        }
        @keyframes dotGrow {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes labelFade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ctaFloat {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-6px); }
        }
      `}</style>

      {/* Slide */}
      <div key={slideKey} style={{ width: '100%', height: '100%', animation: 'splashIn 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
        {slide === 0 && <Slide1 />}
        {slide === 1 && <Slide2 />}
        {slide === 2 && <Slide3 />}
        {slide === 3 && <Slide4 onStart={e => { e.stopPropagation(); finish() }} />}
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'fixed',
        bottom: `max(env(safe-area-inset-bottom, 0px) + 32px, 40px)`,
        left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 6,
        pointerEvents: 'none',
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            height: 4, borderRadius: 99,
            width: i === slide ? 32 : 6,
            background: slide === 2
              ? (i === slide ? '#1C1917' : 'rgba(28,25,23,0.22)')
              : (i === slide ? '#ffffff' : 'rgba(255,255,255,0.28)'),
            transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        ))}
      </div>

      {/* Skip button */}
      {slide < 3 && (
        <button
          onClick={e => { e.stopPropagation(); finish() }}
          style={{
            position: 'fixed',
            top: `max(env(safe-area-inset-top, 0px) + 16px, 20px)`,
            right: 20,
            background: slide === 2 ? 'rgba(28,25,23,0.10)' : 'rgba(255,255,255,0.14)',
            backdropFilter: 'blur(16px)',
            border: 'none', borderRadius: 99, padding: '8px 18px',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
            color: slide === 2 ? 'rgba(28,25,23,0.60)' : 'rgba(255,255,255,0.80)',
            cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          SALTA
        </button>
      )}
    </div>
  )
}

// ── Slide 1 — Brand reveal ────────────────────────────────────────────────────
function Slide1() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#05050F',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '0 32px',
    }}>
      {/* Floating orbs */}
      <Orb size={380} color="#FFD000" opacity={0.18} top="-8%" left="-15%" animation="orbDrift1 9s ease-in-out infinite" blur={80} />
      <Orb size={320} color="#FF0A54" opacity={0.16} top="25%" right="-12%" animation="orbDrift2 11s ease-in-out infinite 1s" blur={80} />
      <Orb size={280} color="#00B4D8" opacity={0.15} bottom="5%" left="15%" animation="orbDrift3 8s ease-in-out infinite 2s" blur={70} />
      <Orb size={240} color="#C77DFF" opacity={0.14} bottom="20%" right="10%" animation="orbDrift1 10s ease-in-out infinite 3s" blur={70} />

      {/* IRIDE wordmark */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{
          fontSize: 'clamp(88px, 24vw, 120px)',
          fontWeight: 900,
          letterSpacing: '-0.07em',
          lineHeight: 0.88,
          background: BRAND,
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: 'Inter, system-ui, sans-serif',
          animation: 'shimmer 4s linear infinite',
          marginBottom: 28,
        }}>
          IRIDE
        </div>

        <p style={{
          fontSize: 22, fontWeight: 700, color: '#FFFFFF',
          letterSpacing: '-0.02em', marginBottom: 16,
          animation: 'splashIn 0.6s 0.25s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          Il tuo diario cromatico
        </p>
        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65,
          animation: 'splashIn 0.6s 0.4s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          Ogni giorno, un colore.<br />
          La tua storia in un'immagine.
        </p>

        {/* Color dot row */}
        <div style={{
          display: 'flex', gap: 10, justifyContent: 'center', marginTop: 40,
          animation: 'splashIn 0.6s 0.55s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {CYCLE_COLORS.map(({ color }, i) => (
            <div key={color} style={{
              width: 10, height: 10, borderRadius: '50%', backgroundColor: color,
              animation: `dotGrow 0.4s ${0.55 + i * 0.07}s cubic-bezier(0.34,1.56,0.64,1) both`,
            }} />
          ))}
        </div>
      </div>

      {/* Tap hint */}
      <p style={{
        position: 'absolute', bottom: 96,
        fontSize: 11, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)',
        fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif',
        animation: 'splashIn 0.6s 1s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        TOCCA PER CONTINUARE
      </p>
    </div>
  )
}

// ── Slide 2 — Daily color ─────────────────────────────────────────────────────
function Slide2() {
  const [idx, setIdx] = useState(0)
  const [labelKey, setLabelKey] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % CYCLE_COLORS.length)
      setLabelKey(k => k + 1)
    }, 1400)
    return () => clearInterval(t)
  }, [])

  const { color, label } = CYCLE_COLORS[idx]

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#060610',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '0 32px',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', width: 340, height: 340, borderRadius: '50%',
        backgroundColor: color, filter: 'blur(100px)', opacity: 0.22,
        transition: 'background-color 0.9s ease',
      }} />

      {/* Big circle */}
      <div style={{
        width: 'clamp(140px, 42vw, 200px)', height: 'clamp(140px, 42vw, 200px)',
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 0 16px ${color}20, 0 0 80px ${color}50, 0 0 160px ${color}20`,
        transition: 'background-color 0.7s cubic-bezier(0.4,0,0.2,1), box-shadow 0.7s ease',
        animation: 'colorPulse 3s ease-in-out infinite',
        marginBottom: 24, zIndex: 1, position: 'relative',
      }} />

      {/* Mood label under circle */}
      <p key={labelKey} style={{
        fontSize: 16, fontWeight: 800, letterSpacing: '0.06em',
        color: color, marginBottom: 32,
        animation: 'labelFade 0.4s ease both',
        transition: 'color 0.6s ease',
        zIndex: 1, position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {label.toUpperCase()}
      </p>

      {/* Dot row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 48, zIndex: 1, position: 'relative' }}>
        {CYCLE_COLORS.map(({ color: c }, i) => (
          <div key={c} style={{
            width: i === idx ? 20 : 12,
            height: i === idx ? 20 : 12,
            borderRadius: '50%',
            backgroundColor: c,
            opacity: i === idx ? 1 : 0.38,
            boxShadow: i === idx ? `0 0 0 3px rgba(255,255,255,0.2), 0 0 18px ${c}70` : undefined,
            transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        ))}
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
        <h2 style={{
          fontSize: 'clamp(28px, 8vw, 36px)', fontWeight: 900, color: '#FFFFFF',
          letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 16,
          animation: 'splashIn 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          Ogni giorno,<br />scegli un colore
        </h2>
        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, maxWidth: 300,
          animation: 'splashIn 0.5s 0.25s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          Un solo gesto al giorno. Il colore che
          racconta come ti senti — custodito per sempre.
        </p>
      </div>
    </div>
  )
}

// ── Slide 3 — Calendar mosaic ─────────────────────────────────────────────────
function Slide3() {
  const filledCount = DEMO_CELLS.filter(c => c !== null).length

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#F2EDE5',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '0 32px',
    }}>
      {/* Calendar */}
      <div style={{
        marginBottom: 36, zIndex: 1,
        animation: 'splashIn 0.5s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Month label */}
        <p style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.16em',
          color: '#8A8680', marginBottom: 12, textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          APRILE 2026
        </p>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 5 }}>
          {['L','M','M','G','V','S','D'].map((d, i) => (
            <div key={i} style={{
              width: 36, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
              color: '#B5B0A8', fontFamily: 'Inter, system-ui, sans-serif',
            }}>{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
          {DEMO_CELLS.map((color, i) => (
            <div key={i} style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: color ?? 'transparent',
              boxShadow: color ? `0 3px 10px ${color}45` : undefined,
              animation: color ? `calCell 0.5s ${i * 0.04}s cubic-bezier(0.34,1.56,0.64,1) both` : undefined,
            }} />
          ))}
        </div>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(28,25,23,0.07)', borderRadius: 99,
          padding: '6px 14px', marginBottom: 18,
          animation: 'splashIn 0.5s 0.3s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#52B788' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#52B788', letterSpacing: '0.06em' }}>
            {filledCount} giorni registrati
          </span>
        </div>
        <h2 style={{
          fontSize: 'clamp(28px, 8vw, 34px)', fontWeight: 900, color: '#1C1917',
          letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 14,
          animation: 'splashIn 0.5s 0.15s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          La tua storia<br />diventa bellezza
        </h2>
        <p style={{
          fontSize: 15, color: '#79716B', lineHeight: 1.7, maxWidth: 300,
          animation: 'splashIn 0.5s 0.28s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          Un mese, un anno: ogni giorno ha un colore.
          L'insieme racconta chi sei davvero.
        </p>
      </div>
    </div>
  )
}

// ── Slide 4 — CTA ─────────────────────────────────────────────────────────────
function Slide4({ onStart }: { onStart: (e: React.MouseEvent) => void }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#05050F',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '0 36px',
    }}>
      <Orb size={400} color="#C77DFF" opacity={0.16} top="-5%" right="-15%" animation="orbDrift2 10s ease-in-out infinite" blur={90} />
      <Orb size={360} color="#FFD000" opacity={0.14} bottom="0%" left="-10%" animation="orbDrift1 12s ease-in-out infinite 1.5s" blur={90} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        {/* Small IRIDE wordmark */}
        <div style={{
          fontSize: 13, fontWeight: 900, letterSpacing: '0.14em',
          background: BRAND, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 28, fontFamily: 'Inter, system-ui, sans-serif',
          animation: 'splashIn 0.5s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          IRIDE
        </div>

        <h2 style={{
          fontSize: 'clamp(32px, 9vw, 44px)', fontWeight: 900, color: '#FFFFFF',
          letterSpacing: '-0.05em', lineHeight: 1.05, marginBottom: 16,
          animation: 'splashIn 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          Il tuo diario cromatico<br />ti aspetta
        </h2>

        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 280,
          marginBottom: 48,
          animation: 'splashIn 0.6s 0.22s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          Gratuito. Nessuna pubblicità.<br />Solo i tuoi colori.
        </p>

        {/* CTA button */}
        <button
          onClick={onStart}
          style={{
            padding: '18px 52px',
            borderRadius: 99,
            background: BRAND,
            backgroundSize: '200% auto',
            border: 'none',
            fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: '0 8px 40px rgba(255,107,0,0.40), 0 2px 12px rgba(0,0,0,0.30)',
            fontFamily: 'Inter, system-ui, sans-serif',
            animation: 'splashIn 0.7s 0.35s cubic-bezier(0.22,1,0.36,1) both, ctaFloat 3s 1s ease-in-out infinite',
            display: 'block', marginLeft: 'auto', marginRight: 'auto',
          }}
        >
          Inizia ora →
        </button>

        <p style={{
          fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 22, letterSpacing: '0.04em',
          animation: 'splashIn 0.6s 0.5s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          Puoi sempre provare la demo senza registrarti
        </p>
      </div>
    </div>
  )
}

// ── Reusable orb ─────────────────────────────────────────────────────────────
function Orb({ size, color, opacity, top, bottom, left, right, animation, blur }: {
  size: number; color: string; opacity: number
  top?: string; bottom?: string; left?: string; right?: string
  animation: string; blur: number
}) {
  return (
    <div style={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: '50%',
      backgroundColor: color,
      opacity,
      filter: `blur(${blur}px)`,
      top, bottom, left, right,
      animation,
      pointerEvents: 'none',
    }} />
  )
}
