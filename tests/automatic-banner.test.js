const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const WebSocket = require('ws');
const { createApplication } = require('../src/app');

test('enviar contenido a TV dispara OBS una vez; avanzar o preparar no repite el banner', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-auto-banner-'));
  const song = { id: '001', number: 1, title: 'Canto de prueba', sections: [
    { type: 'verse', label: 'Estrofa 1', lines: ['Cantamos al Señor'] },
    { type: 'chorus', label: 'Coro', lines: ['Gloria a Dios'] }
  ] };
  fs.writeFileSync(path.join(dir, 'himnario_lldm.json'), JSON.stringify([song]));
  fs.writeFileSync(path.join(dir, 'coro_lldm.json'), JSON.stringify([{ ...song, id: 'coro_001' }]));
  const application = createApplication({ dataDir: dir, uploadsDir: path.join(dir, 'uploads'), obs: false, watchFiles: false });
  await new Promise(resolve => application.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${application.server.address().port}`;
  const ws = new WebSocket(base.replace('http:', 'ws:') + '/ws?view=output');
  const events = [];
  ws.on('message', raw => events.push(JSON.parse(raw)));
  await once(ws, 'open');
  t.after(async () => { ws.terminate(); await application.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const post = async (route, data) => {
    const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    await response.arrayBuffer();
    // Wait for an ordered WebSocket round trip after the HTTP handler completes.
    const pong = once(ws, 'pong'); ws.ping(); await pong;
    return response.status;
  };
  const banners = () => events.filter(event => event.type === 'OVERLAY_EVENT').map(event => event.payload);
  assert.equal(await post('/api/project/hymn', { hymnId: '001' }), 200);
  assert.equal(banners().length, 1);
  assert.equal(banners()[0].text, '1 Canto de prueba');
  assert.equal(banners()[0].durationMs, 30000);
  await post('/api/control/action', { action: 'NEXT_SLIDE' });
  await post('/api/project/hymn', { hymnId: '001', startIndex: 2 });
  await post('/api/control/selection', { type: 'choir', id: 'coro_001' });
  assert.equal(banners().length, 1);
  assert.equal(await post('/api/project/hymn', { hymnId: 'missing' }), 404);
  assert.equal(banners().length, 1);
  await post('/api/project/hymn', { hymnId: '001', announce: true });
  assert.equal(banners().length, 2, 'el botón Enviar puede volver a mostrarlo');
  for (const [route, data, type] of [
    ['choir', { choirId: 'coro_001' }, 'choir'],
    ['bible', { book: 'Juan', chapter: 3, verse: 14 }, 'bible'],
    ['theme', { title: 'La fe' }, 'theme'],
    ['special', { type: 'Carta Apostólica', date: 'Fecha', location: 'Lugar' }, 'special'],
    ['custom', { text: 'Aviso de prueba' }, 'custom'],
    ['drone', { location: 'Ubicación de prueba' }, 'drone']
  ]) {
    const before = banners().length;
    assert.equal(await post('/api/project/' + route, data), 200);
    assert.equal(banners().length, before + 1);
    assert.equal(banners().at(-1).type, type);
  }
  const bible = banners().find(banner => banner.type === 'bible');
  assert.equal(bible.fullText, 'Juan 3:14');
  await post('/api/control/action', { action: 'CLEAR_PROJECTION' });
  await post('/api/project/drone', { location: 'Ubicación de prueba' });
  assert.equal(banners().length, 9, 'un nuevo envío después de reposo vuelve a mostrar el banner');
});
