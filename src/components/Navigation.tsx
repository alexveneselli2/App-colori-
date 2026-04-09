import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useMoodStore } from '../store/useMoodStore'
import { useT } from '../lib/i18n'

export default function Navigation() {
  const t = useT()
  const { todayEntry, entries } = useMoodStore()
  const lastColor = entries[0]?.color_hex ?? null
  const [tappedTab, setTappedTab] = useState<string | null>(null)

  const tabs = [
    {
      to: '/',
      label: t.nav_today,
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="6"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.6"/>
          {active && <circle cx="10" cy="10" r="2.5" fill="var(--color-surface-raised)" fillOpacity="0.7"/>}
        </svg>
      ),
    },
    {
      to: '/history',
      label: t.nav_memory,
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2"   width="6" height="4" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
          <rect x="10" y="2"  width="8" height="4" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
          <rect x="2" y="8"   width="8" height="4" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
          <rect x="12" y="8"  width="6" height="4" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
          <rect x="2" y="14"  width="5" height="4" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
          <rect x="9" y="14"  width="9" height="4" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      to: '/stats',
      label: t.nav_stats,
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 15 L3 10 L7 10 L7 15 M8.5 15 L8.5 6 L12.5 6 L12.5 15 M14 15 L14 12 L18 12 L18 15"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.6"
            strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      to: '/export',
      label: t.nav_export,
      icon: (_active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M13 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 8H8a5 5 0 000 10h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  const showBadge = !todayEntry && new Date().getHours() >= 12

  useEffect(() => {
    if (tappedTab) {
      const timer = setTimeout(() => setTappedTab(null), 300)
      return () => clearTimeout(timer)
    }
  }, [tappedTab])

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
            onClick={() => setTappedTab(tab.to)}
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
                transition: 'background 0.18s',
                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.40)',
                position: 'relative',
                animation: tappedTab === tab.to ? 'navBounce 0.28s cubic-bezier(0.34,1.56,0.64,1)' : undefined,
              }}>
                {isActive && lastColor && (
                  <div style={{
                    position: 'absolute',
                    top: 5,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: lastColor,
                    boxShadow: `0 0 6px ${lastColor}`,
                    transition: 'background-color 0.4s ease',
                  }} />
                )}
                {tab.to === '/' && showBadge && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: '20%',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#FF0A54',
                    animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                  }} />
                )}
                <div style={{ marginTop: isActive && lastColor ? 8 : 0 }}>
                  {tab.icon(isActive)}
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

      <style>{`
        @keyframes navBounce {
          0%   { transform: scale(1); }
          30%  { transform: scale(0.85); }
          70%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
      `}</style>
    </nav>
  )
}
