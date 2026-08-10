import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

// Scroll reset lives at the router now (see ScrollToTop), so it also covers the
// standalone routes that render outside this layout.
export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas bg-grain">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
