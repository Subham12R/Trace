/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    minimizeWindow: () => Promise<void>
    toggleMaximizeWindow: () => Promise<void>
    closeWindow: () => Promise<void>
    isWindowMaximized: () => Promise<boolean>
    onWindowMaximizedChange: (cb: (maximized: boolean) => void) => () => void
    getServerPort: () => Promise<number>
    getAppVersion: () => Promise<string>
    restartAndInstall: () => Promise<void>
    openExternal: (url: string) => Promise<void>
    downloadUrl: (url: string) => Promise<void>
    openCloudLogin: (url: string) => Promise<void>
    onUpdateDownloaded: (cb: () => void) => () => void
    onCloudAuthCallback: (cb: (token: string) => void) => () => void
    resizeTrayWidget: (height: number) => Promise<void>
    broadcastTheme: (mode: string, resolved: string, accent: string) => Promise<void>
    onThemeChanged: (cb: (mode: string, resolved: string, accent: string) => void) => () => void
  }
}
