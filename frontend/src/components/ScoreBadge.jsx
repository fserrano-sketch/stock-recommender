import clsx from 'clsx'

const REC_LABELS = { COMPRAR: 'COMPRAR', VENDER: 'VENDER', MANTENER: 'MANTENER' }

const REC_STYLES = {
  COMPRAR: {
    bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.2)',
    color: '#34d399',
    dot: '#34d399',
  },
  VENDER: {
    bg: 'rgba(248,113,113,0.1)',
    border: 'rgba(248,113,113,0.2)',
    color: '#f87171',
    dot: '#f87171',
  },
  MANTENER: {
    bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.2)',
    color: '#fbbf24',
    dot: '#fbbf24',
  },
}

export function ScoreBadge({ recommendation, score, size = 'md' }) {
  const s = REC_STYLES[recommendation] || REC_STYLES.MANTENER
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : size === 'lg' ? 'px-4 py-1.5 text-sm gap-1.5' : 'px-3 py-1 text-xs gap-1.5'

  return (
    <span
      className={clsx('inline-flex items-center font-semibold rounded-full border', sizeClass)}
      style={{ background: s.bg, borderColor: s.border, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {REC_LABELS[recommendation]}
      {score != null && <span style={{ color: s.color, opacity: 0.6 }} className="font-mono">{score}</span>}
    </span>
  )
}

export function ScoreBar({ score, recommendation }) {
  const s = REC_STYLES[recommendation] || REC_STYLES.MANTENER
  const gradient =
    recommendation === 'COMPRAR' ? 'linear-gradient(90deg, #059669, #34d399)' :
    recommendation === 'VENDER' ? 'linear-gradient(90deg, #dc2626, #f87171)' :
    'linear-gradient(90deg, #d97706, #fbbf24)'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, background: gradient }}
        />
      </div>
      <span className="font-mono text-sm font-bold w-14 text-right" style={{ color: s.color }}>{score}/100</span>
    </div>
  )
}
