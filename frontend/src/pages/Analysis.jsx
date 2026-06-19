import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { ArrowLeft, Star, Bell, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import api from '../lib/api'
import { ScoreBadge, ScoreBar } from '../components/ScoreBadge'
import { isLoggedIn } from '../lib/auth'

function MetricCard({ label, value, sub }) {
  return (
    <div className="card text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="font-semibold text-slate-100 text-sm">{value ?? '—'}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Analysis() {
  const { ticker } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inWatchlist, setInWatchlist] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Try latest cached first, then run fresh analysis if not found
        let res
        try {
          res = await api.get(`/analysis/${ticker}/latest`)
          // Enrich with fresh stock_data for the detail view
          const fresh = await api.post(`/analysis/${ticker}`)
          setData(fresh.data)
        } catch {
          const fresh = await api.post(`/analysis/${ticker}`)
          setData(fresh.data)
        }

        const hist = await api.get(`/analysis/${ticker}/history`)
        setHistory(hist.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al cargar el análisis')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ticker])

  const handleWatchlist = async () => {
    if (!isLoggedIn()) { navigate('/login'); return }
    try {
      if (inWatchlist) {
        await api.delete(`/watchlist/${ticker}`)
        setInWatchlist(false)
      } else {
        await api.post('/watchlist/', { ticker })
        setInWatchlist(true)
      }
    } catch { /* ignore */ }
  }

  const handleSubscribe = async () => {
    if (!isLoggedIn()) { navigate('/login'); return }
    try {
      if (subscribed) {
        await api.delete(`/watchlist/subscriptions/${ticker}`)
        setSubscribed(false)
      } else {
        await api.post('/watchlist/subscriptions', { ticker, frequency: 'daily' })
        setSubscribed(true)
      }
    } catch { /* ignore */ }
  }

  if (loading) return (
    <div className="sm:ml-32 space-y-4">
      <div className="card h-48 animate-pulse bg-navy-700/50" />
      <div className="card h-64 animate-pulse bg-navy-700/50" />
      <div className="card h-32 animate-pulse bg-navy-700/50" />
    </div>
  )

  if (error) return (
    <div className="sm:ml-32 card text-center py-16 text-red-400">
      <AlertTriangle size={40} className="mx-auto mb-3" />
      <p>{error}</p>
      <button onClick={() => navigate('/')} className="btn-ghost mt-4">← Volver</button>
    </div>
  )

  if (!data) return null

  const sd = data.stock_data || {}
  const up = (sd.price_change_pct || 0) >= 0
  const recColor = data.recommendation === 'COMPRAR' ? '#22c55e' : data.recommendation === 'VENDER' ? '#ef4444' : '#f59e0b'

  const chartData = history.map(h => ({ date: h.date, price: h.close }))

  return (
    <div className="sm:ml-32 space-y-5 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate('/')} className="btn-ghost -ml-2 flex items-center gap-1.5 text-slate-400">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Header card */}
      <div className="card border-l-4" style={{ borderLeftColor: recColor }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{data.ticker}</h1>
              <ScoreBadge recommendation={data.recommendation} score={data.score} size="lg" />
            </div>
            <p className="text-slate-400 mt-1">{sd.company_name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {sd.sector && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-400">{sd.sector}</span>}
              {sd.industry && <span className="text-xs text-slate-600">{sd.industry}</span>}
              {data.time_horizon && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock size={12} /> {data.time_horizon}
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-mono font-bold">${sd.price?.toFixed(2)}</div>
            <div className={`flex items-center justify-end gap-1 text-lg font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {up ? '+' : ''}{sd.price_change_pct?.toFixed(2)}%
            </div>
            {sd.target_price && (
              <div className="text-xs text-slate-500 mt-1">
                Objetivo: ${sd.target_price} ({sd.analyst_count} analistas)
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <ScoreBar score={data.score} recommendation={data.recommendation} />
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          <button onClick={handleWatchlist} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-all ${inWatchlist ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}>
            <Star size={14} fill={inWatchlist ? 'currentColor' : 'none'} />
            {inWatchlist ? 'En watchlist' : 'Añadir a watchlist'}
          </button>
          <button onClick={handleSubscribe} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-all ${subscribed ? 'bg-brand/20 border-brand/40 text-brand' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}>
            <Bell size={14} fill={subscribed ? 'currentColor' : 'none'} />
            {subscribed ? 'Suscrito (diario)' : 'Suscribirse a alertas'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="card bg-brand/5 border-brand/20">
          <p className="text-slate-300 italic">"{data.summary}"</p>
        </div>
      )}

      {/* Price chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Precio histórico (1 año)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={recColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={recColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: recColor }}
                formatter={v => [`$${v.toFixed(2)}`, 'Precio']}
              />
              <Area type="monotone" dataKey="price" stroke={recColor} strokeWidth={2} fill="url(#priceGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Bullets */}
      <div className="card">
        <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <CheckCircle size={18} className="text-brand" />
          Argumentos del análisis
        </h2>
        <ul className="space-y-3">
          {(data.bullets || []).map((b, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-brand/20 text-brand text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
              <span className="text-slate-300 leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Risks */}
      {data.risks?.length > 0 && (
        <div className="card border-amber-500/20">
          <h2 className="font-semibold text-amber-400 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            Riesgos a considerar
          </h2>
          <ul className="space-y-2">
            {data.risks.map((r, i) => (
              <li key={i} className="flex gap-3 text-slate-400">
                <span className="text-amber-500 mt-0.5">⚠</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key metrics grid */}
      <div>
        <h2 className="font-semibold text-slate-200 mb-3">Métricas clave</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          <MetricCard label="P/E" value={sd.pe_ratio?.toFixed(1)} sub="trailing" />
          <MetricCard label="P/E Fwd" value={sd.forward_pe?.toFixed(1)} sub="forward" />
          <MetricCard label="P/B" value={sd.pb_ratio?.toFixed(2)} />
          <MetricCard label="EV/EBITDA" value={sd.ev_ebitda?.toFixed(1)} />
          <MetricCard label="Margen neto" value={sd.profit_margin != null ? `${(sd.profit_margin * 100).toFixed(1)}%` : null} />
          <MetricCard label="ROE" value={sd.roe != null ? `${(sd.roe * 100).toFixed(1)}%` : null} />
          <MetricCard label="Crec. ingresos" value={sd.revenue_growth != null ? `${(sd.revenue_growth * 100).toFixed(1)}%` : null} />
          <MetricCard label="Deuda/Pat." value={sd.debt_to_equity?.toFixed(2)} />
          <MetricCard label="Beta" value={sd.beta?.toFixed(2)} />
          <MetricCard label="RSI (14)" value={sd.rsi} />
          <MetricCard label="Máx 52s" value={sd['52w_high'] ? `$${sd['52w_high']?.toFixed(2)}` : null} />
          <MetricCard label="Mín 52s" value={sd['52w_low'] ? `$${sd['52w_low']?.toFixed(2)}` : null} />
        </div>
      </div>

      {/* Recent news */}
      {data.news?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Noticias recientes</h2>
          <div className="space-y-3">
            {data.news.map((n, i) => (
              <div key={i} className="border-b border-slate-700/40 last:border-0 pb-3 last:pb-0">
                <p className="text-slate-300 text-sm font-medium">{n.title}</p>
                <p className="text-xs text-slate-600 mt-1">{n.source} · {n.published?.slice(0, 10)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-600 text-center pb-4">
        Este análisis es generado por IA y no constituye asesoramiento financiero. Consulta con un profesional antes de invertir.
      </p>
    </div>
  )
}
