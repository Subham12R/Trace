import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TrendPoint } from '@/types/metrics'

interface UsageBarChartProps {
  data: TrendPoint[] | undefined
  showCost: boolean
}

export default function UsageBarChart({ data, showCost }: UsageBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 h-64 flex items-center justify-center text-muted">
        No data available
      </div>
    )
  }

  const sources = Array.from(new Set(data.map((d) => d.source)))
  const buckets = Array.from(new Set(data.map((d) => d.bucket)))

  const chartData = buckets.map((bucket) => {
    const row: Record<string, number | string> = { bucket }
    sources.forEach((source) => {
      const point = data.find((d) => d.bucket === bucket && d.source === source)
      row[source] = showCost
        ? point?.cost ?? 0
        : (point?.input_tokens ?? 0) + (point?.output_tokens ?? 0)
    })
    return row
  })

  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-muted mb-4">
        {showCost ? 'Cost Trends' : 'Token Usage Trends'}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
          <XAxis dataKey="bucket" tick={{ fill: '#737373', fontSize: 12 }} />
          <YAxis tick={{ fill: '#737373', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#141414',
              border: '1px solid #1f1f1f',
              borderRadius: '8px',
              color: '#e5e5e5',
            }}
          />
          <Legend wrapperStyle={{ color: '#737373' }} />
          {sources.map((source, i) => (
            <Bar
              key={source}
              dataKey={source}
              fill={colors[i % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
