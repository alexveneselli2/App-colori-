import { NavLink } from 'react-router-dom'

const tabs = [
  {
    to: '/',
    label: 'Oggi',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="6"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'Memoria',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.6"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.6"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.6"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    to: '/stats',
    label: 'Analisi',
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
    label: 'Esporta',
    icon: (_active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v9M7 10l3 3 3-3M4 16h12"
          stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function Navigation() {
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
              }}>
                {tab.icon(isActive)}
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
