import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn } from 'child_process'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null
let serverProcess: ReturnType<typeof spawn> | null = null

const SERVER_PORT = 8765
const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startServer() {
  const serverPath = isDev
    ? path.join(__dirname, '../../server/start.py')
    : path.join(process.resourcesPath, 'server/start.py')

  serverProcess = spawn('python', [serverPath], {
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

app.whenReady().then(() => {
  startServer()
  // Give server a moment to boot
  setTimeout(createWindow, 800)
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
