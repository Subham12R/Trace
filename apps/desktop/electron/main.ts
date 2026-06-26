import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { spawn } from 'child_process'
import * as path from 'path'
import * as os from 'os'
import * as http from 'http'

let mainWindow: BrowserWindow | null = null
let widgetWindow: BrowserWindow | null = null
let serverProcess: ReturnType<typeof spawn> | null = null
let tray: Tray | null = null
let isQuitting = false

function handleTraceUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.pathname === '/auth/callback' || (parsed.host === 'auth' && parsed.pathname === '/callback')) {
      const token = parsed.searchParams.get('token')
      if (token) mainWindow?.webContents.send('cloud-auth-callback', token)
    }
  } catch {
    // ignore malformed deep-links
  }
}

const SERVER_PORT = 8765
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
// public/ is not packaged — Vite copies it into dist/ at build time
const ICON_PATH = isDev
  ? path.join(__dirname, '../public/images/icon.png')
  : path.join(__dirname, '../dist/images/icon.png')

// Prevent a second instance from opening — focus the existing window instead
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.on('second-instance', (_event, argv) => {
  const url = argv.find((a) => a.startsWith('trace://'))
  if (url) handleTraceUrl(url)
  showWindow()
})

function showWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

const WIDGET_WIDTH = 320

// Anchor the widget centered on the tray icon: above it on Windows (taskbar
// usually bottom), below it on macOS (menu bar top).
function positionWidget() {
  if (!widgetWindow || !tray) return
  const trayBounds = tray.getBounds()
  const { width: winW, height: winH } = widgetWindow.getBounds()
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - winW / 2)
  const y = process.platform === 'darwin'
    ? Math.round(trayBounds.y + trayBounds.height + 4)
    : Math.round(trayBounds.y - winH - 4)
  widgetWindow.setPosition(x, y, false)
}

// Build the tray widget once, at startup, and configure its Space/level
// behavior a single time. Re-applying collection behavior on a live window
// while another app is fullscreen is what makes macOS animate to a different
// Space — so all of that happens here, before any fullscreen app is focused,
// and toggleWidget() below only ever shows/hides it.
function createWidgetWindow() {
  if (widgetWindow) return
  widgetWindow = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: 320,
    // 'panel' makes this an NSPanel so it can float over another app's
    // fullscreen Space without macOS switching Spaces to reach it.
    ...(process.platform === 'darwin' ? { type: 'panel' as const } : {}),
    frame: false,
    transparent: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    useContentSize: true,
    roundedCorners: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  const widgetUrl = isDev
    ? 'http://localhost:5173/?tray=1'
    : `file://${path.join(__dirname, '../dist/index.html')}?tray=1`
  widgetWindow.loadURL(widgetUrl)
  // Join every Space (incl. other apps' fullscreen) and sit above fullscreen
  // chrome. 'screen-saver' is the level that actually clears a fullscreen
  // window; 'pop-up-menu' does not. skipTransformProcessType keeps the app
  // from re-activating (which would also pull the focused Space).
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true })
  widgetWindow.setAlwaysOnTop(true, 'screen-saver')
  widgetWindow.on('blur', () => widgetWindow?.hide())
  widgetWindow.on('show', () => widgetWindow?.webContents.send('tray-shown'))
  // Recreate on the rare chance it gets destroyed, so the next toggle works.
  widgetWindow.on('closed', () => { widgetWindow = null })
}

function toggleWidget() {
  if (!widgetWindow) createWidgetWindow()
  if (!widgetWindow) return

  if (widgetWindow.isVisible()) {
    widgetWindow.hide()
  } else {
    positionWidget()
    widgetWindow.showInactive()
  }
}

function createTray() {
  const icon = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Trace')

  const menu = Menu.buildFromTemplate([
    { label: 'Show Trace', click: showWindow },
    { label: 'Settings', click: () => mainWindow?.webContents.send('open-settings') },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  // Left click → usage widget popup; right click → context menu
  tray.on('click', toggleWidget)
  tray.on('right-click', () => tray!.popUpContextMenu(menu))
}

function createWindow(opts: { show?: boolean } = {}) {
  const show = opts.show ?? true

  // Guard: if a window already exists, just focus it
  if (mainWindow) {
    if (show) showWindow()
    return
  }

  Menu.setApplicationMenu(null)
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show,
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Capture this specific window instance so the close handler always
  // operates on the right window even if `mainWindow` is later reassigned.
  const win = mainWindow

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    const isLocal = url.startsWith('file://') || url.startsWith('http://localhost')
    if (!isLocal) event.preventDefault()
  })

  // Hide to tray instead of closing — always operates on `win`, never on
  // whatever `mainWindow` happens to point to at call time.
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win.hide()
    }
  })

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  // Keep the renderer's maximize/restore icon in sync with the real state.
  win.on('maximize', () => win.webContents.send('window-maximized-changed', true))
  win.on('unmaximize', () => win.webContents.send('window-maximized-changed', false))
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
  app.setAsDefaultProtocolClient('trace')

  // macOS deep-link delivery
  app.on('open-url', (_event, url) => {
    handleTraceUrl(url)
  })

  startServer()

  // When launched at login, stay headless: only the server + tray run.
  // The window is still created (hidden) so "Show Trace" works instantly.
  const launchedAtLogin =
    app.getLoginItemSettings().wasOpenedAtLogin ||
    process.argv.includes('--hidden')

  // Create the window immediately so there is never a windowless gap that
  // causes 'activate' to open a second window while the server is starting.
  // The frontend handles the connecting state via React Query retries.
  createWindow({ show: !launchedAtLogin })
  createTray()
  createWidgetWindow()
  setupAutoUpdater()

  if (!isDev) {
    try {
      await waitForServer(SERVER_PORT)
    } catch (err) {
      console.error('[Electron] Server did not start in time:', err)
    }
  }
})

// Tray keeps the app alive on all platforms.
// The app is quit only via the tray menu "Quit" item.
app.on('window-all-closed', () => {})

app.on('activate', () => {
  // createWindow is idempotent — safe to call even if the window exists
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
ipcMain.handle('window-minimize', () => mainWindow?.minimize())
ipcMain.handle('window-toggle-maximize', () => {
  if (!mainWindow) return
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.handle('window-close', () => mainWindow?.close())
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)
ipcMain.handle('get-server-port', () => SERVER_PORT)
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('restart-and-install', () => {
  isQuitting = true
  autoUpdater.quitAndInstall()
})
ipcMain.handle('open-external', (_event, url: string) => {
  shell.openExternal(url)
})
ipcMain.handle('download-url', (_event, url: string) => {
  mainWindow?.webContents.downloadURL(url)
})
ipcMain.handle('open-cloud-login', (_event, url: string) => {
  shell.openExternal(url)
})
ipcMain.handle('get-launch-at-login', () => app.getLoginItemSettings().openAtLogin)
ipcMain.handle('set-launch-at-login', (_event, enabled: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    args: ['--hidden'],
  })
  return app.getLoginItemSettings().openAtLogin
})
ipcMain.handle('open-settings', () => {
  mainWindow?.webContents.send('open-settings-ui')
})
// Forward theme changes from the main window to the tray widget so both
// renderers stay in sync (they have separate localStorage / Zustand stores).
ipcMain.handle('broadcast-theme', (_event, mode: string, resolved: string, accent: string) => {
  widgetWindow?.webContents.send('theme-changed', mode, resolved, accent)
})

// The tray widget measures its rendered content and reports the height it
// needs so the frameless window wraps it exactly — no scrollbar, no empty gap.
ipcMain.handle('resize-tray-widget', (_event, height: number) => {
  if (!widgetWindow) return
  const h = Math.max(80, Math.ceil(height))
  widgetWindow.setContentSize(WIDGET_WIDTH, h)
  if (widgetWindow.isVisible()) positionWidget()
})
