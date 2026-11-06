const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

function loadObsConfig(rootDir) {
  const filename = path.join(rootDir, 'config', 'obs.local.json');
  const local = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {};
  return {
    address: process.env.OBS_ADDRESS || local.address || 'localhost:4455',
    password: process.env.OBS_PASSWORD ?? local.password ?? '',
    scene: process.env.OBS_SCENE || local.scene || 'Camara principal',
    group: process.env.OBS_GROUP || local.group || 'texto himnario',
    source: process.env.OBS_SOURCE || local.source || 'himnario',
    browserSources: Array.isArray(local.browserSources) ? local.browserSources : ['Navegador', 'FondoTv']
  };
}

function createObsBridge(config, { onGraphic, onHide, onConnection = () => {}, getDuration = type => type === 'drone' ? 75000 : 30000 }) {
  let socket;
  let connected = false;
  let stopped = false;
  let reconnectTimer;
  let hideTimer;
  let itemId;
  let counter = 0;
  let visibilityRevision = 0;
  let lastInputText = '';
  let lastInputTime = 0;
  const pending = new Map();

  function send(op, d) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ op, d }));
  }

  function request(requestType, requestData) {
    if (!connected) return Promise.resolve(null);
    const requestId = `proyector-${++counter}`;
    return new Promise(resolve => {
      const timer = setTimeout(() => { pending.delete(requestId); resolve(null); }, 3000);
      pending.set(requestId, response => {
        clearTimeout(timer);
        resolve(response?.requestStatus?.result ? response.responseData || {} : null);
      });
      send(6, { requestId, requestType, requestData });
    });
  }

  async function setVisible(visible, revision = visibilityRevision) {
    if (itemId == null) {
      const response = await request('GetSceneItemList', { sceneName: config.scene });
      itemId = response?.sceneItems?.find(item => item.sourceName === config.group)?.sceneItemId;
    }
    if (itemId == null || revision !== visibilityRevision) return;
    await request('SetSceneItemEnabled', {
      sceneName: config.scene, sceneItemId: itemId, sceneItemEnabled: visible
    });
  }

  async function show(payload) {
    if (!connected) return;
    const revision = ++visibilityRevision;
    clearTimeout(hideTimer);
    const text = payload.fullText || payload.text || payload.theme || `${payload.book || ''} ${payload.chapterVerse || ''}`;
    lastInputText = text.trim();
    lastInputTime = Date.now();
    await request('SetInputSettings', { inputName: config.source, inputSettings: { text: lastInputText } });
    if (revision !== visibilityRevision) return;
    await setVisible(true, revision);
    const duration = payload.durationMs ?? getDuration(payload.type);
    if (duration > 0) hideTimer = setTimeout(() => setVisible(false, revision), duration);
  }

  async function hide() {
    visibilityRevision++;
    clearTimeout(hideTimer);
    await setVisible(false);
  }

  function connect() {
    if (stopped) return;
    socket = new WebSocket(`ws://${config.address}`);
    socket.on('message', raw => {
      try {
        const message = JSON.parse(raw);
        if (message.op === 0) {
          const authentication = message.d?.authentication;
          const identify = { rpcVersion: 1, eventSubscriptions: 255 };
          if (authentication) {
            const hash = text => crypto.createHash('sha256').update(text).digest('base64');
            identify.authentication = hash(hash(config.password + authentication.salt) + authentication.challenge);
          }
          send(1, identify);
        } else if (message.op === 2) {
          connected = true;
          onConnection(true);
          itemId = undefined;
          if (Array.isArray(config.browserSources)) {
            for (const inputName of config.browserSources) {
              request('PressInputPropertiesButton', { inputName, propertyName: 'refreshnocache' }).catch(() => {});
            }
          }
        } else if (message.op === 7) {
          pending.get(message.d.requestId)?.(message.d);
          pending.delete(message.d.requestId);
        } else if (message.op === 5) {
          const { eventType, eventData } = message.d;
          if (eventType === 'CustomEvent') {
            if (eventData?.action === 'hide' || eventData?.type === 'hide') onHide();
            else if (eventData) onGraphic(eventData);
          } else if (eventType === 'InputSettingsChanged' && eventData?.inputName === config.source) {
            const text = String(eventData.inputSettings?.text || '').trim();
            if (text === lastInputText && Date.now() - lastInputTime < 5000) return;
            if (text) {
              onGraphic({ type: 'hymn', text });
              clearTimeout(hideTimer);
              const revision = ++visibilityRevision;
              setVisible(true, revision);
              const duration = getDuration('hymn');
              if (duration > 0) hideTimer = setTimeout(() => setVisible(false, revision), duration);
            }
            else { onHide(); hide(); }
          }
        }
      } catch (error) { console.warn('[OBS]', error.message); }
    });
    socket.on('error', () => {});
    socket.on('close', () => {
      connected = false;
      onConnection(false);
      for (const resolve of pending.values()) resolve(null);
      pending.clear();
      if (!stopped) reconnectTimer = setTimeout(connect, 4000);
    });
  }

  connect();
  return {
    show, hide,
    close() {
      stopped = true;
      clearTimeout(reconnectTimer);
      clearTimeout(hideTimer);
      for (const resolve of pending.values()) resolve(null);
      pending.clear();
      socket?.terminate();
    }
  };
}

module.exports = { createObsBridge, loadObsConfig };
