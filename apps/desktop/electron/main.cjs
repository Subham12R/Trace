"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_electron = require("electron");
var import_electron_updater = require("electron-updater");
var import_child_process = require("child_process");
var path = __toESM(require("path"), 1);
var os = __toESM(require("os"), 1);
var http = __toESM(require("http"), 1);
let mainWindow = null;
let serverProcess = null;
let tray = null;
let isQuitting = false;
const SERVER_PORT = 8765;
const isDev = process.env.NODE_ENV === "development" || !import_electron.app.isPackaged;
function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
function createTray() {
  const iconPath = path.join(__dirname, "../public/images/icon.png");
  const icon = import_electron.nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new import_electron.Tray(icon);
  tray.setToolTip("Trace");
  const menu = import_electron.Menu.buildFromTemplate([
    { label: "Open Trace", click: showWindow },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        import_electron.app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
  tray.on("double-click", showWindow);
}
function createWindow() {
  import_electron.Menu.setApplicationMenu(null);
  mainWindow = new import_electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    icon: path.join(__dirname, "../public/images/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const isLocal = url.startsWith("file://") || url.startsWith("http://localhost");
    if (!isLocal) event.preventDefault();
  });
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function startServer() {
  if (isDev) {
    console.log("[Electron] Dev mode: expecting server on port", SERVER_PORT);
    return;
  }
  const exeName = os.platform() === "win32" ? "server.exe" : "server";
  const serverExe = path.join(process.resourcesPath, "server", exeName);
  serverProcess = (0, import_child_process.spawn)(serverExe, [], {
    env: { ...process.env, TRACE_PORT: String(SERVER_PORT) },
    stdio: "pipe"
  });
  serverProcess.stdout?.on("data", (data) => {
    console.log(`[Server] ${data}`);
  });
  serverProcess.stderr?.on("data", (data) => {
    console.error(`[Server Error] ${data}`);
  });
  serverProcess.on("close", (code) => {
    console.log(`Server exited with code ${code}`);
  });
}
function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}
function waitForServer(port, timeoutMs = 2e4) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http.get(`http://localhost:${port}/health`, (res) => {
        if (res.statusCode === 200) return resolve();
        retry();
      }).on("error", retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error("Server did not start"));
      setTimeout(check, 300);
    };
    check();
  });
}
function setupAutoUpdater() {
  if (isDev) return;
  import_electron_updater.autoUpdater.checkForUpdatesAndNotify();
  import_electron_updater.autoUpdater.on("update-downloaded", () => {
    mainWindow?.webContents.send("update-downloaded");
  });
  import_electron_updater.autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] Error:", err.message);
  });
}
import_electron.app.whenReady().then(async () => {
  startServer();
  if (!isDev) {
    try {
      await waitForServer(SERVER_PORT);
    } catch (err) {
      console.error("[Electron] Server did not start in time:", err);
    }
  }
  createWindow();
  createTray();
  setupAutoUpdater();
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    import_electron.app.quit();
  }
});
import_electron.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    showWindow();
  }
});
import_electron.app.on("before-quit", () => {
  isQuitting = true;
  stopServer();
});
import_electron.ipcMain.handle("get-server-port", () => SERVER_PORT);
import_electron.ipcMain.handle("get-app-version", () => import_electron.app.getVersion());
import_electron.ipcMain.handle("restart-and-install", () => {
  isQuitting = true;
  import_electron_updater.autoUpdater.quitAndInstall();
});
import_electron.ipcMain.handle("open-external", (_event, url) => {
  import_electron.shell.openExternal(url);
});
