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
    <div className="min-h-screen flex flex-col relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.03) 0%, transparent 70%)' }} />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06]"
        style={{ background: 'rgba(6, 13, 26, 0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #38bdf8, #0284c7)', boxShadow: '0 0 16px rgba(56,189,248,0.4)' }}>
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">
              <span className="text-slate-100">StockRec</span>
              <span className="ml-1" style={{ background: 'linear-gradient(135deg, #38bdf8, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn() ? (
              <>
                <div className="hidden sm:flex items-center gap-2 mr-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 40%, #0284c7 100%)', color: '#0a1628', boxShadow: '0 0 18px rgba(56,189,248,0.6), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                    {(user?.name || user?.email || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-slate-400 text-sm">{user?.name || user?.email}</span>
                </div>
                <button onClick={handleLogout} className="btn-ghost p-2 rounded-xl">
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/login')} className="btn-primary text-sm py-2">
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
        <div className="glow-line" />
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 relative z-10">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="sticky bottom-0 border-t border-white/[0.06] sm:hidden z-50"
        style={{ background: 'rgba(6, 13, 26, 0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="flex">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center gap-0.5 py-3 text-xs transition-all duration-200',
                  isActive ? 'text-brand' : 'text-slate-600 hover:text-slate-400'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={clsx('p-1.5 rounded-lg transition-all', isActive && 'bg-brand/10')}>
                    <Icon size={18} />
                  </div>
                  <span>{label}</span>
                </>
              )}
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
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                isActive
                  ? 'text-brand border border-brand/20'
                  : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.04]'
              )
            }
            style={({ isActive }) => isActive ? { background: 'rgba(56,189,248,0.08)' } : {}}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
