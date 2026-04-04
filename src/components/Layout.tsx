import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import { useMoodStore } from '../store/useMoodStore'

export default function Layout() {
  const { entries } = useMoodStore()

  // Derive a subtle ambient background from the last 1-2 mood entries.
  // Changes slowly as the user's emotional palette evolves.
  const recentColors = entries.slice(0, 2).map(e => e.color_hex).filter(Boolean)
  const ambientBg = recentColors.length > 0
    ? recentColors[0]
    : null

  return (
    <div style={{
      position: 'relative',
      height: '100dvh',         // dynamic viewport height: accounts for Safari URL bar
      maxWidth: '28rem',
      margin: '0 auto',
      background: 'var(--color-surface)',
      overflow: 'hidden',
    }}>
      {/* Ambient color layer — very subtle tint from recent mood */}
      {ambientBg && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 100% 55% at 50% 0%, ${ambientBg}1A 0%, transparent 100%)`,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 2s ease',
        }} />
      )}

      {/* Scrollable content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        height: '100%',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}>
        <Outlet />
      </div>

      <Navigation />
    </div>
  )
}
