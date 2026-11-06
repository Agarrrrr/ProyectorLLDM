const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

test('arranque real, prevención de doble instancia y modo ZIP sin impedir la cabina', { timeout: 30000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-startup-'));
  const root = path.resolve(__dirname, '..');
  fs.cpSync(path.join(root, 'src'), path.join(directory, 'src'), { recursive: true });
  fs.copyFileSync(path.join(root, 'server.js'), path.join(directory, 'server.js'));
  fs.copyFileSync(path.join(root, 'package.json'), path.join(directory, 'package.json'));
  fs.writeFileSync(path.join(directory, 'release-fixture.js'), 'global.fetch = async () => ({ status: 404 });');
  fs.mkdirSync(path.join(directory, 'data'));
  const preferences = path.join(directory, 'data', 'update-preferences.json');
  fs.writeFileSync(preferences, JSON.stringify({ automaticChecks: false, applyOnStartup: false }));
  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const children = new Set();
  t.after(async () => {
    await Promise.all([...children].map(async child => { if (child.exitCode === null && child.signalCode === null) { const stopped = once(child, 'exit'); child.kill(); await stopped; } }));
    try { fs.rmSync(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
  });
  function launch() {
    const child = spawn(process.execPath, ['--require', './release-fixture.js', 'server.js'], { cwd: directory, env: { ...process.env, NODE_PATH: path.join(root, 'node_modules'), PORT: String(port), PROYECTOR_OPEN_BROWSER: '0' }, windowsHide: true });
    children.add(child); child.output = '';
    child.stdout.on('data', chunk => { child.output += chunk; }); child.stderr.on('data', chunk => { child.output += chunk; });
    return child;
  }
  const base = `http://127.0.0.1:${port}`;
  async function ready(child) {
    const end = Date.now() + 10000;
    while (Date.now() < end) {
      if (child.exitCode !== null) throw new Error(child.output);
      try { const response = await fetch(base + '/api/state'); if (response.ok) return response.json(); } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('El servidor no inició: ' + child.output);
  }
  const first = launch(); assert.equal((await ready(first)).phase, 'idle');
  assert.equal((await fetch(base + '/api/updates/check', { method: 'POST' })).status, 404, 'no hay consulta manual durante la operación');
  const second = launch(); const [exit] = await once(second, 'exit');
  assert.equal(exit, 0); assert.match(second.output, /ya está en uso/);
  assert.equal((await (await fetch(base + '/api/state')).json()).phase, 'idle');
  const stopped = once(first, 'exit'); first.kill(); await stopped;
  fs.writeFileSync(preferences, JSON.stringify({ automaticChecks: true, applyOnStartup: true }));
  const third = launch(); assert.equal((await ready(third)).phase, 'idle');
  assert.match(third.output, /no hay una versión pública/i);
  assert.equal(fs.existsSync(path.join(directory, 'data', '.updates-startup.lock')), false);
});
