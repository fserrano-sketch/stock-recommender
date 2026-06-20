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
]

export default function TickerStrip() {
  const [tickers, setTickers] = useState(FALLBACK)

  useEffect(() => {
    api.get('/analysis/?limit=8&period=7d')
      .then(r => {
        if (r.data?.length >= 4) {
          setTickers(r.data.map(a => ({
            ticker: a.ticker,
            price: a.price,
            change: a.price_change_pct || 0,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const items = [...tickers, ...tickers]

  return (
    <div className="overflow-hidden border-b border-white/[0.06] py-2"
      style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="flex gap-8 animate-ticker whitespace-nowrap">
        {items.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs font-mono shrink-0">
            <span className="font-bold text-slate-200">{t.ticker}</span>
            <span className="text-slate-400">${t.price?.toFixed(2)}</span>
            <span className={`flex items-center gap-0.5 ${t.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {t.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {t.change >= 0 ? '+' : ''}{t.change?.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
