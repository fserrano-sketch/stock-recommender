import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Plus, Trash2, RefreshCw, Bell } from 'lucide-react'
import api from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { ScoreBadge } from '../components/ScoreBadge'

export default function Watchlist() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTicker, setNewTicker] = useState('')
  const [adding, setAdding] = useState(false)
  const [analyzing, setAnalyzing] = useState(null)

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return }
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [wRes, sRes] = await Promise.all([
        api.get('/watchlist/'),
        api.get('/watchlist/subscriptions'),
      ])
      setItems(wRes.data)
      setSubs(sRes.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const addTicker = async (e) => {
    e.preventDefault()
    if (!newTicker.trim()) return
    setAdding(true)
    try {
      await api.post('/watchlist/', { ticker: newTicker.trim().toUpperCase() })
      setNewTicker('')
      load()
    } catch { /* ignore */ }
    finally { setAdding(false) }
  }

  const remove = async (ticker) => {
    await api.delete(`/watchlist/${ticker}`)
    setItems(prev => prev.filter(i => i.ticker !== ticker))
  }

  const refreshAnalysis = async (ticker) => {
    setAnalyzing(ticker)
    try {
      await api.post(`/analysis/${ticker}`)
      load()
    } catch { /* ignore */ }
    finally { setAnalyzing(null) }
  }

  const toggleSub = async (ticker) => {
    const existing = subs.find(s => s.ticker === ticker)
    if (existing) {
      await api.delete(`/watchlist/subscriptions/${ticker}`)
      setSubs(prev => prev.filter(s => s.ticker !== ticker))
    } else {
      await api.post('/watchlist/subscriptions', { ticker, frequency: 'daily' })
      setSubs(prev => [...prev, { ticker, frequency: 'daily', active: true }])
    }
  }

  if (loading) return (
    <div className="sm:ml-32 space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-navy-700/50" />)}
    </div>
  )

  return (
    <div className="sm:ml-32 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star size={22} className="text-amber-400" />
          Mi Watchlist
        </h1>
      </div>

      {/* Add ticker */}
      <form onSubmit={addTicker} className="flex gap-2">
        <input
          className="input flex-1 uppercase font-mono"
          placeholder="Añadir ticker (ej: GOOGL)"
          value={newTicker}
          onChange={e => setNewTicker(e.target.value.toUpperCase())}
          maxLength={10}
        />
        <button type="submit" disabled={adding || !newTicker.trim()} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} />
          Añadir
        </button>
      </form>

      {/* List */}
      {items.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">
          <Star size={40} className="mx-auto mb-3 opacity-30" />
          <p>Tu watchlist está vacía.</p>
          <p className="text-sm mt-1">Añade tickers para hacer seguimiento de recomendaciones.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const la = item.latest_analysis
            const isSub = subs.some(s => s.ticker === item.ticker)

            return (
              <div key={item.id} className="card flex items-center gap-4">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/analysis/${item.ticker}`)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg">{item.ticker}</span>
                    {la ? (
                      <>
                        <ScoreBadge recommendation={la.recommendation} score={la.score} size="sm" />
                        <span className="text-slate-500 text-sm">${la.price?.toFixed(2)}</span>
                        <span className={`text-sm ${(la.price_change_pct || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {(la.price_change_pct || 0) >= 0 ? '+' : ''}{la.price_change_pct?.toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-600">Sin análisis aún</span>
                    )}
                  </div>
                  {la && <div className="text-xs text-slate-600 mt-0.5">Actualizado: {la.created_at?.slice(0, 10)}</div>}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleSub(item.ticker)}
                    className={`p-2 rounded-xl transition-all ${isSub ? 'text-brand bg-brand/10' : 'text-slate-500 hover:text-brand'}`}
                    title={isSub ? 'Desuscribirse de alertas' : 'Suscribirse a alertas diarias'}
                  >
                    <Bell size={16} fill={isSub ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => refreshAnalysis(item.ticker)}
                    disabled={analyzing === item.ticker}
                    className="p-2 rounded-xl text-slate-500 hover:text-brand transition-all"
                    title="Actualizar análisis"
                  >
                    <RefreshCw size={16} className={analyzing === item.ticker ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={() => remove(item.ticker)}
                    className="p-2 rounded-xl text-slate-600 hover:text-red-400 transition-all"
                    title="Eliminar de watchlist"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
