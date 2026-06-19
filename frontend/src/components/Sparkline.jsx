import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

export default function Sparkline({ data = [], recommendation }) {
  if (!data.length) return <div className="w-24 h-10 bg-navy-700 rounded animate-pulse" />

  const color =
    recommendation === 'COMPRAR' ? '#22c55e' :
    recommendation === 'VENDER' ? '#ef4444' : '#f59e0b'

  const chartData = data.map((v, i) => ({ v, i }))

  return (
    <ResponsiveContainer width={96} height={40}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="bg-navy-900 text-xs px-2 py-1 rounded border border-slate-700">
                ${payload[0].value?.toFixed(2)}
              </div>
            ) : null
          }
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
