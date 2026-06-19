import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { ScoreBadge } from './ScoreBadge'
import Sparkline from './Sparkline'
import clsx from 'clsx'

function timeAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default function RecommendationCard({ analysis }) {
  const navigate = useNavigate()
  const up = (analysis.price_change_pct || 0) >= 0

  return (
    <div
      className="card-hover flex items-center gap-4 animate-slide-up"
      onClick={() => navigate(`/analysis/${analysis.ticker}`)}
    >
      {/* Ticker + company */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-lg text-slate-100">{analysis.ticker}</span>
          <span className="text-xs text-slate-500 truncate max-w-[160px]">{analysis.company_name}</span>
          {analysis.sector && (
            <span className="text-xs bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full hidden sm:inline">
              {analysis.sector}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1.5">
          <ScoreBadge recommendation={analysis.recommendation} score={analysis.score} size="sm" />
          <span className="flex items-center gap-1 text-sm text-slate-400">
            <Clock size={12} />
            {timeAgo(analysis.created_at)}
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="hidden sm:block">
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
        <div className={clsx('flex items-center justify-end gap-0.5 text-sm font-medium', up ? 'text-emerald-400' : 'text-red-400')}>
          {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {up ? '+' : ''}{analysis.price_change_pct?.toFixed(2)}%
        </div>
      </div>
    </div>
  )
}
