const { spawn } = require('child_process')
const path = require('path')
const esbuild = require('esbuild')

const isWindows = process.platform === 'win32'
const python = isWindows
  ? path.join(__dirname, 'apps/server/.venv/Scripts/python.exe')
  : path.join(__dirname, 'apps/server/.venv/bin/python')
const npm = isWindows ? 'npm.cmd' : 'npm'
const desktopDir = path.join(__dirname, 'apps/desktop')

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

function note(msg) {
  console.log(`${c.electron}[Electron]${c.reset} ${msg}`)
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
  cwd: desktopDir,
  stdio: 'pipe',
  shell: isWindows,
})

vite.stdout.on('data', (d) => log('Vite', c.vite, d))
vite.stderr.on('data', (d) => log('Vite', c.vite, d))

// ── Electron main process: compile + watch ────────────────────────────────
// Electron runs the COMPILED electron/main.cjs (see package.json "main"), not
// the .ts source. Vite hot-reloads the renderer, but the main process does
// not, so without this watch any change to main.ts/preload.ts is silently
// ignored until a manual `npm run build:electron-main`. Here we recompile on
// change and relaunch Electron so main-process edits actually take effect.
let electron = null
let restarting = false
let shuttingDown = false

function startElectron() {
  electron = spawn(npm, ['run', 'electron:dev'], {
    cwd: desktopDir,
    stdio: 'pipe',
    shell: isWindows,
    env: { ...process.env, NODE_ENV: 'development' },
  })
  electron.stdout.on('data', (d) => log('Electron', c.electron, d))
  electron.stderr.on('data', (d) => log('Electron', c.electron, d))
  electron.on('exit', () => {
    // If Electron quits on its own (not a rebuild restart, not Ctrl+C), tear
    // the whole dev environment down — matches the old single-process feel.
    if (!restarting && !shuttingDown) shutdown()
  })
}

function restartElectron() {
  if (!electron) return startElectron()
  restarting = true
  const old = electron
  electron = null
  old.once('exit', () => {
    restarting = false
    startElectron()
  })
  old.kill()
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  electron?.kill()
  vite.kill()
  server.kill()
  process.exit(code)
}

let firstBuild = true
async function watchMainProcess() {
  const ctx = await esbuild.context({
    absWorkingDir: desktopDir,
    entryPoints: { main: 'electron/main.ts', preload: 'electron/preload.ts' },
    outdir: 'electron',
    outExtension: { '.js': '.cjs' },
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron'],
    logLevel: 'silent',
    plugins: [
      {
        name: 'electron-restart',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length) {
              note(`main build failed (${result.errors.length} error${result.errors.length > 1 ? 's' : ''}) — keeping previous build`)
              result.errors.forEach((e) => note(`  ${e.text}`))
              return
            }
            if (firstBuild) {
              firstBuild = false
              note('main process compiled')
            } else {
              note('main process changed — restarting Electron')
              restartElectron()
            }
          })
        },
      },
    ],
  })
  // First build happens as part of watch(); resolves once it completes.
  await ctx.watch()
  return ctx
}

// Wait for Vite to be ready, then compile the main process and launch Electron.
setTimeout(async () => {
  try {
    await watchMainProcess()
  } catch (err) {
    console.error('Failed to start Electron main-process watcher:', err)
    return shutdown(1)
  }
  startElectron()
}, 3000)

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('Starting Trace development environment...')
console.log('  - FastAPI server on :8765')
console.log('  - Vite dev server on :5173')
console.log('  - Electron main process: compiled + watched (auto-restart on change)')
console.log('Press Ctrl+C to stop all processes\n')
