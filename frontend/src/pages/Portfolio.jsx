import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { PieChart, Plus, X, Zap, ChevronDown, ChevronUp, Save } from 'lucide-react'
import api from '../lib/api'
import { isLoggedIn } from '../lib/auth'

const METHOD_LABELS = { markowitz: 'Mínima Varianza', sharpe: 'Máx Sharpe', correlation: 'Correlación' }
const METHOD_COLORS = { markowitz: '#38bdf8', sharpe: '#22c55e', blended: '#a78bfa' }

function WeightBar({ ticker, weight, color = '#38bdf8' }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-sm text-slate-300 w-16 shrink-0">{ticker}</span>
      <div className="flex-1 bg-navy-700 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${weight * 100}%`, background: color }} />
      </div>
      <span className="text-sm text-slate-300 w-12 text-right">{(weight * 100).toFixed(1)}%</span>
    </div>
  )
}

function CorrelationMatrix({ matrix }) {
  const tickers = Object.keys(matrix)
  if (!tickers.length) return null

  const getColor = (v) => {
    if (v >= 0.7) return 'bg-red-500/60'
    if (v >= 0.4) return 'bg-amber-500/40'
    if (v >= 0) return 'bg-emerald-500/20'
    return 'bg-blue-500/20'
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full">
        <thead>
          <tr>
            <th className="text-slate-600 p-1"></th>
            {tickers.map(t => <th key={t} className="text-slate-400 p-1 font-mono">{t}</th>)}
          </tr>
        </thead>
        <tbody>
          {tickers.map(r => (
            <tr key={r}>
              <td className="text-slate-400 p-1 font-mono font-semibold">{r}</td>
              {tickers.map(c => (
                <td key={c} className={`p-1 text-center rounded ${getColor(matrix[r]?.[c] ?? 0)}`}>
                  {matrix[r]?.[c]?.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-4 mt-2 text-xs text-slate-500">
        <span><span className="inline-block w-3 h-3 bg-red-500/60 rounded mr-1"></span>Alta correlación (&gt;0.7)</span>
        <span><span className="inline-block w-3 h-3 bg-emerald-500/20 rounded mr-1"></span>Baja correlación</span>
      </div>
    </div>
  )
}

export default function Portfolio() {
  const navigate = useNavigate()
  const [tickers, setTickers] = useState([])
  const [tickerInput, setTickerInput] = useState('')
  const [currentWeights, setCurrentWeights] = useState({})
  const [mode, setMode] = useState('build') // build | review
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedPortfolios, setSavedPortfolios] = useState([])
  const [activeTab, setActiveTab] = useState('markowitz')
  const [showCorr, setShowCorr] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return }
    api.get('/portfolio/').then(r => setSavedPortfolios(r.data)).catch(() => {})
  }, [])

  const addTicker = (e) => {
    e.preventDefault()
    const t = tickerInput.trim().toUpperCase()
    if (!t || tickers.includes(t) || tickers.length >= 20) return
    setTickers(prev => [...prev, t])
    if (mode === 'review') setCurrentWeights(prev => ({ ...prev, [t]: 0 }))
    setTickerInput('')
  }

  const removeTicker = (t) => {
    setTickers(prev => prev.filter(x => x !== t))
    setCurrentWeights(prev => { const n = { ...prev }; delete n[t]; return n })
  }

  const handleOptimize = async () => {
    if (tickers.length < 2) { setError('Necesitas al menos 2 activos'); return }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const payload = {
        tickers,
        current_weights: mode === 'review' ? currentWeights : null,
      }
      const { data } = await api.post('/portfolio/optimize', payload)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al optimizar el portafolio')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    try {
      const payload = {
        name: `Portafolio ${new Date().toLocaleDateString('es')}`,
        tickers,
        current_weights: mode === 'review' ? currentWeights : null,
      }
      await api.post('/portfolio/', payload)
      const r = await api.get('/portfolio/')
      setSavedPortfolios(r.data)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const totalWeight = Object.values(currentWeights).reduce((a, b) => a + Number(b), 0)
  const activeOpt = result?.[activeTab] || {}

  return (
    <div className="sm:ml-32 space-y-5">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <PieChart size={22} className="text-brand" />
        Análisis de Portafolio
      </h1>

      {/* Mode toggle */}
      <div className="flex bg-navy-800 border border-slate-700/40 rounded-xl p-1 gap-1 w-fit">
        <button
          onClick={() => { setMode('build'); setCurrentWeights({}); setResult(null) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'build' ? 'bg-brand text-navy-900' : 'text-slate-400 hover:text-slate-200'}`}
        >
          🏗 Construir portafolio
        </button>
        <button
          onClick={() => { setMode('review'); setResult(null) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'review' ? 'bg-brand text-navy-900' : 'text-slate-400 hover:text-slate-200'}`}
        >
          🔍 Revisar portafolio existente
        </button>
      </div>

      {/* Ticker input */}
      <div className="card space-y-4">
        <form onSubmit={addTicker} className="flex gap-2">
          <input
            className="input flex-1 uppercase font-mono"
            placeholder="Añadir ticker (ej: NVDA)"
            value={tickerInput}
            onChange={e => setTickerInput(e.target.value.toUpperCase())}
            maxLength={10}
          />
          <button type="submit" disabled={!tickerInput.trim() || tickers.length >= 20} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} /> Añadir
          </button>
        </form>

        {/* Ticker chips */}
        {tickers.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {tickers.map(t => (
                <div key={t} className="flex items-center gap-2 bg-navy-700 border border-slate-600 rounded-xl px-3 py-1.5">
                  <span className="font-mono font-semibold text-sm">{t}</span>
                  {mode === 'review' && (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="w-14 bg-navy-800 text-center text-sm rounded-lg px-1 py-0.5 border border-slate-600 text-slate-200"
                      placeholder="%"
                      value={currentWeights[t] !== undefined ? Math.round(currentWeights[t] * 100) : ''}
                      onChange={e => setCurrentWeights(prev => ({ ...prev, [t]: Number(e.target.value) / 100 }))}
                    />
                  )}
                  <button onClick={() => removeTicker(t)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {mode === 'review' && (
              <div className={`text-sm ${Math.abs(totalWeight - 1) > 0.01 ? 'text-amber-400' : 'text-emerald-400'}`}>
                Total: {(totalWeight * 100).toFixed(1)}%
                {Math.abs(totalWeight - 1) > 0.01 && ' ← debe sumar 100%'}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleOptimize}
          disabled={loading || tickers.length < 2}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
              Optimizando con 3 metodologías...
            </>
          ) : (
            <>
              <Zap size={16} />
              Optimizar portafolio
            </>
          )}
        </button>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5 animate-fade-in">
          {/* AI Summary */}
          {result.ai_analysis && (
            <div className="card bg-brand/5 border-brand/20 space-y-3">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-brand">Análisis IA del portafolio</h2>
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs bg-navy-700 px-2 py-1 rounded-full text-slate-400">
                    {result.ai_analysis.risk_level}
                  </span>
                  <span className="text-xs bg-navy-700 px-2 py-1 rounded-full text-slate-400">
                    Diversificación: {result.ai_analysis.diversification_score}/100
                  </span>
                </div>
              </div>
              <p className="text-slate-300 italic">"{result.ai_analysis.summary}"</p>
              <ul className="space-y-2">
                {result.ai_analysis.bullets?.map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-slate-300 text-sm">
                    <span className="text-brand shrink-0 mt-0.5">▸</span>
                    {b}
                  </li>
                ))}
              </ul>
              {result.ai_analysis.rebalancing_actions?.length > 0 && (
                <div className="pt-2 border-t border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-2">Acciones de rebalanceo sugeridas:</p>
                  <ul className="space-y-1">
                    {result.ai_analysis.rebalancing_actions.map((a, i) => (
                      <li key={i} className="text-sm text-amber-300 flex gap-2">
                        <span>→</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Method tabs */}
          <div className="card">
            <div className="flex gap-1 mb-5 bg-navy-700/50 p-1 rounded-xl">
              {['markowitz', 'sharpe'].map(m => (
                <button
                  key={m}
                  onClick={() => setActiveTab(m)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === m ? 'bg-navy-800 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{((activeOpt.expected_return || 0) * 100).toFixed(1)}%</div>
                <div className="text-xs text-slate-500">Retorno esperado</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{((activeOpt.volatility || 0) * 100).toFixed(1)}%</div>
                <div className="text-xs text-slate-500">Volatilidad</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-brand">{(activeOpt.sharpe || 0).toFixed(2)}</div>
                <div className="text-xs text-slate-500">Sharpe Ratio</div>
              </div>
            </div>

            {/* Weights */}
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Pesos óptimos</h3>
            <div className="space-y-2">
              {Object.entries(activeOpt.weights || {})
                .sort(([, a], [, b]) => b - a)
                .map(([t, w]) => (
                  <WeightBar key={t} ticker={t} weight={w} color={METHOD_COLORS[activeTab]} />
                ))}
            </div>

            {/* Rebalancing vs current */}
            {result.rebalancing?.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-700/40">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Rebalanceo recomendado</h3>
                <div className="space-y-2">
                  {result.rebalancing.map(r => (
                    <div key={r.ticker} className="flex items-center gap-3 text-sm">
                      <span className="font-mono w-16">{r.ticker}</span>
                      <span className="text-slate-500">{(r.current * 100).toFixed(1)}%</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-slate-300">{(r.optimal * 100).toFixed(1)}%</span>
                      <span className={`ml-auto font-semibold ${r.action === 'COMPRAR' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.action} {Math.abs(r.change * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Efficient frontier */}
          {result.efficient_frontier?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-slate-200 mb-4">Frontera Eficiente</h2>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="volatility"
                    name="Volatilidad"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    label={{ value: 'Riesgo (volatilidad)', fill: '#64748b', fontSize: 11, position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    dataKey="return"
                    name="Retorno"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    label={{ value: 'Retorno esperado', fill: '#64748b', fontSize: 11, angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    formatter={(v, n) => [`${(v * 100).toFixed(2)}%`, n === 'return' ? 'Retorno' : 'Volatilidad']}
                  />
                  <Scatter
                    data={result.efficient_frontier}
                    fill="#38bdf8"
                    opacity={0.7}
                    line={{ stroke: '#38bdf8', strokeWidth: 2 }}
                    lineType="fitting"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Correlation matrix */}
          <div className="card">
            <button
              onClick={() => setShowCorr(!showCorr)}
              className="flex items-center justify-between w-full text-left"
            >
              <h2 className="font-semibold text-slate-200">Matriz de correlación</h2>
              {showCorr ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
            </button>
            {showCorr && (
              <div className="mt-4">
                <CorrelationMatrix matrix={result.correlation?.correlation_matrix || {}} />
                {result.correlation?.high_correlation_pairs?.length > 0 && (
                  <div className="mt-3 text-sm text-amber-400">
                    ⚠ Pares con alta correlación: {result.correlation.high_correlation_pairs.map(p => p.pair.join('/') + ` (${p.correlation})`).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar portafolio'}
          </button>
        </div>
      )}

      {/* Saved portfolios */}
      {savedPortfolios.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-300 mb-3">Portafolios guardados</h2>
          <div className="space-y-2">
            {savedPortfolios.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0">
                <div>
                  <span className="text-slate-200 font-medium">{p.name}</span>
                  <span className="text-slate-500 text-sm ml-2">{p.tickers?.join(', ')}</span>
                </div>
                <span className="text-xs text-slate-600">{p.created_at?.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
