import { create } from 'zustand'

type ServerStatus = 'connecting' | 'online' | 'offline'

interface ServerStore {
  status: ServerStatus
  setOnline: () => void
  setOffline: () => void
}

export const useServerStore = create<ServerStore>((set, get) => ({
  status: 'connecting',
  setOnline: () => {
    if (get().status !== 'online') set({ status: 'online' })
  },
  setOffline: () => {
    if (get().status !== 'offline') set({ status: 'offline' })
  },
}))
