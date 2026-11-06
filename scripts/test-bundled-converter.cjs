const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const { setTimeout: delay } = require('node:timers/promises');
const { test } = require('node:test');
const { createPresentationService } = require('../src/presentations/service');

const root = path.resolve(__dirname, '..');
const bundledConverter = path.join(root, 'output', 'converter');
const testClasses = path.join(root, 'output', 'converter-build', 'test-classes');
const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');
const fixtureTypes = ['pdf', 'ppt', 'pptx'];

function windowsOnlyEnvironment() {
  const externalRuntimes = new Set(['path', 'java_home', 'jre_home', 'python_path', 'pythonhome', 'pythonpath']);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !externalRuntimes.has(key.toLowerCase())));
  env.Path = [path.join(process.env.SystemRoot, 'System32'), process.env.SystemRoot].join(path.delimiter);
  return env;
}

function makeSamples(storage) {
  execFileSync(path.join(bundledConverter, 'runtime', 'bin', 'java.exe'),
    ['-Djava.awt.headless=true', '-cp', [testClasses, path.join(bundledConverter, 'lib', '*')].join(path.delimiter),
      'SamplePresentations', storage]);
}

test('el runtime incluido convierte PDF, PPT y PPTX sin programas externos', async t => {
  const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector presentaciones-'));
  t.after(() => fs.rmSync(storage, { recursive: true, force: true }));
  makeSamples(storage);
  const uploadsDir = path.join(storage, 'presentations');
  const service = createPresentationService({ dataDir: path.join(storage, 'data'), uploadsDir, bundledConverter, maxEdge: 1280 });

  for (const ext of fixtureTypes) {
    await t.test(ext, async () => {
      const originalname = 'sample.' + ext;
      const source = path.join(storage, originalname);
      const result = await service.createPresentationFromUploads([{ path: source, originalname }]);
      assert.equal(result.totalSlides, 2);
      const [first, second] = result.slides.map(({ imageUrl }) => fs.readFileSync(path.join(uploadsDir, result.id, path.basename(imageUrl))));
      assert.notDeepEqual(first, second);
      for (const image of [first, second]) {
        assert.deepEqual(image.subarray(0, 8), pngSignature);
        assert.equal(Math.max(image.readUInt32BE(16), image.readUInt32BE(20)), 1280);
      }
      assert.equal(fs.existsSync(source), false);
    });
  }
  await t.test('un archivo corrupto no deja una presentación incompleta', async () => {
    const badFile = path.join(storage, 'incompleto.pptx');
    fs.writeFileSync(badFile, 'truncated');
    await assert.rejects(service.createPresentationFromUploads([{ path: badFile, originalname: 'incompleto.pptx' }]), /No se pudo convertir/);
    assert.equal(service.getPresentations().length, 3);
    assert.equal(fs.readdirSync(uploadsDir).length, 3);
    assert.equal(fs.existsSync(badFile), false);
  });
  for (const filename of ['protected.pdf', 'too-many-pages.pdf']) {
    await t.test(`rechaza ${filename} sin afectar las presentaciones guardadas`, async () => {
      const source = path.join(storage, filename);
      await assert.rejects(service.createPresentationFromUploads([{ path: source, originalname: filename }]), /No se pudo convertir/);
      assert.equal(service.getPresentations().length, 3);
      assert.equal(fs.readdirSync(uploadsDir).length, 3);
      assert.equal(fs.existsSync(source), false);
    });
  }
});

if (process.argv.includes('--app')) {
  test('la aplicación empaquetada importa y sirve los tres formatos', { timeout: 60000 }, async t => {
    const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'Proyección de prueba-'));
    let child, stopped;
    t.after(async () => {
      try {
        if (child?.pid && child.exitCode === null && child.signalCode === null) {
          execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
          await stopped;
        }
      } finally {
        fs.rmSync(storage, { recursive: true, force: true, maxRetries: 5 });
      }
    });
    makeSamples(storage);
    const socket = net.createServer();
    socket.listen(Number(process.env.PROYECTOR_TEST_PORT) || 0, '127.0.0.1');
    await once(socket, 'listening');
    const { port } = socket.address();
    await new Promise(resolve => socket.close(resolve));
    const exe = process.env.PROYECTOR_TEST_EXE || path.join(root, 'output', 'windows', 'win-unpacked', 'Proyector LLDM.exe');
    child = spawn(exe, [`--user-data-dir=${path.join(storage, 'profile')}`], {
      env: { ...windowsOnlyEnvironment(), PORT: String(port), PRESENTATION_MAX_EDGE: '1280' },
      stdio: 'ignore',
      windowsHide: true
    });
    stopped = once(child, 'exit').catch(error => { console.error(error.message); });
    const base = `http://127.0.0.1:${port}`;
    let updates;
    for (let attempt = 0; attempt < 100 && child.exitCode === null; attempt++) {
      try {
        const response = await fetch(base + '/api/updates', { signal: AbortSignal.timeout(500) });
        if (response.ok) { updates = await response.json(); break; }
      } catch {}
      await delay(250);
    }
    assert.ok(updates, 'la aplicación debe iniciar la cabina');
    assert.equal(updates.installed, true);
    assert.equal(updates.current, require('../package.json').version);
    assert.equal(updates.preferences.automaticChecks, true);
    for (const route of ['/control', '/pantalla', '/overlay?obs=1', '/carteleria/']) {
      const page = await fetch(base + route);
      assert.equal(page.status, 200, route);
      assert.match(page.headers.get('content-type'), /text\/html/, route);
    }
    for (const ext of fixtureTypes) {
      const filename = 'sample.' + ext;
      const form = new FormData();
      form.append('files', new Blob([fs.readFileSync(path.join(storage, filename))]), filename);
      const uploaded = await fetch(base + '/api/presentations/upload', { method: 'POST', body: form });
      const body = await uploaded.json();
      assert.equal(uploaded.status, 200, JSON.stringify(body));
      assert.equal(body.presentation.totalSlides, 2);
      const image = await fetch(base + body.presentation.slides[0].imageUrl);
      assert.equal(image.status, 200);
      assert.deepEqual(Buffer.from(await image.arrayBuffer()).subarray(0, 8), pngSignature);
    }
    const corrupt = new FormData();
    corrupt.append('files', new Blob(['invalid PDF']), 'dañado.pdf');
    const rejected = await fetch(base + '/api/presentations/upload', { method: 'POST', body: corrupt });
    assert.equal(rejected.status, 500);
    assert.match((await rejected.json()).error, /No se pudo convertir/);
    const saved = await (await fetch(base + '/api/presentations')).json();
    assert.equal(saved.length, fixtureTypes.length);
  });
}
