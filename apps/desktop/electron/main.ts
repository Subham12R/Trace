import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { spawn } from 'child_process'
import * as path from 'path'
import * as os from 'os'
import * as http from 'http'

let mainWindow: BrowserWindow | null = null
let serverProcess: ReturnType<typeof spawn> | null = null

const SERVER_PORT = 8765
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

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

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startServer() {
  // In dev mode, assume server is started externally by dev.js
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

app.whenReady().then(async () => {
  startServer()
  if (!isDev) await waitForServer(SERVER_PORT)
  createWindow()
})

app.on('window-all-closed', () => {
  stopServer()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('before-quit', () => {
  stopServer()
})

// IPC handlers
ipcMain.handle('get-server-port', () => SERVER_PORT)
