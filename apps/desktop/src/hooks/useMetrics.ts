import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { MetricsSummary, TrendPoint, SessionSummary, ActiveSession, ProjectUsage } from '@/types/metrics'
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
  domain: string | null
  logo_url: string | null
}

export function useProviders() {
  const seenRef = useRef<Set<string>>(new Set())

  return useQuery<ProviderInfo[]>({
    queryKey: ['providers'],
    queryFn: () => api.get('/api/metrics/providers'),
    refetchInterval: 30000,
    staleTime: 20000,
    select: (data) => {
      const installed = data.filter((p) => p.installed)
      if (seenRef.current.size > 0) {
        installed
          .filter((p) => !seenRef.current.has(p.id))
          .forEach((p) => toast.info(`New provider detected: ${p.name}`))
      }
      installed.forEach((p) => seenRef.current.add(p.id))
      return data
    },
  })
}

export interface ModelUsage {
  source: string
  model: string
  request_count: number
  input_tokens: number
  output_tokens: number
  cost: number
}

export function useModels(timeRange: string) {
  const { autoRefresh } = useDashboardStore()

  return useQuery<ModelUsage[]>({
    queryKey: ['models', timeRange],
    queryFn: () => api.get(`/api/metrics/models?range=${timeRange}`),
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 4000,
  })
}

export function useProjects(timeRange: string) {
  const { autoRefresh } = useDashboardStore()

  return useQuery<ProjectUsage[]>({
    queryKey: ['projects', timeRange],
    queryFn: () => api.get(`/api/metrics/projects?range=${timeRange}`),
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 4000,
  })
}

export interface QuotaLimit {
  id: string
  label: string
  utilization: number
  resets_at: string
}

export interface ProviderQuota {
  provider: string
  limits: QuotaLimit[]
  last_updated: string
  stale?: boolean
}

export function useQuota() {
  return useQuery<ProviderQuota[]>({
    queryKey: ['quota'],
    queryFn: () => api.get('/api/metrics/quota'),
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

export interface StreakData {
  start: string
  end: string
  days: { date: string; count: number }[]
  max_count: number
}

export function useStreak(months: number = 6) {
  return useQuery<StreakData>({
    queryKey: ['streak', months],
    queryFn: () => api.get(`/api/metrics/streak?months=${months}`),
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

const REFRESH_KEYS = ['metrics', 'trends', 'sessions', 'models', 'active', 'streak', 'quota', 'providers']

export function useRefresh() {
  const queryClient = useQueryClient()

  return useMutation({
    // Trigger the scan, then hold while the watcher tick ingests new files so
    // the refetch below actually sees fresh data.
    mutationFn: async () => {
      await api.post('/api/metrics/refresh', {})
      await new Promise((resolve) => setTimeout(resolve, 1500))
    },
    onMutate: () => {
      toast.loading('Scanning your AI usage…', { id: 'refresh' })
    },
    onSuccess: () => {
      REFRESH_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))
      toast.success('Dashboard updated', { id: 'refresh' })
    },
    onError: () => {
      toast.error('Refresh failed', {
        id: 'refresh',
        description: 'Could not reach the local Trace server.',
      })
    },
  })
}

export interface SystemUser {
  name: string
  avatar_url: string | null
}

export function useSystemUser() {
  return useQuery<SystemUser>({
    queryKey: ['system', 'user'],
    queryFn: () => api.get('/api/system/user'),
    staleTime: Infinity,
  })
}

export interface AuthStatus {
  provider: string
  connected: boolean
}

export function useAuthStatus() {
  return useQuery<Record<string, AuthStatus>>({
    queryKey: ['auth', 'status'],
    queryFn: () => api.get('/api/auth/status'),
    refetchInterval: 10000,
  })
}

export async function connectProvider(provider: string, credential: string) {
  return api.post(`/api/auth/${provider}/connect`, { provider, credential })
}

export async function disconnectProvider(provider: string) {
  return api.delete(`/api/auth/${provider}/disconnect`)
}

export interface ProxyStatus {
  running: boolean
  port: number
  requests_logged: number
}

export function useProxyStatus() {
  return useQuery<ProxyStatus>({
    queryKey: ['system', 'proxy-status'],
    queryFn: () => api.get('/api/system/proxy-status'),
    refetchInterval: 10000,
    staleTime: 8000,
  })
}

export interface CloudAccount {
  logged_in: boolean
  email?: string
  name?: string
}

export function useCloudAccount() {
  return useQuery<CloudAccount>({
    queryKey: ['cloud', 'account'],
    queryFn: () => api.get('/api/cloud/account'),
    refetchInterval: 30000,
    staleTime: 20000,
  })
}

export interface ClaudeUsage {
  weekly: {
    tokens: number
    cost: number
  }
}

export function useClaudeUsage() {
  return useQuery<ClaudeUsage>({
    queryKey: ['system', 'usage'],
    queryFn: () => api.get('/api/system/usage'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}
