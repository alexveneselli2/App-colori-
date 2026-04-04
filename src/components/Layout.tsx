import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-surface overflow-hidden">
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </main>
      <Navigation />
    </div>
  )
}
