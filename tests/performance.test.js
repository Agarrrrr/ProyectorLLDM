const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const WebSocket = require('ws');
const http = require('node:http');
const { createBoundedCache } = require('../src/infrastructure/bounded-cache');
const { createStateStream, outputSnapshot } = require('../src/transport/state-stream');
const { createApplication } = require('../src/app');

test('la caché respeta ambos límites y expulsa primero la entrada menos usada', () => {
  const cache = createBoundedCache({ maxEntries: 2, maxBytes: 40 });
  cache.set('a', 'uno'); cache.set('b', 'dos'); cache.get('a'); cache.set('c', 'tres');
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.get('a'), 'uno');
  cache.set('demasiado', 'x'.repeat(100));
  assert.ok(cache.stats().bytes <= 40); assert.ok(cache.stats().entries <= 2);
});

test('una conexión lenta conserva solamente la última instantánea pendiente', () => {
  const sent = [], callbacks = [];
  const ws = { readyState: WebSocket.OPEN, bufferedAmount: 0, send(payload, callback) { sent.push(JSON.parse(payload)); callbacks.push(callback); } };
  const state = { revision: 0 };
  const stream = createStateStream({ wss: { clients: [ws] }, getState: () => state });
  stream.initial(ws);
  for (let i = 1; i <= 100; i++) { state.revision = i; stream.broadcast(); }
  assert.equal(sent.length, 1); callbacks.shift()();
  assert.equal(sent.length, 2); assert.equal(sent[1].state.revision, 100); callbacks.shift()();
  assert.equal(stream.stats().coalesced, 100);
  let closed;
  ws.bufferedAmount = 1024 * 1024 + 1; ws.close = code => { closed = code; };
  stream.broadcast(); assert.equal(closed, 1013);
});

test('salida ligera conserva la proyección, invalida cachés al editar y evita escrituras de preparación al avanzar', { timeout: 15000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-performance-'));
  const song = { id: '001', number: 1, title: 'Canto de prueba', sections: [
    { type: 'verse', label: 'Estrofa 1', lines: ['Cantamos juntos al Señor'] },
    { type: 'chorus', label: 'Coro', lines: ['Gloria al Señor'] }
  ] };
  for (const name of ['himnario_lldm.json', 'coro_lldm.json']) fs.writeFileSync(path.join(directory, name), JSON.stringify([song]));
  const instance = createApplication({ dataDir: directory, uploadsDir: path.join(directory, 'uploads'), obs: false, watchFiles: false });
  await new Promise(resolve => instance.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${instance.server.address().port}`;
  let full, output;
  t.after(async () => { full?.terminate(); output?.terminate(); await instance.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  const send = (url, body) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const first = await (await fetch(base + '/api/himnos/001')).json();
  await fetch(base + '/api/himnos/001');
  assert.ok(instance.performanceStats().songs.hits >= 1);
  assert.equal((await send('/api/project/hymn', { hymnId: '001' })).status, 200);
  function connect(query) {
    const ws = new WebSocket(base.replace('http:', 'ws:') + '/ws' + query);
    const received = once(ws, 'message'); return { ws, received };
  }
  const a = connect(''), b = connect('?view=output'); full = a.ws; output = b.ws;
  const fullText = (await a.received)[0].toString(), outputText = (await b.received)[0].toString();
  const fullState = JSON.parse(fullText).state, outputState = JSON.parse(outputText).state;
  assert.deepEqual(outputState.displayPayload, fullState.displayPayload);
  assert.equal(outputState.currentSlideIndex, fullState.currentSlideIndex);
  assert.equal(outputState.workspace, undefined);
  assert.equal(fullText.includes('"_idx"'), false);
  assert.ok(outputText.length < fullText.length);
  const workspaceFile = path.join(directory, 'control-workspace.json');
  const before = fs.statSync(workspaceFile).mtimeMs;
  const nextFull = once(full, 'message'), nextOutput = once(output, 'message');
  assert.equal((await send('/api/control/action', { action: 'NEXT_SLIDE' })).status, 200);
  const live = JSON.parse((await nextFull)[0]).state;
  const tv = JSON.parse((await nextOutput)[0]).state;
  assert.deepEqual(tv.displayPayload, live.displayPayload);
  assert.equal(fs.statSync(workspaceFile).mtimeMs, before);
  const again = await (await fetch(base + '/api/himnos/001')).json();
  assert.deepEqual(again.slides, first.slides);
  // Returning an API response must not mutate the cached source.
  again.slides[0].title = 'Mutación del cliente';
  assert.notEqual((await (await fetch(base + '/api/himnos/001')).json()).slides[0].title, again.slides[0].title);
  const updated = { title: 'Título corregido', sections: [{ type: 'verse', label: 'Estrofa 1', lines: ['Letra corregida para cantar'] }] };
  assert.equal((await send('/api/songs/himnos/001/save', updated)).status, 200);
  const edited = await (await fetch(base + '/api/himnos/001')).json();
  assert.equal(edited.slides[0].title, 'TÍTULO CORREGIDO');
  assert.ok(edited.slides.some(slide => slide.text.includes('Letra corregida')));
  const prepared = await (await fetch(base + '/api/state')).json();
  assert.equal(prepared.workspace.selections.hymn.item.title, updated.title);
  assert.equal(prepared.activeItem.title, song.title, 'editar la preparación no reemplaza la versión que sigue en TV');
  const data = outputSnapshot({ ...live, contentType: 'carteleria', slides: [{ listKey: 'oraciones', unused: 'heavy' }] });
  assert.deepEqual(data.slides, [{ listKey: 'oraciones' }]);
  assert.equal((await fetch(base + '/api/state', { headers: { Origin: 'https://foreign.example' } })).status, 403);
  const reboundStatus = await new Promise((resolve, reject) => {
    http.get(base + '/api/state', { headers: { Host: 'rebound.example' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
  });
  assert.equal(reboundStatus, 403);
});
