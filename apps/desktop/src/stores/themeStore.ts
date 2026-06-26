import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  accent: string
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: string) => void
  init: () => void
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(resolved: 'light' | 'dark') {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function broadcast(mode: ThemeMode, resolved: 'light' | 'dark', accent: string) {
  // Only the main window has this API; in the tray renderer it may be absent.
  window.electronAPI?.broadcastTheme?.(mode, resolved, accent)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolved: 'light',
      accent: 'ink',
      setMode: (mode) => {
        const resolved = resolve(mode)
        apply(resolved)
        set({ mode, resolved })
        broadcast(mode, resolved, get().accent)
      },
      setAccent: (accent) => {
        set({ accent })
        broadcast(get().mode, get().resolved, accent)
      },
      init: () => {
        const resolved = resolve(get().mode)
        apply(resolved)
        set({ resolved })
        // Don't broadcast on init — the tray reads its own persisted store on start.
      },
    }),
    {
      name: 'trace-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolve(state.mode)
          apply(resolved)
          state.resolved = resolved
        }
      },
    }
  )
)
