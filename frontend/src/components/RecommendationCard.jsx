import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { ScoreBadge } from './ScoreBadge'
import Sparkline from './Sparkline'
import { getTickerGradient, getLogoUrl } from '../lib/tickerColors'
import clsx from 'clsx'

function timeAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function TickerAvatar({ ticker, size = 44 }) {
  const [logoError, setLogoError] = useState(false)
  const logoUrl = getLogoUrl(ticker)
  const gradient = getTickerGradient(ticker)
  const letters = ticker.slice(0, 2)

  if (logoUrl && !logoError) {
    return (
      <div
        className="shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
        style={{ width: size, height: size, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <img
          src={logoUrl}
          alt={ticker}
          className="object-contain"
          style={{ width: size * 0.72, height: size * 0.72 }}
          onError={() => setLogoError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className="shrink-0 rounded-xl flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, background: gradient, fontSize: size * 0.32 }}
    >
      {letters}
    </div>
  )
}

export default function RecommendationCard({ analysis }) {
  const navigate = useNavigate()
  const up = (analysis.price_change_pct || 0) >= 0

  return (
    <div
      className="group relative flex items-center gap-4 rounded-2xl p-4 border border-white/[0.06] cursor-pointer transition-all duration-300 hover:border-white/[0.12] animate-slide-up overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}
      onClick={() => navigate(`/analysis/${analysis.ticker}`)}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(56,189,248,0.06) 0%, transparent 70%)' }} />

      {/* Logo / Avatar */}
      <TickerAvatar ticker={analysis.ticker} />

      {/* Ticker + company */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-base text-slate-100 tracking-wide">{analysis.ticker}</span>
          <span className="text-xs text-slate-500 truncate max-w-[150px]">{analysis.company_name}</span>
          {analysis.sector && (
            <span className="text-xs bg-white/[0.05] text-slate-500 px-2 py-0.5 rounded-full hidden sm:inline border border-white/[0.06]">
              {analysis.sector}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1.5">
          <ScoreBadge recommendation={analysis.recommendation} score={analysis.score} size="sm" />
          <span className="flex items-center gap-1 text-xs text-slate-600">
            <Clock size={10} />
            {timeAgo(analysis.created_at)}
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="hidden sm:block opacity-70 group-hover:opacity-100 transition-opacity">
        <Sparkline
          data={analysis.data_snapshot?.sparkline || []}
          recommendation={analysis.recommendation}
        />
      </div>

      {/* Price */}
      <div className="text-right shrink-0">
        <div className="font-mono font-semibold text-slate-100">
          ${analysis.price?.toFixed(2) ?? '—'}
        </div>
        <div className={clsx('flex items-center justify-end gap-0.5 text-xs font-medium mt-0.5', up ? 'text-emerald-400' : 'text-red-400')}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {up ? '+' : ''}{analysis.price_change_pct?.toFixed(2)}%
        </div>
      </div>
    </div>
  )
}
