import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { MetricsSummary, TrendPoint, SessionSummary, ActiveSession } from '@/types/metrics'
import { useDashboardStore } from '@/stores/dashboardStore'

export function useMetrics(timeRange: string) {
  const { autoRefresh } = useDashboardStore()

  return useQuery<MetricsSummary>({
    queryKey: ['metrics', timeRange],
    queryFn: () => api.get(`/api/metrics/summary?range=${timeRange}`),
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 4000,
  })
}

export function useTrends(timeRange: string, showCost: boolean) {
  const { autoRefresh } = useDashboardStore()

  return useQuery<TrendPoint[]>({
    queryKey: ['trends', timeRange, showCost],
    queryFn: () => api.get(`/api/metrics/trends?range=${timeRange}&metric=${showCost ? 'cost' : 'tokens'}`),
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 4000,
  })
}

export function useSessions(timeRange: string, sourceView: string) {
  const { autoRefresh } = useDashboardStore()

  return useQuery<SessionSummary[]>({
    queryKey: ['sessions', timeRange, sourceView],
    queryFn: () => api.get(`/api/metrics/sessions?range=${timeRange}&group_by=${sourceView}`),
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 4000,
  })
}

export function useActiveSessions() {
  const { autoRefresh } = useDashboardStore()

  return useQuery<ActiveSession[]>({
    queryKey: ['active'],
    queryFn: () => api.get('/api/metrics/active'),
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 4000,
  })
}

export interface ProviderInfo {
  id: string
  name: string
  installed: boolean
  env: string
  defaults: string[]
}

export function useProviders() {
  return useQuery<ProviderInfo[]>({
    queryKey: ['providers'],
    queryFn: () => api.get('/api/metrics/providers'),
    refetchInterval: 30000,
    staleTime: 20000,
  })
}
