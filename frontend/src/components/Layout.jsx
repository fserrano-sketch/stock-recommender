import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Star, PieChart, User, LogOut, TrendingUp } from 'lucide-react'
import { clearAuth, getUser, isLoggedIn } from '../lib/auth'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/watchlist', icon: Star, label: 'Watchlist' },
  { to: '/portfolio', icon: PieChart, label: 'Portafolio' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const user = getUser()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-navy-900/90 backdrop-blur-md border-b border-slate-700/40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <TrendingUp size={22} className="text-brand" />
            <span className="font-bold text-lg text-slate-100">StockRec <span className="text-brand">AI</span></span>
          </div>

          <div className="flex items-center gap-1">
            {isLoggedIn() ? (
              <>
                <span className="text-slate-400 text-sm hidden sm:block mr-2">{user?.name || user?.email}</span>
                <button onClick={handleLogout} className="btn-ghost p-2 rounded-xl">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/login')} className="btn-primary text-sm py-2">
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="sticky bottom-0 bg-navy-900/95 backdrop-blur-md border-t border-slate-700/40 sm:hidden">
        <div className="flex">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center gap-0.5 py-3 text-xs transition-colors',
                  isActive ? 'text-brand' : 'text-slate-500 hover:text-slate-300'
                )
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Side nav (desktop) */}
      <nav className="hidden sm:flex fixed left-4 top-1/2 -translate-y-1/2 flex-col gap-1 z-40">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all',
                isActive
                  ? 'bg-brand/20 text-brand border border-brand/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-navy-800'
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
