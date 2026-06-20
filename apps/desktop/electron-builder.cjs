const { platform } = require('os')

const isMac = platform() === 'darwin'
const isWin = platform() === 'win32'

const serverResource = isMac
  ? { from: '../server/dist/server', to: 'server/server' }
  : { from: '../server/dist/server.exe', to: 'server/server.exe' }

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.trace.app',
  productName: 'Trace',
  icon: 'public/images/icon.png',
  directories: { output: 'release' },
  files: ['dist/**/*', 'electron/**/*'],
  npmRebuild: false,
  extraResources: [serverResource],
  publish: [
    {
      provider: 'github',
      owner: 'Subham12R',
      repo: 'Trace',
    },
  ],
  mac: {
    target: 'dmg',
    artifactName: 'Trace-${version}-mac.dmg',
  },
  win: {
    target: 'nsis',
    artifactName: 'Trace-Setup.exe',
  },
  linux: {
    target: 'AppImage',
  },
}
