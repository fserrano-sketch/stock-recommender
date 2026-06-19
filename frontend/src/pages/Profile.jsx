import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Bell, Mail, LogOut, Shield } from 'lucide-react'
import api from '../lib/api'
import { isLoggedIn, getUser, clearAuth, setAuth } from '../lib/auth'

export default function Profile() {
  const navigate = useNavigate()
  const user = getUser()
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return }
    api.get('/watchlist/subscriptions').then(r => setSubs(r.data)).catch(() => {}).finally(() => setLoading(false))
    setPushEnabled('Notification' in window && Notification.permission === 'granted')
  }, [])

  const handlePushToggle = async () => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      setPushEnabled(false)
      return
    }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setPushEnabled(true)
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: null,
          })
          await api.post('/users/push-subscription', { subscription: sub.toJSON() })
        } catch { /* push not fully configured */ }
      }
    }
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const freqLabel = { daily: 'Diaria', weekly: 'Semanal', instant: 'Instantánea' }

  return (
    <div className="sm:ml-32 space-y-5 max-w-lg">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <User size={22} className="text-brand" />
        Mi Perfil
      </h1>

      {/* User info */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand/20 flex items-center justify-center text-2xl font-bold text-brand">
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-semibold text-lg">{user?.name || 'Usuario'}</div>
            <div className="text-slate-400 text-sm">{user?.email}</div>
            <div className="text-xs text-slate-600 mt-0.5">Miembro desde {user?.created_at?.slice(0, 10) || '—'}</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Bell size={18} className="text-brand" />
          Notificaciones
        </h2>

        <div className="flex items-center justify-between py-3 border-b border-slate-700/40">
          <div>
            <div className="text-slate-200 text-sm font-medium">Notificaciones push</div>
            <div className="text-xs text-slate-500">Alertas en el navegador / móvil</div>
          </div>
          <button
            onClick={handlePushToggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${pushEnabled ? 'bg-brand' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pushEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Email subscriptions */}
      <div className="card">
        <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Mail size={18} className="text-brand" />
          Suscripciones de email
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-navy-700/50 animate-pulse rounded-xl" />)}
          </div>
        ) : subs.length === 0 ? (
          <p className="text-slate-500 text-sm">No tienes suscripciones activas. Añade alertas desde el análisis de una acción o tu watchlist.</p>
        ) : (
          <div className="space-y-2">
            {subs.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-mono font-semibold text-slate-200">{s.ticker}</span>
                  <span className="ml-2 text-xs bg-navy-700 text-slate-400 px-2 py-0.5 rounded-full">
                    {freqLabel[s.frequency] || s.frequency}
                  </span>
                </div>
                <div className={`w-2 h-2 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-slate-600'}`} title={s.active ? 'Activa' : 'Inactiva'} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="card border-slate-700/20">
        <div className="flex gap-3 text-xs text-slate-500">
          <Shield size={16} className="shrink-0 mt-0.5 text-slate-600" />
          <p>Los análisis de StockRec AI son generados por inteligencia artificial y tienen fines informativos únicamente. No constituyen asesoramiento financiero, de inversión, legal o fiscal. Invierte siempre bajo tu propio criterio y consulta con un profesional financiero certificado.</p>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </div>
  )
}
