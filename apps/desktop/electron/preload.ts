import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  restartAndInstall: () => ipcRenderer.invoke('restart-and-install'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  onUpdateDownloaded: (cb: () => void) => {
    ipcRenderer.on('update-downloaded', cb)
    return () => ipcRenderer.removeListener('update-downloaded', cb)
  },
})
