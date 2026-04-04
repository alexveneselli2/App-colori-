import { NavLink } from 'react-router-dom'

export default function Navigation() {
  return (
    <nav className="border-t border-subtle bg-surface flex-shrink-0">
      <div className="flex">

        {/* Today */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 transition-colors text-[10px] font-medium tracking-widest uppercase ${
              isActive ? 'text-foreground' : 'text-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle
                  cx="9" cy="9" r="5.5"
                  fill={isActive ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <span>Oggi</span>
            </>
          )}
        </NavLink>

        {/* History */}
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 transition-colors text-[10px] font-medium tracking-widest uppercase ${
              isActive ? 'text-foreground' : 'text-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1"
                  fill={isActive ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="1.5" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1"
                  fill={isActive ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="1.5" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1"
                  fill={isActive ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="1.5" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1"
                  fill={isActive ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Memoria</span>
            </>
          )}
        </NavLink>

        {/* Export */}
        <NavLink
          to="/export"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 transition-colors text-[10px] font-medium tracking-widest uppercase ${
              isActive ? 'text-foreground' : 'text-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 2v9M6 9l3 3 3-3M3 15h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Esporta</span>
            </>
          )}
        </NavLink>

      </div>
    </nav>
  )
}
