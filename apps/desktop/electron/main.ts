import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { spawn } from 'child_process'
import * as path from 'path'
import * as os from 'os'
import * as http from 'http'

let mainWindow: BrowserWindow | null = null
let serverProcess: ReturnType<typeof spawn> | null = null
let tray: Tray | null = null
let isQuitting = false

const SERVER_PORT = 8765
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function showWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/images/icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Trace')

  const menu = Menu.buildFromTemplate([
    { label: 'Open Trace', click: showWindow },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
  tray.on('double-click', showWindow)
}

function createWindow() {
  Menu.setApplicationMenu(null)
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '../public/images/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocal = url.startsWith('file://') || url.startsWith('http://localhost')
    if (!isLocal) event.preventDefault()
  })

  // Hide to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startServer() {
  if (isDev) {
    console.log('[Electron] Dev mode: expecting server on port', SERVER_PORT)
    return
  }

  const exeName = os.platform() === 'win32' ? 'server.exe' : 'server'
  const serverExe = path.join(process.resourcesPath, 'server', exeName)

  serverProcess = spawn(serverExe, [], {
    env: { ...process.env, TRACE_PORT: String(SERVER_PORT) },
    stdio: 'pipe',
  })

  serverProcess.stdout?.on('data', (data) => {
    console.log(`[Server] ${data}`)
  })

  serverProcess.stderr?.on('data', (data) => {
    console.error(`[Server Error] ${data}`)
  })

  serverProcess.on('close', (code) => {
    console.log(`Server exited with code ${code}`)
  })
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
}

function waitForServer(port: number, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      http.get(`http://localhost:${port}/health`, (res) => {
        if (res.statusCode === 200) return resolve()
        retry()
      }).on('error', retry)
    }
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error('Server did not start'))
      setTimeout(check, 300)
    }
    check()
  })
}

function setupAutoUpdater() {
  if (isDev) return

  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded')
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err.message)
  })
}

app.whenReady().then(async () => {
  startServer()
  if (!isDev) {
    try {
      await waitForServer(SERVER_PORT)
    } catch (err) {
      console.error('[Electron] Server did not start in time:', err)
    }
  }
  createWindow()
  createTray()
  setupAutoUpdater()
})

// Keep app alive when all windows closed — tray keeps it running
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    app.quit()
  }
  // On Windows/Linux: do nothing — tray keeps the app alive
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  } else {
    showWindow()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  stopServer()
})

// IPC handlers
ipcMain.handle('get-server-port', () => SERVER_PORT)
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('restart-and-install', () => {
  isQuitting = true
  autoUpdater.quitAndInstall()
})
ipcMain.handle('open-external', (_event, url: string) => {
  shell.openExternal(url)
})
