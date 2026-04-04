import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'

export default function Layout() {
  return (
    <div className="relative min-h-screen max-w-md mx-auto bg-surface">
      <div className="scroll-main h-screen">
        <Outlet />
      </div>
      <Navigation />
    </div>
  )
}
