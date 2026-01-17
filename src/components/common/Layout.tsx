import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isPaintMode = location.pathname.startsWith('/paint/')

  // Don't show navigation in paint mode
  if (isPaintMode) {
    return <main className="h-full">{children}</main>
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-primary-50 to-white">
      {/* Header */}
      <header className="flex-shrink-0 bg-white shadow-sm border-b border-primary-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <h1 className="text-xl font-bold text-primary-600">Color by Number</h1>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 bg-white border-t border-primary-100 safe-area-bottom">
        <div className="flex justify-around max-w-md mx-auto">
          <NavLink to="/" icon="🖼️" label="Gallery" active={location.pathname === '/'} />
          <NavLink to="/my-gallery" icon="📁" label="My Art" active={location.pathname === '/my-gallery'} />
        </div>
      </nav>
    </div>
  )
}

interface NavLinkProps {
  to: string
  icon: string
  label: string
  active: boolean
}

function NavLink({ to, icon, label, active }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center py-3 px-6 transition-colors ${
        active
          ? 'text-primary-600'
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}
