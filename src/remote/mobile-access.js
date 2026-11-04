const { randomBytes } = require('node:crypto');
const QRCode = require('qrcode');

const inviteAge = 5 * 60 * 1000;
const sessionAge = 8 * 60 * 60 * 1000;
const cookieName = 'proyector_mobile';
const token = () => randomBytes(32).toString('base64url');
const loopback = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

function createMobileAccess() {
  let invitation;
  const sessions = new Map();
  const sessionId = req => req.headers.cookie?.split(';').map(part => part.trim())
    .find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  const authorized = req => loopback(req) || (sessions.get(sessionId(req))?.expires || 0) > Date.now();

  function install(app, getLocalAddress, revokeConnections) {
    app.post('/api/mobile/invite', async (req, res) => {
      if (!loopback(req)) return res.sendStatus(403);
      const { host, port } = getLocalAddress();
      if (!/^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) {
        return res.status(409).json({ error: 'La PC necesita una dirección IPv4 privada en la red del templo.' });
      }
      const code = token();
      const url = `http://${host}:${port}/conectar.html#${code}`;
      const qr = await QRCode.toDataURL(url, { width: 320, margin: 3 });
      invitation = { code, expires: Date.now() + inviteAge };
      res.set('Cache-Control', 'no-store').json({ qr, url, expires: invitation.expires });
    });
    app.post('/api/mobile/join', (req, res) => {
      res.set('Cache-Control', 'no-store');
      if (!invitation || invitation.expires <= Date.now() || req.body?.code !== invitation.code) {
        return res.status(403).json({ error: 'El QR venció o ya se usó. Genera otro en la PC.' });
      }
      const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
      if (!label || label.length > 24 || /[\u0000-\u001f\u007f]/.test(label)) {
        return res.status(400).json({ error: 'Escribe un nombre de hasta 24 caracteres para el dispositivo.' });
      }
      invitation = undefined;
      const now = Date.now();
      for (const [id, session] of sessions) if (session.expires <= now) sessions.delete(id);
      if (sessions.size >= 32) sessions.delete(sessions.keys().next().value);
      const id = token();
      sessions.set(id, { id: token(), label, expires: now + sessionAge });
      res.cookie(cookieName, id, { httpOnly: true, sameSite: 'strict', maxAge: sessionAge, path: '/' }).json({ ok: true });
    });
    app.get('/api/mobile/sessions', (req, res) => {
      if (!loopback(req)) return res.sendStatus(403);
      res.set('Cache-Control', 'no-store').json([...sessions.values()].filter(session => session.expires > Date.now()));
    });
    app.delete('/api/mobile/sessions/:id', (req, res) => {
      if (!loopback(req)) return res.sendStatus(403);
      for (const [key, session] of sessions) {
        if (session.id === req.params.id) { sessions.delete(key); break; }
      }
      revokeConnections();
      res.sendStatus(204);
    });
    app.delete('/api/mobile/sessions', (req, res) => {
      if (!loopback(req)) return res.sendStatus(403);
      invitation = undefined;
      sessions.clear();
      revokeConnections();
      res.sendStatus(204);
    });

    app.use((req, res, next) => {
      if (authorized(req)) return next();
      const reading = ['GET', 'HEAD'].includes(req.method);
      const pathname = req.path.toLowerCase();
      if (reading && /^\/(?:control(?:\.html)?\/?|carteleria\/?)$/i.test(req.path)) {
        if (/^\/carteleria/i.test(req.path) && (req.query.tv === '1' || req.query.preview === '1')) return next();
        return res.redirect('/conectar.html');
      }
      if (!reading || (pathname.startsWith('/api/') && !['/api/settings', '/api/lists'].includes(pathname))) {
        return res.status(401).json({ error: 'Conecta este dispositivo con un QR desde la PC.' });
      }
      next();
    });
  }

  return { install, authorized };
}

module.exports = { createMobileAccess };
