import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Zap, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import api from '../lib/api'
import RecommendationCard from '../components/RecommendationCard'
import TickerInput from '../components/TickerInput'
import GlobeHero from '../components/GlobeHero'
import MarketTicker from '../components/MarketTicker'

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
    } catch { /* ignore */ }
    finally { setFeedLoading(false) }
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

  const buys = feed.filter(f => f.recommendation === 'COMPRAR').length
  const sells = feed.filter(f => f.recommendation === 'VENDER').length
  const holds = feed.filter(f => f.recommendation === 'MANTENER').length

  return (
    <div className="sm:ml-32 -mt-6 -mx-4">
      {/* ── HERO with globe ── */}
      <div className="relative overflow-hidden" style={{ height: 420 }}>
        <GlobeHero />

        {/* Vignette so text is readable */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 40% 50%, rgba(6,13,26,0.1) 0%, rgba(6,13,26,0.65) 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #060d1a)' }} />

        {/* Hero content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border border-brand/30"
            style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            Análisis con IA en tiempo real
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 leading-tight tracking-tight drop-shadow-lg">
            Invierte con{' '}
            <span style={{ color: '#38bdf8' }}>inteligencia</span>
          </h1>
          <p className="text-slate-300 mb-7 max-w-md text-sm leading-relaxed drop-shadow">
            Análisis fundamentado en datos reales de mercado, indicadores técnicos y razonamiento IA
          </p>

          <form onSubmit={handleAnalyze} className="flex gap-3 w-full max-w-lg">
            <TickerInput
              value={ticker}
              onChange={setTicker}
              onSelect={t => setTicker(t)}
              placeholder="AAPL, TSLA, NVDA..."
              className="text-base flex-1"
            />
            <button type="submit" disabled={loading || !ticker.trim()} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              {loading
                ? <span className="w-4 h-4 border-2 border-navy-900/60 border-t-transparent rounded-full animate-spin" />
                : <><Zap size={15} />Analizar</>}
            </button>
          </form>

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          {loading && <p className="text-slate-400 text-xs mt-3 animate-pulse">Generando análisis con IA...</p>}
        </div>
      </div>

      {/* ── MARKET TICKER ── */}
      <MarketTicker />

      <div className="px-4 py-6 space-y-6">
        {/* Sentiment strip */}
        {feed.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Comprar', count: buys, color: '#34d399', Icon: TrendingUp, border: 'rgba(52,211,153,0.2)', bg: 'rgba(52,211,153,0.06)' },
              { label: 'Mantener', count: holds, color: '#fbbf24', Icon: Minus, border: 'rgba(251,191,36,0.2)', bg: 'rgba(251,191,36,0.06)' },
              { label: 'Vender', count: sells, color: '#f87171', Icon: TrendingDown, border: 'rgba(248,113,113,0.2)', bg: 'rgba(248,113,113,0.06)' },
            ].map(({ label, count, color, Icon, border, bg }) => (
              <div key={label} className="rounded-2xl p-4 text-center border" style={{ background: bg, borderColor: border }}>
                <Icon size={16} className="mx-auto mb-1.5" style={{ color }} />
                <div className="text-2xl font-black" style={{ color }}>{count}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Feed */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Filter size={14} className="text-slate-600" />
            <div className="flex rounded-xl p-0.5 gap-0.5 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${period === p.value ? 'text-navy-900 font-semibold' : 'text-slate-500 hover:text-slate-300'}`}
                  style={period === p.value ? { background: 'linear-gradient(135deg, #38bdf8, #0284c7)' } : {}}>
                  {p.label}
                </button>
              ))}
            </div>
            <select value={rec} onChange={e => setRec(e.target.value)} className="input text-xs py-1.5">
              {RECS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={sector} onChange={e => setSector(e.target.value === 'Todas' ? '' : e.target.value)} className="input text-xs py-1.5">
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Recomendaciones recientes</h2>

          {feedLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl animate-pulse border border-white/[0.04]"
                  style={{ background: 'rgba(255,255,255,0.02)', animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="text-center py-16 text-slate-600 rounded-2xl border border-white/[0.04]" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <Search size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No hay análisis para los filtros seleccionados.</p>
              <p className="text-xs mt-1 opacity-60">Usa el buscador para analizar un ticker.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {feed.map(a => <RecommendationCard key={a.id} analysis={a} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
