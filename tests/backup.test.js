const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { test } = require('node:test');
const { createApplication } = require('../src/app');
const { applyPendingRestore } = require('../src/backup/service');
const yazl = require('yazl');

test('intercambio de catálogos y semanas, y restauración parcial al reiniciar', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-backup-'));
  const dataDir = path.join(root, 'data');
  const uploadsDir = path.join(root, 'uploads');
  fs.cpSync(path.join(__dirname, '../data/factory'), path.join(dataDir, 'factory'), { recursive: true });
  let app;
  let base;
  async function start() {
    app = createApplication({ dataDir, uploadsDir, port: 0, host: '127.0.0.1', watchFiles: false, obs: false });
    app.start();
    await once(app.server, 'listening');
    base = 'http://127.0.0.1:' + app.server.address().port;
  }
  t.after(async () => { await app?.close(); fs.rmSync(root, { recursive: true, force: true }); });
  await start();
  const get = route => fetch(base + route);
  const send = (route, body, method = 'POST') => fetch(base + route, {
    method,
    headers: { 'Content-Type': Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json' },
    body: Buffer.isBuffer(body) ? body : JSON.stringify(body)
  });
  for (const catalog of ['himnos', 'choir']) {
    const exported = await get('/api/library/' + catalog + '/export');
    assert.equal(exported.status, 200);
    const body = Buffer.from(await exported.arrayBuffer());
    const songs = JSON.parse(body);
    assert.ok(songs.length > 100);
    assert.ok(!songs.some(song => song._idx || song._summary));
    const imported = await send('/api/library/' + catalog + '/import?mode=replace', body);
    assert.equal(imported.status, 201, await imported.clone().text());
    assert.equal((await imported.json()).total, songs.length);
    assert.equal((await send('/api/library/' + catalog + '/import', Buffer.from(JSON.stringify(songs.slice(0, 1))))).status, 400);
    assert.equal((await send('/api/library/' + catalog + '/import?mode=replace', Buffer.from('[]'))).status, 400);
    assert.equal((await (await get('/api/library/' + catalog + '/export')).json()).length, songs.length);
  }
  const week = { startDate: '2027-01-04', oraciones: Object.fromEntries(['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'].map(day => [day, ['', '', '', '']])), flores: [], ventas: { startingCycleIndex: 0 } };
  assert.equal((await send('/api/lists/initialize', { currentWeek: week, customSalesGroups: null })).status, 200);
  const file = Buffer.from(await (await get('/api/lists/week/export')).arrayBuffer());
  assert.equal((await send('/api/lists/week/import', file)).status, 201);
  for (const ventas of [
    { startingCycleIndex: -1 },
    { startingCycleIndex: 0, sundays: [{ dateStr: '11/01/2027', groups: 'Grupo', cycleLabel: { text: 'Turno' } }] }
  ]) {
    const malformed = Buffer.from(JSON.stringify({ format: 'proyector-lldm-week', version: 1,
      week: { ...week, startDate: '2027-01-18', ventas } }));
    assert.equal((await send('/api/lists/week/import', malformed)).status, 400);
  }
  assert.equal((await get('/api/lists/week/export?date=2027-01-18')).status, 404);
  const conflict = await send('/api/lists/week/import', file);
  assert.equal(conflict.status, 409);
  const { revision } = await conflict.json();
  assert.equal((await send('/api/lists/week/import?replace=' + revision, file)).status, 201);
  assert.equal((await get('/api/lists/week/export?date=2027-01-04')).status, 200);

  const largeWeek = { ...week, startDate: '2027-01-11',
    flores: Array.from({ length: 160 }, () => ({ dateStr: '11/01/2027', names: 'a'.repeat(700) })) };
  const largeFile = Buffer.from(JSON.stringify({ format: 'proyector-lldm-week', version: 1, week: largeWeek }));
  assert.equal((await send('/api/lists/week/import', largeFile)).status, 201);
  const beforeLoad = (await (await get('/api/lists')).json()).document.currentWeek;
  assert.equal((await send('/api/lists', {
    operations: [{ path: ['currentWeek'], before: beforeLoad, value: largeWeek }]
  }, 'PATCH')).status, 200);

  const archive = new yazl.ZipFile();
  archive.addBuffer(Buffer.from('malicioso'), 'unknown.json');
  const chunks = [];
  const read = (async () => { for await (const chunk of archive.outputStream) chunks.push(chunk); })();
  archive.end();
  await read;
  assert.equal((await send('/api/backup/inspect', Buffer.concat(chunks))).status, 400);

  const damaged = new yazl.ZipFile();
  damaged.addBuffer(Buffer.from(JSON.stringify({ format: 'proyector-lldm-backup', version: 1, sections: ['choir'] })), 'manifest.json');
  const original = Buffer.from('[{"id":"test","title":"Canto íntegro","sections":[{"lines":["Una línea"]}]}]');
  damaged.addBuffer(original, 'coro_lldm.json', { compress: false });
  const damagedChunks = [];
  const readDamaged = (async () => { for await (const chunk of damaged.outputStream) damagedChunks.push(chunk); })();
  damaged.end();
  await readDamaged;
  const damagedZip = Buffer.concat(damagedChunks);
  const titleOffset = damagedZip.indexOf('Canto íntegro');
  assert.ok(titleOffset > 0);
  damagedZip[titleOffset] = 'S'.charCodeAt(0);
  assert.equal((await send('/api/backup/inspect', damagedZip)).status, 400);

  const invalidFont = new yazl.ZipFile();
  const id = 'font-0123456789abcdef01234567';
  const filename = id + '.woff2';
  const settingsWithFont = await (await get('/api/settings')).json();
  settingsWithFont.settings.lyrics.hymn.font = id;
  invalidFont.addBuffer(Buffer.from(JSON.stringify({ format: 'proyector-lldm-backup', version: 1, sections: ['settings'] })), 'manifest.json');
  invalidFont.addBuffer(Buffer.from(JSON.stringify(settingsWithFont)), 'settings.json');
  invalidFont.addBuffer(Buffer.from(JSON.stringify([{ id, filename, kind: 'font', name: 'Fuente inválida' }])), 'song-assets/index.json');
  invalidFont.addBuffer(Buffer.from('Esto no es una fuente'), 'song-assets/' + filename);
  const fontChunks = [];
  const readFont = (async () => { for await (const chunk of invalidFont.outputStream) fontChunks.push(chunk); })();
  invalidFont.end();
  await readFont;
  assert.equal((await send('/api/backup/inspect', Buffer.concat(fontChunks))).status, 400);

  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(path.join(__dirname, '../public/fonts/Montserrat-800.woff2'))]), 'Montserrat.woff2');
  assert.equal((await fetch(base + '/api/song-assets/font', { method: 'POST', body: form })).status, 200);
  const backup = await get('/api/backup?presentations=1');
  assert.equal(backup.status, 200);
  const inspect = await send('/api/backup/inspect', Buffer.from(await backup.arrayBuffer()));
  assert.equal(inspect.status, 200, await inspect.clone().text());
  const preview = await inspect.json();
  assert.deepEqual(preview.sections, ['settings', 'hymn', 'choir', 'lists', 'presentations']);
  const settings = await (await get('/api/settings')).json();
  settings.settings.church.city = 'Cambio local';
  assert.equal((await send('/api/settings', settings, 'PUT')).status, 200);
  assert.equal((await send('/api/backup/restore', { token: preview.token, sections: ['settings'] })).status, 200);
  assert.equal((await (await get('/api/backup/status')).json()).pending, true);
  assert.equal((await fetch(base + '/api/backup/restore', { method: 'DELETE' })).status, 200);
  assert.equal((await (await get('/api/backup/status')).json()).pending, false);
  const again = await send('/api/backup/inspect', Buffer.from(await (await get('/api/backup')).arrayBuffer()));
  const next = await again.json();
  const listsBefore = await (await get('/api/lists')).json();
  assert.equal((await send('/api/backup/restore', { token: next.token, sections: ['lists'] })).status, 200);
  assert.equal((await (await get('/api/settings')).json()).settings.church.city, 'Cambio local');
  assert.equal((await (await get('/api/lists')).json()).revision, listsBefore.revision);
  await app.close();
  app = null;
  await start();
  assert.equal((await (await get('/api/settings')).json()).settings.church.city, 'Cambio local');
  assert.ok((await (await get('/api/lists')).json()).revision > listsBefore.revision);
  assert.ok(fs.existsSync(path.join(dataDir, 'backups', 'restore-previous', 'lista-oraciones.json')));
  assert.equal((await get('/api/lists/week/export?date=2027-01-04')).status, 200);
});

test('el reinicio revierte una restauración interrumpida antes de confirmar', t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-restore-interrupted-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const pending = path.join(dataDir, 'restore-pending');
  const recovery = path.join(dataDir, 'backups', 'restore-previous');
  fs.mkdirSync(pending);
  fs.mkdirSync(recovery, { recursive: true });
  fs.writeFileSync(path.join(pending, 'apply.json'), '["hymn","choir"]');
  fs.writeFileSync(path.join(pending, 'journal.json'), '["himnario_lldm.json","coro_lldm.json"]');
  fs.writeFileSync(path.join(recovery, 'himnario_lldm.json'), 'himnario anterior');
  fs.writeFileSync(path.join(dataDir, 'himnario_lldm.json'), 'himnario importado');
  fs.writeFileSync(path.join(dataDir, 'coro_lldm.json'), 'coro anterior');
  fs.writeFileSync(path.join(pending, 'coro_lldm.json'), 'coro importado');
  applyPendingRestore(dataDir, path.join(dataDir, 'uploads'));
  assert.equal(fs.readFileSync(path.join(dataDir, 'himnario_lldm.json'), 'utf8'), 'himnario anterior');
  assert.equal(fs.readFileSync(path.join(dataDir, 'coro_lldm.json'), 'utf8'), 'coro anterior');
  assert.equal(fs.existsSync(path.join(pending, 'apply.json')), false);
});
