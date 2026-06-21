/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    getServerPort: () => Promise<number>
    getAppVersion: () => Promise<string>
    restartAndInstall: () => Promise<void>
    openExternal: (url: string) => Promise<void>
    openCloudLogin: (url: string) => Promise<void>
    onUpdateDownloaded: (cb: () => void) => () => void
    onCloudAuthCallback: (cb: (token: string) => void) => () => void
  }
}
