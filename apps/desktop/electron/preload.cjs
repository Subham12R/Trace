"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  minimizeWindow: () => import_electron.ipcRenderer.invoke("window-minimize"),
  toggleMaximizeWindow: () => import_electron.ipcRenderer.invoke("window-toggle-maximize"),
  closeWindow: () => import_electron.ipcRenderer.invoke("window-close"),
  isWindowMaximized: () => import_electron.ipcRenderer.invoke("window-is-maximized"),
  onWindowMaximizedChange: (cb) => {
    const handler = (_event, maximized) => cb(maximized);
    import_electron.ipcRenderer.on("window-maximized-changed", handler);
    return () => import_electron.ipcRenderer.removeListener("window-maximized-changed", handler);
  },
  getServerPort: () => import_electron.ipcRenderer.invoke("get-server-port"),
  getAppVersion: () => import_electron.ipcRenderer.invoke("get-app-version"),
  restartAndInstall: () => import_electron.ipcRenderer.invoke("restart-and-install"),
  openExternal: (url) => import_electron.ipcRenderer.invoke("open-external", url),
  downloadUrl: (url) => import_electron.ipcRenderer.invoke("download-url", url),
  openCloudLogin: (url) => import_electron.ipcRenderer.invoke("open-cloud-login", url),
  resizeTrayWidget: (height) => import_electron.ipcRenderer.invoke("resize-tray-widget", height),
  broadcastTheme: (mode, resolved, accent) => import_electron.ipcRenderer.invoke("broadcast-theme", mode, resolved, accent),
  onThemeChanged: (cb) => {
    const handler = (_event, mode, resolved, accent) => cb(mode, resolved, accent);
    import_electron.ipcRenderer.on("theme-changed", handler);
    return () => import_electron.ipcRenderer.removeListener("theme-changed", handler);
  },
  onUpdateDownloaded: (cb) => {
    import_electron.ipcRenderer.on("update-downloaded", cb);
    return () => import_electron.ipcRenderer.removeListener("update-downloaded", cb);
  },
  onCloudAuthCallback: (cb) => {
    const handler = (_event, token) => cb(token);
    import_electron.ipcRenderer.on("cloud-auth-callback", handler);
    return () => import_electron.ipcRenderer.removeListener("cloud-auth-callback", handler);
  }
});
