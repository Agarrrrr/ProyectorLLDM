const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createUpdateService } = require('../src/updates/service');

function setup(t, options) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-release-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(rootDir, 'package.json'), '{"version":"1.9.0"}');
  return { rootDir, service: createUpdateService({ rootDir, ...options }) };
}

const installer = {
  name: 'Proyector-LLDM-Setup-1.10.0.exe',
  state: 'uploaded',
  size: 1234,
  browser_download_url: 'https://otro.example/installer.exe'
};
const response = (fields = {}) => ({
  ok: true, json: async () => ({ tag_name: 'v1.10.0', body: 'Notas', assets: [installer], ...fields })
});

test('ZIP consulta una sola vez y enlaza la publicación estable', async t => {
  let calls = 0;
  const { rootDir, service } = setup(t, { fetchRelease: async () => { calls++; return response(); } });
  const result = await service.checkAtStartup();
  assert.equal(result.downloadUrl, 'https://github.com/HuriTolentino/ProyectorLLDM/releases/tag/v1.10.0');
  assert.equal(result.patchNotes, 'Notas');
  assert.deepEqual(await service.checkAtStartup(), result);
  assert.equal(calls, 1);
  assert.deepEqual(fs.readdirSync(rootDir), ['package.json']);
});

test('Windows ofrece el EXE exacto y solo consulta metadatos', async t => {
  const requested = [];
  const { rootDir, service } = setup(t, { installed: true, fetchRelease: async url => {
    requested.push(url);
    return response();
  } });
  const result = await service.checkAtStartup();
  assert.equal(result.available, true);
  assert.equal(result.installed, true);
  assert.equal(result.downloadUrl, 'https://github.com/HuriTolentino/ProyectorLLDM/releases/download/v1.10.0/Proyector-LLDM-Setup-1.10.0.exe');
  assert.deepEqual(requested, ['https://api.github.com/repos/HuriTolentino/ProyectorLLDM/releases/latest']);
  assert.deepEqual(fs.readdirSync(rootDir), ['package.json']);
});

test('sin instalador publicado, el aviso de Windows no ofrece un enlace roto', async t => {
  for (const assets of [undefined, [], [{ ...installer, state: 'new' }], [{ ...installer, size: 0 }], [{ ...installer, name: 'otro.exe' }]]) {
    const { service } = setup(t, { installed: true, fetchRelease: async () => response({ assets }) });
    const result = await service.checkAtStartup();
    assert.equal(result.available, false);
    assert.equal(result.downloadUrl, undefined);
    assert.match(result.message, /aún no tiene un instalador/);
  }
});

test('ignora versiones anteriores, borradores, versiones de prueba y errores de red', async t => {
  for (const fetchRelease of [
    async () => { throw new Error('sin internet'); },
    async () => ({ status: 404 }),
    async () => response({ tag_name: 'v1.8.0' }),
    async () => response({ tag_name: 'v1.10.0-beta' }),
    async () => response({ prerelease: true }),
    async () => response({ draft: true })
  ]) {
    const { service } = setup(t, { installed: true, fetchRelease });
    const result = await service.checkAtStartup();
    assert.equal(result.available, false);
    assert.equal(result.downloadUrl, undefined);
    assert.equal(result.checking, undefined);
  }
});

test('desactivar un aviso descarta la respuesta pendiente y persiste la preferencia', async t => {
  let release;
  let calls = 0;
  const fetchRelease = () => { calls++; return new Promise(resolve => { release = resolve; }); };
  const { service, rootDir } = setup(t, { installed: true, fetchRelease });
  const pending = service.checkAtStartup();
  assert.equal(service.snapshot().checking, true);
  service.configure({ automaticChecks: false });
  release(response());
  assert.equal((await pending).available, false);
  assert.equal((await createUpdateService({ rootDir, installed: true, fetchRelease }).checkAtStartup()).available, false);
  assert.equal(calls, 1);
  assert.throws(() => service.configure({ automaticChecks: 'false' }), /no válida/);
  service.configure({ automaticChecks: true });
  release(response());
  assert.equal((await service.checkAtStartup()).available, true);
  assert.equal(calls, 2);
});
