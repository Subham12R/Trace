import { useServerStore } from '@/stores/serverStore'

const getBaseUrl = async (): Promise<string> => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    const port = await window.electronAPI.getServerPort()
    return `http://localhost:${port}`
  }
  return 'http://localhost:8765'
}

export { getBaseUrl }

function onSuccess() {
  useServerStore.getState().setOnline()
}

function onNetworkError() {
  useServerStore.getState().setOffline()
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const base = await getBaseUrl()
    try {
      const res = await fetch(`${base}${path}`)
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      onSuccess()
      return data
    } catch (err) {
      if (err instanceof TypeError) onNetworkError()
      throw err
    }
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const base = await getBaseUrl()
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      onSuccess()
      return data
    } catch (err) {
      if (err instanceof TypeError) onNetworkError()
      throw err
    }
  },

  async delete<T>(path: string): Promise<T> {
    const base = await getBaseUrl()
    try {
      const res = await fetch(`${base}${path}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      onSuccess()
      return data
    } catch (err) {
      if (err instanceof TypeError) onNetworkError()
      throw err
    }
  },
}
