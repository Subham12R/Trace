"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  getServerPort: () => import_electron.ipcRenderer.invoke("get-server-port"),
  getAppVersion: () => import_electron.ipcRenderer.invoke("get-app-version"),
  restartAndInstall: () => import_electron.ipcRenderer.invoke("restart-and-install"),
  openExternal: (url) => import_electron.ipcRenderer.invoke("open-external", url),
  downloadUrl: (url) => import_electron.ipcRenderer.invoke("download-url", url),
  openCloudLogin: (url) => import_electron.ipcRenderer.invoke("open-cloud-login", url),
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
