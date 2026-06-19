const { spawn } = require('child_process')
const path = require('path')

const isWindows = process.platform === 'win32'
const python = path.join(__dirname, 'apps/server/.venv312/Scripts/python.exe')
const npm = isWindows ? 'npm.cmd' : 'npm'

// Colors for logging
const c = {
  py: '\x1b[36m',
  vite: '\x1b[32m',
  electron: '\x1b[35m',
  reset: '\x1b[0m',
}

function log(prefix, color, data) {
  const lines = data.toString().trim().split('\n')
  lines.forEach((line) => {
    if (line.trim()) console.log(`${color}[${prefix}]${c.reset} ${line}`)
  })
}

// Start FastAPI server
const server = spawn(python, ['apps/server/start.py'], {
  stdio: 'pipe',
  shell: isWindows,
  env: { ...process.env, TRACE_PORT: '8765' },
})

server.stdout.on('data', (d) => log('Server', c.py, d))
server.stderr.on('data', (d) => log('Server', c.py, d))

// Start Vite dev server
const vite = spawn(npm, ['run', 'dev'], {
  cwd: path.join(__dirname, 'apps/desktop'),
  stdio: 'pipe',
  shell: isWindows,
})

vite.stdout.on('data', (d) => log('Vite', c.vite, d))
vite.stderr.on('data', (d) => log('Vite', c.vite, d))

// Wait for Vite to be ready, then start Electron
setTimeout(() => {
  const electron = spawn(npm, ['run', 'electron:dev'], {
    cwd: path.join(__dirname, 'apps/desktop'),
    stdio: 'pipe',
    shell: isWindows,
    env: { ...process.env, NODE_ENV: 'development' },
  })

  electron.stdout.on('data', (d) => log('Electron', c.electron, d))
  electron.stderr.on('data', (d) => log('Electron', c.electron, d))

  process.on('SIGINT', () => {
    electron.kill()
    vite.kill()
    server.kill()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    electron.kill()
    vite.kill()
    server.kill()
    process.exit(0)
  })
}, 3000)

console.log('Starting Trace development environment...')
console.log('  - FastAPI server on :8765')
console.log('  - Vite dev server on :5173')
console.log('  - Electron will launch shortly')
console.log('Press Ctrl+C to stop all processes\n')
