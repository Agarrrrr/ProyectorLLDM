const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, dialog, shell } = require('electron');
const { createApplication } = require('../src/app');
const { createUpdateService } = require('../src/updates/service');

let window;
let application;
let shuttingDown = false;

const profile = app.commandLine.getSwitchValue('user-data-dir');
if (profile && path.isAbsolute(profile)) {
  fs.mkdirSync(profile, { recursive: true });
  app.setPath('userData', profile);
}

function openCabin(port) {
  const url = new URL(`http://localhost:${port}/control`);
  window = new BrowserWindow({
    width: 1366,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  window.webContents.on('will-navigate', (event, target) => {
    if (new URL(target).origin !== url.origin) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    const parsed = new URL(target);
    if (parsed.origin === url.origin || parsed.protocol === 'https:') {
      shell.openExternal(target).catch(console.error);
    }
    return { action: 'deny' };
  });
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { window = undefined; });
  return window.loadURL(url.href);
}

async function start() {
  const rootDir = path.resolve(__dirname, '..');
  const storage = app.getPath('userData');
  const dataDir = path.join(storage, 'data');
  const resources = process.resourcesPath;
  const updatesService = createUpdateService({ rootDir, dataDir, installed: app.isPackaged });
  application = createApplication({
    dataDir,
    factoryDir: path.join(rootDir, 'data', 'factory'),
    uploadsDir: path.join(storage, 'presentations'),
    converters: app.isPackaged ? {
      bundledConverter: path.join(resources, 'converter')
    } : undefined,
    updatesService,
    onStartError: fail,
    onStarted(port) {
      openCabin(port).catch(fail);
      void updatesService.checkAtStartup();
    }
  });
  application.start();
}

function fail(error) {
  dialog.showErrorBox('No se pudo iniciar Proyector LLDM', error.message);
  app.quit();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', event => {
    if (!application || shuttingDown) return;
    event.preventDefault();
    const activeApplication = application;
    application = undefined;
    activeApplication.close().catch(console.error).finally(() => {
      shuttingDown = true;
      app.quit();
    });
  });
  app.whenReady().then(start).catch(fail);
}
