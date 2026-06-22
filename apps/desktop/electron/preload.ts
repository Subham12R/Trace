import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  restartAndInstall: () => ipcRenderer.invoke('restart-and-install'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  downloadUrl: (url: string) => ipcRenderer.invoke('download-url', url),
  openCloudLogin: (url: string) => ipcRenderer.invoke('open-cloud-login', url),
  onUpdateDownloaded: (cb: () => void) => {
    ipcRenderer.on('update-downloaded', cb)
    return () => ipcRenderer.removeListener('update-downloaded', cb)
  },
  onCloudAuthCallback: (cb: (token: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, token: string) => cb(token)
    ipcRenderer.on('cloud-auth-callback', handler)
    return () => ipcRenderer.removeListener('cloud-auth-callback', handler)
  },
})
