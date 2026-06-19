import clsx from 'clsx'

const REC_LABELS = { COMPRAR: 'COMPRAR', VENDER: 'VENDER', MANTENER: 'MANTENER' }
const REC_EMOJI = { COMPRAR: '🟢', VENDER: '🔴', MANTENER: '🟡' }

export function ScoreBadge({ recommendation, score, size = 'md' }) {
  const cls = clsx(
    'font-semibold rounded-full border',
    recommendation === 'COMPRAR' && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    recommendation === 'VENDER' && 'bg-red-500/20 text-red-400 border-red-500/30',
    recommendation === 'MANTENER' && 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    size === 'sm' && 'px-2 py-0.5 text-xs',
    size === 'md' && 'px-3 py-1 text-sm',
    size === 'lg' && 'px-4 py-1.5 text-base',
  )

  return (
    <span className={cls}>
      {REC_EMOJI[recommendation]} {REC_LABELS[recommendation]}
      {score != null && <span className="ml-1.5 opacity-70">{score}/100</span>}
    </span>
  )
}

export function ScoreBar({ score, recommendation }) {
  const color =
    recommendation === 'COMPRAR' ? 'bg-emerald-500' :
    recommendation === 'VENDER' ? 'bg-red-500' : 'bg-amber-500'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-navy-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-slate-300 font-mono text-sm w-12 text-right">{score}/100</span>
    </div>
  )
}
