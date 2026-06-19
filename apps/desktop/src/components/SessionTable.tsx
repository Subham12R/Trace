import type { SessionSummary } from '@/types/metrics'

interface SessionTableProps {
  data: SessionSummary[] | undefined
}

export default function SessionTable({ data }: SessionTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-muted text-sm">
        No sessions found for this time range.
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">Session</th>
            <th className="px-4 py-3 font-medium">Model</th>
            <th className="px-4 py-3 font-medium text-right">Requests</th>
            <th className="px-4 py-3 font-medium text-right">Input</th>
            <th className="px-4 py-3 font-medium text-right">Output</th>
            <th className="px-4 py-3 font-medium text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {data.map((session) => (
            <tr
              key={`${session.source}-${session.session_id}`}
              className="border-b border-border/50 hover:bg-foreground/5 transition-colors"
            >
              <td className="px-4 py-3 text-foreground capitalize">{session.source}</td>
              <td className="px-4 py-3 text-foreground font-mono text-xs truncate max-w-[200px]">
                {session.session_id}
              </td>
              <td className="px-4 py-3 text-muted">{session.model ?? '-'}</td>
              <td className="px-4 py-3 text-right text-foreground">{session.request_count}</td>
              <td className="px-4 py-3 text-right text-muted">{session.input_tokens.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-muted">{session.output_tokens.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-accent font-medium">
                ${session.cost.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
