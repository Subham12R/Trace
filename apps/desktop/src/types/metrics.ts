export interface RequestRecord {
  id: number
  source: string
  session_id: string | null
  timestamp: string
  model: string | null
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  cost: number
  project: string | null
  latency_ms: number | null
}

export interface MetricsSummary {
  total_cost: number
  total_requests: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  cache_hit_rate: number
  session_count: number
}

export interface ProjectUsage {
  branch: string
  project: string
  source: string
  request_count: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  cost: number
  session_count: number
}

export interface TrendPoint {
  bucket: string
  source: string
  input_tokens: number
  output_tokens: number
  cost: number
}

export interface SessionSummary {
  session_id: string
  source: string
  model: string | null
  request_count: number
  input_tokens: number
  output_tokens: number
  cost: number
  start_time: string
  end_time: string
}

export interface ActiveSession {
  source: string
  session_id: string
  model: string | null
  last_active: string
}

export type TimeRange = 'today' | 'week' | 'month' | 'all'
export type SourceView = 'providers' | 'projects' | 'sessions'
