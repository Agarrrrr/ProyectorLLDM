const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApplication } = require('../src/app');

test('ajustes, preparación y posición sobreviven al reinicio; los datos de iglesia se usan al proyectar', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-settings-'));
  const song = { id: '001', number: 1, title: 'Prueba', sections: [{ type: 'verse', label: 'Estrofa 1', lines: ['Cantamos juntos al Señor'] }] };
  fs.writeFileSync(path.join(dataDir, 'himnario_lldm.json'), JSON.stringify([song]));
  fs.writeFileSync(path.join(dataDir, 'coro_lldm.json'), JSON.stringify([{ ...song, id: 'coro_001' }]));
  let instance;
  async function start() {
    instance = createApplication({ dataDir, uploadsDir: path.join(dataDir, 'uploads'), watchFiles: false, obs: false });
    await new Promise(resolve => instance.server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${instance.server.address().port}`;
  }
  t.after(async () => { await instance?.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  let base = await start();
  const get = async url => (await fetch(base + url)).json();
  const send = (url, body, method = 'POST') => fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const initial = await get('/api/settings');
  const settings = structuredClone(initial.settings);
  settings.church = { name: 'La Luz del Mundo', address: 'Colonia Central', city: 'Ensenada' };
  settings.keyboard.nextSlide = ['KeyN', 'Space'];
  assert.equal(settings.operator.showLyricsEditor, false);
  settings.operator.showLyricsEditor = true;
  settings.graphics = { background: 'classic', bannerStyle: 'angular', bannerTone: 'ivory', bannerPosition: 'bottom-right', logoColor: 'white', logoPosition: 'top-left', logoSize: 180, bannerDurationSeconds: 12, locationDurationSeconds: 0 };
  assert.equal((await send('/api/settings', { revision: initial.revision, settings }, 'PUT')).status, 200);
  assert.equal((await send('/api/settings', { revision: initial.revision, settings }, 'PUT')).status, 409);
  const renamed = structuredClone(settings); renamed.church.name = 'Otro nombre';
  assert.equal((await send('/api/settings', { revision: 1, settings: renamed }, 'PUT')).status, 400);
  assert.equal((await send('/api/settings', { revision: 1, settings: { ...settings, operator: { showLyricsEditor: 'true' } } }, 'PUT')).status, 400);
  for (const graphics of [{ ...settings.graphics, logoSize: 9999 }, { ...settings.graphics, logoColor: 'unknown' }, { ...settings.graphics, bannerPosition: 'outside' }]) {
    assert.equal((await send('/api/settings', { revision: 1, settings: { ...settings, graphics } }, 'PUT')).status, 400);
  }
  for (const value of [-1, 3601, 1.5, null, '30']) {
    assert.equal((await send('/api/settings', { revision: 1, settings: { ...settings, graphics: { ...settings.graphics, bannerDurationSeconds: value } } }, 'PUT')).status, 400);
  }
  const invalid = structuredClone(settings); invalid.keyboard.previousSlide = ['KeyN'];
  assert.equal((await send('/api/settings', { revision: 1, settings: invalid }, 'PUT')).status, 400);
  invalid.keyboard.previousSlide = ['Escape'];
  assert.equal((await send('/api/settings', { revision: 1, settings: invalid }, 'PUT')).status, 400);
  assert.equal((await send('/api/project/theme', { title: 'La fe' })).status, 200);
  assert.equal((await get('/api/state')).displayPayload.subtitle, 'La Luz del Mundo • Colonia Central');
  await send('/api/control/selection', { type: 'hymn', id: '001' });
  await send('/api/control/selection', { type: 'choir', id: 'coro_001' });
  await send('/api/control/drafts', { themeInput: 'Preparado para después', activeTab: 'tab-coro' }, 'PATCH');
  await send('/api/project/choir', { choirId: 'coro_001', startIndex: 1 });
  await instance.close();
  base = await start();
  const restored = await get('/api/state');
  assert.deepEqual((await get('/api/settings')).settings, settings);
  assert.equal(restored.workspace.selections.hymn.item.id, '001');
  assert.equal(restored.workspace.selections.choir.item.id, 'coro_001');
  assert.equal(restored.workspace.drafts.themeInput, 'Preparado para después');
  assert.equal(restored.workspace.drafts.activeTab, 'tab-coro');
  assert.equal(restored.currentSlideIndex, 1);
  assert.equal(restored.contentType, 'choir');
  assert.equal(restored.phase, 'idle');
  assert.equal(restored.displayPayload.type, 'idle');
});
