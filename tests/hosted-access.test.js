const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { request } = require('node:http');
const { once } = require('node:events');
const WebSocket = require('ws');
const { createApplication } = require('../src/app');

test('la cabina web protege el control y permite pantallas y dispositivos enlazados', async t => {
  const storage = await mkdtemp(path.join(tmpdir(), 'proyector-web-'));
  const origin = 'https://cabina.example.test';
  const host = new URL(origin).host;
  const operatorKey = 'a'.repeat(43);
  const outputKey = 'b'.repeat(43);
  const instance = createApplication({
    dataDir: path.join(storage, 'data'), uploadsDir: path.join(storage, 'uploads'),
    watchFiles: false, hosted: { origin, operatorKey, outputKey }
  });
  t.after(async () => {
    await instance.close();
    await rm(storage, { recursive: true, force: true });
  });
  instance.server.listen(0, '127.0.0.1');
  await once(instance.server, 'listening');
  const port = instance.server.address().port;
  const call = (pathname, { method = 'GET', body, cookie, from = origin } = {}) =>
    new Promise((resolve, reject) => {
      const payload = body === undefined ? '' : JSON.stringify(body);
      const headers = { host, origin: from };
      if (cookie) headers.cookie = cookie;
      if (body !== undefined) Object.assign(headers, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) });
      const req = request({ host: '127.0.0.1', port, path: pathname, method, headers }, res => {
        let content = '';
        res.setEncoding('utf8').on('data', chunk => { content += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, content }));
      });
      req.on('error', reject);
      req.end(payload);
    });
  const signIn = async (key, destination) => {
    const response = await call('/api/web/session', { method: 'POST', body: { key, destination } });
    assert.equal(response.status, 200);
    const cookie = response.headers['set-cookie'][0];
    assert.match(cookie, /Secure/);
    assert.match(cookie, /HttpOnly/);
    assert.ok(!cookie.includes(key));
    return cookie.split(';')[0];
  };
  assert.equal((await call('/control')).headers.location, '/acceso.html');
  assert.equal((await call('/api/settings')).status, 403);
  assert.equal((await call('/api/web/session', {
    method: 'POST', from: 'https://otro.example.test', body: { key: operatorKey, destination: '/control' }
  })).status, 403);
  const operator = await signIn(operatorKey, '/control');
  const output = await signIn(outputKey, '/pantalla');
  assert.equal((await call('/control', { cookie: output })).status, 302);
  assert.equal((await call('/pantalla', { cookie: output })).status, 200);
  assert.equal((await call('/api/project/theme', { method: 'POST', cookie: output, body: { title: 'Prueba' } })).status, 403);

  const screen = new WebSocket('ws://127.0.0.1:' + port + '/ws?view=output', { origin, headers: { host, cookie: output } });
  const firstState = once(screen, 'message');
  await firstState;
  const projected = once(screen, 'message');
  const sent = await call('/api/project/theme', { method: 'POST', cookie: operator, body: { title: 'Tema de prueba' } });
  assert.equal(sent.status, 200);
  assert.match(String((await projected)[0]), /Tema de prueba/);

  const invitation = await call('/api/mobile/invite', { method: 'POST', cookie: operator });
  assert.equal(invitation.status, 200);
  const link = new URL(JSON.parse(invitation.content).url);
  assert.equal(link.origin, origin);
  const joined = await call('/api/mobile/join', { method: 'POST', body: { code: link.hash.slice(1), label: 'Tablet' } });
  assert.equal(joined.status, 200);
  const mobile = joined.headers['set-cookie'][0].split(';')[0];
  assert.equal((await call('/api/state', { cookie: mobile })).status, 200);
  const devices = await call('/api/mobile/sessions', { cookie: operator });
  const [device] = JSON.parse(devices.content);
  assert.equal(device.label, 'Tablet');
  assert.equal((await call('/api/mobile/sessions/' + device.id, { method: 'DELETE', cookie: operator })).status, 204);
  assert.equal((await call('/api/state', { cookie: mobile })).status, 403);
});
