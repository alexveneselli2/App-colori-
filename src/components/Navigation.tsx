import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useMoodStore } from '../store/useMoodStore'

function isAfterNoon(): boolean {
  return new Date().getHours() >= 12
}

export default function Navigation() {
  const { entries, todayEntry } = useMoodStore()
  const [bouncing, setBouncing] = useState<string | null>(null)
  const [afterNoon, setAfterNoon] = useState(isAfterNoon())

  // Re-check every minute for the badge
  useEffect(() => {
    const id = setInterval(() => setAfterNoon(isAfterNoon()), 60_000)
    return () => clearInterval(id)
  }, [])

  const lastColor = entries.length > 0
    ? [...entries].sort((a, b) => b.date.localeCompare(a.date))[0].color_hex
    : null

  const showTodayBadge = !todayEntry && afterNoon

  const handleTap = (to: string) => {
    setBouncing(to)
    setTimeout(() => setBouncing(null), 320)
  }

  const tabs = [
    {
      to: '/',
      label: 'Oggi',
      badge: showTodayBadge,
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {active ? (
            <>
              <circle cx="10" cy="10" r="6.5" fill="currentColor"/>
              <circle cx="10" cy="10" r="2.5" fill="rgba(0,0,0,0.28)"/>
            </>
          ) : (
            <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.6"/>
          )}
        </svg>
      ),
    },
    {
      to: '/history',
      label: 'Memoria',
      badge: false,
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2.5" y="2.5" width="6" height="6" rx="1.5"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.6"/>
          <rect x="11.5" y="2.5" width="6" height="6" rx="1.5"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.6"/>
          <rect x="2.5" y="11.5" width="6" height="6" rx="1.5"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.6"/>
          <rect x="11.5" y="11.5" width="6" height="6" rx="1.5"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.6"/>
        </svg>
      ),
    },
    {
      to: '/stats',
      label: 'Analisi',
      badge: false,
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2.5" y="10" width="3" height="7.5" rx="1"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.4"/>
          <rect x="8.5" y="6" width="3" height="11.5" rx="1"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.4"/>
          <rect x="14.5" y="2.5" width="3" height="15" rx="1"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      ),
    },
    {
      to: '/export',
      label: 'Esporta',
      badge: false,
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2.5 L10 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M6.5 6 L10 2.5 L13.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 10 L3.5 10 C3 10 2.5 10.5 2.5 11 L2.5 16.5 C2.5 17 3 17.5 3.5 17.5 L16.5 17.5 C17 17.5 17.5 17 17.5 16.5 L17.5 11 C17.5 10.5 17 10 16.5 10 L15 10"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            fill={active ? 'rgba(255,255,255,0.08)' : 'none'}/>
        </svg>
      ),
    },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '28rem',
      paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 8,
      zIndex: 50,
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex',
        background: 'rgba(24, 23, 20, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 28,
        padding: 4,
        pointerEvents: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.14)',
      }}>
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            style={{ flex: 1, textDecoration: 'none' }}
            onClick={() => handleTap(tab.to)}
          >
            {({ isActive }) => (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 22,
                background: isActive ? 'rgba(255,255,255,0.13)' : 'transparent',
                transition: 'background 0.18s, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.40)',
                transform: bouncing === tab.to ? 'scale(0.88)' : 'scale(1)',
                position: 'relative',
              }}>
                {/* Active dot indicator */}
                <div style={{
                  position: 'absolute',
                  top: 5,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: isActive
                    ? (lastColor ?? 'linear-gradient(90deg, #FFD000, #FF0A54, #00B4D8)')
                    : 'transparent',
                  backgroundColor: isActive ? (lastColor ?? '#FFD000') : 'transparent',
                  transition: 'background-color 0.3s ease',
                  opacity: isActive ? 1 : 0,
                }} />

                {/* Icon wrapper with relative positioning for badge */}
                <div style={{ position: 'relative', marginTop: 6 }}>
                  {tab.icon(isActive)}

                  {/* Red badge dot for "Oggi" when no entry and after noon */}
                  {tab.badge && (
                    <div style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#FF3B30',
                      border: '1.5px solid rgba(24,23,20,0.9)',
                      animation: 'pulse-badge 1.5s ease-in-out infinite',
                    }} />
                  )}
                </div>

                <span style={{
                  fontSize: 8,
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}>
                  {tab.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
