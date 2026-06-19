import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, BarChart, Bar, Cell
} from 'recharts'
import { PieChart, Plus, X, Zap, ChevronDown, ChevronUp, Save, TrendingUp, TrendingDown, RefreshCw, Trash2, ImageDown, Copy, Check, Upload, FileSpreadsheet, ClipboardPaste } from 'lucide-react'
import api from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import TickerInput from '../components/TickerInput'

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
  const [trackingData, setTrackingData] = useState({})
  const [trackingLoading, setTrackingLoading] = useState({})
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const resultRef = useRef(null)
  const fileInputRef = useRef(null)

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

  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) await extractFromFile(file)
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const extractFromFile = async (file) => {
    setExtracting(true)
    setExtractError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/portfolio/extract-from-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (data.tickers?.length > 0) {
        setTickers(data.tickers.slice(0, 20))
        if (data.weights) {
          setCurrentWeights(data.weights)
          setMode('review')
        }
      } else {
        setExtractError('No se encontraron tickers en el archivo.')
      }
    } catch {
      setExtractError('Error al procesar el archivo. Intenta con otra imagen o Excel.')
    } finally {
      setExtracting(false)
    }
  }

  const loadTracking = async (portfolio) => {
    const id = portfolio.id
    setTrackingLoading(prev => ({ ...prev, [id]: true }))
    try {
      const tickers = portfolio.tickers || []
      const weights = portfolio.optimized_weights || {}
      // Fetch latest analysis for each ticker
      const results = await Promise.all(
        tickers.map(t => api.get(`/analysis/${t}/latest`).then(r => r.data).catch(() => null))
      )
      const positions = tickers.map((t, i) => {
        const analysis = results[i]
        const weight = weights[t] || (1 / tickers.length)
        return {
          ticker: t,
          weight,
          price: analysis?.price || 0,
          change: analysis?.price_change_pct || 0,
          recommendation: analysis?.recommendation || '—',
          score: analysis?.score || 0,
        }
      }).filter(p => p.price > 0)

      const portfolioChange = positions.reduce((sum, p) => sum + p.weight * p.change, 0)
      setTrackingData(prev => ({ ...prev, [id]: { positions, portfolioChange } }))
    } catch { /* ignore */ }
    finally { setTrackingLoading(prev => ({ ...prev, [id]: false })) }
  }

  const deletePortfolio = async (id) => {
    try {
      await api.delete(`/portfolio/${id}`)
      setSavedPortfolios(prev => prev.filter(p => p.id !== id))
    } catch { /* ignore */ }
  }

  const exportImage = async () => {
    if (!resultRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `portafolio-${tickers.join('-')}-${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch { /* ignore */ }
    finally { setExporting(false) }
  }

  const copyToClipboard = async () => {
    if (!resultRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
      })
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setCopied(true)
          setTimeout(() => setCopied(false), 2500)
        } catch {
          // Fallback: download if clipboard not supported
          const link = document.createElement('a')
          link.download = `portafolio-${tickers.join('-')}.png`
          link.href = URL.createObjectURL(blob)
          link.click()
        }
      }, 'image/png')
    } catch { /* ignore */ }
    finally { setExporting(false) }
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

      {/* Import from file / image */}
      <div
        className={`border-2 border-dashed rounded-2xl p-5 transition-all text-center ${dragOver ? 'border-brand bg-brand/5' : 'border-slate-700 hover:border-slate-500'}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) extractFromFile(f) }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv,image/*"
          onChange={e => { const f = e.target.files?.[0]; if (f) extractFromFile(f) }}
        />
        {extracting ? (
          <div className="flex items-center justify-center gap-2 text-brand animate-pulse">
            <span className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            Analizando con IA...
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">Importa tu portafolio desde un archivo o imagen</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-700 border border-slate-600 text-slate-300 hover:border-brand hover:text-brand transition-all text-sm"
              >
                <FileSpreadsheet size={15} />
                Excel / CSV
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-700 border border-slate-600 text-slate-300 hover:border-brand hover:text-brand transition-all text-sm"
              >
                <Upload size={15} />
                Imagen
              </button>
              <span className="flex items-center gap-1.5 text-slate-500 text-sm">
                <ClipboardPaste size={15} />
                o pega con Ctrl+V
              </span>
            </div>
            <p className="text-xs text-slate-600">Arrastra un archivo aquí · La IA extrae los tickers automáticamente</p>
          </div>
        )}
        {extractError && <p className="text-red-400 text-xs mt-2">{extractError}</p>}
      </div>

      {/* Ticker input */}
      <div className="card space-y-4">
        <form onSubmit={addTicker} className="flex gap-2">
          <TickerInput
            value={tickerInput}
            onChange={setTickerInput}
            onSelect={t => setTickerInput(t)}
            placeholder="Añadir ticker (ej: NVDA)"
            showIcon={false}
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
        <div ref={resultRef} className="space-y-5 animate-fade-in">
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

          {/* Save + Export */}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar portafolio'}
            </button>
            <button
              onClick={exportImage}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:border-brand hover:text-brand transition-all"
              title="Descargar como imagen"
            >
              <ImageDown size={16} />
              Descargar
            </button>
            <button
              onClick={copyToClipboard}
              disabled={exporting}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${copied ? 'border-emerald-500 text-emerald-400' : 'border-slate-600 text-slate-300 hover:border-brand hover:text-brand'}`}
              title="Copiar al portapapeles para pegar en WhatsApp, etc."
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {/* Saved portfolios */}
      {savedPortfolios.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Portafolios guardados</h2>
          {savedPortfolios.map(p => {
            const tracking = trackingData[p.id]
            const isLoadingTracking = trackingLoading[p.id]
            return (
              <div key={p.id} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200 font-semibold">{p.name}</span>
                    <span className="text-slate-500 text-xs ml-2">{p.created_at?.slice(0, 10)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadTracking(p)}
                      disabled={isLoadingTracking}
                      className="flex items-center gap-1.5 text-xs text-brand border border-brand/30 px-3 py-1.5 rounded-lg hover:bg-brand/10 transition-all"
                    >
                      <RefreshCw size={12} className={isLoadingTracking ? 'animate-spin' : ''} />
                      {tracking ? 'Actualizar' : 'Ver rendimiento'}
                    </button>
                    <button onClick={() => deletePortfolio(p.id)} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(p.tickers || []).map(t => (
                    <span key={t} className="font-mono text-xs bg-navy-700 border border-slate-700 px-2 py-1 rounded-lg text-slate-300">{t}</span>
                  ))}
                </div>

                {isLoadingTracking && (
                  <div className="text-center py-4 text-slate-500 text-sm animate-pulse">Cargando precios actuales...</div>
                )}

                {tracking && !isLoadingTracking && (
                  <div className="space-y-3 pt-2 border-t border-slate-700/40">
                    {/* Portfolio daily return */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Rendimiento hoy (ponderado):</span>
                      <span className={`font-bold text-lg ${tracking.portfolioChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tracking.portfolioChange >= 0 ? '+' : ''}{tracking.portfolioChange.toFixed(2)}%
                      </span>
                      {tracking.portfolioChange >= 0
                        ? <TrendingUp size={18} className="text-emerald-400" />
                        : <TrendingDown size={18} className="text-red-400" />
                      }
                    </div>

                    {/* Position breakdown */}
                    <div className="space-y-2">
                      {tracking.positions.map(pos => (
                        <div key={pos.ticker} className="flex items-center gap-3 text-sm">
                          <span
                            className="font-mono font-bold w-14 cursor-pointer hover:text-brand transition-colors"
                            onClick={() => navigate(`/analysis/${pos.ticker}`)}
                          >{pos.ticker}</span>
                          <div className="flex-1 bg-navy-700 rounded-full h-1.5">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${pos.weight * 100}%` }} />
                          </div>
                          <span className="text-slate-500 w-10 text-right text-xs">{(pos.weight * 100).toFixed(0)}%</span>
                          <span className="text-slate-300 w-20 text-right">${pos.price.toFixed(2)}</span>
                          <span className={`w-16 text-right font-medium ${pos.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pos.change >= 0 ? '+' : ''}{pos.change.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Bar chart */}
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={tracking.positions} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <XAxis dataKey="ticker" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v.toFixed(1)}%`} />
                        <Tooltip
                          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                          formatter={v => [`${v.toFixed(2)}%`, 'Cambio hoy']}
                        />
                        <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                          {tracking.positions.map((pos, i) => (
                            <Cell key={i} fill={pos.change >= 0 ? '#34d399' : '#f87171'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
