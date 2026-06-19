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
      },
      setAccent: (accent) => {
        set({ accent })
      },
      init: () => {
        const resolved = resolve(get().mode)
        apply(resolved)
        set({ resolved })
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
