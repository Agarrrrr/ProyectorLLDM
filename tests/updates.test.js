const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createUpdateService } = require('../src/updates/service');

test('una instalación ZIP consulta una sola vez y ofrece la versión estable sin modificar archivos', async t => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-release-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(rootDir, 'package.json'), '{"version":"1.9.0"}');
  let calls = 0;
  const service = createUpdateService({ rootDir, fetchRelease: async () => {
    calls++;
    return { ok: true, json: async () => ({ tag_name: 'v1.10.0', body: 'Notas', html_url: 'https://otro.example' }) };
  } });
  const result = await service.checkAtStartup();
  assert.equal(result.available, true);
  assert.equal(result.downloadUrl, 'https://github.com/HuriTolentino/ProyectorLLDM/releases/tag/v1.10.0');
  assert.equal(result.patchNotes, 'Notas');
  assert.deepEqual(await service.checkAtStartup(), result);
  assert.equal(calls, 1);
  assert.deepEqual(fs.readdirSync(rootDir), ['package.json']);
  service.configure({ automaticChecks: false });
  const disabled = createUpdateService({ rootDir, fetchRelease: async () => { calls++; } });
  await disabled.checkAtStartup();
  assert.equal(calls, 1);
  assert.throws(() => service.configure({ automaticChecks: 'false' }), /no válida/);
});

test('sin conexión o sin una versión estable posterior, la cabina conserva su versión', async () => {
  const rootDir = path.resolve(__dirname, '..');
  for (const fetchRelease of [
    async () => { throw new Error('Sin internet'); },
    async () => ({ status: 404 }),
    async () => ({ ok: true, json: async () => ({ tag_name: 'v0.9.0' }) }),
    async () => ({ ok: true, json: async () => ({ tag_name: 'v2.0.0', prerelease: true }) })
  ]) {
    const service = createUpdateService({ rootDir, dataDir: path.join(rootDir, 'tests', 'fixtures-unused'), fetchRelease });
    assert.equal((await service.checkAtStartup()).available, false);
    assert.equal(service.snapshot().downloadUrl, undefined);
  }
});
