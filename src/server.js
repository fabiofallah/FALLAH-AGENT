const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const apiRoutes = require('./routes/apiRoutes');
const chatService = require('./services/chatService');
const terminalService = require('./services/terminalService');
const { storageService } = require('./services/storageService');
const { arbitrageDataPipelineService } = require('./services/arbitrageDataPipelineService');
const { arbitrageEngineService } = require('./services/arbitrageEngineService');
const { homologationService } = require('./services/homologationService');

const app = express();
const server = http.createServer(app);

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '..');
const REQUESTED_PORT = Number(process.env.PORT || 3000);
const PORT_RETRY_LIMIT = Math.max(0, Number(process.env.FALLAH_PORT_RETRY_LIMIT || 40));
const HOST = process.env.HOST || '127.0.0.1';
const LOCAL_SESSION = crypto.randomBytes(32).toString('hex');
let activePort = REQUESTED_PORT;
let servicesStarted = false;

let resolveReady;
let rejectReady;
const ready = new Promise((resolve, reject) => {
  resolveReady = resolve;
  rejectReady = reject;
});

function parseCookies(header = '') {
  return Object.fromEntries(String(header).split(';').map((part) => part.trim().split('=')).filter(([key, value]) => key && value));
}

function isLoopback(address = '') {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' data: blob:; connect-src 'self' ws://127.0.0.1:* ws://localhost:*; font-src 'self' data:; frame-ancestors 'none'");
  // Prevent BFCache so window.load always fires on navigation
  if (req.method === 'GET' && (req.path === '/' || req.path === '/index.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  // Do not force a global Content-Type. Static assets and res.json() must set
  // their own MIME types; nosniff intentionally rejects JS served as HTML.
  const cookies = parseCookies(req.headers.cookie);
  if (req.method === 'GET' && cookies.fallah_session !== LOCAL_SESSION) {
    res.setHeader('Set-Cookie', `fallah_session=${LOCAL_SESSION}; HttpOnly; SameSite=Strict; Path=/`);
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.origin;
    const originAllowed = !origin || origin === `http://${HOST}:${activePort}` || origin === `http://localhost:${activePort}`;
    if (!isLoopback(req.socket.remoteAddress) || cookies.fallah_session !== LOCAL_SESSION || !originAllowed) {
      res.status(403).json({ success: false, error: 'Sessão local inválida. Recarregue o FALLAH AGENT.' });
      return;
    }
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/vendor/monaco', express.static(path.join(__dirname, '..', 'node_modules', 'monaco-editor', 'min')));
app.use('/vendor/remixicon', express.static(path.join(__dirname, '..', 'node_modules', 'remixicon')));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (path.basename(filePath).toLowerCase() === 'index.html') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  },
}));
app.use('/api', apiRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', workspace: WORKSPACE_ROOT, port: activePort }));

const wss = new WebSocket.Server({
  server,
  path: '/ws',
  verifyClient: ({ req }) => isLoopback(req.socket.remoteAddress) && parseCookies(req.headers.cookie).fallah_session === LOCAL_SESSION,
});

wss.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') return;
  console.error('WebSocket server error:', error.message);
});

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'status', message: 'FALLAH AGENT websocket ready' }));

  socket.on('message', async (message) => {
    try {
      const payload = JSON.parse(message.toString());

      if (payload.type === 'chat') {
        const reply = await chatService.reply(payload.text);
        socket.send(JSON.stringify({ type: 'chat', message: reply }));
      }

      if (payload.type === 'terminal') {
        const result = await terminalService.runCommand(payload.command, WORKSPACE_ROOT);
        socket.send(JSON.stringify({ type: 'terminal', result }));
      }
    } catch (error) {
      socket.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });
});

function startServices() {
  if (servicesStarted) return;
  servicesStarted = true;

  homologationService.initialize().catch((error) => {
    console.error('Homologation startup failed:', error.message);
  });
}

function listenWithRetry(port, retriesLeft) {
  activePort = Number(port);
  process.env.PORT = String(activePort);

  const onError = (error) => {
    server.off('listening', onListening);
    if (error?.code === 'EADDRINUSE' && retriesLeft > 0) {
      listenWithRetry(activePort + 1, retriesLeft - 1);
      return;
    }
    rejectReady(error);
  };

  const onListening = () => {
    server.off('error', onError);
    const address = server.address();
    if (address && typeof address === 'object' && Number.isFinite(address.port)) {
      activePort = address.port;
      process.env.PORT = String(activePort);
    }
    console.log(`FALLAH AGENT running on http://${HOST}:${activePort}`);
    console.log(`Workspace root: ${WORKSPACE_ROOT}`);
    startServices();
    resolveReady({ host: HOST, port: activePort });
  };

  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(activePort, HOST);
}

listenWithRetry(REQUESTED_PORT, PORT_RETRY_LIMIT);

let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}. Stopping storage monitoring...`);
  try {
    await storageService.stop();
    await arbitrageDataPipelineService.shutdown();
    await arbitrageEngineService.shutdown();
  } catch (error) {
    console.error('Storage monitor shutdown failed:', error.message);
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

module.exports = {
  app,
  server,
  ready,
  getBoundPort: () => activePort,
};
