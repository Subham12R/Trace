const getBaseUrl = async (): Promise<string> => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    const port = await window.electronAPI.getServerPort()
    return `http://localhost:${port}`
  }
  return 'http://localhost:8765'
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const base = await getBaseUrl()
    const res = await fetch(`${base}${path}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const base = await getBaseUrl()
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },

  async delete<T>(path: string): Promise<T> {
    const base = await getBaseUrl()
    const res = await fetch(`${base}${path}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
}
