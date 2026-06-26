import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window-toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowMaximizedChange: (cb: (maximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) => cb(maximized)
    ipcRenderer.on('window-maximized-changed', handler)
    return () => ipcRenderer.removeListener('window-maximized-changed', handler)
  },
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  restartAndInstall: () => ipcRenderer.invoke('restart-and-install'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  downloadUrl: (url: string) => ipcRenderer.invoke('download-url', url),
  openCloudLogin: (url: string) => ipcRenderer.invoke('open-cloud-login', url),
  resizeTrayWidget: (height: number) => ipcRenderer.invoke('resize-tray-widget', height),
  broadcastTheme: (mode: string, resolved: string, accent: string) => ipcRenderer.invoke('broadcast-theme', mode, resolved, accent),
  onThemeChanged: (cb: (mode: string, resolved: string, accent: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, mode: string, resolved: string, accent: string) => cb(mode, resolved, accent)
    ipcRenderer.on('theme-changed', handler)
    return () => ipcRenderer.removeListener('theme-changed', handler)
  },
  onUpdateDownloaded: (cb: () => void) => {
    ipcRenderer.on('update-downloaded', cb)
    return () => ipcRenderer.removeListener('update-downloaded', cb)
  },
  onCloudAuthCallback: (cb: (token: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, token: string) => cb(token)
    ipcRenderer.on('cloud-auth-callback', handler)
    return () => ipcRenderer.removeListener('cloud-auth-callback', handler)
  },
  onTrayShown: (cb: () => void) => {
    ipcRenderer.on('tray-shown', cb)
    return () => ipcRenderer.removeListener('tray-shown', cb)
  },
  getLaunchAtLogin: () => ipcRenderer.invoke('get-launch-at-login'),
  setLaunchAtLogin: (enabled: boolean) => ipcRenderer.invoke('set-launch-at-login', enabled),
})
