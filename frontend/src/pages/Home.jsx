import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Zap, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import api from '../lib/api'
import RecommendationCard from '../components/RecommendationCard'
import TickerInput from '../components/TickerInput'

const SECTORS = ['Todas', 'Technology', 'Healthcare', 'Financials', 'Energy', 'Consumer Discretionary', 'Industrials', 'Communication Services']
const PERIODS = [{ value: 'today', label: 'Hoy' }, { value: '7d', label: '7 días' }, { value: 'all', label: 'Todo' }]
const RECS = [{ value: '', label: 'Todas' }, { value: 'COMPRAR', label: '🟢 Comprar' }, { value: 'VENDER', label: '🔴 Vender' }, { value: 'MANTENER', label: '🟡 Mantener' }]

export default function Home() {
  const navigate = useNavigate()
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feed, setFeed] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [sector, setSector] = useState('')
  const [period, setPeriod] = useState('today')
  const [rec, setRec] = useState('')

  const loadFeed = useCallback(async () => {
    setFeedLoading(true)
    try {
      const params = new URLSearchParams()
      if (sector && sector !== 'Todas') params.set('sector', sector)
      if (rec) params.set('recommendation', rec)
      if (period !== 'all') params.set('period', period)
      params.set('limit', '20')
      const { data } = await api.get(`/analysis/?${params}`)
      setFeed(data)
    } catch {
      /* ignore */
    } finally {
      setFeedLoading(false)
    }
  }, [sector, period, rec])

  useEffect(() => { loadFeed() }, [loadFeed])

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!ticker.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.post(`/analysis/${ticker.trim().toUpperCase()}`)
      navigate(`/analysis/${ticker.trim().toUpperCase()}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al analizar. Verifica el ticker.')
      setLoading(false)
    }
  }

  // Stats from feed
  const buys = feed.filter(f => f.recommendation === 'COMPRAR').length
  const sells = feed.filter(f => f.recommendation === 'VENDER').length
  const holds = feed.filter(f => f.recommendation === 'MANTENER').length

  return (
    <div className="space-y-6 sm:ml-32">
      {/* Hero search */}
      <div className="card bg-gradient-to-br from-navy-800 to-navy-900 border-brand/20">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Análisis de acciones con <span className="text-brand">IA</span>
          </h1>
          <p className="text-slate-400">Ingresa cualquier ticker y obtén recomendaciones fundamentadas en segundos</p>
        </div>

        <form onSubmit={handleAnalyze} className="flex gap-3 max-w-xl mx-auto">
          <TickerInput
            value={ticker}
            onChange={setTicker}
            onSelect={t => { setTicker(t) }}
            placeholder="AAPL, TSLA, MSFT..."
            className="text-lg"
          />
          <button type="submit" disabled={loading || !ticker.trim()} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                Analizando...
              </span>
            ) : (
              <>
                <Zap size={16} />
                Analizar
              </>
            )}
          </button>
        </form>

        {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}

        {loading && (
          <div className="text-center mt-4 text-slate-400 text-sm animate-pulse">
            Recopilando datos de mercado y generando análisis con IA...
          </div>
        )}
      </div>

      {/* Market sentiment strip */}
      {feed.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <TrendingUp size={20} className="text-emerald-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-400">{buys}</div>
            <div className="text-xs text-slate-500">Comprar</div>
          </div>
          <div className="card text-center">
            <Minus size={20} className="text-amber-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-amber-400">{holds}</div>
            <div className="text-xs text-slate-500">Mantener</div>
          </div>
          <div className="card text-center">
            <TrendingDown size={20} className="text-red-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-red-400">{sells}</div>
            <div className="text-xs text-slate-500">Vender</div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Filter size={16} className="text-slate-500" />

          {/* Period */}
          <div className="flex bg-navy-800 border border-slate-700/40 rounded-xl p-0.5 gap-0.5">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p.value ? 'bg-brand text-navy-900' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Recommendation filter */}
          <select
            value={rec}
            onChange={e => setRec(e.target.value)}
            className="input text-sm py-1.5 pr-8"
          >
            {RECS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          {/* Sector filter */}
          <select
            value={sector}
            onChange={e => setSector(e.target.value === 'Todas' ? '' : e.target.value)}
            className="input text-sm py-1.5 pr-8"
          >
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <h2 className="text-lg font-semibold text-slate-200 mb-3">
          Recomendaciones recientes
        </h2>

        {feedLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card h-20 animate-pulse bg-navy-700/50" />
            ))}
          </div>
        ) : feed.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay análisis para los filtros seleccionados.</p>
            <p className="text-sm mt-1">Usa el buscador para analizar un ticker.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.map(a => <RecommendationCard key={a.id} analysis={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}
