"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 8765;
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
function createWindow() {
    electron_1.Menu.setApplicationMenu(null);
    mainWindow = new electron_1.BrowserWindow({
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
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const isLocal = url.startsWith('file://') || url.startsWith('http://localhost');
        if (!isLocal)
            event.preventDefault();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
function startServer() {
    // In dev mode, assume server is started externally by dev.js
    if (isDev) {
        console.log('[Electron] Dev mode: expecting server on port', SERVER_PORT);
        return;
    }
    const serverPath = path.join(process.resourcesPath, 'server/start.py');
    const pythonCmd = os.platform() === 'win32' ? 'py -3.12' : 'python3';
    serverProcess = (0, child_process_1.spawn)(pythonCmd, [serverPath], {
        env: { ...process.env, TRACE_PORT: String(SERVER_PORT) },
        stdio: 'pipe',
        shell: os.platform() === 'win32',
    });
    serverProcess.stdout?.on('data', (data) => {
        console.log(`[Server] ${data}`);
    });
    serverProcess.stderr?.on('data', (data) => {
        console.error(`[Server Error] ${data}`);
    });
    serverProcess.on('close', (code) => {
        console.log(`Server exited with code ${code}`);
    });
}
function stopServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}
electron_1.app.whenReady().then(() => {
    startServer();
    // Give server a moment to boot in production
    const delay = isDev ? 0 : 800;
    setTimeout(createWindow, delay);
});
electron_1.app.on('window-all-closed', () => {
    stopServer();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
electron_1.app.on('before-quit', () => {
    stopServer();
});
// IPC handlers
electron_1.ipcMain.handle('get-server-port', () => SERVER_PORT);
