const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const crypto = require('node:crypto');
const { WebSocketServer } = require('ws');
const { createObsBridge } = require('../src/infrastructure/obs-bridge');
const { createPresentationService } = require('../src/presentations/service');

test('puente OBS autentica y controla el grupo sin reenviar ecos como nuevos gráficos', { timeout: 5000 }, async t => {
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await once(server, 'listening');
  const requests = [];
  const graphics = [];
  let identified;
  let client;
  let connected;
  const ready = new Promise(resolve => {
    connected = resolve;
    server.on('connection', socket => {
      client = socket;
      socket.send(JSON.stringify({ op: 0, d: { authentication: { salt: 'salt', challenge: 'challenge' } } }));
      socket.on('message', raw => {
        const message = JSON.parse(raw);
        if (message.op === 1) {
          identified = message.d;
          socket.send(JSON.stringify({ op: 2, d: {} }));

        } else if (message.op === 6) {
          requests.push(message.d);
          socket.send(JSON.stringify({ op: 7, d: {
            requestId: message.d.requestId, requestStatus: { result: true },
            responseData: message.d.requestType === 'GetSceneItemList' ? { sceneItems: [{ sourceName: 'grupo', sceneItemId: 0 }] } : {}
          } }));
          if (message.d.requestType === 'SetInputSettings') {
            socket.send(JSON.stringify({ op: 5, d: { eventType: 'InputSettingsChanged', eventData: {
              inputName: 'texto', inputSettings: message.d.requestData.inputSettings
            } } }));
          }
        }
      });
    });
  });
  const bridge = createObsBridge({ address: `127.0.0.1:${server.address().port}`, password: 'test-password', scene: 'escena', group: 'grupo', source: 'texto' }, {
    onGraphic: value => graphics.push(value), onHide() {}, onConnection: value => { if (value) connected(); }
  });
  t.after(async () => { bridge.close(); for (const socket of server.clients) socket.terminate(); await new Promise(resolve => server.close(resolve)); });
  await ready;
  const hash = text => crypto.createHash('sha256').update(text).digest('base64');
  assert.equal(identified.authentication, hash(hash('test-password' + 'salt') + 'challenge'));
  await bridge.show({ type: 'theme', theme: 'Tema de prueba' });
  assert.ok(requests.some(request => request.requestType === 'SetSceneItemEnabled' && request.requestData.sceneItemEnabled && request.requestData.sceneItemId === 0));
  assert.deepEqual(graphics, []);
  await bridge.hide();
  assert.equal(requests.at(-1).requestData.sceneItemEnabled, false);
  await bridge.show({ type: 'theme', theme: 'Sin cierre automático', durationMs: 0 });
  const before = requests.length;
  await new Promise(resolve => setTimeout(resolve, 70));
  assert.equal(requests.length, before, 'el modo manual no oculta el grupo');
  await bridge.show({ type: 'theme', theme: 'Con duración', durationMs: 40 });
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 1000;
    const check = () => {
      if (requests.at(-1).requestData.sceneItemEnabled === false) resolve();
      else if (Date.now() > deadline) reject(new Error('No se ocultó al vencer el tiempo'));
      else setTimeout(check, 10);
    };
    check();
  });
  const received = new Promise(resolve => {
    const check = () => graphics.length ? resolve() : setTimeout(check, 5);
    check();
  });
  client.send(JSON.stringify({ op: 5, d: { eventType: 'CustomEvent', eventData: { type: 'hymn', text: 'Otro sistema' } } }));
  await received;
  assert.equal(graphics[0].text, 'Otro sistema');
});

test('presentaciones persisten imágenes y limpian temporales cuando falla una importación', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-presentations-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const uploadsDir = path.join(dataDir, 'uploads');
  const service = createPresentationService({ dataDir, uploadsDir });
  const input = path.join(dataDir, 'input.png');
  fs.writeFileSync(input, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64'));
  const presentation = await service.createPresentationFromUploads([{ path: input, originalname: 'prueba.png' }]);
  assert.equal(presentation.totalSlides, 1);
  assert.equal(fs.existsSync(input), false);
  assert.equal(service.getPresentations()[0].id, presentation.id);
  const invalid = path.join(dataDir, 'input.txt');
  fs.writeFileSync(invalid, 'unsupported');
  await assert.rejects(service.createPresentationFromUploads([{ path: invalid, originalname: 'prueba.txt' }]), /Formato no compatible/);
  assert.equal(fs.existsSync(invalid), false);
  assert.equal(fs.readdirSync(uploadsDir).length, 1);
  assert.equal(service.deletePresentation(presentation.id), true);
  assert.deepEqual(service.getPresentations(), []);
});
