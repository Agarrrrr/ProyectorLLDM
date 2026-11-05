const { createStateStream, cleanWireValue } = require('./transport/state-stream');
const { createUpdateService } = require('./updates/service');
const { installUpdateRoutes } = require('./updates/routes');
const { createSongAssets } = require('./songs/assets');
const { createSongCompiler } = require('./songs/compiler');
const { installSongManagement } = require('./songs/management');
const { createSession } = require('./projection/session');
const { createSettingsService } = require('./settings/service');
const { createWorkspace } = require('./projection/workspace');
const { installListsRoutes } = require('./lists/routes');
const { applyPendingRestore, installBackupRoutes } = require('./backup/service');
const { createObsBridge, loadObsConfig } = require('./infrastructure/obs-bridge');
const { installCatalogRoutes } = require('./transport/catalog-routes');
const { installContentRoutes } = require('./transport/content-routes');
const { installPresentationRoutes } = require('./transport/presentation-routes');
const { createProjection } = require('./projection/state');
const { createProjectionPublisher } = require('./projection/banner');
const { createProjectionTimeout } = require('./projection/timeout');
const { createCatalogRepository } = require('./songs/repository');
const { createActionHandler } = require('./projection/actions');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { localSecurity, validLocalRequest } = require('./transport/local-security');
const { createMobileAccess } = require('./remote/mobile-access');
const { createHostedAccess } = require('./remote/hosted-access');
const fs = require('fs');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function createApplication(options = {}) {
  const app = express();
  const server = http.createServer(app);
  const hosted = options.hosted && createHostedAccess(options.hosted);
  const mobile = createMobileAccess({ isOwner: hosted?.isOwner, publicOrigin: hosted?.origin });
  const isOutput = req => new URL(req.url, 'http://localhost').searchParams.get('view') === 'output';
  const wss = new WebSocket.Server({ server, path: '/ws', maxPayload: 64 * 1024, perMessageDeflate: false,
    verifyClient: ({ req }) => hosted
      ? hosted.validRequest(req) && (mobile.authorized(req) || (isOutput(req) && hosted.canView(req)))
      : validLocalRequest(req) && (isOutput(req) || mobile.authorized(req)) });

  const PORT = options.port ?? (parseInt(process.env.PORT, 10) || 4000);

  function getLocalIp() {
    const nets = os.networkInterfaces();
    const candidates = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          candidates.push({ name, address: net.address });
        }
      }
    }
    // Priorizar redes LAN físicas o Wi-Fi (192.168.1.x o 192.168.0.x)
    const lan192 = candidates.find(c => c.address.startsWith('192.168.1.') || c.address.startsWith('192.168.0.'));
    if (lan192) return lan192.address;
    // Cualquier otra IP privada estándar (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const anyPrivate = candidates.find(c => /^192\.168\./.test(c.address) || /^10\./.test(c.address) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(c.address));
    if (anyPrivate) return anyPrivate.address;
    return candidates[0] ? candidates[0].address : 'localhost';
  }
  const LOCAL_IP = getLocalIp();

  app.disable('x-powered-by');
  if (hosted) {
    app.use((req, res, next) => {
      if (!hosted.validRequest(req)) return res.sendStatus(403);
      res.set({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN' });
      next();
    });
  } else app.use(localSecurity);
  // Moving a saved week can send both the previous and new 2 MiB documents.
  app.patch('/api/lists', express.json({ limit: '5mb', inflate: false }));
  app.use(express.json({ limit: '100kb', inflate: false }));
  hosted?.install(app);
  mobile.install(app, () => ({ host: getLocalIp(), port: server.address()?.port || PORT }), () => {
    for (const ws of wss.clients) if (!ws.outputOnly && !ws.canControl()) ws.close(1008, 'Sesión revocada');
  });
  if (hosted) app.use((req, res, next) => hosted.protect(req, res, next, mobile.authorized(req)));
  app.set('json replacer', cleanWireValue);
  // UTF-8 Charset explícito para todas las respuestas de API
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });
  app.use(express.static(PUBLIC_DIR, { redirect: false }));

  // Integración con LLDM Cartelería digital
  const CARTELERIA_DIST = path.resolve(options.carteleriaDir || process.env.CARTELERIA_DIR || path.join(ROOT_DIR, 'lista-oraciones', 'dist'));
  if (fs.existsSync(CARTELERIA_DIST)) {
    // Vite fingerprints these filenames; a new build receives new URLs.
    app.use('/carteleria/assets', express.static(path.join(CARTELERIA_DIST, 'assets'), { maxAge: '1y', immutable: true, fallthrough: false }));
    app.use('/carteleria', express.static(CARTELERIA_DIST));
    app.get(/^\/carteleria/, (req, res) => {
      res.sendFile('index.html', { root: CARTELERIA_DIST });
    });
  }

  const DATA_DIR = path.resolve(options.dataDir || path.join(ROOT_DIR, 'data'));
  const uploadsDir = path.resolve(options.uploadsDir || path.join(ROOT_DIR, 'public', 'uploads', 'presentations'));
  applyPendingRestore(DATA_DIR, uploadsDir);
  installBackupRoutes({ app, dataDir: DATA_DIR, uploadsDir, isOwner: hosted?.isOwner });
  if (!hosted) {
    const updates = options.updatesService || createUpdateService({ rootDir: ROOT_DIR, dataDir: DATA_DIR });
    installUpdateRoutes({ app, service: updates });
  }
  if (hosted) app.use('/uploads/presentations', express.static(uploadsDir, { index: false, dotfiles: 'deny' }));
  const multer = require('multer');
  const presentationService = require('./presentations/service').createPresentationService({ dataDir: DATA_DIR, uploadsDir });
  const tempUploadDir = hosted ? path.join(DATA_DIR, 'upload-temp') : path.join(ROOT_DIR, 'public', 'uploads', 'temp');
  if (!fs.existsSync(tempUploadDir)) fs.mkdirSync(tempUploadDir, { recursive: true });
  const upload = multer({
    dest: tempUploadDir,
    limits: { fileSize: 300 * 1024 * 1024 }
  });

  // 1. CARGA DE BASES DE DATOS EN MEMORIA

  const catalogs = createCatalogRepository({ dataDir: DATA_DIR, watchFiles: options.watchFiles !== false });
  // 3. ESTADO GLOBAL DE PROYECCIÓN
  const { state: projectionState, updateDisplayPayload } = createProjection({ localIp: LOCAL_IP, port: PORT });
  const session = createSession({ state: projectionState, dataDir: DATA_DIR });
  // 4. WEBSOCKET BROADCAST
  let workspace, listsService;
  const stateStream = createStateStream({ wss, getState: () => projectionState });
  const projectionTimeout = createProjectionTimeout({ state: projectionState, onExpire: () => {
    projectionState.phase = 'idle';
    projectionState.isLooping = false;
    broadcastState();
  } });
  const projectionPublisher = createProjectionPublisher({
    getState: () => projectionState, broadcastState, broadcastOverlay,
    onPublish: repeat => projectionTimeout.observe(repeat)
  });
  function broadcastState() {
    workspace?.adoptProjection();
    projectionState.revision++;
    updateDisplayPayload();
    session.save();
    listsService?.syncPlayback();
    stateStream.broadcast();
    projectionPublisher.observe();
    projectionTimeout.observe();
  }

  function broadcastOverlay(payload, updateObs = true) {
    if (!payload) return;
    const { church, graphics } = settingsService.get().settings;
    const durationMs = (payload.type === 'drone' ? graphics.locationDurationSeconds : graphics.bannerDurationSeconds) * 1000;
    payload = { ...payload, durationMs, churchName: church.name, churchAddress: church.address, churchCity: church.city };
    if (payload.type === 'drone') {
      payload.location ||= church.city;
      payload.tag ||= [church.name, church.address].filter(Boolean).join(' • ');
    }
    if (updateObs) obsBridge?.show(payload);
    const msg = JSON.stringify({
      type: 'OVERLAY_EVENT',
      payload: payload
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  function hideOverlay(updateObs = true) {
    if (updateObs) obsBridge?.hide();
    const message = JSON.stringify({ type: 'OVERLAY_HIDE' });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    }
  }

  const songAssets = createSongAssets({ app, dataDir: DATA_DIR });
  const songCompiler = createSongCompiler({ getSettings: () => settingsService.get().settings, assets: songAssets });
  const settingsService = createSettingsService({ app, dataDir: DATA_DIR, validateExtra: value => { songAssets.validate(value.lyrics); songCompiler.refresh(projectionState, value); }, onChange(snapshot) {
    songCompiler.refresh(projectionState, snapshot.settings)();
    projectionState.settings = snapshot.settings;
    projectionState.settingsRevision = snapshot.revision;
    broadcastState();
  } });
  projectionState.settings = settingsService.get().settings;
  projectionState.settingsRevision = settingsService.get().revision;

  const obsBridge = hosted || options.obs === false ? null : createObsBridge(loadObsConfig(ROOT_DIR), {
    getDuration: type => {
      const graphics = settingsService.get().settings.graphics;
      return (type === 'drone' ? graphics.locationDurationSeconds : graphics.bannerDurationSeconds) * 1000;
    },
    onGraphic: payload => broadcastOverlay(payload, false),
    onHide: () => hideOverlay(false)
  });

  wss.on('connection', (ws, req) => {
    let count = 0, windowStart = Date.now();
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('error', () => ws.terminate());
    ws.outputOnly = isOutput(req);
    ws.canControl = () => mobile.authorized(req);
    // Enviar estado actual de inmediato al conectar
    updateDisplayPayload();
    stateStream.initial(ws);

    ws.on('message', (message) => {
      if (hosted && ws.outputOnly) { ws.close(1008, 'Vista de solo lectura'); return; }
      if (!ws.canControl()) { ws.close(1008, 'Dispositivo sin acceso a la cabina'); return; }
      if (Date.now() - windowStart > 1000) { windowStart = Date.now(); count = 0; }
      if (++count > 40) { ws.close(1008, 'Demasiadas acciones'); return; }
      try {
        const data = JSON.parse(message);
        handleWsAction(data);
      } catch (e) {
        console.error('Error procesando mensaje WS:', e);
      }
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.outputOnly && !ws.canControl()) { ws.close(1008, 'Sesión vencida'); continue; }
      if (ws.isAlive === false) { ws.terminate(); continue; }
      ws.isAlive = false; ws.ping();
    }
  }, 30000);
  heartbeat.unref();

  const handleWsAction = createActionHandler({ projectionState, wss, broadcastState, broadcastOverlay, hideOverlay });

  workspace = createWorkspace({ app, state: projectionState, catalogs, presentationService, broadcastState, dataDir: DATA_DIR, songCompiler });
  if (['hymn', 'choir'].includes(projectionState.contentType) && projectionState.activeItem) songCompiler.refresh(projectionState)();

  // 5. MOTOR DE BÚSQUEDA LAZY Y NORMALIZADO (TOLERANTE A TILDES, PUNTUACIÓN Y ORDEN - ALTO RENDIMIENTO)
  installCatalogRoutes({ app, catalogs, projectionState, broadcastState, publishProjection: projectionPublisher.publish, songCompiler, dataDir: DATA_DIR });
  installSongManagement({ app, catalogs, projectionState, broadcastState, songCompiler });

  installContentRoutes({ app, projectionState, publishProjection: projectionPublisher.publish, settings: settingsService });

  installPresentationRoutes({ app, upload, presentationService, projectionState, broadcastState });

  listsService = installListsRoutes({
    app, dataDir: DATA_DIR, projectionState, broadcastState,
    hasApp: () => fs.existsSync(path.join(CARTELERIA_DIST, 'index.html')),
    intervalMs: options.listIntervalMs,
    broadcastMessage(message) {
      let payload;
      for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        if (client.bufferedAmount > 1024 * 1024) { client.close(1013, 'Conexión demasiado lenta'); continue; }
        client.send(payload ??= JSON.stringify(message));
      }
    }
  });

  // Acciones de Control Directo
  app.post('/api/control/action', (req, res) => {
    if (!handleWsAction(req.body)) return res.status(400).json({ error: 'Acción de control no disponible.' });
    res.json({ success: true, state: projectionState });
  });

  // Obtener estado actual
  app.get('/api/state', (req, res) => {
    updateDisplayPayload();
    res.json(projectionState);
  });

  // Endpoint dinámico para consultar la IP local actual de conexión
  app.get('/api/ip', (req, res) => {
    if (hosted) return res.json({
      ip: new URL(hosted.origin).host,
      controlUrl: hosted.origin + '/control',
      pantallaUrl: hosted.origin + '/pantalla',
      overlayUrl: hosted.origin + '/overlay?obs=1'
    });
    const ip = getLocalIp();
    const PORT = server.address()?.port || projectionState.networkInfo.port;
    res.json({
      ip,
      port: PORT,
      controlUrl: `http://${ip}:${PORT}/control`,
      pantallaUrl: `http://${ip}:${PORT}/pantalla`,
      overlayUrl: `http://${ip}:${PORT}/overlay`
    });
  });

  // Rutas de Vistas
  app.get('/pantalla', (req, res) => {
    res.sendFile('pantalla.html', { root: PUBLIC_DIR });
  });

  app.get('/overlay', (req, res) => {
    res.sendFile('overlay.html', { root: PUBLIC_DIR });
  });

  app.get('/control', (req, res) => {
    res.sendFile('control.html', { root: PUBLIC_DIR });
  });

  app.get('/', (req, res) => {
    res.redirect('/control');
  });

  // APIs directas de Overlay de Cámaras (OBS)
  app.post('/api/overlay/broadcast', (req, res) => {
    broadcastOverlay(req.body);
    res.json({ success: true });
  });
  app.post('/api/overlay/hide', (req, res) => {
    hideOverlay();
    res.json({ success: true });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error('[API]', error.message);
    res.status(error.status || 500).json({ error: error.message || 'No se pudo completar la operación.' });
  });

  // Iniciar servidor con recuperación de puertos
  function startServer(port) {
    server.listen(port, options.host, () => {
      const actualPort = server.address().port;
      options.onStarted?.(actualPort);
      Object.assign(projectionState.networkInfo, {
        port: actualPort, networkUrl: `http://${LOCAL_IP}:${actualPort}/control`,
        obsUrl: `http://${LOCAL_IP}:${actualPort}/pantalla`, overlayUrl: `http://${LOCAL_IP}:${actualPort}/overlay`
      });
      console.log(`=======================================================`);
      console.log(`[OK] CABINA DE PROYECCION LLDM: http://localhost:${port}`);
      console.log(`[OK] Acceso Red Local (LAN): http://${LOCAL_IP}:${port}/control`);
      console.log(`[OK] Fuente OBS Pantalla (16:9, hasta 4K): http://localhost:${port}/pantalla`);
      console.log(`[OK] Fuente Transmisión OBS (Banners): http://localhost:${port}/overlay`);
      console.log(`=======================================================`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[WARN] Puerto ${port} ocupado, intentando en ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('[SERVER ERROR]', err);
      }
    });
  }

  async function close() {
    projectionTimeout.cancel();
    clearInterval(heartbeat);
    listsService.close();
    catalogs.close();
    obsBridge?.close();
    for (const client of wss.clients) client.terminate();
    wss.close();
    return new Promise(resolve => server.listening ? server.close(resolve) : resolve());
  }
  return { app, server, wss, performanceStats: () => ({ stream: stateStream.stats(), songs: songCompiler.cacheStats() }), start: () => startServer(PORT), close };

}

module.exports = { createApplication };
