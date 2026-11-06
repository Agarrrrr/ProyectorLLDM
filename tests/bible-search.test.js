const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApplication } = require('../src/app');

test('el buscador de texto bíblico respeta la versión seleccionada', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-bible-search-'));
  let instance;
  t.after(async () => { await instance?.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  instance = createApplication({ dataDir, uploadsDir: path.join(dataDir, 'uploads'), watchFiles: false, obs: false });
  await new Promise(resolve => instance.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${instance.server.address().port}`;
  const factory = path.join(__dirname, '..', 'data', 'factory', 'biblia');
  const verse = id => Object.values(JSON.parse(fs.readFileSync(path.join(factory, id + '.json'), 'utf8')).books)[0]['1']['1'];
  const rvr = verse('RVR1960'), ntv = verse('NTV');
  assert.notEqual(rvr, ntv);
  for (const [version, expected] of [['RVR1960', rvr], ['NTV', ntv]]) {
    const query = expected.slice(0, 40);
    const data = await (await fetch(`${base}/api/biblia/search?${new URLSearchParams({ q: query, version, limit: '5' })}`)).json();
    assert.equal(data.version, version);
    assert.ok(data.results.some(item => item.text === expected), `Debe devolver el texto de ${version}`);
  }
});
