import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import api from '../lib/api'

const FALLBACK = [
  { ticker: 'AAPL', price: 213.49, change: 1.23 },
  { ticker: 'NVDA', price: 875.40, change: 2.95 },
  { ticker: 'MSFT', price: 379.40, change: 0.13 },
  { ticker: 'TSLA', price: 248.20, change: -1.84 },
  { ticker: 'AMZN', price: 184.70, change: 0.67 },
  { ticker: 'META', price: 498.30, change: 1.45 },
  { ticker: 'GOOGL', price: 162.80, change: -0.32 },
  { ticker: 'JPM', price: 196.50, change: 0.88 },
  { ticker: 'NFLX', price: 625.10, change: -0.54 },
  { ticker: 'AMD', price: 158.20, change: 3.12 },
]

export default function MarketTicker() {
  const [items, setItems] = useState(FALLBACK)

  useEffect(() => {
    api.get('/analysis/?limit=12&period=7d')
      .then(r => { if (r.data?.length >= 4) setItems(r.data.map(a => ({ ticker: a.ticker, price: a.price, change: a.price_change_pct || 0 }))) })
      .catch(() => {})
  }, [])

  const doubled = [...items, ...items]

  return (
    <div className="relative overflow-hidden py-2.5 border-y border-white/[0.06]"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(6,13,26,0.9), transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgba(6,13,26,0.9), transparent)' }} />

      <div className="flex gap-10 animate-ticker whitespace-nowrap">
        {doubled.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs font-mono shrink-0">
            <span className="font-bold text-slate-200 tracking-wider">{t.ticker}</span>
            <span className="text-slate-400">${t.price?.toFixed(2)}</span>
            <span className={`flex items-center gap-0.5 font-semibold ${t.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {t.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {t.change >= 0 ? '+' : ''}{t.change?.toFixed(2)}%
            </span>
            <span className="text-slate-700">|</span>
          </span>
        ))}
      </div>
    </div>
  )
}
