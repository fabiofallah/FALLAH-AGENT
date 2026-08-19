const { app, BrowserWindow, nativeImage, crashReporter, shell } = require('electron');
const { spawn, fork } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');

const PREFERRED_PORT = Number(process.env.FALLAH_AGENT_PORT || 37621);
let appPort = PREFERRED_PORT;
let appUrl = `http://127.0.0.1:${appPort}`;
let mainWindow;
let createWindowPromise = null;
let activationPending = false;
let backendProcess = null;
const STARTUP_LOG_MAX_BYTES = 2 * 1024 * 1024;
const PATCH_TAG = 'PATCH_138';
const FIXED_CRASH_LOG_ROOT = process.env.FALLAH_CRASH_LOG_ROOT || 'C:\\FALLAH_AGENT_TRABALHO\\CRASH_LOGS';
const MASTER_LOG_PATH = path.join(FIXED_CRASH_LOG_ROOT, `${PATCH_TAG}_MASTER.log`);
try { crashReporter.start({ uploadToServer: false, compress: false }); } catch {}

// PATCH 83: canonical diagnostics directory + durable run marker.
// The marker is synchronous and survives a hard process death. On the next startup
// we can prove that the previous run ended abnormally even when no JS exception ran.
const RUN_MARKER = path.join(FIXED_CRASH_LOG_ROOT, `${PATCH_TAG}_RUN_STATE.json`);
function writeRunMarker(state, details = {}) {
  try {
    fs.mkdirSync(FIXED_CRASH_LOG_ROOT, { recursive: true });
    fs.writeFileSync(RUN_MARKER, JSON.stringify({
      patch: PATCH_TAG,
      state,
      pid: process.pid,
      timestamp: new Date().toISOString(),
      ...details,
    }, null, 2), 'utf8');
  } catch {}
}
function previousRunState() {
  try {
    if (!fs.existsSync(RUN_MARKER)) return null;
    return JSON.parse(fs.readFileSync(RUN_MARKER, 'utf8'));
  } catch { return null; }
}
const previousRun = previousRunState();
writeRunMarker('RUNNING', { previousRun });

function startupLog(event, details = {}) {
  try {
    fs.mkdirSync(FIXED_CRASH_LOG_ROOT, { recursive: true });
    const file = MASTER_LOG_PATH;
    const line = `${JSON.stringify({ timestamp: new Date().toISOString(), patch: PATCH_TAG, category: 'DESKTOP', pid: process.pid, event, ...details })}\n`;
    if (fs.existsSync(file) && fs.statSync(file).size > STARTUP_LOG_MAX_BYTES) fs.writeFileSync(file, line, 'utf8');
    else fs.appendFileSync(file, line, 'utf8');
  } catch {
    // Startup diagnostics must never block the app.
  }
}

startupLog('PATCH_RUNTIME_STARTED', { previousRun });
if (previousRun?.state === 'RUNNING') startupLog('PREVIOUS_RUN_ABNORMAL_TERMINATION', { previousRun });

// PATCH 83: durable runtime heartbeat. If Windows/Chromium kills the process without
// a JS exception, the last heartbeat still records the process memory immediately
// before disappearance.
const runtimeHeartbeat = setInterval(() => {
  const usage = process.memoryUsage();
  startupLog('RUNTIME_HEARTBEAT', {
    heapUsedMB: Math.round(usage.heapUsed / 104857.6) / 10,
    heapTotalMB: Math.round(usage.heapTotal / 104857.6) / 10,
    externalMB: Math.round(usage.external / 104857.6) / 10,
    arrayBuffersMB: Math.round(usage.arrayBuffers / 104857.6) / 10,
    rssMB: Math.round(usage.rss / 104857.6) / 10,
  });
}, 5000);
runtimeHeartbeat.unref?.();

function revealMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.center();
  mainWindow.focus();
  return true;
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

function healthAt(port) {
  // A 200 /health alone is not enough: an older FALLAH process can still own
  // the preferred port. Validate a critical static asset before reusing it.
  return new Promise((resolve) => {
    const request = http.get(`http://127.0.0.1:${port}/health`, (response) => {
      response.resume();
      if (response.statusCode !== 200) return resolve(false);
      const asset = http.get(`http://127.0.0.1:${port}/fallah-engine.css`, (assetResponse) => {
        assetResponse.resume();
        const contentType = String(assetResponse.headers['content-type'] || '').toLowerCase();
        resolve(assetResponse.statusCode === 200 && contentType.includes('text/css'));
      });
      asset.on('error', () => resolve(false));
      asset.setTimeout(500, () => { asset.destroy(); resolve(false); });
    });
    request.on('error', () => resolve(false));
    request.setTimeout(500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function canBind(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '127.0.0.1');
  });
}

async function resolvePort(preferred) {
  if (await healthAt(preferred)) return preferred;
  if (await canBind(preferred)) return preferred;
  for (let offset = 1; offset <= 40; offset += 1) {
    const candidate = preferred + offset;
    if (await canBind(candidate)) return candidate;
  }
  throw new Error(`Nenhuma porta livre encontrada a partir de ${preferred}.`);
}

function waitForServer(attempts = 80) {
  return new Promise((resolve, reject) => {
    const tryRequest = () => {
      const request = http.get(`${appUrl}/health`, (response) => { response.resume();if (response.statusCode === 200) resolve();else retry(); });
      request.on('error', retry);request.setTimeout(500, () => request.destroy());
    };
    const retry = () => { if (--attempts <= 0) reject(new Error('O servidor local não iniciou.'));else setTimeout(tryRequest, 250); };
    tryRequest();
  });
}

function serverAvailable() {
  return new Promise((resolve) => {
    const request = http.get(`${appUrl}/health`, (response) => { response.resume();resolve(response.statusCode === 200); });
    request.on('error', () => resolve(false));request.setTimeout(500, () => { request.destroy();resolve(false); });
  });
}

async function createWindow() {
  if (createWindowPromise) return createWindowPromise;
  createWindowPromise = createWindowInternal();
  try { return await createWindowPromise; } finally { createWindowPromise = null; }
}


function openExternalInSeparateWindow(target) {
  if (process.platform === 'win32') {
    const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
    const candidates = roots.flatMap((root) => [
      path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ]);
    const browserExe = candidates.find((candidate) => fs.existsSync(candidate));
    if (browserExe) {
      try {
        const child = spawn(browserExe, ['--new-window', target], { detached: true, stdio: 'ignore', windowsHide: false });
        child.unref();
        startupLog('OPEN_EXTERNAL_SEPARATE_WINDOW', { url: target, browserExe });
        return Promise.resolve();
      } catch (error) {
        startupLog('OPEN_EXTERNAL_BROWSER_FALLBACK', { url: target, message: error?.message || String(error) });
      }
    }
  }
  return shell.openExternal(target);
}

async function createWindowInternal() {
  startupLog('CREATE_WINDOW_STARTED', { appPath: app.getAppPath(), resourcesPath: process.resourcesPath, cwd: process.cwd() });
  appPort = await resolvePort(PREFERRED_PORT);
  appUrl = `http://127.0.0.1:${appPort}`;
  process.env.PORT = String(appPort);
  process.env.FALLAH_FOUNDATION_DATA_ROOT = path.join(app.getPath('userData'), 'foundation');
  process.env.FALLAH_PROJECT_ROOTS = process.env.FALLAH_PROJECT_ROOTS || path.parse(app.getPath('documents')).root;
  if (!(await serverAvailable())) {
    // PATCH 138 STRUCTURAL: the Express/readers/arbitrage backend is CPU and I/O heavy.
    // Running it through require('../server') kept it in Electron's main process and
    // caused Windows "Não está respondendo" during matching/logging. Fork it into an
    // independent Node process so mouse/scroll/window events remain responsive.
    const serverEntry = path.join(__dirname, '..', 'server.js');
    backendProcess = fork(serverEntry, [], {
      env: { ...process.env, PORT: String(appPort), HOST: '127.0.0.1' },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      windowsHide: true,
    });
    backendProcess.on('exit', (code, signal) => {
      startupLog('BACKEND_PROCESS_EXIT', { code, signal });
      backendProcess = null;
    });
    backendProcess.on('error', (error) => startupLog('BACKEND_PROCESS_ERROR', { message: error.message, stack: error.stack }));
    startupLog('BACKEND_PROCESS_FORKED', { pid: backendProcess.pid, port: appPort });
  }
  await waitForServer(160);
  const iconPath = path.join(__dirname, '..', '..', 'build', 'fallah-agent.png');
  mainWindow = new BrowserWindow({ width: 1480, height: 940, minWidth: 1100, minHeight: 720, center: true, show: true, title: 'FALLAH AGENT', icon: nativeImage.createFromPath(iconPath), autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const target = String(url || '').trim();
    if (/^https?:\/\//i.test(target)) {
      startupLog('OPEN_EXTERNAL_REQUEST', { url: target });
      setImmediate(() => openExternalInSeparateWindow(target)
        .then(() => startupLog('OPEN_EXTERNAL_SUCCESS', { url: target }))
        .catch((error) => startupLog('OPEN_EXTERNAL_FAILURE', { url: target, message: error?.message || String(error) })));
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(appUrl)) event.preventDefault(); });
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  mainWindow.webContents.session.on('will-download', (_event, item) => {
    const fileName = item.getFilename();
    if (!/^FALLAH_DIAGNOSTIC_/i.test(fileName)) return;
    const pictures = app.getPath('pictures');
    const screenshots = path.join(pictures, 'Screenshots');
    const defaultDir = fs.existsSync(screenshots) ? screenshots : pictures;
    item.setSaveDialogOptions({
      title: 'Salvar diagnóstico FALLAH',
      defaultPath: path.join(defaultDir, fileName),
      buttonLabel: 'Salvar',
    });
    item.once('done', (_downloadEvent, state) => {
      if (state !== 'completed' || mainWindow?.isDestroyed()) return;
      const savedPath = item.getSavePath();
      mainWindow.webContents.executeJavaScript(`window.dispatchEvent(new CustomEvent('fallah-diagnostic-saved', { detail: ${JSON.stringify(savedPath)} }))`).catch(() => null);
    });
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => { startupLog('MAIN_RENDER_PROCESS_GONE', details || {}); });
  mainWindow.webContents.on('unresponsive', () => startupLog('MAIN_RENDERER_UNRESPONSIVE'));
  mainWindow.webContents.on('responsive', () => startupLog('MAIN_RENDERER_RESPONSIVE'));
  mainWindow.webContents.once('did-finish-load', () => { startupLog('HOME_LOADED', { url: mainWindow?.webContents.getURL() });revealMainWindow(); });
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => startupLog('HOME_LOAD_FAILED', { code, description, url }));
  await mainWindow.loadURL(appUrl);mainWindow.on('close', () => startupLog('MAIN_WINDOW_CLOSE_REQUESTED', { url: mainWindow?.webContents?.getURL?.() || null }));mainWindow.on('closed', () => { startupLog('MAIN_WINDOW_CLOSED');mainWindow = null; });
  startupLog('BROWSER_WINDOW_READY', { url: appUrl });
  if (activationPending) { activationPending = false;revealMainWindow(); }
}

if (singleInstanceLock) {
  app.on('second-instance', () => {
    startupLog('SECOND_INSTANCE_RECEIVED', { windowReady: Boolean(mainWindow) });
    if (!revealMainWindow()) activationPending = true;
  });

  app.whenReady().then(async () => {
    if (app.isPackaged && !process.env.PORTABLE_EXECUTABLE_FILE) {
      app.setLoginItemSettings({ openAtLogin: false, path: process.execPath });
    }
    await createWindow();
  }).catch((error) => startupLog('STARTUP_FAILED', { message: error.message, stack: error.stack }));
}
app.on('before-quit', (_event) => { startupLog('APP_BEFORE_QUIT'); writeRunMarker('CLEAN_EXIT_REQUESTED'); if (backendProcess && !backendProcess.killed) { try { backendProcess.kill('SIGTERM'); } catch {} } });
app.on('will-quit', (_event) => startupLog('APP_WILL_QUIT'));
app.on('quit', (_event, exitCode) => { startupLog('APP_QUIT', { exitCode }); writeRunMarker('CLEAN_EXIT', { exitCode }); });
app.on('child-process-gone', (_event, details) => startupLog('CHILD_PROCESS_GONE', details || {}));
app.on('render-process-gone', (_event, webContents, details) => startupLog('APP_RENDER_PROCESS_GONE', { url: webContents?.getURL?.() || null, ...(details || {}) }));
app.on('window-all-closed', () => { startupLog('WINDOW_ALL_CLOSED', { mainWindowPresent: Boolean(mainWindow && !mainWindow.isDestroyed()) });if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!revealMainWindow()) createWindow().catch((error) => startupLog('ACTIVATE_FAILED', { message: error.message, stack: error.stack })); });
process.on('uncaughtException', (error) => startupLog('UNCAUGHT_EXCEPTION', { message: error.message, stack: error.stack }));
process.on('unhandledRejection', (error) => startupLog('UNHANDLED_REJECTION', { message: error?.message || String(error), stack: error?.stack }));

