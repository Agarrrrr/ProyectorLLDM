const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { createApplication } = require('../src/app');

test('un puerto ocupado abre una sola cabina y anuncia el puerto que realmente escucha', async t => {
  const host = '127.0.0.1';
  const occupied = net.createServer();
  occupied.listen(0, host);
  await once(occupied, 'listening');
  const { port } = occupied.address();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'proyector-port-'));
  let application;
  t.after(async () => {
    if (application) await application.close();
    await new Promise(resolve => occupied.close(resolve));
    fs.rmSync(profile, { recursive: true, force: true });
  });
  const notified = [];
  let ready;
  const listening = new Promise(resolve => { ready = resolve; });
  application = createApplication({
    host, port, dataDir: path.join(profile, 'data'), uploadsDir: path.join(profile, 'presentations'),
    obs: false, watchFiles: false, onStarted(actualPort) {
      notified.push(actualPort);
      ready();
    }
  });
  application.start();
  await listening;
  const actualPort = application.server.address().port;
  assert.ok(actualPort > port);
  assert.deepEqual(notified, [actualPort]);
  assert.equal((await fetch(`http://${host}:${actualPort}/control`)).status, 200);
});
