const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const WebSocket = require('ws');
const { createListsService, slideKeys } = require('../src/lists/service');
const { createApplication } = require('../src/app');
const { paginateSection, MIN_FONT } = require('../src/songs/section-layout');

const week = () => ({ startDate: '2026-11-01', oraciones: { encargada9AM: '', ...Object.fromEntries(['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'].map(day => [day, Array(day === 'jue' ? 7 : 4).fill('')])) }, flores: [], ventas: { startingCycleIndex: 0, sundays: [] } });

test('listas persisten; ediciones concurrentes de campos distintos se combinan y los conflictos se rechazan', t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lists-store-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const events = [];
  const store = createListsService({ dataDir, onChange: snapshot => events.push(snapshot) });
  store.patch([{ path: ['currentWeek'], before: null, value: week() }]);
  store.patch([{ path: ['currentWeek', 'oraciones', 'encargada9AM'], before: '', value: 'Ana' }]);
  store.patch([{ path: ['currentWeek', 'oraciones', 'lun', '0'], before: '', value: 'Pedro' }]);
  assert.throws(() => store.patch([{ path: ['currentWeek', 'oraciones', 'encargada9AM'], before: '', value: 'Otro' }]), { status: 409 });
  assert.throws(() => store.patch([{ path: ['weeks', '__proto__'], before: null, value: {} }]), { status: 400 });
  const restored = createListsService({ dataDir, onChange() {} }).getState();
  assert.equal(restored.document.currentWeek.oraciones.encargada9AM, 'Ana');
  assert.equal(restored.document.currentWeek.oraciones.lun[0], 'Pedro');
  assert.equal(restored.revision, 3);
  assert.equal(events.length, 3);
  store.patch([{ path: ['customSalesGroups'], before: null, value: ['Grupo A', 'Grupo B', 'Grupo C'] }]);
  assert.deepEqual(createListsService({ dataDir, onChange() {} }).getState().document.customSalesGroups, ['Grupo A', 'Grupo B', 'Grupo C']);

});

test('las fechas especiales y los campos persisten y el aviso tiene su propia vista', t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lists-custom-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const store = createListsService({ dataDir, onChange() {} });
  const current = week();
  current.notice = { text: 'Primera línea\n*Aviso*', align: 'left', position: 'top', size: 'large' };
  current.flores = Array.from({ length: 5 }, () => ({ date: '2028-02-29', dateStr: 'Martes, 29 de febrero de 2028', dateLocked: true, names: 'Responsable', fields: [{ label: 'Ocasión', value: 'Servicio especial' }] }));
  store.patch([{ path: ['currentWeek'], before: null, value: current }]);
  assert.deepEqual(slideKeys(current).slice(-4), ['mensaje_flores', 'flores', 'flores:1', 'flores:2']);
  current.visibleSlides = { flores: false };
  assert.ok(slideKeys(current).includes('mensaje_flores'));
  assert.throws(() => store.patch([{ path: ['currentWeek', 'flores', '0', 'date'], before: '2028-02-29', value: '2027-02-29' }]), { status: 400 });
  assert.deepEqual(createListsService({ dataDir, onChange() {} }).getState().document.currentWeek.flores[0], current.flores[0]);
});

test('estrofas y repeticiones que caben permanecen completas, sin dividir palabras ni eliminar marcadores', () => {
  const lines = ['//Viva mi alma y alábate,', 'y tus juicios me ayuden//'];
  assert.equal(paginateSection(lines).length, 1);
  const long = [...Array.from({ length: 10 }, (_, i) => `Esta es la primera parte de la estrofa número ${i}`), ...lines, ...Array.from({ length: 10 }, (_, i) => `Esta es la última parte de la estrofa número ${i}`)];
  const slides = paginateSection(long);
  assert.ok(slides.length > 1);
  assert.ok(slides.some(slide => slide.lines.join(' ').includes(lines.join(' '))));
  assert.equal(slides.flatMap(slide => slide.lines).join(' '), long.join(' '));
  assert.ok(slides.every(slide => slide.fontSize >= MIN_FONT));
});

test('una repetición extensa se ajusta como bloque completo aunque supere el tamaño habitual', () => {
  const repeat = '///' + 'Alabamos juntos con gozo al Señor. '.repeat(10).trim() + '///';
  const text = 'Entrada del canto. ' + repeat + ' Cierre del canto.';
  const slides = paginateSection([text], { fontSize: 207, minFontSize: 156, maxLines: 6 });
  const repeatSlide = slides.find(slide => slide.lines.includes(repeat));
  assert.ok(repeatSlide);
  assert.ok(repeatSlide.fontSize < 156);
  assert.ok(repeatSlide.height <= 980 && repeatSlide.maxLineWidth <= 1740);
  assert.equal(slides.flatMap(slide => slide.lines).join(' '), text);
});

test('la duración de las listas migra, se valida y persiste sin modificar las semanas', t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lists-duration-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dataDir, 'lista-oraciones.json'), JSON.stringify({ revision: 4, document: { currentWeek: week(), customSalesGroups: null, weeks: {} } }));
  const store = createListsService({ dataDir, onChange() {} });
  const originalWeek = store.getState().document.currentWeek;
  assert.equal(store.getState().document.rotationSeconds, 15);
  store.patch([{ path: ['rotationSeconds'], before: 15, value: 2 }]);
  for (const value of [0, 601, 2.5, '15', null]) assert.throws(() => store.patch([{ path: ['rotationSeconds'], before: 2, value }]), { status: 400 });
  assert.throws(() => store.patch([{ path: ['rotationSeconds'], before: 15, value: 3 }]), { status: 409 });
  const restored = createListsService({ dataDir, onChange() {} }).getState();
  assert.equal(restored.document.rotationSeconds, 2);
  assert.deepEqual(restored.document.currentWeek, originalWeek);
});

test('cambiar la duración reinicia el reloj compartido conservando la vista y la pausa', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lists-clock-duration-'));
  for (const file of ['himnario_lldm.json', 'coro_lldm.json']) fs.writeFileSync(path.join(dataDir, file), '[]');
  const app = createApplication({ dataDir, uploadsDir: path.join(dataDir, 'uploads'), watchFiles: false, obs: false });
  let client;
  t.after(async () => { client?.terminate(); await app.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const call = async (url, body, method = 'POST') => {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, 200); return response.json();
  };
  await call('/api/lists', { operations: [{ path: ['currentWeek'], before: null, value: week() }, { path: ['rotationSeconds'], before: 15, value: 1 }] }, 'PATCH');
  await call('/api/project/carteleria', { loop: true });
  client = new WebSocket(base.replace('http:', 'ws:') + '/ws');
  await once(client, 'message');
  const advance = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('El reloj no avanzó con la duración guardada.')), 2500);
    client.on('message', raw => { const data = JSON.parse(raw); if (data.state?.currentSlideIndex === 1) { clearTimeout(timeout); resolve(); } });
  });
  await advance;
  await call('/api/lists', { operations: [{ path: ['rotationSeconds'], before: 1, value: 2 }] }, 'PATCH');
  await new Promise(resolve => setTimeout(resolve, 1200));
  const unchanged = await (await fetch(base + '/api/state')).json();
  assert.equal(unchanged.currentSlideIndex, 1); assert.equal(unchanged.isLooping, true);
  assert.equal((await (await fetch(base + '/api/carteleria/info')).json()).rotationSeconds, 2);
  await call('/api/project/carteleria/playback', { playing: false });
  await call('/api/lists', { operations: [{ path: ['rotationSeconds'], before: 2, value: 1 }] }, 'PATCH');
  await new Promise(resolve => setTimeout(resolve, 1200));
  const paused = await (await fetch(base + '/api/state')).json();
  assert.equal(paused.currentSlideIndex, 1); assert.equal(paused.isLooping, false);
});

test('lista utiliza un reloj del servidor; la pausa, el fondo y las reconexiones conservan el mismo índice', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lists-network-'));
  fs.writeFileSync(path.join(dataDir, 'himnario_lldm.json'), '[]');
  fs.writeFileSync(path.join(dataDir, 'coro_lldm.json'), '[]');
  const dist = path.join(dataDir, 'dist'); fs.mkdirSync(dist); fs.writeFileSync(path.join(dist, 'index.html'), '<html></html>');
  const app = createApplication({ dataDir, uploadsDir: path.join(dataDir, 'uploads'), carteleriaDir: dist, watchFiles: false, obs: false, listIntervalMs: 100 });
  t.after(async () => { await app.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const call = async (url, body, method = 'POST') => {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, 200); return response.json();
  };
  await call('/api/lists', { operations: [{ path: ['currentWeek'], before: null, value: week() }] }, 'PATCH');
  const projected = await call('/api/project/carteleria', { loop: false });
  assert.equal(projected.state.slides.length, 3);
  await call('/api/control/action', { action: 'NEXT_SLIDE' });
  const late = new WebSocket(base.replace('http:', 'ws:') + '/ws');
  const [initial] = await once(late, 'message');
  assert.equal(JSON.parse(initial).state.currentSlideIndex, 1);
  const advanced = new Promise(resolve => late.on('message', raw => {
    const message = JSON.parse(raw);
    if (message.state?.currentSlideIndex === 2) resolve(message.state);
  }));
  await call('/api/project/carteleria/toggle-loop', {});
  assert.equal((await advanced).slides[2].listKey, 'tarde');
  await call('/api/project/carteleria/playback', { playing: false });
  const paused = await (await fetch(base + '/api/state')).json();
  await call('/api/project/carteleria/playback', { playing: false });
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal((await (await fetch(base + '/api/state')).json()).currentSlideIndex, paused.currentSlideIndex);
  await call('/api/control/action', { action: 'CLEAR_PROJECTION' });
  await new Promise(resolve => setTimeout(resolve, 250));
  const state = await (await fetch(base + '/api/state')).json();
  assert.equal(state.phase, 'idle'); assert.equal(state.currentSlideIndex, 0); assert.equal(state.isLooping, false);
});
