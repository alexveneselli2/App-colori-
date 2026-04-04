import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import { useMoodStore } from '../store/useMoodStore'

export default function Layout() {
  const { entries } = useMoodStore()

  const lastColor = entries[0]?.color_hex ?? null

  return (
    <div style={{
      position: 'relative',
      height: '100dvh',
      maxWidth: '28rem',
      margin: '0 auto',
      background: 'var(--color-surface)',
      overflow: 'hidden',
    }}>
      {/* Ambient mood tint — very subtle, fades from top */}
      {lastColor && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 100% 50% at 50% 0%, ${lastColor}18 0%, transparent 100%)`,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 2s ease',
        }} />
      )}

      {/*
        Scrollable content area.
        paddingBottom ensures content is ALWAYS fully visible above the nav pill —
        no page-specific class needed; this is the single source of truth.
      */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        height: '100%',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'calc(var(--nav-total) + 36px)',
      }}>
        <Outlet />
      </div>

      {/* Navigation is fixed inside this bounded container */}
      <Navigation />
    </div>
  )
}
